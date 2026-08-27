/* ============================================================
   Masterchessis — puzzles.js
   Entraîneur de Puzzles Tactiques Avancé & Mode Puzzle Rush
   - Mode Entraîneur Classé avec Elo tactique et filtres de thèmes
   - Mode Puzzle Rush (3 minutes chrono + 3 vies)
   - Effets sonores Web Audio & Gamification (XP, Combos, Streaks 🔥)
   ============================================================ */
(function () {
  'use strict';

  const Puzzles = {
    container: null,
    chess: null,
    board: null,
    puzzle: null,
    index: 0,
    step: 0,
    solved: false,
    wrongCount: 0,
    puzzles: [],
    selectedPuzzles: [],
    currentTheme: 'all',
    mode: 'ranked', // 'ranked' | 'rush'

    // Mode Puzzle Rush
    rush: {
      active: false,
      score: 0,
      lives: 3,
      timeLeft: 180,
      timer: null,
      solvedCount: 0
    },

    // Initialisation
    async render(container) {
      this.container = container;
      this.puzzles = window.PUZZLES || [];
      this.mode = 'ranked';
      this._buildLayout();
    },

    _buildLayout() {
      const c = this.container;
      c.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.className = 'puzzle-wrapper';
      wrap.innerHTML = `
        <div class="puzzle-header-tabs mb-20 flex gap-10 justify-center">
          <button class="btn ${this.mode === 'ranked' ? 'btn-cta' : ''}" id="tabRanked">♟️ Entraîneur Classé</button>
          <button class="btn ${this.mode === 'rush' ? 'btn-cta' : 'btn-blue'}" id="tabRush">⚡ Puzzle Rush (3 min)</button>
        </div>
        <div id="puzzleViewRoot"></div>
      `;
      c.appendChild(wrap);

      wrap.querySelector('#tabRanked').addEventListener('click', () => {
        this.mode = 'ranked';
        this._stopRush();
        this._buildLayout();
        this._renderRankedView();
      });

      wrap.querySelector('#tabRush').addEventListener('click', () => {
        this.mode = 'rush';
        this._buildLayout();
        this._renderRushView();
      });

      if (this.mode === 'ranked') this._renderRankedView();
      else this._renderRushView();
    },

    // ==================== 1. MODE ENTRAÎNEUR CLASSÉ ====================
    _renderRankedView() {
      const host = document.getElementById('puzzleViewRoot');
      if (!host) return;
      host.innerHTML = '';

      const layout = document.createElement('div');
      layout.className = 'puzzle-layout';
      host.appendChild(layout);

      // Plateau
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'puzzleBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      // Panneau latéral
      const panel = document.createElement('div');
      panel.className = 'puzzle-panel';
      layout.appendChild(panel);

      const elo = Storage.getElo();
      const stats = Storage.getStats();

      // Thèmes disponibles
      const themes = ['all', 'Échec et mat en 1', 'Fourchette', 'Clouage', 'Enfilade', 'Sacrifice de fou en f7', 'Attaque Grecque', 'Finale de pions'];

      panel.innerHTML = `
        <div class="stat-grid mb-15">
          <div class="stat-card center">
            <div class="stat-value text-accent font-bold" id="puzzleElo">${elo.puzzle || 1200}</div>
            <div class="stat-label">Elo Puzzles</div>
          </div>
          <div class="stat-card center">
            <div class="stat-value text-gold font-bold" id="puzzleStreak">${stats.puzzlesStreak || 0} 🔥</div>
            <div class="stat-label">Série active</div>
          </div>
          <div class="stat-card center">
            <div class="stat-value font-bold">${stats.puzzlesBest || 0}</div>
            <div class="stat-label">Meilleure série</div>
          </div>
        </div>

        <div class="form-group mb-10">
          <label style="font-size:12px">Filtrer par thème tactique :</label>
          <select class="input" id="themeSelect">
            ${themes.map(t => `<option value="${t}" ${this.currentTheme === t ? 'selected' : ''}>${t === 'all' ? '🎯 Tous les thèmes tactiques' : t}</option>`).join('')}
          </select>
        </div>

        <div class="game-info mb-15">
          <div class="game-info-title">
            <span id="puzzleTitle">Puzzle</span>
            <span class="badge badge-blue" id="puzzleRatingBadge">Elo ?</span>
          </div>
          <div class="text-secondary mt-5" id="puzzleInstruction" style="font-size:13px">Trouvez le meilleur coup.</div>
        </div>

        <div class="game-controls mb-15 flex gap-8">
          <button class="btn btn-sm" id="btnHint">💡 Indice</button>
          <button class="btn btn-sm" id="btnSolution">Voir solution</button>
          <button class="btn btn-sm" id="btnSkip">Passer ➔</button>
        </div>

        <div class="puzzle-result-box" id="puzzleFeedback" style="display:none"></div>
      `;

      this.feedbackEl = panel.querySelector('#puzzleFeedback');
      this.instructionEl = panel.querySelector('#puzzleInstruction');
      this.titleEl = panel.querySelector('#puzzleTitle');
      this.ratingBadgeEl = panel.querySelector('#puzzleRatingBadge');

      panel.querySelector('#themeSelect').addEventListener('change', (e) => {
        this.currentTheme = e.target.value;
        this._filterAndStart();
      });

      panel.querySelector('#btnHint').addEventListener('click', () => this._giveHint());
      panel.querySelector('#btnSolution').addEventListener('click', () => this._revealSolution());
      panel.querySelector('#btnSkip').addEventListener('click', () => this._nextPuzzle());

      this._filterAndStart();
    },

    _filterAndStart() {
      let list = this.puzzles.slice();
      if (this.currentTheme !== 'all') {
        list = list.filter(p => p.theme === this.currentTheme);
      }
      if (!list.length) list = this.puzzles.slice();

      // Trier autour du Elo tactique actuel
      const elo = Storage.getElo().puzzle || 1200;
      this.selectedPuzzles = list.sort((a, b) => Math.abs(a.rating - elo) - Math.abs(b.rating - elo));
      this.index = 0;
      this._loadPuzzle(0);
    },

    _loadPuzzle(idx) {
      // Vérification du quota Pro pour les puzzles
      if (!Storage.isPro()) {
        const count = Storage.getDailyPuzzleCount();
        if (count >= 5) {
          if (this.feedbackEl) {
            this.feedbackEl.style.display = 'block';
            this.feedbackEl.className = 'puzzle-result-box info';
            this.feedbackEl.innerHTML = `
              <div class="center p-10">
                <div class="font-bold mb-10">🚀 Limite quotidienne atteinte (5/5)</div>
                <p style="font-size:12px" class="mb-10">Passez à Masterchessis <span class="text-accent">Pro</span> pour des puzzles illimités !</p>
                <button class="btn btn-cta btn-sm" onclick="app.showProModal()">Devenir Pro 💎</button>
              </div>
            `;
          }
          // Bloquer le chargement du plateau
          const boardContainer = document.getElementById('puzzleBoard');
          if (boardContainer) boardContainer.innerHTML = '<div class="center p-40 text-muted">Limite de puzzles gratuite atteinte.<br><br><button class="btn btn-cta" onclick="app.showProModal()">Débloquer avec Pro 💎</button></div>';
          return;
        }
        Storage.incrementDailyPuzzleCount();
      }

      this.index = idx % this.selectedPuzzles.length;
      const p = this.selectedPuzzles[this.index];
      if (!p) return;

      this.puzzle = p;
      this.step = 0;
      this.solved = false;
      this.wrongCount = 0;
      this.chess = new Chess(p.fen);

      if (this.feedbackEl) this.feedbackEl.style.display = 'none';

      if (this.titleEl) this.titleEl.textContent = p.theme;
      if (this.ratingBadgeEl) this.ratingBadgeEl.textContent = `Elo ${p.rating}`;
      if (this.instructionEl) {
        const turnText = this.chess.turn() === 'w' ? '♔ Les Blancs jouent et gagnent' : '♚ Les Noirs jouent et gagnent';
        this.instructionEl.innerHTML = `<b>${turnText}</b><br>${p.desc || ''}`;
      }

      const boardContainer = document.getElementById('puzzleBoard');
      if (boardContainer) {
        boardContainer.innerHTML = '';
        this.board = new ChessBoard({
          container: boardContainer,
          chess: this.chess,
          interactive: true,
          orientation: this.chess.turn(),
          onMove: (move) => this._onPlayerMove(move)
        });
      }
    },

    _onPlayerMove(move) {
      if (this.solved) return;
      const expected = this.puzzle.solution[this.step];

      if (move.san === expected) {
        // Coup correct
        if (window.Sound) {
          if (move.captured) Sound.playCapture();
          else if (move.san.includes('+') || move.san.includes('#')) Sound.playCheck();
          else Sound.playMove();
        }

        this.step++;

        if (this.step >= this.puzzle.solution.length) {
          this._handleSuccess();
        } else {
          // Jouer la réponse de l'adversaire
          setTimeout(() => {
            if (this.step < this.puzzle.solution.length) {
              const oppMoveSan = this.puzzle.solution[this.step];
              try {
                const m = this.chess.move(oppMoveSan);
                if (m) {
                  this.step++;
                  this.board.highlightLastMove(m.from, m.to);
                  this.board.setChess(this.chess);
                  if (window.Sound) Sound.playMove();
                }
              } catch (e) {}
            }
          }, 350);
        }
      } else {
        // Coup incorrect
        if (window.Sound) Sound.playWrong();
        this._handleError(move);
      }
    },

    _handleSuccess() {
      this.solved = true;
      if (window.Sound) Sound.playSuccess();

      if (this.mode === 'rush') {
        this.rush.score += 1;
        this.rush.solvedCount += 1;
        this._updateRushHUD();
        setTimeout(() => this._loadNextRushPuzzle(), 400);
        return;
      }

      // Gain d'Elo et de stats
      const elo = Storage.getElo();
      const s = Storage.getStats();
      const streak = (s.puzzlesStreak || 0) + 1;
      const eloGain = Math.max(5, Math.round(15 + (this.puzzle.rating - elo.puzzle) * 0.05));

      elo.puzzle = Math.max(100, (elo.puzzle || 1200) + eloGain);
      Storage.setElo(elo);

      Storage.updateStats({
        puzzles: (s.puzzles || 0) + 1,
        puzzlesSolved: (s.puzzlesSolved || 0) + 1,
        puzzlesStreak: streak,
        puzzlesBest: Math.max(s.puzzlesBest || 0, streak)
      });

      Storage.markPuzzleSolved(this.puzzle.id, true);

      // UI Feedback
      if (this.feedbackEl) {
        this.feedbackEl.style.display = 'block';
        this.feedbackEl.className = 'puzzle-result-box success';
        this.feedbackEl.innerHTML = `
          <div class="flex justify-between items-center">
            <div>
              <div class="font-bold text-accent">✔ Bravo ! Puzzle réussi</div>
              <div style="font-size:12px" class="text-secondary">+${eloGain} Elo · +25 XP · Série ${streak} 🔥</div>
            </div>
            <button class="btn btn-cta btn-sm" id="btnNextPuzzleSuccess">Suivant ➔</button>
          </div>
        `;
        this.feedbackEl.querySelector('#btnNextPuzzleSuccess').addEventListener('click', () => this._nextPuzzle());
      }

      // Mettre à jour les compteurs
      const eloEl = document.getElementById('puzzleElo');
      if (eloEl) eloEl.textContent = elo.puzzle;
      const streakEl = document.getElementById('puzzleStreak');
      if (streakEl) streakEl.textContent = `${streak} 🔥`;
    },

    _handleError(move) {
      this.wrongCount++;
      if (move && move.to) this.board.flashError(move.to);

      if (this.mode === 'rush') {
        this.rush.lives -= 1;
        this._updateRushHUD();
        if (this.rush.lives <= 0) {
          this._endRush();
        } else {
          setTimeout(() => this._loadNextRushPuzzle(), 500);
        }
        return;
      }

      const s = Storage.getStats();
      const elo = Storage.getElo();
      const eloLoss = Math.min(12, Math.max(4, Math.round(10 - (this.puzzle.rating - elo.puzzle) * 0.03)));

      if (this.wrongCount >= 2) {
        this.solved = true;
        elo.puzzle = Math.max(100, (elo.puzzle || 1200) - eloLoss);
        Storage.setElo(elo);
        Storage.updateStats({ puzzles: (s.puzzles || 0) + 1, puzzlesStreak: 0 });
        Storage.markPuzzleSolved(this.puzzle.id, false);

        if (this.feedbackEl) {
          this.feedbackEl.style.display = 'block';
          this.feedbackEl.className = 'puzzle-result-box error';
          this.feedbackEl.innerHTML = `
            <div>
              <div class="font-bold text-danger">❌ Échec du puzzle (-${eloLoss} Elo)</div>
              <div style="font-size:12px;margin:4px 0" class="text-secondary">Solution : <b>${this.puzzle.solution.join(' ')}</b></div>
              <button class="btn btn-sm btn-cta mt-5" id="btnNextPuzzleFail">Puzzle suivant ➔</button>
            </div>
          `;
          this.feedbackEl.querySelector('#btnNextPuzzleFail').addEventListener('click', () => this._nextPuzzle());
        }

        const eloEl = document.getElementById('puzzleElo');
        if (eloEl) eloEl.textContent = elo.puzzle;
        const streakEl = document.getElementById('puzzleStreak');
        if (streakEl) streakEl.textContent = '0 🔥';
      } else {
        if (this.feedbackEl) {
          this.feedbackEl.style.display = 'block';
          this.feedbackEl.className = 'puzzle-result-box error';
          this.feedbackEl.textContent = '❌ Coup imprécis. Réessayez !';
        }
      }
    },

    _giveHint() {
      if (this.step >= this.puzzle.solution.length) return;
      const expected = this.puzzle.solution[this.step];
      const from = expected.slice(0, 2);
      this.board.flashError(from);
      if (this.feedbackEl) {
        this.feedbackEl.style.display = 'block';
        this.feedbackEl.className = 'puzzle-result-box info';
        this.feedbackEl.textContent = `💡 Indice : Observez la pièce sur la case ${from}`;
      }
    },

    _revealSolution() {
      this.solved = true;
      if (this.feedbackEl) {
        this.feedbackEl.style.display = 'block';
        this.feedbackEl.className = 'puzzle-result-box info';
        this.feedbackEl.innerHTML = `
          <div>
            <div>📚 Solution complète : <b>${this.puzzle.solution.join(' ')}</b></div>
            <button class="btn btn-sm btn-cta mt-5" id="btnNextPuzzleRev">Puzzle suivant ➔</button>
          </div>
        `;
        this.feedbackEl.querySelector('#btnNextPuzzleRev').addEventListener('click', () => this._nextPuzzle());
      }
    },

    _nextPuzzle() {
      this.index++;
      this._loadPuzzle(this.index);
    },

    // ==================== 2. MODE PUZZLE RUSH (3 MIN) ====================
    _renderRushView() {
      const host = document.getElementById('puzzleViewRoot');
      if (!host) return;
      host.innerHTML = '';

      const best = Storage.getRushBest();

      const card = document.createElement('div');
      card.className = 'card center';
      card.style.maxWidth = '600px';
      card.style.margin = '20px auto';
      card.innerHTML = `
        <h2 class="mb-10">⚡ Puzzle Rush — Défi 3 Minutes</h2>
        <p class="text-secondary mb-20">Résolvez un maximum de puzzles tactiques en 3 minutes chrono avec seulement 3 vies !</p>

        <div class="grid grid-2 gap-15 mb-20">
          <div class="stat-card">
            <div class="stat-value text-accent font-bold" style="font-size:28px">${best}</div>
            <div class="stat-label">🏆 Votre Record</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-gold font-bold" style="font-size:28px">3:00</div>
            <div class="stat-label">⏱ Temps Limite</div>
          </div>
        </div>

        <button class="btn btn-cta btn-lg btn-block" id="btnStartRush">🔥 Lancer le Puzzle Rush</button>
      `;
      host.appendChild(card);

      card.querySelector('#btnStartRush').addEventListener('click', () => this._startRushGame());
    },

    _startRushGame() {
      const host = document.getElementById('puzzleViewRoot');
      if (!host) return;
      host.innerHTML = '';

      this.rush = {
        active: true,
        score: 0,
        lives: 3,
        timeLeft: 180,
        timer: null,
        solvedCount: 0
      };

      // Trier puzzles par difficulté croissante
      this.selectedPuzzles = this.puzzles.slice().sort((a, b) => a.rating - b.rating);
      this.index = 0;

      const layout = document.createElement('div');
      layout.className = 'puzzle-layout';
      host.appendChild(layout);

      // Plateau
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'puzzleBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      // HUD Rush
      const panel = document.createElement('div');
      panel.className = 'puzzle-panel';
      panel.innerHTML = `
        <div class="stat-grid mb-15">
          <div class="stat-card center">
            <div class="stat-value text-gold font-bold" id="rushScore" style="font-size:30px">0</div>
            <div class="stat-label">Score</div>
          </div>
          <div class="stat-card center">
            <div class="stat-value text-accent font-bold" id="rushTimer" style="font-size:30px">3:00</div>
            <div class="stat-label">Temps restant</div>
          </div>
          <div class="stat-card center">
            <div class="stat-value" id="rushLives" style="font-size:24px">❤️❤️❤️</div>
            <div class="stat-label">Vies</div>
          </div>
        </div>

        <div class="game-info mb-15">
          <div class="game-info-title">
            <span id="puzzleTitle">Puzzle Rush</span>
            <span class="badge badge-gold" id="puzzleRatingBadge">Niveau 1</span>
          </div>
          <div class="text-secondary mt-5" id="puzzleInstruction" style="font-size:13px">Jouez le meilleur coup !</div>
        </div>

        <button class="btn btn-danger btn-block mt-15" id="btnQuitRush">Quitter le Rush</button>
      `;
      layout.appendChild(panel);

      this.titleEl = panel.querySelector('#puzzleTitle');
      this.ratingBadgeEl = panel.querySelector('#puzzleRatingBadge');
      this.instructionEl = panel.querySelector('#puzzleInstruction');

      panel.querySelector('#btnQuitRush').addEventListener('click', () => {
        if (confirm('Abandonner la session de Puzzle Rush ?')) {
          this._stopRush();
          this._renderRushView();
        }
      });

      // Lancer le timer
      this.rush.timer = setInterval(() => {
        this.rush.timeLeft -= 1;
        this._updateRushHUD();
        if (this.rush.timeLeft <= 0) {
          this._endRush();
        }
      }, 1000);

      this._loadNextRushPuzzle();
    },

    _loadNextRushPuzzle() {
      if (!this.rush.active) return;
      this._loadPuzzle(this.index);
      this.index++;
    },

    _updateRushHUD() {
      const scoreEl = document.getElementById('rushScore');
      if (scoreEl) scoreEl.textContent = this.rush.score;

      const timerEl = document.getElementById('rushTimer');
      if (timerEl) {
        const m = Math.floor(this.rush.timeLeft / 60);
        const s = this.rush.timeLeft % 60;
        timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (this.rush.timeLeft <= 30) timerEl.style.color = 'var(--danger)';
      }

      const livesEl = document.getElementById('rushLives');
      if (livesEl) {
        livesEl.textContent = '❤️'.repeat(Math.max(0, this.rush.lives)) + '🖤'.repeat(Math.max(0, 3 - this.rush.lives));
      }
    },

    _endRush() {
      this._stopRush();
      if (window.Sound) Sound.playWin();

      const isNewBest = Storage.saveRushScore(this.rush.score);
      const host = document.getElementById('puzzleViewRoot');
      if (!host) return;

      host.innerHTML = `
        <div class="card center" style="max-width:550px;margin:30px auto">
          <h2>⚡ Session Terminée !</h2>
          <div class="stat-value text-accent my-15" style="font-size:48px;font-weight:800">${this.rush.score}</div>
          <p class="text-secondary mb-15">${isNewBest ? '🎉 Nouveau record personnel battu !' : 'Bel effort ! Continuez à vous entraîner pour battre votre record.'}</p>
          <div class="badge badge-gold mb-20" style="font-size:14px;padding:6px 12px">+${this.rush.score * 20} XP Gagnés</div>
          <div class="flex gap-10 justify-center">
            <button class="btn btn-cta" id="btnReplayRush">Rejouer</button>
            <button class="btn" id="btnBackRush">Menu Puzzles</button>
          </div>
        </div>
      `;

      host.querySelector('#btnReplayRush').addEventListener('click', () => this._startRushGame());
      host.querySelector('#btnBackRush').addEventListener('click', () => this._buildLayout());
    },

    _stopRush() {
      if (this.rush && this.rush.timer) {
        clearInterval(this.rush.timer);
        this.rush.timer = null;
      }
      this.rush.active = false;
    }
  };

  window.ChessPuzzlesModule = window.Puzzles = Puzzles;
})();
