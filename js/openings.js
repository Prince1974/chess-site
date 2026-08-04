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
        <h2>${o.eco} — ${o.name}</h2>
        <div class="mt-10"><span class="badge badge-blue">${o.side}</span> <span class="badge badge-gold">Difficulté ${o.difficulty}/3</span></div>
        <div class="divider"></div>
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
    }
  };

  window.ChessOpeningsModule = window.Openings = Openings;
})();
