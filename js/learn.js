/* ============================================================
   Masterchessis — learn.js
   Cours & Entraînement Interactif Pas-à-Pas (Style Chess.com)
   - Dialogue avec Coach virtuel, consignes interactives
   - Validation coup par coup en temps réel sur l'échiquier
   - Système de 3 étoiles ⭐⭐⭐, XP et déblocage progressif
   ============================================================ */
(function () {
  'use strict';

  const Learn = {
    container: null,
    lessons: [],
    currentLesson: null,
    currentStepIdx: 0,
    chess: null,
    board: null,
    completedSteps: 0,

    async render(container) {
      this.container = container;
      this.lessons = window.LESSONS || [];
      this._renderCatalogue();
    },

    // ==================== 1. CATALOGUE DES LEÇONS ====================
    _renderCatalogue() {
      const c = this.container;
      c.innerHTML = '';

      const doneMap = Storage.getLessons();
      const isGod = Storage.isGodMode();
      const completedCount = Object.values(doneMap).filter(l => l && l.done).length;

      const hero = document.createElement('div');
      hero.className = 'learn-hero mb-25';
      hero.innerHTML = `
        <div class="flex justify-between items-center flex-wrap gap-15">
          <div>
            <h1 class="mb-5">📚 Académie d'Échecs Interactive</h1>
            <p class="text-secondary">Apprenez en jouant les coups sur l'échiquier avec les conseils de votre coach virtuel.</p>
          </div>
          <div class="stat-card" style="min-width:180px">
            <div class="stat-value text-accent font-bold">${completedCount} / ${this.lessons.length}</div>
            <div class="stat-label">Leçons Complétées</div>
          </div>
        </div>
      `;
      c.appendChild(hero);

      // Grouper par niveau
      const levels = ['Débutant', 'Intermédiaire', 'Avancé'];
      levels.forEach(lvl => {
        const lvlLessons = this.lessons.filter(l => l.level === lvl);
        if (!lvlLessons.length) return;

        const section = document.createElement('div');
        section.className = 'learn-level-section mb-25';
        section.innerHTML = `
          <h2 class="mb-15 flex items-center gap-8">
            <span>${lvl === 'Débutant' ? '🌱' : lvl === 'Intermédiaire' ? '⚔️' : '👑'}</span>
            <span>Niveau ${lvl}</span>
          </h2>
          <div class="grid grid-2 gap-15" id="levelGrid_${lvl}"></div>
        `;
        c.appendChild(section);

        const grid = section.querySelector(`#levelGrid_${lvl}`);
        lvlLessons.forEach((l, idx) => {
          const prog = doneMap[l.id];
          const isDone = prog && prog.done;
          const stars = prog ? (prog.stars || 3) : 0;

          // Déblocage progressif : accessible si admin, si première leçon ou si précédente terminée
          const isUnlocked = isGod || idx === 0 || (doneMap[lvlLessons[idx - 1].id] && doneMap[lvlLessons[idx - 1].id].done) || isDone;

          const card = document.createElement('div');
          card.className = `lesson-card-interactive card ${isDone ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`;
          card.innerHTML = `
            <div class="lesson-card-header flex justify-between items-start">
              <div class="lesson-icon-badge">${l.icon}</div>
              <div>
                ${isDone ? `<span class="stars-badge">${'⭐'.repeat(stars)}</span>` : `<span class="badge badge-gold">+${l.xp || 50} XP</span>`}
              </div>
            </div>
            <h3 class="mt-10 mb-5">${l.title}</h3>
            <p class="text-secondary mb-15" style="font-size:13px">${l.summary || l.category}</p>
            <div class="flex justify-between items-center mt-auto">
              <span class="badge ${lvl === 'Débutant' ? 'badge-green' : lvl === 'Intermédiaire' ? 'badge-blue' : 'badge-gold'}">${l.category} · ⏱ ${l.estTime} min</span>
              <button class="btn btn-sm ${isDone ? 'btn-blue' : 'btn-cta'}">${isDone ? 'Revoir ↺' : isUnlocked ? 'Commencer ➔' : '🔒 Verrouillé'}</button>
            </div>
          `;

          if (isUnlocked) {
            card.addEventListener('click', () => this._startInteractiveLesson(l));
          } else {
            card.style.opacity = '0.6';
            card.style.cursor = 'not-allowed';
          }
          grid.appendChild(card);
        });
      });
    },

    // ==================== 2. ENTRAÎNEMENT INTERACTIF (CHESS.COM STYLE) ====================
    _startInteractiveLesson(lesson) {
      this.currentLesson = lesson;
      this.currentStepIdx = 0;
      this.completedSteps = 0;
      this._renderStepView();
    },

    _renderStepView() {
      const c = this.container;
      c.innerHTML = '';

      const lesson = this.currentLesson;
      const step = lesson.steps[this.currentStepIdx];
      if (!step) {
        this._renderLessonVictory();
        return;
      }

      this.chess = new Chess(step.fen);

      const header = document.createElement('div');
      header.className = 'lesson-active-header mb-15 flex justify-between items-center';
      header.innerHTML = `
        <button class="btn btn-sm" id="btnBackToCatalogue">← Quitter la leçon</button>
        <div class="flex items-center gap-10">
          <span class="badge badge-blue">Étape ${this.currentStepIdx + 1} / ${lesson.steps.length}</span>
          <span class="badge badge-gold">${lesson.title}</span>
        </div>
      `;
      c.appendChild(header);

      header.querySelector('#btnBackToCatalogue').addEventListener('click', () => {
        if (confirm('Quitter cette leçon interactive ?')) {
          this._renderCatalogue();
        }
      });

      const layout = document.createElement('div');
      layout.className = 'puzzle-layout';
      c.appendChild(layout);

      // Plateau d'échecs
      const boardCol = document.createElement('div');
      boardCol.className = 'board-col';
      const bWrap = document.createElement('div');
      bWrap.id = 'lessonBoard';
      boardCol.appendChild(bWrap);
      layout.appendChild(boardCol);

      // Panneau du Coach interactif
      const panel = document.createElement('div');
      panel.className = 'puzzle-panel';
      panel.innerHTML = `
        <div class="coach-card card mb-15">
          <div class="flex items-center gap-10 mb-10">
            <div class="coach-avatar">🧙‍♂️</div>
            <div>
              <div class="font-bold text-accent">Coach Masterchess</div>
              <div style="font-size:11px" class="text-muted">Instructeur d'Échecs</div>
            </div>
          </div>
          <div class="coach-bubble p-10 mb-10" id="coachSpeech">
            ${step.coach}
          </div>
          <div class="coach-feedback p-10" id="coachFeedback" style="display:none;font-size:13px;border-radius:6px"></div>
        </div>

        <div class="game-controls flex gap-8">
          <button class="btn btn-sm" id="btnLessonHint">💡 Indice</button>
          <button class="btn btn-sm" id="btnLessonReset">↺ Recommencer l'étape</button>
        </div>
      `;
      layout.appendChild(panel);

      this.feedbackEl = panel.querySelector('#coachFeedback');
      this.speechEl = panel.querySelector('#coachSpeech');

      panel.querySelector('#btnLessonHint').addEventListener('click', () => this._showLessonHint());
      panel.querySelector('#btnLessonReset').addEventListener('click', () => this._renderStepView());

      // Initialiser le plateau
      this.board = new ChessBoard({
        container: bWrap,
        chess: this.chess,
        interactive: true,
        orientation: step.turn || 'w',
        onMove: (move) => this._onPlayerLessonMove(move)
      });
    },

    _onPlayerLessonMove(move) {
      const step = this.currentLesson.steps[this.currentStepIdx];
      const expected = step.solution[0];

      if (move.san === expected) {
        // Coup parfait !
        if (window.Sound) {
          if (move.captured) Sound.playCapture();
          else if (move.san.includes('+') || move.san.includes('#')) Sound.playCheck();
          else Sound.playMove();
          Sound.playSuccess();
        }

        this.completedSteps++;

        if (this.feedbackEl) {
          this.feedbackEl.style.display = 'block';
          this.feedbackEl.className = 'coach-feedback success';
          this.feedbackEl.innerHTML = `
            <div class="font-bold text-accent mb-5">✔ Excellent coup !</div>
            <div>${step.successMsg || 'Objectif validé avec brio.'}</div>
            <button class="btn btn-cta btn-sm mt-10" id="btnNextStep">Étape suivante ➔</button>
          `;
          this.feedbackEl.querySelector('#btnNextStep').addEventListener('click', () => {
            this.currentStepIdx++;
            this._renderStepView();
          });
        }
      } else {
        // Mauvais coup
        if (window.Sound) Sound.playWrong();
        if (move && move.to) this.board.flashError(move.to);

        if (this.feedbackEl) {
          this.feedbackEl.style.display = 'block';
          this.feedbackEl.className = 'coach-feedback error';
          this.feedbackEl.innerHTML = `
            <div class="font-bold text-danger mb-5">❌ Pas tout à fait...</div>
            <div>${step.hint || 'Ce n\'est pas le coup attendu. Réessayez !'}</div>
          `;
        }

        // Réinitialiser la position après une seconde
        setTimeout(() => {
          this.chess = new Chess(step.fen);
          this.board.setChess(this.chess);
          this.board.resetBoard();
        }, 800);
      }
    },

    _showLessonHint() {
      const step = this.currentLesson.steps[this.currentStepIdx];
      if (this.feedbackEl) {
        this.feedbackEl.style.display = 'block';
        this.feedbackEl.className = 'coach-feedback info';
        this.feedbackEl.innerHTML = `💡 <b>Indice du Coach :</b> ${step.hint || 'Cherchez le coup le plus direct.'}`;
      }
    },

    // ==================== 3. ÉCRAN DE VICTOIRE DE LEÇON ====================
    _renderLessonVictory() {
      const c = this.container;
      c.innerHTML = '';

      const lesson = this.currentLesson;
      const stars = 3;
      const xp = lesson.xp || 75;

      Storage.markLessonDone(lesson.id, stars);
      if (window.Sound) Sound.playWin();

      const nextLessonIdx = this.lessons.findIndex(l => l.id === lesson.id) + 1;
      const nextLesson = this.lessons[nextLessonIdx];

      const card = document.createElement('div');
      card.className = 'card center';
      card.style.maxWidth = '550px';
      card.style.margin = '30px auto';
      card.innerHTML = `
        <div class="victory-stars mb-15" style="font-size:36px">⭐ ⭐ ⭐</div>
        <h2 class="mb-10 text-accent">🎉 Leçon Terminée !</h2>
        <h3 class="mb-15">${lesson.title}</h3>
        <p class="text-secondary mb-20">${lesson.summary || 'Vous maîtrisez maintenant tous les concepts clés de cette leçon.'}</p>

        <div class="badge badge-gold mb-25" style="font-size:16px;padding:8px 16px">+${xp} XP Gagnés · Badge débloqué : ${lesson.badge || '🏅 Érudit'}</div>

        <div class="flex gap-10 justify-center">
          ${nextLesson ? `<button class="btn btn-cta" id="btnNextLessonAuto">Leçon Suivante (${nextLesson.title}) ➔</button>` : ''}
          <button class="btn" id="btnBackToCatalogueEnd">Retour aux leçons</button>
        </div>
      `;
      c.appendChild(card);

      if (nextLesson) {
        card.querySelector('#btnNextLessonAuto').addEventListener('click', () => {
          this._startInteractiveLesson(nextLesson);
        });
      }
      card.querySelector('#btnBackToCatalogueEnd').addEventListener('click', () => {
        this._renderCatalogue();
      });
    }
  };

  window.ChessLearn = window.Learn = Learn;
})();
