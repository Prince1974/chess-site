/* ============================================================
   ChessArena — learn.js
   Cours interactifs : liste des leçons, détail, progression,
   mini-plateau pour les exemples
   ============================================================ */
(function () {
  'use strict';

  const Learn = {
    container: null,
    lessons: [],

    async render(container) {
      this.container = container;
      this.lessons = window.LESSONS || [];
      this._renderList();
    },

    _renderList() {
      const c = this.container;
      c.innerHTML = '';
      const done = Storage.getLessons();
      const h = document.createElement('h1');
      h.textContent = '📚 Apprendre les échecs';
      h.classList.add('center', 'mb-20');
      c.appendChild(h);

      const sub = document.createElement('p');
      sub.className = 'center text-secondary mb-20';
      sub.innerHTML = `Leçons progressives — <b>${Object.values(done).filter(l => l && l.done).length}/${this.lessons.length}</b> complétées`;
      c.appendChild(sub);

      const grid = document.createElement('div');
      grid.className = 'grid grid-2';
      c.appendChild(grid);

      this.lessons.forEach(lesson => {
        const isDone = done[lesson.id] && done[lesson.id].done;
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.innerHTML = `
          <div class="lesson-icon">${lesson.icon}</div>
          <div style="flex:1">
            <h3>${lesson.title}</h3>
            <p>${lesson.category} · ${lesson.estTime} min</p>
            <div class="badge-row">
              <span class="badge badge-blue">${lesson.level}</span>
              ${isDone ? '<span class="badge badge-green">✔ Terminée</span>' : '<span class="badge">À faire</span>'}
            </div>
          </div>
        `;
        card.addEventListener('click', () => this._showLesson(lesson));
        grid.appendChild(card);
      });
    },

    _showLesson(lesson) {
      const c = this.container;
      c.innerHTML = '';
      const detail = document.createElement('div');
      detail.className = 'lesson-detail';
      c.appendChild(detail);

      // Header
      const back = document.createElement('button');
      back.className = 'btn btn-sm';
      back.textContent = '← Retour aux leçons';
      back.addEventListener('click', () => this._renderList());
      detail.appendChild(back);

      const title = document.createElement('h1');
      title.className = 'mt-10 mb-10';
      title.innerHTML = `${lesson.icon} ${lesson.title}`;
      detail.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'mb-20';
      meta.innerHTML = `
        <span class="badge badge-blue">${lesson.level}</span>
        <span class="badge">${lesson.category}</span>
        <span class="badge badge-gold">⏱ ${lesson.estTime} min</span>
      `;
      detail.appendChild(meta);

      // Sections
      lesson.sections.forEach((sec, i) => {
        const s = document.createElement('div');
        s.className = 'lesson-section';
        const h = document.createElement('h3');
        h.textContent = `${i + 1}. ${sec.h}`;
        s.appendChild(h);
        if (sec.p) {
          const p = document.createElement('p');
          p.textContent = sec.p;
          s.appendChild(p);
        }
        if (sec.list) {
          const ul = document.createElement('ul');
          sec.list.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
          });
          s.appendChild(ul);
        }
        // Mini-board si leçon a des coups d'exemple
        if (sec.moves) {
          const mini = document.createElement('div');
          mini.className = 'board-mini card';
          mini.innerHTML = '<div class="game-info-title"><span>Exemple interactif</span></div><div class="btn-row mt-10" style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-sm" data-action="prev">←</button><button class="btn btn-sm" data-action="next">→</button><span class="badge" data-count></span></div>';
          const miniBoard = document.createElement('div');
          mini.appendChild(miniBoard);
          mini.countEl = mini.querySelector('[data-count]');
          const example = new ChessBoard({
            container: miniBoard,
            chess: new Chess(),
            interactive: false,
            orientation: 'w'
          });
          // Rejouer les coups
          const chessMoves = sec.moves;
          let mIdx = 0;
          const applyTo = (delta) => {
            mIdx = Math.max(0, Math.min(chessMoves.length, mIdx + delta));
            const c2 = new Chess();
            for (let k = 0; k < mIdx; k++) {
              try { c2.move(chessMoves[k]); } catch (e) {}
            }
            example.setChess(c2);
            if (mIdx > 0) {
              const hist = c2.history({ verbose: true });
              const last = hist[hist.length - 1];
              if (last) example.highlightLastMove(last.from, last.to);
            }
            mini.countEl.textContent = mIdx + '/' + chessMoves.length;
          };
          mini.querySelector('[data-action="prev"]').addEventListener('click', () => applyTo(-1));
          mini.querySelector('[data-action="next"]').addEventListener('click', () => applyTo(1));
          mini.classList.add('mb-20');
          s.appendChild(mini);
          applyTo(chessMoves.length); // afficher la position finale
        }
        detail.appendChild(s);
      });

      // Nav NEXT / mark complete
      const nav = document.createElement('div');
      nav.className = 'lesson-nav';
      const idx = this.lessons.findIndex(l => l.id === lesson.id);
      const prev = document.createElement('button');
      prev.className = 'btn';
      prev.textContent = '← Leçon précédente';
      prev.disabled = idx <= 0;
      prev.addEventListener('click', () => this._showLesson(this.lessons[idx - 1]));
      nav.appendChild(prev);

      const mark = document.createElement('button');
      mark.className = 'btn btn-cta';
      mark.textContent = '✔ Marquer comme terminée';
      mark.addEventListener('click', () => {
        Storage.markLessonDone(lesson.id);
        window.ChessUI && ChessUI.toast('Leçon terminée !', 'success');
        this._showLesson(lesson);
      });
      nav.appendChild(mark);

      const next = document.createElement('button');
      next.className = 'btn btn-blue';
      next.textContent = 'Leçon suivante →';
      next.disabled = idx >= this.lessons.length - 1;
      if (idx < this.lessons.length - 1) {
        next.addEventListener('click', () => this._showLesson(this.lessons[idx + 1]));
      }
      nav.appendChild(next);
      detail.appendChild(nav);
    }
  };

  window.ChessLearn = window.Learn = Learn;
})();
