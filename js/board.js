/* ============================================================
   Masterchessis — board.js
   Plateau interactif : rendu 8x8, pièces unicode, coordonnées,
   sélection, mouvements, animation, promotion, DRAG & DROP
   ============================================================ */
(function () {
  'use strict';

  const PieceUnicode = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  class ChessBoard {
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
      this.lastMove = null;
      this.checkSquare = null;
      this.pendingPromotion = null;

      // --- État du drag & drop ---
      this.dragging = false;
      this.dragData = null; // { from, piece, color, type, element, clone }
      this.ghostElement = null; // clone de la pièce qui suit la souris
      this.dropTarget = null; // case de destination survolée

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

    // ---- Événements souris et tactiles ----
    _attachEvents() {
      // Clic (conservé pour rétrocompatibilité)
      this.container.addEventListener('click', (e) => {
        const cell = e.target.closest('.square');
        if (!cell) return;
        const sq = cell.dataset.square;
        // Ne pas traiter un clic pendant un drag
        if (this.dragging) return;
        this._handleClick(sq);
      });

      // Événements de souris pour le drag
      this.container.addEventListener('mousedown', (e) => {
        const cell = e.target.closest('.square');
        if (!cell) return;
        const sq = cell.dataset.square;
        this._onPointerDown(e, sq, 'mouse');
      });

      // Mouvement de la souris (suivi du ghost)
      document.addEventListener('mousemove', (e) => {
        if (!this.dragging) return;
        e.preventDefault();
        this._onPointerMove(e.clientX, e.clientY);
      });

      document.addEventListener('mouseup', (e) => {
        if (!this.dragging) return;
        this._onPointerUp(e.clientX, e.clientY);
      });

      // Événements tactiles
      this.container.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const cell = target?.closest('.square');
        if (!cell) return;
        const sq = cell.dataset.square;
        // Simuler un pointer down
        this._onPointerDown(e, sq, 'touch');
      }, { passive: false });

      document.addEventListener('touchmove', (e) => {
        if (!this.dragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        this._onPointerMove(touch.clientX, touch.clientY);
      }, { passive: false });

      document.addEventListener('touchend', (e) => {
        if (!this.dragging) return;
        const touch = e.changedTouches[0];
        this._onPointerUp(touch.clientX, touch.clientY);
        e.preventDefault();
      }, { passive: false });
    }

    // ---- Gestion du drag ----
    _onPointerDown(e, sq, type) {
      if (this.pendingPromotion) return;
      if (this.chess.isGameOver()) return;
      const piece = this.chess.get(sq);
      if (!piece || piece.color !== this.chess.turn()) return;

      // On commence le drag
      this.dragging = true;
      this.dragData = { from: sq, piece };
      // Créer le ghost
      const cell = this.squares[sq];
      const pieceEl = cell?.querySelector('.piece');
      if (!pieceEl) {
        // Pas de pièce affichée, annuler
        this.dragging = false;
        return;
      }
      // Créer un clone du span de la pièce
      const clone = pieceEl.cloneNode(true);
      const rect = pieceEl.getBoundingClientRect();
      
      clone.style.position = 'fixed';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '1000';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.fontSize = window.getComputedStyle(pieceEl).fontSize;
      clone.style.display = 'flex';
      clone.style.alignItems = 'center';
      clone.style.justifyContent = 'center';
      clone.style.transform = 'translate(-50%, -50%)';
      clone.style.transition = 'none';
      clone.style.opacity = '0.9';
      document.body.appendChild(clone);
      this.ghostElement = clone;

      // Masquer la pièce originale (pour l'instant)
      pieceEl.style.visibility = 'hidden';

      // On sélectionne la case (pour afficher les coups légaux)
      this.selected = sq;
      this._computeLegalTargets(sq);
      this.render();
      if (this.onSelect) this.onSelect(sq, this.legalTargets);

      // Mettre à jour la position du ghost
      const ev = type === 'mouse' ? e : e.touches[0];
      if (ev) {
        this._updateGhostPosition(ev.clientX, ev.clientY);
      }
    }

    _updateGhostPosition(clientX, clientY) {
      if (!this.ghostElement) return;
      this.ghostElement.style.left = clientX + 'px';
      this.ghostElement.style.top = clientY + 'px';
    }

    _onPointerMove(clientX, clientY) {
      this._updateGhostPosition(clientX, clientY);
      // Calculer la case survolée
      const el = document.elementFromPoint(clientX, clientY);
      const cell = el?.closest('.square');
      const sq = cell?.dataset.square;
      this.dropTarget = sq || null;
      // Mettre en évidence visuelle (optionnel)
      if (sq) {
        // On peut surligner la case survolée si c'est une cible légale
        // (on le fait via render)
        this.render();
        // Ajouter une classe temporaire pour le survol
        const targetCell = this.squares[sq];
        if (targetCell) {
          targetCell.classList.add('hover');
        }
      }
    }

    _onPointerUp(clientX, clientY) {
      // Nettoyer ghost
      if (this.ghostElement) {
        this.ghostElement.remove();
        this.ghostElement = null;
      }

      // Restaurer la visibilité de la pièce d'origine
      if (this.dragData) {
        const from = this.dragData.from;
        const cell = this.squares[from];
        const pieceEl = cell?.querySelector('.piece');
        if (pieceEl) pieceEl.style.visibility = 'visible';
      }

      // Déterminer la case de drop
      let target = this.dropTarget;
      if (!target) {
        // Si aucun survol, on essaie de déterminer la case sous le pointeur
        const el = document.elementFromPoint(clientX, clientY);
        const cell = el?.closest('.square');
        target = cell?.dataset.square || null;
      }

      // Exécuter le mouvement si la case est légale
      const from = this.dragData?.from;
      if (from && target && this.legalTargets.has(target)) {
        this._tryMove(from, target);
      } else {
        // Snapback : on remet la pièce (déjà visible) et on efface la sélection
        this.clearSelection();
        this.render();
      }

      // Nettoyer l'état du drag
      this.dragging = false;
      this.dragData = null;
      this.dropTarget = null;
      this.render(); // pour supprimer les surlignages
    }

    // ---- Clic (hérité) ----
    _handleClick(sq) {
      if (this.chess.isGameOver()) return;
      const piece = this.chess.get(sq);

      if (this.pendingPromotion) return;

      if (piece && piece.color === this.chess.turn()) {
        this.selected = sq;
        this._computeLegalTargets(sq);
        this.render();
        if (this.onSelect) this.onSelect(sq, this.legalTargets);
        return;
      }

      if (this.selected && this.legalTargets.has(sq)) {
        const from = this.selected;
        this._tryMove(from, sq);
        return;
      }

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

      if (isPromotion) {
        this.pendingPromotion = { from, to, color: piece.color };
        this._showPromotionBar(from, to, piece.color);
        return;
      }

      this._executeMove(from, to, 'q');
    }

    _showPromotionBar(from, to, color) {
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
      cell.classList.remove('selected', 'move-target', 'capturable', 'last-move-from', 'last-move-to', 'check', 'hint', 'hover');

      const piece = this.chess.get(sq);

      if (this.lastMove) {
        if (this.lastMove.from === sq) cell.classList.add('last-move-from');
        if (this.lastMove.to === sq) cell.classList.add('last-move-to');
      }

      if (this.checkSquare === sq) cell.classList.add('check');

      if (this.selected === sq) {
        cell.classList.add('selected');
      }
      if (this.selected && this.legalTargets.has(sq)) {
        if (piece) cell.classList.add('capturable');
        else cell.classList.add('move-target');
      }

      // Survol (hover) pendant le drag
      if (this.dragging && this.dropTarget === sq && this.legalTargets.has(sq)) {
        cell.classList.add('hover');
      }

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
      for (const rank of ranks) {
        for (const file of files) {
          this._renderSquare(file + rank);
        }
      }
    }

    makeMove(move) {
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
