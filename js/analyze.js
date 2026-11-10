/* ============================================================
   Masterchessis — analyze.js
   Analyse Stockfish : barre d'évaluation, meilleur coup,
   lignes principales, navigation par coups
   ============================================================ */
(function () {
  'use strict';

  const Analyze = {
    container: null,
    chess: null,
    board: null,
    fenHistory: [],
    currentIndex: 0,
    evalBar: null,
    evalText: null,
    statusEl: null,
    engineAvailable: false,
    analyzing: false,

    async render(container, gameData = null) {
      this.container = container;
      this.reviewData = (gameData && gameData.reviewData) || null;
      if (gameData) {
        this.fenHistory = gameData.fenHistory;
        this.chess = new Chess(this.fenHistory[0] || undefined);
        if (gameData.moveList && gameData.moveList.length) {
          gameData.moveList.forEach(san => { try { this.chess.move(san); } catch (e) {} });
        } else if (this.fenHistory.length > 1) {
          this.chess = new Chess(this.fenHistory[this.fenHistory.length - 1]);
        }
        this.currentIndex = this.fenHistory.length - 1;
        this.sanHistory = (gameData.moveList || this.chess.history() || []).slice();
      } else {
        this.chess = Engine.newGame();
        this.currentIndex = 0;
        this.fenHistory = [this.chess.fen()];
        this.sanHistory = [];
      }
      this._build();
      this._analyze();
    },

    _build() {
      const c = this.container;
      c.innerHTML = '';

      const head = document.createElement('div');
      head.className = 'arena-head lab-head';
      head.innerHTML = `
        <div>
          <div class="eyebrow">Le Laboratoire</div>
          <h1 class="arena-title">Radiographiez <span>votre partie</span></h1>
          <p class="arena-sub">Importez un PGN ou jouez des coups : le moteur évalue chaque position, coup par coup.</p>
        </div>
        <div class="lab-badges">
          <span class="lab-badge">⚙️ Moteur local</span>
          <span class="lab-badge">📄 PGN</span>
          <span class="lab-badge">⚡ Temps réel</span>
        </div>
      `;
      c.appendChild(head);

      const layout = document.createElement('div');
      layout.className = 'analyze-layout lab-layout';
      c.appendChild(layout);

      // Rail d'évaluation
      const evalCol = document.createElement('div');
      evalCol.className = 'eval-col';
      const evalBar = document.createElement('div');
      evalBar.className = 'eval-bar lab-eval-bar';
      evalBar.innerHTML = '<div class="eval-white" id="evalWhite"></div><div class="eval-black" id="evalBlack"></div><div class="eval-text" id="evalText">0.0</div>';
      evalCol.appendChild(evalBar);
      evalCol.insertAdjacentHTML('beforeend', '<div class="eval-caption">BLANCS</div>');
      layout.appendChild(evalCol);

      // Plateau
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col lab-board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'analyzeBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      // Panneau
      const panel = document.createElement('div');
      panel.className = 'side-panel lab-panel';
      layout.appendChild(panel);

      panel.innerHTML = `
        <div class="lab-card lab-engine-card">
          <div class="lab-card-head">
            <span class="eyebrow">Moteur</span>
            <span class="engine-status" id="engineStatus">Initialisation…</span>
          </div>
          <div class="lab-bestmove">
            <div class="lab-bestmove-label">Meilleur coup</div>
            <div id="bestMove" class="lab-bestmove-value">—</div>
          </div>
        </div>

        <div class="lab-card">
          <div class="lab-card-head">
            <span class="eyebrow">Timeline</span>
            <span class="badge badge-blue" id="aPlyBadge">Coup 0</span>
          </div>
          <input type="range" class="lab-range" id="aRange" min="0" max="0" value="0">
          <div class="analyze-controls lab-controls">
            <button class="btn btn-sm" id="aStart" title="Début">⏮</button>
            <button class="btn btn-sm" id="aPrev" title="Précédent">◀</button>
            <button class="btn btn-sm" id="aNext" title="Suivant">▶</button>
            <button class="btn btn-sm" id="aEnd" title="Fin">⏭</button>
            <button class="btn btn-sm" id="aFlip" title="Retourner">⇄</button>
            <button class="btn btn-sm btn-blue" id="aAuto" title="Jouer le meilleur coup">Auto ▶</button>
          </div>
        </div>

        <div class="lab-card">
          <div class="lab-card-head">
            <span class="eyebrow">Notation</span>
            <span class="badge" id="aMoveCount">0 coup</span>
          </div>
          <div class="move-list lab-movelist" id="aMoveList"></div>
        </div>

        <div class="lab-card lab-import">
          <div class="lab-card-head">
            <span class="eyebrow">Importer</span>
            <span class="badge badge-gold">PGN</span>
          </div>
          <textarea class="textarea" id="pgnInput" rows="3" placeholder="Collez un PGN, ou déposez un fichier .pgn…"></textarea>
          <div class="flex gap-8 mt-10">
            <button class="btn btn-primary btn-sm flex-1" id="pgnLoad">Charger le PGN</button>
            <button class="btn btn-sm" id="pgnClear">Effacer</button>
          </div>
          <div class="lab-drop" id="pgnDrop">📥 Glissez-déposez un fichier PGN ici</div>
          <input type="file" id="pgnFile" accept=".pgn,text/plain" style="display:none">
        </div>
      `;

      this.evalBar = document.getElementById('evalWhite');
      this.evalText = document.getElementById('evalText');
      this.statusEl = document.getElementById('engineStatus');
      this.bestMoveEl = document.getElementById('bestMove');
      this.moveListEl = document.getElementById('aMoveList');
      this.rangeEl = document.getElementById('aRange');
      this.plyBadge = document.getElementById('aPlyBadge');
      this.moveCountEl = document.getElementById('aMoveCount');

      // Plateau
      const prefs = Storage.getPrefs();
      this.board = new ChessBoard({
        container: document.getElementById('analyzeBoard'),
        chess: this.chess,
        interactive: false,
        orientation: 'w',
        showCoords: prefs.showCoords
      });

      this._renderMoveList();

      // Contrôles
      document.getElementById('aStart').addEventListener('click', () => this._goto(0));
      document.getElementById('aPrev').addEventListener('click', () => this._goto(this.currentIndex - 1));
      document.getElementById('aNext').addEventListener('click', () => this._goto(this.currentIndex + 1));
      document.getElementById('aEnd').addEventListener('click', () => this._goto(this.fenHistory.length - 1));
      document.getElementById('aFlip').addEventListener('click', () => this.board.flip());
      document.getElementById('aAuto').addEventListener('click', () => this._autoPlay());
      this.rangeEl.addEventListener('input', (e) => this._goto(parseInt(e.target.value, 10)));
      document.getElementById('pgnLoad').addEventListener('click', () => this._loadPgn());
      document.getElementById('pgnClear').addEventListener('click', () => {
        document.getElementById('pgnInput').value = '';
      });

      const fileInput = document.getElementById('pgnFile');
      const drop = document.getElementById('pgnDrop');
      drop.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          document.getElementById('pgnInput').value = reader.result;
          this._loadPgn();
        };
        reader.readAsText(file);
      });
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add('over');
      }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove('over');
      }));
      drop.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          document.getElementById('pgnInput').value = reader.result;
          this._loadPgn();
        };
        reader.readAsText(file);
      });
    },

    _goto(idx) {
      idx = Math.max(0, Math.min(this.fenHistory.length - 1, idx));
      this.currentIndex = idx;
      this.chess = new Chess(this.fenHistory[idx]);
      this.board.setChess(this.chess);
      this._renderMoveList();
      this._highlightLast();
      this._analyze();
    },

    _highlightLast() {
      if (this.currentIndex > 0) {
        let last = null;
        if (this.sanHistory && this.sanHistory.length >= this.currentIndex) {
          const replay = new Chess(this.fenHistory[0] || undefined);
          for (let i = 0; i < this.currentIndex; i++) {
            try { last = replay.move(this.sanHistory[i]); } catch (e) { last = null; }
          }
        } else {
          const hist = this.chess.history({ verbose: true });
          last = hist[hist.length - 1];
        }
        if (last) this.board.highlightLastMove(last.from, last.to);
      }
    },

    _renderMoveList() {
      if (!this.moveListEl) return;
      this.moveListEl.innerHTML = '';
      const hist = this.sanHistory || this.chess.history();
      const rows = [];
      for (let i = 0; i < hist.length; i += 2) {
        const row = document.createElement('div');
        row.className = 'move-row';
        const num = document.createElement('span');
        num.className = 'move-num';
        num.textContent = (i / 2 + 1) + '.';
        row.appendChild(num);
        const detailFor = (ply) => {
          if (!this.reviewData || !this.reviewData.details) return null;
          return this.reviewData.details[ply - 1] || null;
        };
        const decorate = (el, ply) => {
          const d = detailFor(ply);
          if (!d) return;
          const meta = window.Review && window.Review.LABELS ? window.Review.LABELS[d.verdict] : null;
          if (meta) {
            el.classList.add(meta.cls);
            el.title = meta.label + ' · perte ' + d.loss + ' cp';
            el.insertAdjacentHTML('beforeend', `<i class="lab-verdict">${meta.icon}</i>`);
          }
          el.dataset.ply = ply;
          el.addEventListener('click', () => this._goto(ply));
        };
        const w = document.createElement('span');
        w.className = 'move-san' + (i === this.currentIndex - 1 ? ' current' : '');
        w.textContent = hist[i];
        decorate(w, i + 1);
        row.appendChild(w);
        if (hist[i + 1]) {
          const b = document.createElement('span');
          b.className = 'move-san' + (i + 1 === this.currentIndex - 1 ? ' current' : '');
          b.textContent = hist[i + 1];
          decorate(b, i + 2);
          row.appendChild(b);
        }
        rows.push(row);
      }
      rows.forEach(r => this.moveListEl.appendChild(r));
      this._updateRange(hist.length);
    },

    _updateRange(totalMoves) {
      if (this.rangeEl) {
        this.rangeEl.max = Math.max(0, this.fenHistory.length - 1);
        this.rangeEl.value = this.currentIndex;
      }
      if (this.plyBadge) this.plyBadge.textContent = 'Coup ' + this.currentIndex;
      if (this.moveCountEl) {
        const n = totalMoves != null ? totalMoves : this.chess.history().length;
        this.moveCountEl.textContent = n + ' coup' + (n > 1 ? 's' : '');
      }
    },

    _analyze() {
      const token = (this.analyzeToken = (this.analyzeToken || 0) + 1);
      this.analyzing = true;
      
      const isPro = Storage.isPro();
      const depth = isPro ? 18 : 10;
      
      this.statusEl.textContent = `Analyse ${isPro ? 'Pro' : 'Standard'} (profondeur ${depth})…`;
      this.statusEl.className = 'engine-status think';
      
      const fen = this.chess.fen();
      Engine.analyze(fen, { depth: depth, onInfo: (info) => { if (token === this.analyzeToken) this._onInfo(info); } })
        .then((res) => {
          if (token !== this.analyzeToken) return;
          this.analyzing = false;
          if (res && res.bestMove) {
            this.bestMoveEl.textContent = res.bestMove;
          }
          this.statusEl.textContent = `Moteur prêt (${isPro ? 'Analyse Pro active' : 'Mode Standard'})`;
          this.statusEl.className = 'engine-status';
        })
        .catch(() => {
          if (token !== this.analyzeToken) return;
          this.analyzing = false;
          this.statusEl.textContent = 'Moteur indisponible';
          this.statusEl.className = 'engine-status error';
        });
    },

    _onInfo(info) {
      if (!info) return;
      // EVAL bar
      const score = info.score;
      const whitePct = this._scoreToPct(score);
      if (this.evalBar) {
        this.evalBar.style.height = whitePct + '%';
        this.evalBar.style.setProperty('--eval-pct', whitePct + '%');
      }
      if (this.evalText) this.evalText.textContent = Engine.formatScore(info);
    },

    _scoreToPct(score) {
      // Convertit score centipawn en % de la barre blanche
      const sig = 1 / (1 + Math.pow(10, -score / 400));
      return Math.max(2, Math.min(98, sig * 100));
    },

    _autoPlay() {
      // Joue automatiquement le meilleur coup puis continue
      const best = this.bestMoveEl.textContent;
      if (best && best !== '—') {
        try {
          const move = this.chess.move(best);
          this.fenHistory.push(this.chess.fen());
          this.currentIndex = this.fenHistory.length - 1;
          this.board.highlightLastMove(move.from, move.to);
          this._renderMoveList();
          this._analyze();
        } catch (e) {}
      }
    },

    _loadPgn() {
      const pgn = document.getElementById('pgnInput').value.trim();
      if (!pgn) { window.ChessUI && ChessUI.toast('Veuillez coller un PGN', 'warn'); return; }
      try {
        const c = new Chess();
        c.loadPgn(pgn);
        this.chess = c;
        this.fenHistory = [c.fen()];
        // Reconstruire l'historique des FEN
        const c2 = new Chess();
        this.fenHistory = [c2.fen()];
        const hist = c.history({ verbose: true });
        hist.forEach(m => {
          try { c2.move(m.san); this.fenHistory.push(c2.fen()); } catch (e) {}
        });
        this.sanHistory = hist.map(m => m.san);
        this.currentIndex = this.fenHistory.length - 1;
        this.board.setChess(this.chess);
        this._renderMoveList();
        this._highlightLast();
        this._analyze();
        window.ChessUI && ChessUI.toast('Partie chargée', 'success');
      } catch (e) {
        window.ChessUI && ChessUI.toast('PGN invalide', 'error');
      }
    }
  };

  window.ChessAnalyze = window.Analyze = Analyze;
})();
