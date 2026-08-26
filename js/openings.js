/* ============================================================
   Masterchessis — openings.js
   Explorateur d'ouvertures d'échecs Pro (Style Chess.com)
   - Statistiques de victoires (Blancs / Nulles / Noirs)
   - Filtres par 1.e4, 1.d4, Flancs et recherche temps réel
   - Entraîneur interactif étape par étape avec validation
   ============================================================ */
(function () {
  'use strict';

  const Openings = {
    container: null,
    openings: [],
    active: null,
    currentFilter: 'all',

    async render(container) {
      this.container = container;
      this.openings = window.OPENINGS || [];
      this._build();
    },

    _build() {
      const c = this.container;
      c.innerHTML = '';
      
      const wrap = document.createElement('div');
      wrap.className = 'openings-wrapper';
      wrap.innerHTML = `
        <div class="center mb-20">
          <h1 class="mb-5">♟️ Explorateur & Maître des Ouvertures</h1>
          <p class="text-secondary" style="font-size:14px">Analysez les variantes maîtresses, leurs statistiques mondiales de victoires et pratiquez-les interactivement.</p>
        </div>

        <div class="flex justify-center gap-10 flex-wrap mb-20">
          <button class="btn btn-sm ${this.currentFilter === 'all' ? 'btn-cta' : ''}" data-filter="all">Toutes (${this.openings.length})</button>
          <button class="btn btn-sm ${this.currentFilter === 'e4' ? 'btn-cta' : ''}" data-filter="e4">⚔️ 1.e4 (Pion Roi)</button>
          <button class="btn btn-sm ${this.currentFilter === 'd4' ? 'btn-cta' : ''}" data-filter="d4">🛡️ 1.d4 (Pion Dame)</button>
          <button class="btn btn-sm ${this.currentFilter === 'flank' ? 'btn-cta' : ''}" data-filter="flank">🏹 Flancs (1.c4 / 1.f4)</button>
        </div>

        <div class="puzzle-layout" style="align-items:flex-start">
          <div class="puzzle-panel">
            <input class="input mb-10" id="openingsSearch" placeholder="🔍 Filtrer par nom, code ECO (ex: B20) ou coup...">
            <div class="opening-list card" id="openingsList" style="max-height: 580px; overflow-y: auto;"></div>
          </div>
          <div class="puzzle-panel" id="openingDetailCol"></div>
        </div>
      `;
      c.appendChild(wrap);

      this.searchEl = wrap.querySelector('#openingsSearch');
      this.listEl = wrap.querySelector('#openingsList');
      this.detailEl = wrap.querySelector('#openingDetailCol');

      // Filter buttons
      wrap.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.currentFilter = btn.dataset.filter;
          wrap.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('btn-cta'));
          btn.classList.add('btn-cta');
          this._renderList(this.searchEl.value);
        });
      });

      this.searchEl.addEventListener('input', () => this._renderList(this.searchEl.value));

      this._renderList('');
      this._renderDetail(this.openings[0]);
    },

    _renderList(query) {
      query = (query || '').toLowerCase().trim();
      const list = this.listEl;
      list.innerHTML = '';

      let filtered = this.openings.filter(o => {
        // Filtre catégorie
        if (this.currentFilter === 'e4' && o.moves[0] !== 'e4') return false;
        if (this.currentFilter === 'd4' && o.moves[0] !== 'd4') return false;
        if (this.currentFilter === 'flank' && o.moves[0] === 'e4' || (this.currentFilter === 'flank' && o.moves[0] === 'd4')) return false;

        // Recherche texte
        if (!query) return true;
        return (
          o.name.toLowerCase().includes(query) ||
          o.eco.toLowerCase().includes(query) ||
          o.moves.join(' ').toLowerCase().includes(query) ||
          (o.ideas && o.ideas.toLowerCase().includes(query))
        );
      });

      if (!filtered.length) {
        list.innerHTML = '<div class="text-muted center p-15">Aucune ouverture ne correspond aux critères.</div>';
        return;
      }

      filtered.forEach(o => {
        const wr = o.winRate || { w: 40, d: 35, b: 25 };
        const item = document.createElement('div');
        item.className = 'opening-item' + (this.active && this.active.eco === o.eco && this.active.name === o.name ? ' active' : '');
        item.innerHTML = `
          <div class="flex justify-between items-center mb-5">
            <div><b>${o.eco}</b> · <span>${o.name}</span></div>
            <span class="badge badge-blue" style="font-size:11px">${o.side}</span>
          </div>
          <div class="op-moves mb-5">${o.moves.join(' ')}</div>
          <!-- Barre de statistiques Chess.com -->
          <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:#333;margin-top:4px" title="Blancs ${wr.w}% | Nulles ${wr.d}% | Noirs ${wr.b}%">
            <div style="width:${wr.w}%;background:#ffffff;height:100%"></div>
            <div style="width:${wr.d}%;background:#888888;height:100%"></div>
            <div style="width:${wr.b}%;background:#272522;height:100%"></div>
          </div>
          <div class="flex justify-between text-muted mt-5" style="font-size:10px">
            <span>⚪ ${wr.w}%</span>
            <span>⚪/⚫ ${wr.d}%</span>
            <span>⚫ ${wr.b}%</span>
          </div>
        `;
        item.addEventListener('click', () => {
          this.active = o;
          this._renderList(this.searchEl.value);
          this._renderDetail(o);
        });
        list.appendChild(item);
      });
    },

    _renderDetail(o) {
      const d = this.detailEl;
      if (!o) { d.innerHTML = '<div class="card center text-muted">Sélectionnez une ouverture.</div>'; return; }
      d.innerHTML = '';

      const wr = o.winRate || { w: 40, d: 35, b: 25 };

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="flex justify-between items-start mb-15 flex-wrap gap-10">
          <div>
            <h2 class="mb-5">${o.eco} — ${o.name}</h2>
            <div class="flex gap-8 items-center flex-wrap">
              <span class="badge badge-blue">${o.side}</span>
              <span class="badge badge-gold">Difficulté ${o.difficulty}/3</span>
              <span class="badge badge-green">${o.moves.length} coups</span>
            </div>
          </div>
          <button class="btn btn-cta" id="btnStartPractice">♟ S'entraîner à cette ouverture</button>
        </div>

        <!-- Taux de victoire Explorer -->
        <div class="mb-15 p-10 card" style="background:var(--bg-secondary);border:1px solid var(--border)">
          <div class="flex justify-between text-secondary mb-5" style="font-size:12px">
            <span>Statistiques Master & Parties En Ligne :</span>
            <b>${wr.w}% Blancs · ${wr.d}% Nulles · ${wr.b}% Noirs</b>
          </div>
          <div style="display:flex;height:10px;border-radius:4px;overflow:hidden;background:#333">
            <div style="width:${wr.w}%;background:#ffffff;height:100%" title="Victoires Blancs : ${wr.w}%"></div>
            <div style="width:${wr.d}%;background:#888888;height:100%" title="Parties Nulles : ${wr.d}%"></div>
            <div style="width:${wr.b}%;background:#1b1917;height:100%" title="Victoires Noirs : ${wr.b}%"></div>
          </div>
        </div>
        
        <div class="opening-explorer-view">
          <div class="controller flex gap-8 items-center mb-10">
            <button class="btn btn-sm" id="opPrev">◀ Coup Précédent</button>
            <span class="badge" id="opStep">0/${o.moves.length}</span>
            <button class="btn btn-sm" id="opNext">Coup Suivant ▶</button>
            <button class="btn btn-sm" id="opAll">Ligne Complète</button>
          </div>
          <div id="opBoard" style="max-width:380px;margin:0 auto"></div>
          <div class="divider my-15"></div>
          <h3>💡 Idées Stratégiques & Plans de Jeu</h3>
          <p class="text-secondary mt-10" style="font-size:14px;line-height:1.6">${o.ideas}</p>
        </div>
      `;
      d.appendChild(card);

      // Mini board replay
      const board = new ChessBoard({
        container: document.getElementById('opBoard'),
        chess: new Chess(),
        interactive: false,
        orientation: o.side === 'Noirs' ? 'b' : 'w'
      });
      let step = 0;
      const setStep = (s) => {
        step = Math.max(0, Math.min(o.moves.length, s));
        const c = new Chess();
        for (let i = 0; i < step; i++) {
          try { c.move(o.moves[i]); } catch (e) {}
        }
        board.setChess(c);
        if (step > 0) {
          const hist = c.history({ verbose: true });
          const last = hist[hist.length - 1];
          if (last) board.highlightLastMove(last.from, last.to);
        }
        document.getElementById('opStep').textContent = step + '/' + o.moves.length;
      };
      card.querySelector('#opPrev').addEventListener('click', () => setStep(step - 1));
      card.querySelector('#opNext').addEventListener('click', () => setStep(step + 1));
      card.querySelector('#opAll').addEventListener('click', () => setStep(o.moves.length));
      setStep(o.moves.length);

      card.querySelector('#btnStartPractice').addEventListener('click', () => this._startPractice(o));
    },

    // ==================== ENTRAÎNEUR INTERACTIF ====================
    _startPractice(opening) {
      const c = this.container;
      c.innerHTML = '';
      
      let currentStep = 0;
      const chess = new Chess();
      
      const header = document.createElement('div');
      header.className = 'lesson-active-header mb-15 flex justify-between items-center';
      header.innerHTML = `
        <button class="btn btn-sm" id="btnStopPractice">← Quitter l'entraînement</button>
        <div class="flex items-center gap-10">
          <span class="badge badge-gold">Ouverture : ${opening.name}</span>
        </div>
      `;
      c.appendChild(header);

      const layout = document.createElement('div');
      layout.className = 'puzzle-layout';
      
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'practiceBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      const panel = document.createElement('div');
      panel.className = 'puzzle-panel';
      panel.innerHTML = `
        <div class="coach-card card mb-15">
          <div class="flex items-center gap-10 mb-10">
            <div class="coach-avatar">🧙‍♂️</div>
            <div>
              <div class="font-bold text-accent">Coach Masterchess</div>
              <div style="font-size:11px" class="text-muted">Expert en Ouvertures</div>
            </div>
          </div>
          <div class="coach-bubble p-10 mb-10" id="practiceSpeech">
            C'est parti ! Jouez le premier coup de l'ouverture : <b>${opening.name}</b>.
          </div>
          <div class="coach-feedback p-10" id="practiceFeedback" style="display:none;font-size:13px;border-radius:6px"></div>
        </div>
        <div class="card mb-15">
          <h3 class="mb-10" style="font-size:15px">Progression</h3>
          <div class="op-moves-progress" id="opMovesProgress"></div>
        </div>
        <div class="game-controls flex gap-8">
          <button class="btn btn-sm" id="btnPracticeHint">💡 Indice</button>
          <button class="btn btn-sm" id="btnPracticeReset">↺ Recommencer</button>
        </div>
      `;
      layout.appendChild(panel);

      c.appendChild(layout);

      const feedbackEl = panel.querySelector('#practiceFeedback');
      const speechEl = panel.querySelector('#practiceSpeech');
      const progressEl = panel.querySelector('#opMovesProgress');

      const updateProgress = () => {
        progressEl.innerHTML = opening.moves.map((m, i) => 
          `<span class="badge ${i < currentStep ? 'badge-green' : 'badge-dark'}">${m}</span>`
        ).join(' ');
      };
      updateProgress();

      const showHint = () => {
        const expected = opening.moves[currentStep];
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'coach-feedback info';
        feedbackEl.innerHTML = `💡 <b>Indice :</b> Le coup attendu est <b>${expected}</b>.`;
      };

      const board = new ChessBoard({
        container: bWrap,
        chess: chess,
        interactive: true,
        orientation: opening.side === 'Blancs' ? 'w' : 'b',
        onMove: (move) => {
          const expected = opening.moves[currentStep];
          if (move.san === expected) {
            currentStep++;
            updateProgress();
            if (window.Sound) {
              if (move.captured) Sound.playCapture();
              else Sound.playMove();
              Sound.playSuccess();
            }
            
            if (currentStep < opening.moves.length) {
              speechEl.innerHTML = `Excellent ! Prochain coup : <b>${opening.moves[currentStep]}</b>.`;
              feedbackEl.style.display = 'none';
              
              // Si c'est au tour de l'adversaire (et qu'on pratique une ouverture spécifique),
              // on pourrait faire jouer l'adversaire automatiquement si on avait les coups.
              // Ici, opening.moves contient TOUS les coups (blancs et noirs).
              // Donc on attend juste le prochain coup de la liste.
            } else {
              this._renderOpeningVictory(opening);
            }
          } else {
            if (window.Sound) Sound.playWrong();
            board.flashError(move.to);
            feedbackEl.style.display = 'block';
            feedbackEl.className = 'coach-feedback error';
            feedbackEl.innerHTML = `❌ Ce n'est pas le coup attendu. Le coup correct était <b>${expected}</b>.`;
            
            // Undo move
            setTimeout(() => {
              chess.undo();
              board.render();
            }, 500);
          }
        }
      });

      header.querySelector('#btnStopPractice').addEventListener('click', () => this._build());
      panel.querySelector('#btnPracticeHint').addEventListener('click', showHint);
      panel.querySelector('#btnPracticeReset').addEventListener('click', () => this._startPractice(opening));
    },

    _renderOpeningVictory(opening) {
      const c = this.container;
      c.innerHTML = '';
      
      if (window.Sound) Sound.playWin();
      Storage.addXp(25);

      const card = document.createElement('div');
      card.className = 'card center';
      card.style.maxWidth = '550px';
      card.style.margin = '30px auto';
      card.innerHTML = `
        <div class="victory-stars mb-15" style="font-size:36px">⭐ ⭐ ⭐</div>
        <h2 class="mb-10 text-accent">🎉 Ouverture Maîtrisée !</h2>
        <h3 class="mb-15">${opening.name}</h3>
        <p class="text-secondary mb-20">Vous avez joué parfaitement la ligne principale de l'ouverture <b>${opening.eco}</b>.</p>

        <div class="badge badge-gold mb-25" style="font-size:16px;padding:8px 16px">+25 XP Gagnés</div>

        <div class="flex gap-10 justify-center">
          <button class="btn btn-cta" id="btnBackToExplo">Retour à l'explorateur</button>
        </div>
      `;
      c.appendChild(card);
      card.querySelector('#btnBackToExplo').addEventListener('click', () => this._build());
    }
  };

  window.ChessOpeningsModule = window.Openings = Openings;
})();
