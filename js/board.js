/* ============================================================
   ChessArena — board.js
   Plateau interactif : rendu 8x8, pièces unicode, coordonnées,
   sélection, mouvements, animation, promotion
   ============================================================ */
(function () {
  'use strict';

  const PieceUnicode = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  class ChessBoard {
    /**
     * @param {Object} cfg
     *  - container: HTMLElement
     *  - chess: instance chess.js
     *  - interactive (bool)
     *  - orientation ('w'|'b')
     *  - onMove(move) callback
     *  - onSelect(square) callback
     *  - onClearSelect callback
     */
    constructor(cfg) {
      this.container = cfg.container;
      this.chess = cfg.chess;
      this.interactive = cfg.interactive !== false;
      this.orientation = cfg.orientation || 'w';
      this.onMove = cfg.onMove || null;
      this.onSelect = cfg.onSelect || null;
      this.onClearSelect = cfg.onClearSelect || null;
      this.showCoords = cfg.showCoords !== false;
      this.showLegalMoves = cfg.showLegalMoves !== false;
      this.selected = null;
      this.legalTargets = new Set();
      this.lastMove = null; // {from, to}
      this.checkSquare = null;
      this.pendingPromotion = null; // {from, to, color}

      this.flipped = false;
      this._build();
      this.render();
      if (this.interactive) this._attachEvents();
    }

    _build() {
      this.container.classList.add('board-container');
      this.container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'board';
      this.boardEl = wrap;
      this.container.appendChild(wrap);
      this.squares = {};
      const files = 'abcdefgh'.split('');
      const ranks = '87654321'.split('');

      for (const rank of ranks) {
        for (const file of files) {
          const sq = file + rank;
          const cell = document.createElement('div');
          const isLight = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
          cell.className = 'square ' + (isLight ? 'light' : 'dark');
          cell.dataset.square = sq;
          wrap.appendChild(cell);
          if (this.showCoords) {
            // coordonnées
            if (rank === '8') {
              const y = document.createElement('span');
              y.className = 'coord y ' + (isLight ? 'dark-coord' : 'light-coord');
              y.textContent = file;
              cell.appendChild(y);
            }
            if (file === 'a') {
              const x = document.createElement('span');
              x.className = 'coord x ' + (isLight ? 'dark-coord' : 'light-coord');
              x.textContent = rank;
              cell.appendChild(x);
            }
          }
          this.squares[sq] = cell;
        }
      }
    }

    setChess(chess) {
      this.chess = chess;
      this.clearSelection();
      this.lastMove = null;
      this.checkSquare = null;
      this.render();
    }

    setOrientation(o) {
      this.orientation = o;
      this.clearSelection();
      this.render();
    }

    flip() {
      this.flipped = !this.flipped;
      this.clearSelection();
      this._updateBoardClass();
      this.render();
    }

    _updateBoardClass() {
      const o = this.flipped ? (this.orientation === 'w' ? 'b' : 'w') : this.orientation;
      const flip = (o === 'b');
      this.boardEl.classList.toggle('flipped', flip);
    }

    clearSelection() {
      this.selected = null;
      this.legalTargets.clear();
      if (this.onClearSelect) this.onClearSelect();
    }

    _attachEvents() {
      this.container.addEventListener('click', (e) => {
        const cell = e.target.closest('.square');
        if (!cell) return;
        const sq = cell.dataset.square;
        this._handleClick(sq);
      });
    }

    _handleClick(sq) {
      if (this.chess.isGameOver()) return;
      const piece = this.chess.get(sq);

      // Si une promotion est en attente, ignorer
      if (this.pendingPromotion) return;

      // Sélection d'une pièce du camp dont c'est le tour
      if (piece && piece.color === this.chess.turn()) {
        this.selected = sq;
        this._computeLegalTargets(sq);
        this.render();
        if (this.onSelect) this.onSelect(sq, this.legalTargets);
        return;
      }

      // Tente un mouvement vers la case cliquée
      if (this.selected && this.legalTargets.has(sq)) {
        const from = this.selected;
        this._tryMove(from, sq);
        return;
      }

      // Clic sur case vide / pièce adverse sans sélection -> annule
      if (this.selected) {
        this.clearSelection();
        this.render();
      }
    }

    _computeLegalTargets(from) {
      this.legalTargets.clear();
      const moves = this.chess.moves({ square: from, verbose: true });
      moves.forEach(m => this.legalTargets.add(m.to));
    }

    _tryMove(from, to) {
      const piece = this.chess.get(from);
      const isPromotion = piece && piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPromotion && this.pendingPromotion !== null) {
        // déjà en attente -> on choisit la dame par défaut
      }

      if (isPromotion) {
        this.pendingPromotion = { from, to, color: piece.color };
        this._showPromotionBar(from, to, piece.color);
        return;
      }

      this._executeMove(from, to, 'q');
    }

    _showPromotionBar(from, to, color) {
      // Barre de promotion dans le plateau
      if (!this.promotionBarEl) {
        this.promotionBarEl = document.createElement('div');
        this.promotionBarEl.className = 'promo-bar';
        this.boardEl.appendChild(this.promotionBarEl);
      }
      this.promotionBarEl.innerHTML = '';
      const choices = ['q', 'r', 'b', 'n'];
      choices.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'promo-btn';
        btn.textContent = PieceUnicode[color][p];
        btn.addEventListener('click', () => {
          this.promotionBarEl.innerHTML = '';
          this.pendingPromotion = null;
          this._executeMove(from, to, p);
        });
        this.promotionBarEl.appendChild(btn);
      });
    }

    _executeMove(from, to, promotion) {
      this.clearSelection();
      let move = null;
      try {
        move = this.chess.move({ from, to, promotion });
      } catch (err) {
        move = null;
      }
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.checkSquare = null;
        if (this.chess.inCheck()) {
          // trouve le roi en échec
          const turn = this.chess.turn();
          const board = this.chess.board();
          for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
              const p = board[r][f];
              if (p && p.type === 'k' && p.color === turn) {
                this.checkSquare = p.square;
              }
            }
          }
        }
        this.render();
        if (this.onMove) this.onMove(move);
      } else {
        this.render();
      }
    }

    _renderSquare(sq) {
      const cell = this.squares[sq];
      if (!cell) return;
      cell.classList.remove('selected', 'move-target', 'capturable', 'last-move-from', 'last-move-to', 'check', 'hint');

      const piece = this.chess.get(sq);

      // Dernier coup
      if (this.lastMove) {
        if (this.lastMove.from === sq) cell.classList.add('last-move-from');
        if (this.lastMove.to === sq) cell.classList.add('last-move-to');
      }

      // Échec
      if (this.checkSquare === sq) cell.classList.add('check');

      // Sélection & cibles
      if (this.selected === sq) {
        cell.classList.add('selected');
      }
      if (this.selected && this.legalTargets.has(sq)) {
        if (piece) cell.classList.add('capturable');
        else cell.classList.add('move-target');
      }

      // Pièce
      let pieceEl = cell.querySelector('.piece');
      if (piece) {
        if (!pieceEl) {
          pieceEl = document.createElement('div');
          pieceEl.className = 'piece ' + piece.color;
          pieceEl.innerHTML = '<span></span>';
          cell.appendChild(pieceEl);
        }
        pieceEl.className = 'piece ' + piece.color;
        pieceEl.querySelector('span').textContent = PieceUnicode[piece.color][piece.type];
        pieceEl.style.visibility = 'visible';
      } else if (pieceEl) {
        pieceEl.style.visibility = 'hidden';
      }
    }

    render() {
      if (!this.boardEl) return;
      this._updateBoardClass();
      const files = 'abcdefgh'.split('');
      const ranks = '87654321'.split('');
      // Dans l'ordre du DOM, mais l'orientation gère le flip via CSS transform.
      for (const rank of ranks) {
        for (const file of files) {
          this._renderSquare(file + rank);
        }
      }
    }

    // ---- API publique ----
    makeMove(move) {
      // Applique un move déjà joué (par ex. par IA) avec mise à jour
      this.lastMove = { from: move.from, to: move.to };
      this.checkSquare = null;
      this.clearSelection();
      this.render();
    }

    highlightLastMove(from, to) {
      this.lastMove = { from, to };
      this.render();
    }

    highlightCheck(square) {
      this.checkSquare = square;
      this.render();
    }

    flashError(square) {
      const cell = this.squares[square];
      if (!cell) return;
      cell.classList.add('flash-error');
      setTimeout(() => cell.classList.remove('flash-error'), 350);
    }

    resetBoard() {
      this.lastMove = null;
      this.checkSquare = null;
      this.clearSelection();
      this.render();
    }
  }

  window.ChessBoard = ChessBoard;
  window.ChessBoardUnicode = PieceUnicode;
})();
