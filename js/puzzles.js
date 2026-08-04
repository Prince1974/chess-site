/* ============================================================
   ChessArena — puzzles.js
   Entraîneur de puzzles : sélection, résolution, feedback,
   statistiques, difficulté progressive
   ============================================================ */
(function () {
  'use strict';

  const Puzzles = {
    container: null,
    chess: null,
    board: null,
    puzzle: null,
    index: 0,
    step: 0,          // coup attendu dans la solution
    solved: false,
    wrongCount: 0,
    puzzles: [],
    ratings: [],

    // ---------- Affichage ----------
    async render(container) {
      this.container = container;
      this.puzzles = window.PUZZLES || [];
      const elo = Storage.getElo();
      this.ratings = this._selectPuzzles(elo.puzzle || 1200);
      this.index = 0;
      this._display();
    },

    _selectPuzzles(rating) {
      // Ordre de difficulté autour du rating du joueur
      const sorted = this.puzzles.slice().sort((a, b) =>
        Math.abs(a.rating - rating) - Math.abs(b.rating - rating));
      return sorted.slice(0, 10); // session de 10
    },

    _display() {
      const c = this.container;
      c.innerHTML = '';
      if (!this.puzzles.length) {
        c.innerHTML = '<div class="card center text-muted">Aucun puzzle disponible.</div>';
        return;
      }

      const layout = document.createElement('div');
      layout.className = 'puzzle-layout';
      c.appendChild(layout);

      // Board
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'puzzleBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      // Panel
      const panel = document.createElement('div');
      panel.className = 'puzzle-panel';
      layout.appendChild(panel);

      this._renderPanel(panel);

      this._loadPuzzle(0);
    },

    _renderPanel(panel) {
      const self = this;
      // Stats
      const stats = document.createElement('div');
      stats.className = 'puzzle-stats';
      const s = Storage.getStats();
      stats.innerHTML = `
        <div class="stat-box"><div class="stat-value">${Math.round(s.puzzlesSolved / Math.max(1, s.puzzles) * 100) || 0}%</div><div class="stat-label">Réussite</div></div>
        <div class="stat-box"><div class="stat-value">${s.puzzlesStreak}</div><div class="stat-label">Série</div></div>
        <div class="stat-box"><div class="stat-value">${s.puzzlesBest}</div><div class="stat-label">Record</div></div>
      `;
      panel.appendChild(stats);

      // Info puzzle
      const info = document.createElement('div');
      info.className = 'game-info';
      info.innerHTML = '<div class="game-info-title"><span>Puzzle</span><span class="badge">#' + (this.index + 1) + '/' + this.ratings.length + '</span></div>';
      const desc = document.createElement('div');
      desc.className = 'text-secondary';
      desc.style.fontSize = '13px';
      desc.style.margin = '8px 0';
      desc.id = 'puzzleDesc';
      info.appendChild(desc);
      panel.appendChild(info);

      // Boutons
      const btns = document.createElement('div');
      btns.className = 'game-controls';
      btns.innerHTML = `
        <button class="btn btn-sm" id="btnHint">💡 Indice</button>
        <button class="btn btn-sm" id="btnGiveUp">Voir solution</button>
        <button class="btn btn-sm" id="btnSkip">Passer</button>
      `;
      panel.appendChild(btns);

      // Feedback
      const result = document.createElement('div');
      result.className = 'puzzle-result';
      result.id = 'puzzleResult';
      result.style.display = 'none';
      panel.appendChild(result);

      this.panelEl = panel;
      this.descEl = desc;
      this.resultEl = result;
      this.statsEl = stats;
      this.btns = btns;

      btns.querySelector('#btnHint').addEventListener('click', () => this._giveHint());
      btns.querySelector('#btnGiveUp').addEventListener('click', () => this._revealSolution());
      btns.querySelector('#btnSkip').addEventListener('click', () => this._next());
    },

    _loadPuzzle(idx) {
      this.index = idx;
      const p = this.ratings[idx];
      if (!p) { this._sessionEnd(); return; }
      this.puzzle = p;
      this.chess = Engine.newGame(p.fen);
      this.step = 0;
      this.solved = false;
      this.wrongCount = 0;

      if (this.board) { this.board.setChess(this.chess); }
      else {
        this.board = new ChessBoard({
          container: document.getElementById('puzzleBoard'),
          chess: this.chess,
          interactive: true,
          orientation: this.chess.turn(),
          onMove: (move) => this._onMove(move)
        });
      }
      // Re-sélection de l'élément au cas où
      this.board.container = document.getElementById('puzzleBoard');

      if (this.descEl) {
        this.descEl.innerHTML = `<b>${this.puzzle.theme}</b> — Rating ${this.puzzle.rating}<br>${this.puzzle.desc}`;
      }
      if (this.resultEl) this.resultEl.style.display = 'none';

      // Mise à jour highlight
      const turnLabel = this.chess.turn() === 'w' ? 'Les Blancs jouent' : 'Les Noirs jouent';
      if (this.descEl) this.descEl.innerHTML = `<b>${this.puzzle.theme}</b> — Rating ${this.puzzle.rating}<br>${turnLabel}. ${this.puzzle.desc}`;
    },

    _onMove(move) {
      if (this.solved) return;
      const expected = this.puzzle.solution[this.step];
      // La solution est en coups complets ; on compare la SAN au coup attendu
      if (move.san === expected) {
        this.step++;
        // Si on a atteint la fin de la solution, ou que le mat est fait
        if (this.step >= this.puzzle.solution.length) {
          this._win();
        } else {
          // Le joueur a joué le coup correct, on joue la réponse « adversaire »
          this._playResponse();
        }
      } else {
        this._wrong(move);
      }
    },

    _playResponse() {
      // L'adversaire (dans la solution) joue le prochain coup si c'est son tour
      if (this.step < this.puzzle.solution.length) {
        const expected = this.puzzle.solution[this.step];
        try {
          const m = this.chess.move(expected);
          this.step++;
          if (m) this.board.highlightLastMove(m.from, m.to);
        } catch (e) {}
      }
    },

    _win() {
      this.solved = true;
      const s = Storage.getStats();
      const streak = s.puzzlesStreak + 1;
      Storage.updateStats({
        puzzles: s.puzzles + 1,
        puzzlesSolved: s.puzzlesSolved + 1,
        puzzlesStreak: streak,
        puzzlesBest: Math.max(s.puzzlesBest, streak)
      });
      Storage.markPuzzleSolved(this.puzzle.id, true);

      this.resultEl.style.display = 'block';
      this.resultEl.className = 'puzzle-result correct';
      this.resultEl.innerHTML = '✔ Bravo !<br><button class="btn btn-cta btn-sm mt-10" id="btnNextP">Puzzle suivant</button>';
      this.resultEl.querySelector('#btnNextP').addEventListener('click', () => this._next());

      // Mise à jour stats affichées
      this._updateStatsDisplay();
    },

    _wrong(move) {
      this.wrongCount++;
      this.board.flashError(move.to);
      if (this.wrongCount >= 2) {
        this._lose();
      } else {
        this.resultEl.style.display = 'block';
        this.resultEl.className = 'puzzle-result wrong';
        this.resultEl.textContent = '❌ Incorrect, essayez encore (' + (1) + ')';
      }
    },

    _lose() {
      this.solved = true;
      const s = Storage.getStats();
      Storage.updateStats({
        puzzles: s.puzzles + 1,
        puzzlesStreak: 0
      });
      Storage.markPuzzleSolved(this.puzzle.id, false);

      this.resultEl.style.display = 'block';
      this.resultEl.className = 'puzzle-result wrong';
      this.resultEl.innerHTML = `❌ Raté — Solution : ${this.puzzle.solution.join(' ')}<br><button class="btn btn-cta btn-sm mt-10" id="btnNextL">Puzzle suivant</button>`;
      this.resultEl.querySelector('#btnNextL').addEventListener('click', () => this._next());
      this._updateStatsDisplay();
    },

    _giveHint() {
      if (this.step >= this.puzzle.solution.length) return;
      const hintMove = this.puzzle.solution[this.step];
      const from = hintMove.slice(0, 2);
      this.board.flashError(from);
      this.resultEl.style.display = 'block';
      this.resultEl.className = 'puzzle-result wrong';
      this.resultEl.textContent = '💡 Indice : regardez la case ' + from;
    },

    _revealSolution() {
      this._lose();
      // Surcharge : afficher la solution pour apprendre
      this.resultEl.innerHTML = `📚 Solution : <b>${this.puzzle.solution.join(' ')}</b><br><button class="btn btn-cta btn-sm mt-10" id="btnNextR">Puzzle suivant</button>`;
      const btn = this.resultEl.querySelector('#btnNextR');
      if (btn) btn.addEventListener('click', () => this._next());
    },

    _next() {
      this.index++;
      if (this.index >= this.ratings.length) { this._sessionEnd(); return; }
      this._loadPuzzle(this.index);
    },

    _sessionEnd() {
      this.container.innerHTML = `
        <div class="card center" style="max-width:480px;margin:40px auto">
          <h2>Session terminée !</h2>
          <p class="text-secondary mt-10">Continuez à vous entraîner pour progresser.</p>
          <div class="mt-20">
            <button class="btn btn-cta" id="btnRestart">Recommencer</button>
            <button class="btn" id="btnBackHome">Retour accueil</button>
          </div>
        </div>`;
      this.container.querySelector('#btnRestart').addEventListener('click', () => this.render(this.container));
      this.container.querySelector('#btnBackHome').addEventListener('click', () => app.navigate('home'));
    },

    _updateStatsDisplay() {
      const s = Storage.getStats();
      if (this.statsEl) {
        this.statsEl.innerHTML = `
          <div class="stat-box"><div class="stat-value">${Math.round(s.puzzlesSolved / Math.max(1, s.puzzles) * 100) || 0}%</div><div class="stat-label">Réussite</div></div>
          <div class="stat-box"><div class="stat-value">${s.puzzlesStreak}</div><div class="stat-label">Série</div></div>
          <div class="stat-box"><div class="stat-value">${s.puzzlesBest}</div><div class="stat-label">Record</div></div>
        `;
      }
    }
  };

  window.ChessPuzzlesModule = window.Puzzles = Puzzles;
})();
