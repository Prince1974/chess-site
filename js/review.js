/* ============================================================
   Masterchessis — review.js
   Bilan de partie interactif : évaluation réelle coup par coup,
   classification, précision, moments clés et navigation.
   ============================================================ */
(function () {
  'use strict';

  const MATE_CP = 100000;

  const LABELS = {
    brilliant: { icon: '🌟', label: 'Brillant', cls: 'rev-brilliant', color: '#35e0a1', desc: 'Un sacrifice ou un coup exceptionnel qui reste gagnant.' },
    best: { icon: '🟢', label: 'Meilleur', cls: 'rev-best', color: '#35e0a1', desc: 'Le meilleur coup de la position.' },
    excellent: { icon: '💎', label: 'Excellent', cls: 'rev-excellent', color: '#5b9dff', desc: 'Un très bon coup, presque aussi fort que le meilleur.' },
    good: { icon: '🔵', label: 'Bon', cls: 'rev-good', color: '#4fd1e0', desc: 'Un coup sain qui conserve l’avantage.' },
    inaccuracy: { icon: '🟡', label: 'Imprécision', cls: 'rev-inaccuracy', color: '#f5c76a', desc: 'Un coup jouable, mais qui laisse filer une partie de l’avantage.' },
    mistake: { icon: '🟠', label: 'Erreur', cls: 'rev-mistake', color: '#ffa45c', desc: 'Un coup qui dégrade nettement votre position.' },
    blunder: { icon: '🔴', label: 'Gaffe', cls: 'rev-blunder', color: '#ff6b6b', desc: 'Une grosse erreur qui peut coûter la partie.' }
  };

  const PIECE_VALUE = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function fmtEval(cp) {
    if (!isFinite(cp)) return '0.00';
    const abs = Math.abs(cp);
    if (abs >= MATE_CP - 20000) {
      const mateIn = Math.max(1, Math.round((MATE_CP - abs) / 1000));
      return (cp > 0 ? '+#' : '-#') + mateIn;
    }
    return (cp > 0 ? '+' : '') + (cp / 100).toFixed(2);
  }

  function materialFor(color, chess) {
    const board = chess.board();
    let total = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === color) total += PIECE_VALUE[piece.type] || 0;
      }
    }
    return total;
  }

  function winPercent(cpMover) {
    const capped = clamp(cpMover, -1200, 1200);
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * capped)) - 1);
  }

  function moveAccuracy(cpBefore, cpAfter, mover) {
    const before = winPercent(mover === 'w' ? cpBefore : -cpBefore);
    const after = winPercent(mover === 'w' ? cpAfter : -cpAfter);
    const loss = Math.max(0, before - after);
    const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
    return clamp(raw, 0, 100);
  }

  function terminalEval(fen) {
    try {
      const c = new Chess(fen);
      if (c.isCheckmate()) return c.turn() === 'w' ? -MATE_CP : MATE_CP;
      if (c.isDraw() || c.isStalemate() || c.isThreefoldRepetition() || c.isInsufficientMaterial()) return 0;
    } catch (e) {}
    return null;
  }

  function classify(loss, isBest, sacrifice, cpAfter, mover) {
    const goodForMover = mover === 'w' ? cpAfter > -120 : cpAfter < 120;
    if (isBest && loss <= 12 && sacrifice && goodForMover) return 'brilliant';
    if (isBest || loss <= 12) return 'best';
    if (loss <= 30) return 'excellent';
    if (loss <= 60) return 'good';
    if (loss <= 120) return 'inaccuracy';
    if (loss <= 300) return 'mistake';
    return 'blunder';
  }

  const Review = {
    modal: null,
    board: null,
    state: null,
    cache: new Map(),
    token: 0,

    open(gameInstance) {
      if (!gameInstance) return;
      const history = gameInstance.fenHistory || [];
      const moveList = gameInstance.moveList || [];
      if (!moveList.length) {
        if (window.ChessUI) ChessUI.toast('Aucun coup à analyser dans cette partie.', 'info');
        return;
      }

      this.close();
      const token = ++this.token;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay review-overlay';
      modal.innerHTML = `
        <div class="review-modal" role="dialog" aria-modal="true" aria-label="Bilan de partie">
          <div class="review-head">
            <div>
              <span class="eyebrow">Bilan de partie</span>
              <h2>Analyse <span class="text-accent">coup par coup</span></h2>
              <p class="review-sub" id="reviewSub">Le moteur évalue chaque position et classe chaque coup.</p>
            </div>
            <button class="review-close" id="reviewClose" type="button" aria-label="Fermer">✕</button>
          </div>
          <div class="review-loading" id="reviewLoading">
            <div class="review-spinner"></div>
            <b id="reviewLoadingTitle">Analyse en cours…</b>
            <span id="reviewProgressText">Préparation du moteur…</span>
            <div class="review-progress"><i id="reviewProgressBar"></i></div>
          </div>
          <div class="review-body" id="reviewBody" hidden></div>
        </div>
      `;
      document.body.appendChild(modal);
      this.modal = modal;
      document.body.classList.add('modal-open');

      const close = () => this.close();
      modal.querySelector('#reviewClose').addEventListener('click', close);
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
      modal._keyHandler = (e) => {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') this.step(-1);
        if (e.key === 'ArrowRight') this.step(1);
      };
      document.addEventListener('keydown', modal._keyHandler);

      const cacheKey = history.join('|') + '|' + moveList.join(',');
      if (this.cache.has(cacheKey)) {
        this.state = this.cache.get(cacheKey);
        this._render(token, gameInstance);
        return;
      }

      this._analyze(history, moveList, token).then((state) => {
        if (!state || token !== this.token) return;
        this.cache.set(cacheKey, state);
        this.state = state;
        gameInstance.reviewData = state;
        this._render(token, gameInstance);
      }).catch((err) => {
        if (token !== this.token) return;
        console.error('Review error', err);
        const loading = modal.querySelector('#reviewLoading');
        if (loading) loading.innerHTML = '<b>Impossible d’analyser cette partie.</b><span>Réessayez ou ouvrez le laboratoire d’analyse.</span>';
      });
    },

    close() {
      this.token++;
      if (this.modal) {
        if (this.modal._keyHandler) document.removeEventListener('keydown', this.modal._keyHandler);
        this.modal.remove();
      }
      this.modal = null;
      this.board = null;
      document.body.classList.remove('modal-open');
    },

    async _analyze(history, moveList, token) {
      const total = history.length;
      const isPro = window.Storage && Storage.isPro();
      const depth = isPro ? 15 : 10;
      const minLevel = isPro ? 7 : 6;
      const evals = new Array(total).fill(0);
      const bestMoves = new Array(total).fill(null);
      let stockfishBroken = false;
      let failed = 0;

      const evaluate = async (fen) => {
        const terminal = terminalEval(fen);
        if (terminal !== null) return { cp: terminal, bestMove: null };
        if (!stockfishBroken && window.Engine && Engine.sfAvailable) {
          let lastInfo = null;
          const sfPromise = Engine.analyze(fen, {
            depth,
            onInfo: (info) => { if (info) lastInfo = info; }
          }).catch(() => null);
          const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 7000));
          const res = await Promise.race([sfPromise, timeout]);
          if (res && res !== 'timeout' && res.bestMove) {
            const turn = new Chess(fen).turn();
            let cp = 0;
            if (lastInfo) {
              if (lastInfo.scoreKind === 'mate') {
                const sign = lastInfo.score > 0 ? 1 : -1;
                cp = sign * (MATE_CP - Math.abs(lastInfo.score) * 1000);
              } else {
                cp = Number(lastInfo.score) || 0;
              }
              if (turn === 'b') cp = -cp;
            }
            return { cp, bestMove: res.bestMove };
          }
          stockfishBroken = true;
        }
        try {
          const res = await Engine.analyze(fen, { level: minLevel });
          const info = (res && res.info) || {};
          return { cp: Number(info.score) || 0, bestMove: res ? res.bestMove : null };
        } catch (e) {
          return null;
        }
      };

      for (let i = 0; i < total; i++) {
        if (token !== this.token) return null;
        const result = await evaluate(history[i]);
        if (!result) failed++;
        evals[i] = result ? result.cp : 0;
        bestMoves[i] = result ? result.bestMove : null;
        const pct = Math.round((i / total) * 100);
        if (this.modal) {
          const bar = this.modal.querySelector('#reviewProgressBar');
          const txt = this.modal.querySelector('#reviewProgressText');
          if (bar) bar.style.width = pct + '%';
          if (txt) txt.textContent = `Position ${i + 1} sur ${total} · ${pct}%`;
        }
        if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
      }
      if (failed >= total) throw new Error('Moteur d’analyse indisponible');

      const details = [];
      const white = { moves: 0, accuracySum: 0, brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, cpLoss: 0 };
      const black = { moves: 0, accuracySum: 0, brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, cpLoss: 0 };

      for (let i = 0; i < moveList.length; i++) {
        const mover = i % 2 === 0 ? 'w' : 'b';
        const stats = mover === 'w' ? white : black;
        const cpBefore = evals[i] != null ? evals[i] : 0;
        const cpAfter = evals[i + 1] != null ? evals[i + 1] : 0;
        const loss = Math.max(0, mover === 'w' ? cpBefore - cpAfter : cpAfter - cpBefore);
        const played = moveList[i];
        const best = bestMoves[i];
        const isBest = !!best && String(best).replace(/[+#!?]/g, '') === String(played).replace(/[+#!?]/g, '');

        let verdict = 'book';
        let sacrifice = false;
        let from = null;
        let to = null;
        try {
          const c = new Chess(history[i]);
          const before = materialFor(mover, c);
          const verbose = c.move(played);
          if (verbose) {
            from = verbose.from;
            to = verbose.to;
            const after = materialFor(mover, c);
            sacrifice = (before - after) >= 120;
          }
        } catch (e) {}

        verdict = classify(loss, isBest, sacrifice, cpAfter, mover);
        const acc = moveAccuracy(cpBefore, cpAfter, mover);
        stats.moves++;
        stats.accuracySum += acc;
        stats.cpLoss += loss;
        stats[verdict] = (stats[verdict] || 0) + 1;
        details.push({
          ply: i + 1,
          num: Math.floor(i / 2) + 1,
          color: mover,
          played,
          best: best || played,
          from,
          to,
          evalBefore: cpBefore,
          evalAfter: cpAfter,
          loss: Math.round(loss),
          accuracy: acc,
          verdict,
          sacrifice
        });
      }

      const state = {
        history,
        moveList,
        evals,
        details,
        white,
        black,
        whiteAccuracy: white.moves ? Math.round(white.accuracySum / white.moves) : 0,
        blackAccuracy: black.moves ? Math.round(black.accuracySum / black.moves) : 0,
        isPro,
        partial: failed > 0
      };
      return state;
    },

    _render(token, gameInstance) {
      if (!this.modal || !this.state) return;
      const s = this.state;
      const loading = this.modal.querySelector('#reviewLoading');
      const body = this.modal.querySelector('#reviewBody');
      if (loading) loading.hidden = true;
      if (body) body.hidden = false;
      const sub = this.modal.querySelector('#reviewSub');
      if (sub) sub.textContent = `${s.moveList.length} coups analysés · ${s.isPro ? 'profondeur Pro' : 'analyse standard'}${s.partial ? ' · certaines positions n’ont pas pu être évaluées' : ''} · cliquez un coup pour revoir la position.`;

      const verdictRows = ['brilliant', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
      const keyMoments = s.details.slice().sort((a, b) => b.loss - a.loss).filter(d => d.loss >= 120).slice(0, 4);
      const accCard = (side, label, value, cls) => `
        <div class="review-acc ${cls}">
          <div class="review-acc-top"><span class="review-acc-side">${label}</span><span class="review-acc-elo">${side.moves} coups</span></div>
          <div class="review-acc-value">${value}<small>%</small></div>
          <div class="review-acc-label">Précision</div>
          <div class="review-acc-meta">
            <span>${LABELS.brilliant.icon} ${side.brilliant}</span>
            <span>${LABELS.blunder.icon} ${side.blunder}</span>
            <span>${(side.cpLoss / Math.max(1, side.moves)).toFixed(0)} cp/coup</span>
          </div>
        </div>`;

      body.innerHTML = `
        <div class="review-accuracy">
          ${accCard(s.white, '⚪ Blancs', s.whiteAccuracy, 'white')}
          ${accCard(s.black, '⚫ Noirs', s.blackAccuracy, 'black')}
        </div>

        <div class="review-main-grid">
          <div class="review-board-col">
            <div class="review-board" id="reviewBoard"></div>
            <div class="review-move-strip">
              <button class="btn btn-sm" id="revFirst" title="Début">⏮</button>
              <button class="btn btn-sm" id="revPrev" title="Coup précédent">◀</button>
              <div class="review-eval-pill" id="reviewEval">+0.00</div>
              <button class="btn btn-sm" id="revNext" title="Coup suivant">▶</button>
              <button class="btn btn-sm" id="revLast" title="Fin">⏭</button>
            </div>
            <div class="review-current" id="reviewCurrent"></div>
          </div>

          <div class="review-side">
            <div class="review-panel">
              <div class="review-panel-head"><h3>Répartition des coups</h3><span class="badge badge-blue">${s.moveList.length} demi-coups</span></div>
              <div class="review-table">
                <div class="review-table-row head"><span>Classification</span><span>Blancs</span><span>Noirs</span></div>
                ${verdictRows.map(v => `
                  <div class="review-table-row">
                    <span class="review-verdict ${LABELS[v].cls}">${LABELS[v].icon} ${LABELS[v].label}</span>
                    <span>${s.white[v] || 0}</span>
                    <span>${s.black[v] || 0}</span>
                  </div>`).join('')}
              </div>
            </div>

            ${keyMoments.length ? `
            <div class="review-panel">
              <div class="review-panel-head"><h3>Moments clés</h3><span class="badge badge-gold">À revoir</span></div>
              <div class="review-keymoments">
                ${keyMoments.map(d => `
                  <button class="review-keymoment" data-ply="${d.ply}">
                    <span class="review-verdict ${LABELS[d.verdict].cls}">${LABELS[d.verdict].icon}</span>
                    <span><b>${d.num}${d.color === 'w' ? '.' : '…'} ${esc(d.played)}</b><small>perte de ${d.loss} centipions</small></span>
                  </button>`).join('')}
              </div>
            </div>` : ''}
          </div>
        </div>

        <div class="review-panel review-moves-panel">
          <div class="review-panel-head">
            <h3>Détail des coups</h3>
            <span class="text-muted" style="font-size:12px">Chaque coup est évalué et classé</span>
          </div>
          <div class="review-move-list" id="reviewMoveList">
            ${s.details.map(d => `
              <button class="review-move-item ${LABELS[d.verdict].cls}" data-ply="${d.ply}">
                <span class="revm-num">${d.num}${d.color === 'w' ? '.' : '…'}</span>
                <span class="revm-san">${esc(d.played)}</span>
                <span class="revm-badge">${LABELS[d.verdict].icon} ${LABELS[d.verdict].label}</span>
                <span class="revm-eval">${fmtEval(d.evalAfter)}</span>
                <span class="revm-loss">${d.loss ? '-' + d.loss : '0'} cp</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="review-footer">
          <button class="btn btn-secondary" id="reviewAnalyze">🔬 Ouvrir dans le laboratoire</button>
          <button class="btn btn-secondary" id="reviewCopy">📋 Copier le rapport</button>
          <button class="btn btn-primary" id="reviewDone">Terminer</button>
        </div>
      `;

      const boardHost = body.querySelector('#reviewBoard');
      this.board = new ChessBoard({
        container: boardHost,
        chess: new Chess(s.history[0]),
        interactive: false,
        orientation: 'w',
        showCoords: true
      });

      const go = (idx) => this.goto(idx);
      body.querySelector('#revFirst').addEventListener('click', () => go(0));
      body.querySelector('#revPrev').addEventListener('click', () => this.step(-1));
      body.querySelector('#revNext').addEventListener('click', () => this.step(1));
      body.querySelector('#revLast').addEventListener('click', () => go(s.history.length - 1));
      body.querySelector('#reviewMoveList').addEventListener('click', (e) => {
        const item = e.target.closest('[data-ply]');
        if (item) go(Number(item.dataset.ply));
      });
      body.querySelectorAll('.review-keymoment').forEach(btn => {
        btn.addEventListener('click', () => go(Number(btn.dataset.ply)));
      });
      body.querySelector('#reviewDone').addEventListener('click', () => this.close());
      body.querySelector('#reviewAnalyze').addEventListener('click', () => {
        if (window.App) {
          App.gameToReview = gameInstance;
          App.navigate('analyze');
        }
        this.close();
      });
      body.querySelector('#reviewCopy').addEventListener('click', () => this._copyReport());
      this.goto(s.moveList.length ? 1 : 0);
    },

    goto(idx) {
      const s = this.state;
      if (!s || !this.board) return;
      idx = clamp(idx, 0, s.history.length - 1);
      this.current = idx;
      const chess = new Chess(s.history[idx]);
      this.board.setChess(chess);
      if (idx > 0) {
        const d = s.details[idx - 1];
        if (d && d.from && d.to) this.board.highlightLastMove(d.from, d.to);
      }
      const evalEl = this.modal && this.modal.querySelector('#reviewEval');
      if (evalEl) evalEl.textContent = fmtEval(s.evals[idx] || 0);
      this._renderCurrent(idx);
      if (this.modal) {
        this.modal.querySelectorAll('.review-move-item').forEach(el => {
          el.classList.toggle('active', Number(el.dataset.ply) === idx);
        });
        const active = this.modal.querySelector('.review-move-item.active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
      }
    },

    step(delta) {
      if (!this.state) return;
      this.goto((this.current || 0) + delta);
    },

    _renderCurrent(idx) {
      const host = this.modal && this.modal.querySelector('#reviewCurrent');
      if (!host || !this.state) return;
      if (idx === 0) {
        host.innerHTML = `
          <div class="review-current-head"><span class="badge">Position initiale</span><span class="review-current-eval">${fmtEval(this.state.evals[0] || 0)}</span></div>
          <p class="text-muted">Cliquez sur un coup de la liste pour afficher la position et son verdict.</p>`;
        return;
      }
      const d = this.state.details[idx - 1];
      const meta = LABELS[d.verdict];
      host.innerHTML = `
        <div class="review-current-head">
          <div>
            <span class="eyebrow">${d.color === 'w' ? 'Blancs' : 'Noirs'} · Coup ${d.num}</span>
            <h3>${esc(d.played)} <span class="review-verdict ${meta.cls}">${meta.icon} ${meta.label}</span></h3>
          </div>
          <span class="review-current-eval">${fmtEval(d.evalAfter)}</span>
        </div>
        <div class="review-current-grid">
          <div><span>Meilleur coup</span><b>${esc(d.best)}</b></div>
          <div><span>Perte d’évaluation</span><b>${d.loss} cp</b></div>
          <div><span>Précision du coup</span><b>${Math.round(d.accuracy)}%</b></div>
          <div><span>Évaluation avant</span><b>${fmtEval(d.evalBefore)}</b></div>
        </div>
        <p class="review-current-desc">${meta.desc}${d.sacrifice ? ' Ce coup comporte un sacrifice de matériel.' : ''}</p>
      `;
    },

    _copyReport() {
      const s = this.state;
      if (!s) return;
      const lines = [
        'Masterchessis — Bilan de partie',
        `Précision Blancs : ${s.whiteAccuracy}% · Précision Noirs : ${s.blackAccuracy}%`,
        ''
      ];
      s.details.forEach(d => {
        lines.push(`${d.num}${d.color === 'w' ? '.' : '…'} ${d.played} — ${LABELS[d.verdict].label} (perte ${d.loss} cp, meilleur : ${d.best})`);
      });
      const text = lines.join('\n');
      const done = () => window.ChessUI && ChessUI.toast('Rapport copié', 'success');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        ta.remove();
      }
    }
  };

  Review.LABELS = LABELS;
  window.Review = Review;
  window.ChessReview = Review;
})();
