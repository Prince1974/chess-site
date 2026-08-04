/* ============================================================
   Masterchessis — game.js
   Modes de jeu : vs IA, hot-seat, en ligne, horloges, liste
   des coups, détection de fin, sauvegarde historique
   ============================================================ */
(function () {
  'use strict';

  const Game = {
    mode: 'ai',           // 'ai' | 'hot' | 'online'
    chess: null,
    board: null,
    container: null,
    settings: { level: 5, time: 10, increment: 0, color: 'w' },
    playerColor: 'w',
    aiThinking: false,
    gameOver: false,
    clock: { w: null, b: null, active: null, timer: null },
    moveList: [],
    online: null, // gestionnaire online.js
    onStatusChange: null,
    onClockChange: null,
    onMoveListChange: null,
    captured: { w: [], b: [] },
    result: null,

    // ---------- Initialisation ----------
    create(cfg) {
      this.container = cfg.container;
      this.settings = Object.assign({}, this.settings, cfg.settings || {});
      this.mode = cfg.mode || 'ai';
      if (this.mode === 'online') {
        this.online = cfg.online;
        this.playerColor = this.online ? this.online.myColor : 'w';
      } else {
        this.playerColor = (this.mode === 'ai') ? this.settings.color : 'w';
      }

      this.chess = Engine.newGame();
      this.gameOver = false;
      this.result = null;
      this.moveList = [];
      this.captured = { w: [], b: [] };
      this.aiThinking = false;

      this._initClock();
      this._buildUI();
      this._bindBoard();
      this._startClocks();

      // IA commence si elle joue les blancs
      if (this.mode === 'ai' && this.playerColor === 'b') {
        setTimeout(() => this.aiMove(), 600);
      }
      return this;
    },

    // ---------- Horloge ----------
    _initClock() {
      const t = this.settings.time;
      this.clock = {
        w: { total: t * 60, inc: this.settings.increment || 0 },
        b: { total: t * 60, inc: this.settings.increment || 0 },
        active: null,
        timer: null
      };
    },

    _startClocks() {
      this.stopClock();
      const turn = this.chess.turn();
      this.clock.active = turn;
      this._tick();
      this.clock.timer = setInterval(() => this._tick(), 200);
    },

    _tick() {
      if (this.gameOver || !this.clock.active) return;
      const c = this.clock[this.clock.active];
      c.total -= 0.2;
      if (c.total <= 0) {
        c.total = 0;
        this._timeout(this.clock.active);
      }
      if (this.onClockChange) this.onClockChange(this.clock);
    },

    stopClock() {
      if (this.clock.timer) { clearInterval(this.clock.timer); this.clock.timer = null; }
      this.clock.active = null;
    },

    _timeout(color) {
      this._endGame({
        result: color === 'w' ? '0-1' : '1-0',
        reason: 'Temps écoulé'
      });
    },

    _switchTurn() {
      const turn = this.chess.turn();
      this.clock.active = turn;
      // incrément
      const prev = turn === 'w' ? 'b' : 'w';
      this.clock[prev].total += this.clock[prev].inc;
      if (this.onClockChange) this.onClockChange(this.clock);
    },

    // ---------- UI ----------
    _buildUI() {
      this.container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'board-wrap';
      this.container.appendChild(wrap);

      // Board
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bContainer = document.createElement('div');
      bContainer.id = 'boardContainer';
      boardCol.appendChild(bContainer);
      wrap.appendChild(boardCol);

      // Side panel
      const side = document.createElement('div');
      side.className = 'side-panel';
      this.sidePanel = side;
      wrap.appendChild(side);

      this.boardContainer = bContainer;
      this.board = new ChessBoard({
        container: bContainer,
        chess: this.chess,
        interactive: true,
        orientation: this.playerColor,
        onMove: (move) => this._onPlayerMove(move)
      });

      this._renderSidePanel();
    },

    _renderSidePanel() {
      const s = this.sidePanel;
      s.innerHTML = '';
      const names = this._playerNames();
      const ratings = this._playerRatings();

      // Player cards + clocks (keys w/b selon la couleur réelle)
      const topClockKey = this.playerColor === 'w' ? 'b' : 'w';
      const bottomClockKey = this.playerColor;
      const cardTop = this._playerCard(names.top, ratings.top, topClockKey);
      const status = document.createElement('div');
      status.className = 'status-banner';
      status.id = 'gameStatus';
      status.textContent = 'Partie en cours';
      this.statusBanner = status;
      const cardBottom = this._playerCard(names.bottom, ratings.bottom, bottomClockKey);
      s.appendChild(cardTop);
      s.appendChild(status);
      s.appendChild(cardBottom);

      // Game info / move list
      const info = document.createElement('div');
      info.className = 'game-info';
      info.innerHTML = '<div class="game-info-title"><span>Coups</span><span class="badge">' + this._modeLabel() + '</span></div>';
      const ml = document.createElement('div');
      ml.className = 'move-list';
      ml.id = 'moveList';
      info.appendChild(ml);
      s.appendChild(info);

      // Controls
      const controls = document.createElement('div');
      controls.className = 'game-controls';
      controls.innerHTML = `
        <button class="btn btn-sm" id="btnUndo">↩ Annuler</button>
        <button class="btn btn-sm" id="btnResign">Éd. défaite</button>
        <button class="btn btn-sm" id="btnDraw" title="Proposer nulle">½</button>
        <button class="btn btn-sm" id="btnNew">Nouvelle</button>
        <button class="btn btn-sm" id="btnFlip">⇄</button>
      `;
      s.appendChild(controls);

      this.moveListEl = ml;
      this._bindControls();
    },

    _playerCard(name, rating, clockKey) {
      const card = document.createElement('div');
      card.className = 'player-card';
      const letter = (name || '?').charAt(0).toUpperCase();
      card.innerHTML = `
        <div class="avatar">${letter}</div>
        <div class="player-meta">
          <div class="player-name">${name}</div>
          <div class="player-rating">${rating}</div>
        </div>
        <div class="clock" data-clock="${clockKey}">--:--</div>
      `;
      return card;
    },

    _playerNames() {
      if (this.mode === 'ai') {
        return this.playerColor === 'w'
          ? { top: 'Stockfish', bottom: this._profileName() }
          : { top: this._profileName(), bottom: 'Stockfish' };
      }
      if (this.mode === 'online') {
        const me = this._profileName();
        const opp = this.online ? this.online.opponentName : 'Adversaire';
        return this.playerColor === 'w'
          ? { top: opp, bottom: me }
          : { top: me, bottom: opp };
      }
      return { top: 'Joueur 1', bottom: 'Joueur 2' };
    },

    _playerRatings() {
      if (this.mode === 'ai') {
        const levels = { 1: 200, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400, 8: 1600, 9: 1800, 10: 2000 };
        return this.playerColor === 'w'
          ? { top: 'Stockfish ' + (levels[this.settings.level] || 1200), bottom: this._eloRating() }
          : { top: this._eloRating(), bottom: 'Stockfish ' + (levels[this.settings.level] || 1200) };
      }
      if (this.mode === 'online') {
        const me = this._eloRating();
        const opp = this.online ? (this.online.opponentRating || '?') : '?';
        return this.playerColor === 'w' ? { top: opp, bottom: me } : { top: me, bottom: opp };
      }
      return { top: '—', bottom: '—' };
    },

    _profileName() {
      const p = Storage.getProfile();
      return p.name || 'Invité';
    },

    _eloRating() {
      const elo = Storage.getElo();
      return elo.rapid || 1200;
    },

    _modeLabel() {
      const labels = { ai: 'vs IA', hot: 'Local ×2', online: 'En ligne' };
      return labels[this.mode] || this.mode;
    },

    _bindControls() {
      const undo = this.sidePanel.querySelector('#btnUndo');
      const resign = this.sidePanel.querySelector('#btnResign');
      const draw = this.sidePanel.querySelector('#btnDraw');
      const newBtn = this.sidePanel.querySelector('#btnNew');
      const flip = this.sidePanel.querySelector('#btnFlip');

      undo.addEventListener('click', () => this.undoMove());
      resign.addEventListener('click', () => this._resign());
      draw.addEventListener('click', () => this._offerDraw());
      newBtn.addEventListener('click', () => this._newGame());
      flip.addEventListener('click', () => this.board.flip());
    },

    _bindBoard() {
      // interactions gérées par ChessBoard
    },

    // ---------- Mouvements ----------
    _onPlayerMove(move) {
      if (this.gameOver) return;

      // En mode online : n'autoriser que le camp du joueur
      if (this.mode === 'online' && move.color !== this.playerColor) return;
      // En mode IA : n'autoriser que le camp du joueur
      if (this.mode === 'ai' && move.color !== this.playerColor) return;

      this._postMove(move);
    },

    _postMove(move) {
      this.moveList.push(move.san);
      this._trackCaptured(move);
      this._renderMoveList();
      this._switchTurn();
      if (this._checkEnd()) return;

      if (this.mode === 'ai' && this.chess.turn() !== this.playerColor) {
        this.aiMove();
      }
    },

    _trackCaptured(move) {
      if (move.captured) {
        const capturedBy = move.color;
        this.captured[capturedBy].push(move.captured);
      }
    },

    aiMove() {
      if (this.gameOver || this.aiThinking) return;
      this.aiThinking = true;
      this.statusBanner.textContent = 'Stockfish réfléchit…';
      Engine.getBestMove(this.chess.fen(), { level: this.settings.level })
        .then((move) => {
          this.aiThinking = false;
          if (this.gameOver) return;
          if (!move) { this._checkEnd(); return; }
          let m;
          try { m = this.chess.move(move); } catch (e) { m = null; }
          if (m) {
            this.board.highlightLastMove(m.from, m.to);
            this.moveList.push(m.san);
            this._trackCaptured(m);
            this._renderMoveList();
            this._switchTurn();
            this.statusBanner.textContent = 'À vous de jouer';
            this._checkEnd();
          }
        });
    },

    undoMove() {
      if (this.mode === 'ai') {
        // annuler 2 demis-coups si l'IA a joué
        this.chess.undo();
        if (this.moveList.length) this.moveList.pop();
        this.chess.undo();
        if (this.moveList.length) this.moveList.pop();
      } else {
        this.chess.undo();
        if (this.moveList.length) this.moveList.pop();
      }
      this.gameOver = false;
      this.result = null;
      this._renderMoveList();
      this.board.resetBoard();
      this.board.setChess(this.chess);
      this._startClocks();
      this.statusBanner.textContent = 'Coup annulé';
    },

    _checkEnd() {
      if (this.chess.isCheckmate()) {
        const winner = this.chess.turn() === 'w' ? 'b' : 'w';
        this._endGame({ result: winner === 'w' ? '1-0' : '0-1', reason: 'Échec et mat' });
        return true;
      }
      if (this.chess.isStalemate()) {
        this._endGame({ result: '½-½', reason: 'Pat (stalemate)' });
        return true;
      }
      if (this.chess.isDraw()) {
        this._endGame({ result: '½-½', reason: 'Nulle' });
        return true;
      }
      if (this.chess.isThreefoldRepetition()) {
        this._endGame({ result: '½-½', reason: 'Répétition' });
        return true;
      }
      if (this.chess.isInsufficientMaterial()) {
        this._endGame({ result: '½-½', reason: 'Matériel insuffisant' });
        return true;
      }
      return false;
    },

    _endGame(obj) {
      this.gameOver = true;
      this.result = obj;
      this.stopClock();
      this._renderStatus();
      this._saveResult(obj);
      if (this.onStatusChange) this.onStatusChange(obj);
    },

    _renderStatus() {
      if (!this.result) {
        this.statusBanner.textContent = 'Partie en cours';
        this.statusBanner.className = 'status-banner';
        return;
      }
      const r = this.result;
      let cls = 'draw', txt = r.reason + ' — Nulle';
      if (r.result === '1-0') { cls = 'win'; txt = r.reason + ' — Victoire des Blancs'; }
      else if (r.result === '0-1') { cls = 'lose'; txt = r.reason + ' — Victoire des Noirs'; }
      this.statusBanner.textContent = txt;
      this.statusBanner.className = 'status-banner ' + cls;
    },

    _saveResult(obj) {
      const myColor = this.playerColor;
      const isWin = obj.result === '1-0' ? myColor === 'w' : myColor === 'b';
      const isLoss = obj.result !== '½-½' && !isWin;
      const isDraw = obj.result === '½-½';

      const s = Storage.getStats();
      const patch = { games: s.games + 1 };
      if (this.mode === 'ai') {
        if (isWin) patch.aiWins = s.aiWins + 1;
        else if (isLoss) patch.aiLosses = s.aiLosses + 1;
        else patch.aiDraws = s.aiDraws + 1;
      } else if (this.mode === 'online') {
        if (isWin) patch.onlineWins = s.onlineWins + 1;
        else if (isLoss) patch.onlineLosses = s.onlineLosses + 1;
        else patch.onlineDraws = s.onlineDraws + 1;
      }
      if (isWin) patch.wins = s.wins + 1;
      else if (isLoss) patch.losses = s.losses + 1;
      else patch.draws = s.draws + 1;
      patch.totalMoves = s.totalMoves + this.moveList.length;
      Storage.updateStats(patch);

      // Elo
      const elo = Storage.getElo();
      const delta = isWin ? 10 : isLoss ? -10 : 0;
      elo.rapid = Math.max(100, elo.rapid + delta);
      Storage.setElo(elo);

      Storage.addGame({
        mode: this.mode,
        result: obj.result,
        reason: obj.reason,
        moves: this.moveList.length,
        pgn: this.chess.pgn(),
        opponent: this._playerNames().top,
        color: this.playerColor
      });
    },

    _resign() {
      const resigned = this.chess.turn();
      const winner = resigned === 'w' ? 'b' : 'w';
      this._endGame({ result: winner === 'w' ? '1-0' : '0-1', reason: 'Abandon' });
    },

    _offerDraw() {
      this._endGame({ result: '½-½', reason: 'Nulle par accord' });
    },

    _newGame() {
      this.chess = Engine.newGame();
      this.gameOver = false;
      this.result = null;
      this.moveList = [];
      this.captured = { w: [], b: [] };
      this.aiThinking = false;
      this._initClock();
      this.board.setChess(this.chess);
      this.board.resetBoard();
      this._renderMoveList();
      this._startClocks();
      this.statusBanner.textContent = 'Partie en cours';
      this.statusBanner.className = 'status-banner';
      if (this.mode === 'ai' && this.playerColor === 'b') {
        setTimeout(() => this.aiMove(), 600);
      }
    },

    _renderMoveList() {
      if (!this.moveListEl) return;
      this.moveListEl.innerHTML = '';
      const rows = [];
      for (let i = 0; i < this.moveList.length; i += 2) {
        const row = document.createElement('div');
        row.className = 'move-row';
        const num = document.createElement('span');
        num.className = 'move-num';
        num.textContent = (i / 2 + 1) + '.';
        row.appendChild(num);
        const w = document.createElement('span');
        w.className = 'move-san';
        w.textContent = this.moveList[i];
        row.appendChild(w);
        if (this.moveList[i + 1]) {
          const b = document.createElement('span');
          b.className = 'move-san';
          b.textContent = this.moveList[i + 1];
          row.appendChild(b);
        }
        rows.push(row);
      }
      rows.forEach(r => this.moveListEl.appendChild(r));
      this.moveListEl.scrollTop = this.moveListEl.scrollHeight;
    },

    // Chrono affichage
    updateClockDisplay() {
      const cards = this.sidePanel.querySelectorAll('.clock[data-clock]');
      cards.forEach(c => {
        const key = c.dataset.clock;
        const ck = this.clock[key];
        if (!ck) return;
        const m = Math.floor(ck.total / 60);
        const s = Math.floor(ck.total % 60);
        c.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        c.classList.toggle('active', this.clock.active === key);
        c.classList.toggle('low', ck.total < 30);
      });
    },

    destroy() {
      this.stopClock();
      if (this.online) this.online.disconnect();
    },

    playerColor() { return this.playerColor; }
  };

  window.ChessGame = window.Game = Game;
})();
