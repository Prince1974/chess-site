/* ============================================================
   ChessArena — analyze.js
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

    async render(container) {
      this.container = container;
      this.chess = Engine.newGame();
      this.currentIndex = 0;
      this.fenHistory = [this.chess.fen()];
      this._build();
      this._analyze();
    },

    _build() {
      const c = this.container;
      c.innerHTML = '';
      const layout = document.createElement('div');
      layout.className = 'analyze-layout';
      c.appendChild(layout);

      // Eval bar
      const evalCol = document.createElement('div');
      evalCol.className = 'eval-col';
      const evalBar = document.createElement('div');
      evalBar.className = 'eval-bar';
      evalBar.innerHTML = '<div class="eval-white" id="evalWhite"></div><div class="eval-black" id="evalBlack"></div><div class="eval-text" id="evalText">0.0</div>';
      evalCol.appendChild(evalBar);
      layout.appendChild(evalCol);

      // Board
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'analyzeBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      // Panel
      const panel = document.createElement('div');
      panel.className = 'side-panel';
      layout.appendChild(panel);

      // Controls
      const controls = document.createElement('div');
      controls.className = 'analyze-controls';
      controls.innerHTML = `
        <button class="btn btn-sm" id="aStart">⏮</button>
        <button class="btn btn-sm" id="aPrev">◀</button>
        <button class="btn btn-sm" id="aNext">▶</button>
        <button class="btn btn-sm" id="aEnd">⏭</button>
        <button class="btn btn-sm" id="aFlip">⇄</button>
        <button class="btn btn-sm" id="aAuto">Auto</button>
      `;
      panel.appendChild(controls);

      // Engine status
      const status = document.createElement('div');
      status.className = 'engine-status';
      status.id = 'engineStatus';
      status.textContent = 'Initialisation du moteur…';
      panel.appendChild(status);

      // Best move
      const best = document.createElement('div');
      best.className = 'game-info';
      best.innerHTML = '<div class="game-info-title"><span>Meilleur coup</span></div><div id="bestMove" style="font-size:20px;font-weight:800;color:var(--accent)">—</div>';
      panel.appendChild(best);

      // Move list
      const mv = document.createElement('div');
      mv.className = 'game-info';
      mv.innerHTML = '<div class="game-info-title"><span>Coups</span></div><div class="move-list" id="aMoveList"></div>';
      panel.appendChild(mv);

      // PGN import
      const imp = document.createElement('div');
      imp.className = 'game-info';
      imp.innerHTML = `
        <div class="game-info-title"><span>Importer une partie</span></div>
        <textarea class="textarea" id="pgnInput" rows="3" placeholder="Collez un PGN ici…"></textarea>
        <button class="btn btn-sm btn-block mt-10" id="pgnLoad">Charger</button>
      `;
      panel.appendChild(imp);

      this.evalBar = document.getElementById('evalWhite');
      this.evalText = document.getElementById('evalText');
      this.statusEl = document.getElementById('engineStatus');
      this.bestMoveEl = document.getElementById('bestMove');
      this.moveListEl = document.getElementById('aMoveList');

      // Board
      this.board = new ChessBoard({
        container: document.getElementById('analyzeBoard'),
        chess: this.chess,
        interactive: false,
        orientation: 'w'
      });

      this._renderMoveList();

      // Bind controls
      controls.querySelector('#aStart').addEventListener('click', () => this._goto(0));
      controls.querySelector('#aPrev').addEventListener('click', () => this._goto(this.currentIndex - 1));
      controls.querySelector('#aNext').addEventListener('click', () => this._goto(this.currentIndex + 1));
      controls.querySelector('#aEnd').addEventListener('click', () => this._goto(this.fenHistory.length - 1));
      controls.querySelector('#aFlip').addEventListener('click', () => this.board.flip());
      controls.querySelector('#aAuto').addEventListener('click', () => this._autoPlay());
      document.getElementById('pgnLoad').addEventListener('click', () => this._loadPgn());
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
        const hist = this.chess.history({ verbose: true });
        const last = hist[hist.length - 1];
        if (last) this.board.highlightLastMove(last.from, last.to);
      }
    },

    _renderMoveList() {
      if (!this.moveListEl) return;
      this.moveListEl.innerHTML = '';
      const hist = this.chess.history();
      const rows = [];
      for (let i = 0; i < hist.length; i += 2) {
        const row = document.createElement('div');
        row.className = 'move-row';
        const num = document.createElement('span');
        num.className = 'move-num';
        num.textContent = (i / 2 + 1) + '.';
        row.appendChild(num);
        const w = document.createElement('span');
        w.className = 'move-san' + (i === this.currentIndex - 1 ? ' current' : '');
        w.textContent = hist[i];
        row.appendChild(w);
        if (hist[i + 1]) {
          const b = document.createElement('span');
          b.className = 'move-san' + (i + 1 === this.currentIndex - 1 ? ' current' : '');
          b.textContent = hist[i + 1];
          row.appendChild(b);
        }
        rows.push(row);
      }
      rows.forEach(r => this.moveListEl.appendChild(r));
    },

    _analyze() {
      if (this.analyzing) return;
      this.analyzing = true;
      this.statusEl.textContent = 'Analyse en cours…';
      this.statusEl.className = 'engine-status think';
      const fen = this.chess.fen();
      Engine.analyze(fen, { depth: 12, onInfo: (info) => this._onInfo(info) })
        .then((res) => {
          this.analyzing = false;
          if (res && res.bestMove) {
            this.bestMoveEl.textContent = res.bestMove;
          }
          this.statusEl.textContent = 'Moteur prêt';
          this.statusEl.className = 'engine-status';
        })
        .catch(() => {
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
      if (this.evalBar) this.evalBar.style.height = whitePct + '%';
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
