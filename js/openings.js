/* ============================================================
   Masterchessis — openings.js
   Explorateur d'ouvertures : liste, recherche, détail,
   rejeu des coups sur un mini plateau
   ============================================================ */
(function () {
  'use strict';

  const Openings = {
    container: null,
    openings: [],
    active: null,

    async render(container) {
      this.container = container;
      this.openings = window.OPENINGS || [];
      this._build();
    },

    _build() {
      const c = this.container;
      c.innerHTML = '';
      const h = document.createElement('h1');
      h.textContent = '♟ Explorateur d\'ouvertures';
      h.classList.add('center', 'mb-10');
      c.appendChild(h);
      const sub = document.createElement('p');
      sub.className = 'center text-secondary mb-20';
      sub.textContent = 'Découvrez les grandes ouvertures et leurs idées stratégiques.';
      c.appendChild(sub);

      const layout = document.createElement('div');
      layout.className = 'puzzle-layout';
      layout.style.alignItems = 'flex-start';
      c.appendChild(layout);

      // Liste + recherche
      const listCol = document.createElement('div');
      listCol.className = 'puzzle-panel';
      layout.appendChild(listCol);

      const search = document.createElement('input');
      search.className = 'input';
      search.placeholder = '🔍 Rechercher une ouverture…';
      search.id = 'openingsSearch';
      listCol.appendChild(search);

      const list = document.createElement('div');
      list.className = 'opening-list card';
      list.style.marginTop = '10px';
      list.id = 'openingsList';
      listCol.appendChild(list);

      this.searchEl = search;
      this.listEl = list;

      search.addEventListener('input', () => this._renderList(search.value));

      // Détail
      const detailCol = document.createElement('div');
      detailCol.className = 'puzzle-panel';
      layout.appendChild(detailCol);
      this.detailEl = detailCol;

      this._renderList('');
      this._renderDetail(this.openings[0]);
    },

    _renderList(query) {
      query = (query || '').toLowerCase();
      const list = this.listEl;
      list.innerHTML = '';
      const filtered = this.openings.filter(o =>
        !query ||
        o.name.toLowerCase().includes(query) ||
        o.eco.toLowerCase().includes(query) ||
        (o.moves.join(' ').toLowerCase().includes(query)) ||
        (o.ideas && o.ideas.toLowerCase().includes(query))
      );
      if (!filtered.length) {
        list.innerHTML = '<div class="text-muted center p-10">Aucune ouverture trouvée.</div>';
        return;
      }
      filtered.forEach(o => {
        const item = document.createElement('div');
        item.className = 'opening-item' + (this.active && this.active.eco === o.eco && this.active.name === o.name ? ' active' : '');
        item.innerHTML = `
          <div><b>${o.eco}</b> · ${o.name} <span class="badge badge-blue" style="margin-left:6px">${o.side}</span></div>
          <div class="op-eco">${o.moves.length} coups · Difficulté ${'★'.repeat(o.difficulty)}${'☆'.repeat(Math.max(0, 3 - o.difficulty))}</div>
          <div class="op-moves">${o.moves.join(' ')}</div>
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

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="flex justify-between items-start mb-15">
          <div>
            <h2 class="mb-5">${o.eco} — ${o.name}</h2>
            <div><span class="badge badge-blue">${o.side}</span> <span class="badge badge-gold">Difficulté ${o.difficulty}/3</span></div>
          </div>
          <button class="btn btn-cta" id="btnStartPractice">♟ Pratiquer l'ouverture</button>
        </div>
        
        <div class="divider"></div>
        
        <div class="opening-explorer-view">
          <div class="controller" style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <button class="btn btn-sm" id="opPrev">◀</button>
            <span class="badge" id="opStep">0/${o.moves.length}</span>
            <button class="btn btn-sm" id="opNext">▶</button>
            <button class="btn btn-sm" id="opAll">Tout</button>
          </div>
          <div id="opBoard"></div>
          <div class="divider"></div>
          <h3>💡 Idée stratégique</h3>
          <p class="text-secondary mt-10" style="font-size:14px">${o.ideas}</p>
        </div>
      `;
      d.appendChild(card);

      // Mini board replay
      const board = new ChessBoard({
        container: document.getElementById('opBoard'),
        chess: new Chess(),
        interactive: false,
        orientation: 'w'
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
            <div class="coach-avatar">♟️</div>
            <div>
              <div class="font-bold text-accent">Entraîneur d'Ouvertures</div>
              <div style="font-size:11px" class="text-muted">Pratiquez la ligne principale</div>
            </div>
          </div>
          <div class="coach-bubble p-10 mb-10" id="practiceSpeech">
            C'est parti ! Jouez le premier coup de l'ouverture : <b>${opening.name}</b>.
          </div>
          <div class="coach-feedback p-10" id="practiceFeedback" style="display:none;font-size:13px;border-radius:6px"></div>
        </div>
        <div class="card mb-15">
          <h3 class="mb-10">${opening.name}</h3>
          <div class="op-moves-progress" id="opMovesProgress"></div>
        </div>
        <button class="btn btn-sm btn-block" id="btnStopPractice">← Retour à l'explorateur</button>
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

      const board = new ChessBoard({
        container: bWrap,
        chess: chess,
        interactive: true,
        orientation: 'w',
        onMove: (move) => {
          const expected = opening.moves[currentStep];
          if (move.san === expected) {
            currentStep++;
            updateProgress();
            if (window.Sound) Sound.playSuccess();
            
            if (currentStep < opening.moves.length) {
              speechEl.innerHTML = `Excellent ! Prochain coup : <b>${opening.moves[currentStep]}</b>.`;
              feedbackEl.style.display = 'none';
            } else {
              speechEl.innerHTML = `Félicitations ! Vous avez maîtrisé la ligne principale de l'ouverture : <b>${opening.name}</b>.`;
              feedbackEl.style.display = 'block';
              feedbackEl.className = 'coach-feedback success';
              feedbackEl.innerHTML = '✔ Ouverture complétée ! +25 XP';
              Storage.addXp(25);
              if (window.Sound) Sound.playWin();
            }
          } else {
            if (window.Sound) Sound.playWrong();
            board.flashError(move.to);
            feedbackEl.style.display = 'block';
            feedbackEl.className = 'coach-feedback error';
            feedbackEl.innerHTML = `❌ Ce n'est pas le coup attendu pour cette variante. Le coup correct était <b>${expected}</b>.`;
            
            // Undo move
            setTimeout(() => {
              chess.undo();
              board.render();
            }, 500);
          }
        }
      });

      panel.querySelector('#btnStopPractice').addEventListener('click', () => {
        this._build();
      });
    }
  };

  window.ChessOpeningsModule = window.Openings = Openings;
})();
