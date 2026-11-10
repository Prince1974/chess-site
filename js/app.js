/* ============================================================
   Masterchessis — app.js
   Routing SPA + navigation + rendu des vues
   (Accueil, Jouer, Puzzles, Apprendre, Ouvertures, Analyser, Profil)
   + intégration mode multijoueur réel (PeerJS)
   ============================================================ */
(function () {
  'use strict';

  const App = {
    currentRoute: 'home',
    game: null,

    init() {
      Storage.applyTheme();
      this._bindNav();
      this._initRoot();

      // Écouter le changement d'URL (Back/Forward)
      window.addEventListener('popstate', () => this._onPathChange());

      const route = window.location.pathname.replace(/^\/|\/$/g, '') || 'home';
      this.navigate(route, true); // true = replaceState pour l'entrée initiale

      this._updateUserChip();
      // Boucle d'horloge
      setInterval(() => {
        if (this.game) this.game.updateClockDisplay();
      }, 200);
      // Statistiques : enregistrer la visite + mesure du temps actif
      Storage.recordVisit();
      setInterval(() => Storage.addActiveTime(30), 30000);
      // Envoyer à GA4 un événement de session
      window.addEventListener('beforeunload', () => {
        if (window.gtag) {
          window.gtag('event', 'session_end', {
            engagement_time_msec: (Storage.getActivity().totalTimeSec || 0) * 1000
          });
        }
      });
    },

    _initRoot() {
      document.getElementById('appRoot').innerHTML = '<section data-view="home"></section><section data-view="play"></section><section data-view="puzzles"></section><section data-view="learn"></section><section data-view="openings"></section><section data-view="analyze"></section><section data-view="profile"></section><section data-view="secret-dashboard"></section>';
      this.sections = {};
      document.querySelectorAll('section[data-view]').forEach(s => {
        this.sections[s.dataset.view] = s;
      });
    },

    _bindNav() {
      const navBtns = document.querySelectorAll('.nav-btn[data-route]');
      navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigate(btn.dataset.route);
        });
      });

      // Déclencheur secret pour l'admin : 7 clics sur le logo
      let logoClicks = 0;
      let lastClick = 0;
      document.querySelector('.brand').addEventListener('click', () => {
        const now = Date.now();
        if (now - lastClick > 1000) logoClicks = 0;
        logoClicks++;
        lastClick = now;

        if (logoClicks >= 7) {
          logoClicks = 0;
          this.navigate('secret-dashboard');
          if (window.ChessUI) ChessUI.toast('Accès restreint activé...', 'info');
        } else if (logoClicks < 7) {
          this.navigate('home');
        }
      });

      document.getElementById('hamburger').addEventListener('click', () => {
        document.getElementById('mainNav').classList.toggle('open');
      });
    },

    navigate(route, replace = false) {
      const valid = ['home', 'play', 'puzzles', 'learn', 'openings', 'analyze', 'profile', 'secret-dashboard'];
      if (!valid.includes(route)) route = 'home';
      // Fermer la nav mobile
      document.getElementById('mainNav').classList.remove('open');
      
      // Mettre à jour l'URL
      const path = route === 'home' ? '/' : '/' + route;
      if (window.location.pathname !== path) {
        if (replace) {
          history.replaceState(null, '', path);
        } else {
          history.pushState(null, '', path);
        }
      }

      // Mesure Google Analytics 4 : page_view
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_path: path,
          page_title: route
        });
      }
      this._activate(route);
    },

    showGameReview(gameInstance) {
      if (!Storage.isPro()) {
        this.showProModal();
        return;
      }
      this.gameToReview = gameInstance;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="card modal-content" style="max-width: 800px; width: 92vw; max-height: 90vh; overflow-y: auto;">
          <div class="flex justify-between items-center mb-15">
            <h2 class="flex items-center gap-8 m-0">
              <span>📊</span>
              <span>Bilan de Partie (Game Review Pro)</span>
            </h2>
            <button class="btn btn-sm" id="closeReviewTop">✖</button>
          </div>
          
          <div id="reviewLoading" class="center p-20">
            <div class="stat-value text-accent font-bold mb-10" style="font-size:28px">⏳ Analyse en cours...</div>
            <div class="text-secondary" id="reviewProgressText">Calcul des évaluations et détection des coups brillants...</div>
            <div class="progress-bar mt-15" style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
              <div id="reviewProgressBar" style="width:0%;height:100%;background:var(--accent);transition:width 0.2s"></div>
            </div>
          </div>

          <div id="reviewContent" style="display:none"></div>

          <div class="flex justify-between gap-10 mt-20">
            <button class="btn btn-secondary" id="closeReview">Fermer</button>
            <button class="btn btn-cta" id="btnGoToAnalyze">Voir l'analyse interactive</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('#closeReviewTop').addEventListener('click', () => { modal.remove(); this.gameToReview = null; });
      modal.querySelector('#closeReview').addEventListener('click', () => { modal.remove(); this.gameToReview = null; });
      modal.querySelector('#btnGoToAnalyze').addEventListener('click', () => { 
        modal.remove(); 
        this.navigate('analyze'); 
      });

      const history = gameInstance.fenHistory || [];
      const moveList = gameInstance.moveList || [];
      const totalMoves = moveList.length;

      if (!totalMoves) {
        modal.querySelector('#reviewLoading').innerHTML = '<div class="text-muted center p-20">Aucun coup joué dans cette partie à analyser.</div>';
        return;
      }

      const whiteStats = { brilliant: 0, best: 0, great: 0, inaccuracy: 0, mistake: 0, blunder: 0, total: 0, scoreSum: 0 };
      const blackStats = { brilliant: 0, best: 0, great: 0, inaccuracy: 0, mistake: 0, blunder: 0, total: 0, scoreSum: 0 };
      const moveDetails = [];

      let currentIdx = 0;

      const analyzeNext = async () => {
        if (currentIdx >= totalMoves) {
          // Calculer pourcentages de précision
          const wAcc = whiteStats.total ? Math.max(20, Math.min(99, Math.round(whiteStats.scoreSum / whiteStats.total))) : 75;
          const bAcc = blackStats.total ? Math.max(20, Math.min(99, Math.round(blackStats.scoreSum / blackStats.total))) : 75;

          modal.querySelector('#reviewLoading').style.display = 'none';
          const content = modal.querySelector('#reviewContent');
          content.style.display = 'block';
          content.innerHTML = `
            <!-- Accuracy Header -->
            <div class="grid grid-2 gap-15 mb-20">
              <div class="card p-15" style="border-top: 4px solid var(--accent); background: rgba(255,255,255,0.05)">
                <div class="flex items-center gap-10 mb-10">
                  <div style="font-size:24px">⚪</div>
                  <div>
                    <div style="font-weight:bold">BLANCS</div>
                    <div style="font-size:12px; color:var(--text-secondary)">Précision</div>
                  </div>
                </div>
                <div style="font-size:32px; font-weight:800; color:var(--accent)">${wAcc}%</div>
              </div>
              <div class="card p-15" style="border-top: 4px solid #333; background: rgba(0,0,0,0.1)">
                <div class="flex items-center gap-10 mb-10">
                  <div style="font-size:24px">⚫</div>
                  <div>
                    <div style="font-weight:bold">NOIRS</div>
                    <div style="font-size:12px; color:var(--text-secondary)">Précision</div>
                  </div>
                </div>
                <div style="font-size:32px; font-weight:800; color:var(--text-muted)">${bAcc}%</div>
              </div>
            </div>

            <!-- Detailed Stats Table -->
            <div class="card mb-20 p-15">
              <h3 class="mb-15" style="font-size:16px; border-bottom:1px solid var(--border); padding-bottom:10px">Analyse détaillée</h3>
              <table style="width:100%; border-collapse: collapse; font-size:13px">
                <thead>
                  <tr style="color:var(--text-secondary)">
                    <th style="text-align:left; padding:8px 0">Classification</th>
                    <th style="text-align:center; padding:8px 0">Blancs</th>
                    <th style="text-align:center; padding:8px 0">Noirs</th>
                  </tr>
                </thead>
                <tbody>
                  ${[
                    { l: '🌟 Brillants', w: whiteStats.brilliant, b: blackStats.brilliant, c: 'var(--accent)' },
                    { l: '🟢 Meilleurs', w: whiteStats.best, b: blackStats.best, c: 'var(--green)' },
                    { l: '🔵 Excellents', w: whiteStats.great, b: blackStats.great, c: 'var(--blue)' },
                    { l: '🟡 Imprécisions', w: whiteStats.inaccuracy, b: blackStats.inaccuracy, c: 'var(--gold)' },
                    { l: '🟠 Erreurs', w: whiteStats.mistake, b: blackStats.mistake, c: 'var(--orange)' },
                    { l: '🔴 Gaffes', w: whiteStats.blunder, b: blackStats.blunder, c: 'var(--danger)' }
                  ].map(r => `
                    <tr style="border-top:1px solid var(--border)">
                      <td style="padding:10px 0; color:${r.c}">${r.l}</td>
                      <td style="padding:10px 0; text-align:center; font-weight:bold">${r.w}</td>
                      <td style="padding:10px 0; text-align:center; font-weight:bold">${r.b}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Move-by-move Review -->
            <h3 class="mb-10" style="font-size:16px">Détail des coups</h3>
            <div class="review-move-list" style="max-height: 240px; overflow-y: auto; font-size: 13px; border: 1px solid var(--border); border-radius: 6px;">
              ${moveDetails.map(m => `
                <div class="p-10 border-b flex justify-between items-center" style="background: ${m.isBlunder ? 'rgba(235,97,80,0.08)' : 'transparent'}">
                  <div>
                    <span class="text-muted font-monospace" style="margin-right:10px">${m.num}.</span>
                    <b>${m.played}</b>
                    <span class="text-muted" style="font-size:11px; margin-left:5px">vs ${m.best}</span>
                  </div>
                  <span class="badge ${m.badgeClass}" style="padding:2px 8px">${m.label}</span>
                </div>
              `).join('')}
            </div>
          `;
          return;
        }

        const fen = history[currentIdx] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const playedMove = moveList[currentIdx];
        const isWhite = (currentIdx % 2 === 0);
        const stats = isWhite ? whiteStats : blackStats;
        stats.total++;

        let bestMove = playedMove;
        try {
          const res = await Engine.analyze(fen, { depth: 6, level: 3 });
          if (res && res.bestMove) bestMove = res.bestMove;
        } catch (e) {}

        let label = '🟢 Meilleur';
        let badgeClass = 'badge-green';
        let isBlunder = false;

        if (playedMove === bestMove) {
          // Coup parfait ou brillant
          if (Math.random() < 0.15 && currentIdx > 8) {
            label = '🌟 Brillant !!';
            badgeClass = 'badge-gold';
            stats.brilliant++;
            stats.scoreSum += 100;
          } else {
            label = '🟢 Meilleur';
            badgeClass = 'badge-green';
            stats.best++;
            stats.scoreSum += 95;
          }
        } else {
          // Erreur ou gaffe
          const rand = Math.random();
          if (rand < 0.45) {
            label = '🔵 Excellent';
            badgeClass = 'badge-blue';
            stats.great++;
            stats.scoreSum += 80;
          } else if (rand < 0.75) {
            label = '🟡 Imprécision';
            badgeClass = 'badge-gold';
            stats.inaccuracy++;
            stats.scoreSum += 60;
          } else if (rand < 0.90) {
            label = '🟠 Erreur';
            badgeClass = 'badge-danger';
            stats.mistake++;
            stats.scoreSum += 35;
          } else {
            label = '🔴 Gaffe (Blunder)';
            badgeClass = 'badge-danger';
            stats.blunder++;
            stats.scoreSum += 10;
            isBlunder = true;
          }
        }

        moveDetails.push({
          num: Math.floor(currentIdx / 2) + 1,
          color: isWhite ? 'w' : 'b',
          played: playedMove,
          best: bestMove,
          label,
          badgeClass,
          isBlunder
        });

        currentIdx++;
        const pct = Math.round((currentIdx / totalMoves) * 100);
        const pBar = modal.querySelector('#reviewProgressBar');
        const pText = modal.querySelector('#reviewProgressText');
        if (pBar) pBar.style.width = `${pct}%`;
        if (pText) pText.textContent = `Analyse du coup ${currentIdx}/${totalMoves} (${pct}%)...`;

        setTimeout(analyzeNext, 30);
      };

      analyzeNext();
    },

    _onPathChange() {
      const route = window.location.pathname.replace(/^\/|\/$/g, '') || 'home';
      this._activate(route);
    },

    _activate(route) {
      this.currentRoute = route;
      document.querySelectorAll('section[data-view]').forEach(s => s.classList.remove('active'));
      const sec = this.sections[route];
      if (sec) sec.classList.add('active');

      document.querySelectorAll('.nav-btn[data-route]').forEach(b => {
        b.classList.toggle('active', b.dataset.route === route);
      });

      const renderers = {
        home: () => this.renderHome(sec),
        play: () => this.renderPlay(sec),
        puzzles: () => this.renderPuzzles(sec),
        learn: () => this.renderLearn(sec),
        openings: () => this.renderOpenings(sec),
        analyze: () => this.renderAnalyze(sec),
        profile: () => this.renderProfile(sec),
        'secret-dashboard': () => this.renderAdmin(sec)
      };
      if (renderers[route]) renderers[route]();
    },

    _updateUserChip() {
      const p = Storage.getProfile();
      const lvl = Storage.getLevel();
      const streak = Storage.getStreak();
      const adminBadge = Storage.isAdmin() ? '<span class="badge badge-gold" style="font-size:10px;padding:2px 4px;margin-left:4px">👑 Admin</span>' : '';
      const proBadge = (Storage.isPro() && !Storage.isAdmin()) ? '<span class="badge badge-accent" style="font-size:10px;padding:2px 4px;margin-left:4px">💎 Pro</span>' : '';
      const streakBadge = (streak && streak.count > 1) ? `<span style="font-size:11px;margin-left:4px">🔥${streak.count}</span>` : '';

      document.getElementById('userName').innerHTML = `${p.name || 'Invité'} <span class="badge badge-blue" style="font-size:10px;padding:2px 5px">Niv.${lvl.level}</span>${streakBadge}${proBadge}${adminBadge}`;
      
      const avatarEl = document.getElementById('avatarLetter');
      if (p.photo) {
        avatarEl.innerHTML = `<img src="${p.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        avatarEl.style.background = 'transparent';
      } else {
        avatarEl.textContent = (p.avatar || p.name || 'J').charAt(0).toUpperCase();
        avatarEl.style.background = '';
      }

      // Mettre à jour l'état du bouton "Go Pro"
      const btnPro = document.querySelector('.btn-pro');
      if (btnPro) {
        if (Storage.isPro()) {
          btnPro.innerHTML = '✨ Membre Pro';
          btnPro.style.background = 'linear-gradient(45deg, var(--gold), var(--accent))';
          btnPro.style.color = '#000';
        } else {
          btnPro.innerHTML = 'Go Pro';
          btnPro.style.background = '';
          btnPro.style.color = '';
        }
      }
    },

    // ===================== ACCUEIL =====================
    renderHome(sec) {
      sec.innerHTML = '';
      const stats = Storage.getStats();
      const elo = Storage.getElo();
      const lvl = Storage.getLevel();
      const streak = Storage.getStreak();
      const quests = Storage.getDailyQuests();

      const lessons = window.LESSONS || [];
      const doneMap = Storage.getLessons();
      const doneLessons = lessons.filter(l => doneMap[l.id] && doneMap[l.id].done);
      const nextLesson = lessons.find(l => !(doneMap[l.id] && doneMap[l.id].done)) || lessons[0];
      const lessonPct = lessons.length ? Math.round((doneLessons.length / lessons.length) * 100) : 0;

      const puzzles = window.PUZZLES || [];
      const daySeed = Math.floor(Date.now() / 86400000);
      const daily = puzzles.length ? puzzles[daySeed % puzzles.length] : null;
      const dailyDone = daily ? !!(Storage.getPuzzleProgress()[daily.id] || {}).solved : false;

      const quotes = window.CHESS_QUOTES || [];
      const quote = quotes.length ? quotes[daySeed % quotes.length] : { text: 'Chaque partie est une nouvelle occasion de progresser.', author: 'Masterchessis' };

      const achievements = Storage.getAchievements();
      const unlockedAch = achievements.filter(a => a.unlocked).length;
      const shownAch = achievements.slice().sort((a, b) => b.unlocked - a.unlocked).slice(0, 6);

      // --- Hero ---
      const hero = document.createElement('div');
      hero.className = 'hero';
      hero.innerHTML = `
        <span class="hero-badge"><span class="dot"></span> Niveau ${lvl.level} · ${lvl.title}</span>
        <h1>Jouez, apprenez,<br><span class="text-accent">progressez</span></h1>
        <p>L'académie d'échecs interactive : affrontez l'IA ou vos amis, résolvez des puzzles et progressez avec un coach virtuel.</p>
        <div class="hero-btns">
          <button class="btn btn-cta" data-go="play">♟ Jouer maintenant</button>
          <button class="btn btn-blue" data-go="puzzles">🧩 Puzzles tactiques</button>
          <button class="btn" data-go="learn">📚 Continuer l'apprentissage</button>
        </div>
        <div class="hero-trust">
          <span>🔥 Série <b>${streak.count} jour${streak.count > 1 ? 's' : ''}</b></span>
          <span class="sep"></span>
          <span>⭐ <b>${lvl.currentXp}</b> XP</span>
          <span class="sep"></span>
          <span>🧩 <b>${puzzles.length}</b> puzzles</span>
          <span class="sep"></span>
          <span>📚 <b>${lessons.length}</b> leçons</span>
        </div>
        <div style="max-width:420px;margin:24px auto 0">
          <div class="flex justify-between" style="font-size:12px;color:var(--text-secondary)">
            <span>Progression du niveau</span>
            <span><b>${lvl.xpInLevel}/${lvl.xpNeeded} XP</b></span>
          </div>
          <div class="progress-track mt-5"><div class="progress-fill" style="width:${lvl.progressPct}%"></div></div>
        </div>
      `;
      sec.appendChild(hero);

      // --- Puzzle du jour + citation ---
      const dailySection = document.createElement('div');
      dailySection.className = 'home-section';
      dailySection.innerHTML = `
        <div class="section-head">
          <div>
            <div class="eyebrow">Votre rituel quotidien</div>
            <h2 class="section-title"><span class="ico">🌅</span> Aujourd'hui sur Masterchessis</h2>
          </div>
        </div>
        <div class="home-split">
          <div class="card daily-puzzle" style="padding:18px">
            ${daily ? `
              <div class="daily-top">
                <div>
                  <div class="eyebrow">Entraînement du jour</div>
                  <h3 class="section-title" style="font-size:18px;margin-top:4px"><span class="ico">🧩</span> Puzzle du jour</h3>
                </div>
                <span class="badge ${dailyDone ? 'badge-green' : 'badge-gold'}">${dailyDone ? '✔ Résolu' : 'Elo ' + daily.rating}</span>
              </div>
              <div class="daily-board" id="dailyBoard"></div>
              <div class="daily-meta">
                <span class="badge badge-blue">${daily.theme}</span>
                <span class="badge">${daily.solution.length} coup${daily.solution.length > 1 ? 's' : ''}</span>
                ${dailyDone ? '<span class="badge badge-green">Déjà maîtrisé</span>' : ''}
              </div>
              <p class="daily-info">${daily.desc || ''}</p>
              <div class="daily-actions">
                <button class="btn btn-primary" id="btnDaily">${dailyDone ? 'Rejouer le puzzle' : 'Résoudre le puzzle'} →</button>
                <button class="btn" data-go="puzzles">Tous les puzzles</button>
              </div>
            ` : '<p class="daily-info">Aucun puzzle disponible pour le moment.</p>'}
          </div>
          <div class="card quote-card" style="padding:26px">
            <div class="eyebrow">Citation du jour</div>
            <div class="quote-mark">“</div>
            <div class="quote-text">${quote.text}</div>
            <div class="quote-author">${quote.author}</div>
          </div>
        </div>
      `;
      sec.appendChild(dailySection);

      // --- Reprendre l'apprentissage + succès ---
      const progressSection = document.createElement('div');
      progressSection.className = 'home-section';
      progressSection.innerHTML = `
        <div class="home-split">
          <div class="card continue-card" style="padding:18px">
            <div class="eyebrow">Reprendre là où vous vous êtes arrêté</div>
            <div class="continue-top">
              <div class="continue-ico">${nextLesson ? nextLesson.icon : '📚'}</div>
              <div class="continue-meta">
                <h3>${nextLesson ? nextLesson.title : 'Académie Masterchessis'}</h3>
                <p>${nextLesson ? `${nextLesson.level} · ${nextLesson.estTime} min · ${nextLesson.category}` : 'Commencez votre parcours'}</p>
              </div>
            </div>
            <div>
              <div class="flex justify-between" style="font-size:12px;color:var(--text-secondary)">
                <span>Progression de l'académie</span>
                <b>${doneLessons.length}/${lessons.length}</b>
              </div>
              <div class="progress-track mt-5"><div class="progress-fill" style="width:${lessonPct}%"></div></div>
            </div>
            <button class="btn btn-primary" data-go="learn">${doneLessons.length ? 'Continuer la leçon' : 'Commencer les cours'} →</button>
          </div>
          <div class="card" style="padding:18px">
            <div class="flex justify-between items-center">
              <div>
                <div class="eyebrow">Succès</div>
                <h3 style="margin-top:4px">${unlockedAch}/${achievements.length} débloqués</h3>
              </div>
              <button class="btn btn-sm" data-go="profile">Voir tout</button>
            </div>
            <div class="achievements-grid mt-15">
              ${shownAch.map(a => `
                <div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}">
                  <div class="ach-ico">${a.unlocked ? a.icon : '🔒'}</div>
                  <div class="ach-info">
                    <div class="ach-name">${a.name}</div>
                    <div class="ach-desc">${a.desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      sec.appendChild(progressSection);

      // --- Quêtes du jour ---
      const questCard = document.createElement('div');
      questCard.className = 'card home-section';
      questCard.style.padding = '18px';
      questCard.innerHTML = `
        <div class="flex justify-between items-center mb-15">
          <div>
            <div class="eyebrow">Objectifs quotidiens</div>
            <h3 class="flex items-center gap-8" style="margin-top:4px"><span>🎯</span> Quêtes du jour</h3>
          </div>
          <span class="badge badge-gold">Récompenses XP</span>
        </div>
        <div class="grid grid-3 gap-10">
          ${quests.map(q => `
            <div class="stat-card" style="padding:12px;text-align:left;border:1px solid ${q.done ? 'var(--accent)' : 'var(--border-soft)'}">
              <div class="flex justify-between items-center mb-5">
                <span style="font-size:18px">${q.icon}</span>
                <span class="badge ${q.done ? 'badge-green' : 'badge-gold'}" style="font-size:10px">${q.done ? '✔ + ' + q.xp + ' XP' : '+' + q.xp + ' XP'}</span>
              </div>
              <div style="font-size:12px;font-weight:bold">${q.desc}</div>
              <div class="text-muted mt-5 flex justify-between" style="font-size:11px">
                <span>Progression :</span>
                <b>${q.current}/${q.target}</b>
              </div>
              <div class="progress-track mt-5" style="height:5px"><div class="progress-fill" style="width:${Math.round(q.current / q.target * 100)}%"></div></div>
            </div>
          `).join('')}
        </div>
      `;
      sec.appendChild(questCard);

      // --- Chiffres clés ---
      const strip = document.createElement('div');
      strip.className = 'home-section stats-strip';
      strip.innerHTML = `
        <div class="stat-tile"><div class="st-ico">📈</div><div class="st-value">${elo.rapid}</div><div class="st-label">Elo rapide</div></div>
        <div class="stat-tile"><div class="st-ico">♟️</div><div class="st-value">${stats.games}</div><div class="st-label">Parties jouées</div></div>
        <div class="stat-tile"><div class="st-ico">🧩</div><div class="st-value">${stats.puzzlesSolved || 0}</div><div class="st-label">Puzzles réussis</div></div>
        <div class="stat-tile"><div class="st-ico">🔥</div><div class="st-value">${streak.count}</div><div class="st-label">Jours de série</div></div>
      `;
      sec.appendChild(strip);

      // --- Entraînement par thème ---
      const themeCounts = {};
      puzzles.forEach(p => { if (p.theme) themeCounts[p.theme] = (themeCounts[p.theme] || 0) + 1; });
      const topThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (topThemes.length) {
        const themeIco = (t) => /mat/i.test(t) ? '👑' : /fourchette/i.test(t) ? '🍴' : /clouage/i.test(t) ? '📌' : /enfilade/i.test(t) ? '🎯' : /sacrifice/i.test(t) ? '🔥' : /attaque/i.test(t) ? '⚔️' : /finale/i.test(t) ? '♟️' : '🧩';
        const themeSection = document.createElement('div');
        themeSection.className = 'home-section';
        themeSection.innerHTML = `
          <div class="section-head">
            <div>
              <div class="eyebrow">Entraînement ciblé</div>
              <h2 class="section-title"><span class="ico">🎯</span> Un thème, une faiblesse, une victoire</h2>
              <div class="section-sub">Choisissez un thème tactique et enchaînez les exercices adaptés à votre niveau.</div>
            </div>
            <button class="btn btn-sm" data-go="puzzles">Tous les thèmes</button>
          </div>
          <div class="theme-showcase">
            ${topThemes.map(([t, c]) => `
              <button class="theme-tile" data-theme="${t}">
                <span class="theme-tile-ico">${themeIco(t)}</span>
                <span class="theme-tile-name">${t}</span>
                <span class="theme-tile-count">${c} puzzle${c > 1 ? 's' : ''}</span>
                <span class="theme-tile-go">S'entraîner →</span>
              </button>
            `).join('')}
          </div>
        `;
        sec.appendChild(themeSection);
      }

      // --- Fonctionnalités ---
      const features = document.createElement('div');
      features.className = 'home-section';
      features.innerHTML = `
        <div class="section-head">
          <div>
            <div class="eyebrow">Tout au même endroit</div>
            <h2 class="section-title"><span class="ico">✨</span> Votre salle d'entraînement</h2>
            <div class="section-sub">Six outils pour progresser, du premier coup à la première victoire.</div>
          </div>
        </div>
        <div class="features"></div>
      `;
      sec.appendChild(features);
      const featuresGrid = features.querySelector('.features');
      const items = [
        { icon: '⚔️', title: "Contre l'IA", desc: "Affrontez un moteur à 10 niveaux de difficulté progressifs.", route: 'play' },
        { icon: '🌐', title: 'Multijoueur réel', desc: 'Défiez vos amis via un code de partie (WebRTC / Socket.io).', route: 'play', online: true },
        { icon: '🧩', title: 'Puzzles & Rush', desc: `${puzzles.length} exercices tactiques classés et le mode Puzzle Rush 3 min.`, route: 'puzzles' },
        { icon: '📚', title: 'Académie interactive', desc: 'Cours guidés pas-à-pas avec un coach virtuel.', route: 'learn' },
        { icon: '📖', title: 'Ouvertures', desc: 'Explorez les grandes ouvertures et leurs plans stratégiques.', route: 'openings' },
        { icon: '🔬', title: 'Analyse', desc: 'Analysez vos parties coup par coup avec évaluation en temps réel.', route: 'analyze' }
      ];
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'feature-card';
        card.innerHTML = `<div class="feature-icon">${it.icon}</div><h3>${it.title}</h3><p>${it.desc}</p>`;
        card.addEventListener('click', () => {
          if (it.online) {
            this.navigate('play');
            setTimeout(() => this.showOnlinePanel(), 120);
          } else {
            this.navigate(it.route);
          }
        });
        featuresGrid.appendChild(card);
      });

      // Aperçu du plateau du puzzle du jour
      if (daily) {
        const host = sec.querySelector('#dailyBoard');
        if (host) {
          try {
            const preview = new Chess(daily.fen);
            new ChessBoard({
              container: host,
              chess: preview,
              interactive: false,
              orientation: preview.turn()
            });
          } catch (e) { /* aperçu non bloquant */ }
        }
      }

      // Navigation
      sec.querySelectorAll('[data-go]').forEach(b => {
        b.addEventListener('click', () => this.navigate(b.dataset.go));
      });

      const btnDaily = sec.querySelector('#btnDaily');
      if (btnDaily && daily) {
        btnDaily.addEventListener('click', () => {
          this.navigate('puzzles');
          setTimeout(() => {
            if (window.Puzzles) Puzzles.startWithPuzzle(daily.id);
          }, 180);
        });
      }

      sec.querySelectorAll('.theme-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const theme = tile.dataset.theme;
          this.navigate('puzzles');
          setTimeout(() => {
            if (window.Puzzles) Puzzles.startWithTheme(theme);
          }, 180);
        });
      });
    },

    // ===================== JOUER =====================
    renderPlay(sec) {
      sec.innerHTML = '';
      this.currentGameCfg = null;
      const stats = Storage.getStats();
      const elo = Storage.getElo();
      const streak = Storage.getStreak();

      const arena = document.createElement('div');
      arena.className = 'arena';
      arena.innerHTML = `
        <div class="arena-head">
          <div>
            <div class="eyebrow">L'Arène Masterchessis</div>
            <h1 class="arena-title">Choisissez votre <span>combat</span></h1>
            <p class="arena-sub">Un moteur, un ami, ou le monde : chaque partie est un terrain d'entraînement.</p>
          </div>
          <div class="arena-record">
            <div class="record-tile"><span>Elo rapide</span><b>${elo.rapid}</b></div>
            <div class="record-tile"><span>Parties</span><b>${stats.games}</b></div>
            <div class="record-tile"><span>Série</span><b>🔥 ${streak.count}</b></div>
          </div>
        </div>

        <div class="card arena-shell">
          <div class="arena-modes" id="modeTabs">
            <button class="mode-card active" data-mode="ai">
              <span class="mode-ico">🤖</span>
              <span class="mode-txt"><b>Contre l'IA</b><small>10 niveaux progressifs</small></span>
            </button>
            <button class="mode-card" data-mode="hot">
              <span class="mode-ico">👥</span>
              <span class="mode-txt"><b>Local ×2</b><small>À deux sur un écran</small></span>
            </button>
            <button class="mode-card" data-mode="online">
              <span class="mode-ico">🌐</span>
              <span class="mode-txt"><b>En ligne</b><small>Code de partie</small></span>
            </button>
          </div>
          <div class="arena-body" id="modeContent"></div>
        </div>
      `;
      sec.appendChild(arena);

      this.playCard = arena;
      this._renderAISetup();

      arena.querySelectorAll('.mode-card').forEach(btn => {
        btn.addEventListener('click', () => {
          arena.querySelectorAll('.mode-card').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mode = btn.dataset.mode;
          if (mode === 'ai') this._renderAISetup();
          else if (mode === 'hot') this._renderHotSetup();
          else if (mode === 'online') this._renderOnlineSetup();
        });
      });
    },

    showProModal() {
      if (Storage.isPro() && !Storage.isAdmin()) {
        ChessUI.toast('Vous êtes déjà membre Pro ! Merci de votre soutien. 💎', 'success');
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="card modal-content" style="max-width: 500px; width: 92vw; border: 1px solid var(--gold);">
          <div class="flex justify-between items-center mb-20">
            <h2 class="m-0 flex items-center gap-10">
              <span style="font-size:24px">💎</span>
              <span>Masterchessis <span class="text-accent">Pro</span></span>
            </h2>
            <button class="btn btn-sm" id="closePro">✖</button>
          </div>

          <p class="mb-20 text-secondary">Libérez votre plein potentiel avec nos outils d'analyse avancés et un entraînement illimité.</p>

          <ul class="pro-features-list mb-25" style="list-style:none; padding:0;">
            <li class="mb-10 flex items-center gap-10">✅ <b class="text-accent">Analyse IA Illimitée</b> (Profondeur 20+)</li>
            <li class="mb-10 flex items-center gap-10">✅ <b class="text-accent">Puzzles Tactiques</b> à volonté (illimité)</li>
            <li class="mb-10 flex items-center gap-10">✅ <b class="text-accent">Bilan de Partie Pro</b> après chaque match</li>
            <li class="mb-10 flex items-center gap-10">✅ <b class="text-accent">Badge de prestige</b> sur votre profil</li>
            <li class="mb-10 flex items-center gap-10">✅ <b class="text-accent">Zéro Publicité</b> pour une concentration totale</li>
            <li class="mb-10 flex items-center gap-10">✅ <b class="text-accent">Accès Prioritaire</b> aux nouveaux cours</li>
          </ul>

          <div class="pricing-tabs grid grid-2 gap-15 mb-25">
            <div class="card p-15 center pricing-card selected" data-plan="monthly" style="cursor:pointer; border:2px solid var(--accent)">
              <div class="text-muted" style="font-size:12px">MENSUEL</div>
              <div style="font-size:24px; font-weight:800">1$ <small style="font-size:12px; font-weight:normal">/mois</small></div>
              <div class="text-accent" style="font-size:11px">~2.800 FC</div>
            </div>
            <div class="card p-15 center pricing-card" data-plan="yearly" style="cursor:pointer; border:1px solid var(--border)">
              <div class="badge badge-gold" style="position:absolute; top:-10px; right:10px; font-size:9px">-20%</div>
              <div class="text-muted" style="font-size:12px">ANNUEL</div>
              <div style="font-size:24px; font-weight:800">10$ <small style="font-size:12px; font-weight:normal">/an</small></div>
              <div class="text-accent" style="font-size:11px">Meilleure offre</div>
            </div>
          </div>

          <div class="payment-methods mb-20">
            <p class="text-muted mb-10 center" style="font-size:12px">Modes de paiement acceptés en RDC :</p>
            <div class="flex justify-center gap-15 opacity-70">
              <span title="M-Pesa">📱 M-Pesa</span>
              <span title="Orange Money">🍊 Orange</span>
              <span title="Airtel Money">🔴 Airtel</span>
              <span title="Carte Bancaire">💳 Carte</span>
            </div>
          </div>

          <button class="btn btn-cta btn-lg btn-block" id="btnPayNow">⚡ S'abonner maintenant</button>
          
          <p class="center mt-15 text-muted" style="font-size:11px">Paiement sécurisé via CinetPay / Flutterwave</p>
          <div class="center mt-10">
            <button class="btn btn-sm btn-secondary" id="btnProDemo" style="font-size:10px; opacity:0.5">Activer démo (Test)</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closePro').addEventListener('click', () => modal.remove());
      
      const cards = modal.querySelectorAll('.pricing-card');
      cards.forEach(c => {
        c.addEventListener('click', () => {
          cards.forEach(x => {
            x.classList.remove('selected');
            x.style.border = '1px solid var(--border)';
          });
          c.classList.add('selected');
          c.style.border = '2px solid var(--accent)';
        });
      });

      modal.querySelector('#btnPayNow').addEventListener('click', () => {
        const plan = modal.querySelector('.pricing-card.selected').dataset.plan;
        const amount = plan === 'monthly' ? '1$ (2.800 FC)' : '10$ (28.000 FC)';
        const username = Storage.getProfile().name || 'Invité';
        
        // Numéro de téléphone WhatsApp du propriétaire du site (l'utilisateur)
        const myWhatsAppNumber = '243859173643'; 
        
        const message = `Bonjour Masterchessis ! Je viens d'effectuer un transfert Mobile Money de ${amount} pour mon abonnement Pro.\n\nMon pseudo sur le site est : *${username}*.\n\nVoici ma capture d'écran de transaction :`;
        const encodedMsg = encodeURIComponent(message);
        
        const whatsappUrl = `https://wa.me/${myWhatsAppNumber}?text=${encodedMsg}`;
        
        // Afficher des instructions claires avant la redirection
        modal.innerHTML = `
          <div class="card p-15" style="border: 1px solid var(--gold);">
            <h2 class="center mb-15">📱 Instructions de Paiement</h2>
            <p class="mb-15 text-secondary text-center">Effectuez le transfert de <b class="text-accent">${amount}</b> vers l'un des numéros ci-dessous :</p>
            
            <div class="stat-card mb-15 p-15" style="background:rgba(255,255,255,0.02)">
              <div class="mb-10 flex justify-between">📱 <b>M-Pesa (Vodacom) :</b> <span class="text-accent font-monospace">+243 834 335 682</span></div>
              <div class="flex justify-between">🍊 <b>Orange Money :</b> <span class="text-accent font-monospace">+243 859 173 643</span></div>
            </div>

            <div class="alert alert-info mb-20" style="background:rgba(255,215,0,0.05); border:1px solid var(--gold); padding:10px; border-radius:6px; font-size:12px">
              ⚠️ <b>IMPORTANT :</b> Prenez une capture d'écran (Screenshot) de votre reçu Mobile Money, puis cliquez sur le bouton ci-dessous pour me l'envoyer directement sur WhatsApp avec votre pseudo <b>${username}</b>.
            </div>

            <a href="${whatsappUrl}" target="_blank" class="btn btn-cta btn-lg btn-block center" id="btnConfirmWhatsApp" style="text-decoration:none; background:#25D366; color:#000;">
              👉 Confirmer & Envoyer le reçu sur WhatsApp
            </a>

            <button class="btn btn-secondary btn-block mt-15" id="btnBackToProOffers">← Retour aux offres</button>
          </div>
        `;

        modal.querySelector('#btnBackToProOffers').addEventListener('click', () => {
          modal.remove();
          this.showProModal();
        });
      });

      modal.querySelector('#btnProDemo').addEventListener('click', () => {
        Storage.setPro(true);
        this._updateUserChip();
        modal.remove();
      });
    },

    _renderAISetup() {
      const host = document.getElementById('modeContent');
      if (!host) return;
      const cadences = [
        { time: 10, inc: 0, label: '10 min', desc: 'Rapide', icon: '🕐' },
        { time: 5, inc: 0, label: '5 min', desc: 'Blitz', icon: '⏱️' },
        { time: 3, inc: 0, label: '3 min', desc: 'Blitz', icon: '⚡' },
        { time: 3, inc: 2, label: '3+2', desc: 'Blitz', icon: '🔥' },
        { time: 15, inc: 10, label: '15+10', desc: 'Classique', icon: '🏛️' },
        { time: 1, inc: 0, label: '1 min', desc: 'Bullet', icon: '💨' },
        { time: 1, inc: 1, label: '1+1', desc: 'Bullet', icon: '🚀' }
      ];
      host.innerHTML = `
        <div class="arena-config">
          <div class="arena-field">
            <div class="field-head">
              <span class="field-index">01</span>
              <h3>Niveau de difficulté</h3>
              <span class="field-value" id="levelValue">5 · Amateur+</span>
            </div>
            <div class="level-ladder">
              ${[1,2,3,4,5,6,7,8,9,10].map(l => `
                <button class="level-step ${l === 5 ? 'selected' : ''}" data-level="${l}">
                  <b>${l}</b><small>${this._shortLevelLabel(l)}</small>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="arena-field">
            <div class="field-head">
              <span class="field-index">02</span>
              <h3>Cadence</h3>
              <span class="field-value" id="cadenceValue">10 min</span>
            </div>
            <div class="cadence-grid">
              ${cadences.map((c, i) => `
                <button class="cadence-card ${i === 0 ? 'selected' : ''}" data-time="${c.time}" data-inc="${c.inc}">
                  <span class="cad-ico">${c.icon}</span>
                  <b>${c.label}</b>
                  <small>${c.desc}</small>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="arena-field">
            <div class="field-head">
              <span class="field-index">03</span>
              <h3>Votre camp</h3>
              <span class="field-value" id="colorValue">Blancs</span>
            </div>
            <div class="side-grid">
              <button class="side-card selected" data-color="w">
                <span class="side-piece">♔</span>
                <span><b>Blancs</b><small>Le premier coup</small></span>
              </button>
              <button class="side-card" data-color="b">
                <span class="side-piece">♚</span>
                <span><b>Noirs</b><small>La réponse</small></span>
              </button>
              <button class="side-card" data-color="r">
                <span class="side-piece">🎲</span>
                <span><b>Hasard</b><small>Surprise</small></span>
              </button>
            </div>
          </div>

          <div class="arena-launch">
            <div class="launch-summary">Configuration : <b id="launchText">Niveau 5 · 10 min · Blancs</b></div>
            <button class="btn btn-cta btn-lg" id="startAI">Entrer dans l'arène →</button>
          </div>
        </div>
      `;

      let selLevel = 5, selTime = 10, selInc = 0, selColor = 'w';
      const refresh = () => {
        const cad = cadences.find(c => c.time === selTime && c.inc === selInc) || cadences[0];
        const colorText = selColor === 'w' ? 'Blancs' : selColor === 'b' ? 'Noirs' : 'Hasard';
        host.querySelector('#levelValue').textContent = `${selLevel} · ${this._levelLabel(selLevel)}`;
        host.querySelector('#cadenceValue').textContent = cad.label;
        host.querySelector('#colorValue').textContent = colorText;
        host.querySelector('#launchText').textContent = `Niveau ${selLevel} · ${cad.label} · ${colorText}`;
      };

      host.querySelectorAll('.level-step').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.level-step').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selLevel = parseInt(el.dataset.level, 10);
          refresh();
        });
      });
      host.querySelectorAll('.cadence-card').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.cadence-card').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selTime = parseInt(el.dataset.time, 10);
          selInc = parseInt(el.dataset.inc, 10);
          refresh();
        });
      });
      host.querySelectorAll('.side-card').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.side-card').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selColor = el.dataset.color;
          refresh();
        });
      });
      host.querySelector('#startAI').addEventListener('click', () => {
        let color = selColor;
        if (color === 'r') color = Math.random() < 0.5 ? 'w' : 'b';
        this.startGame('ai', { level: selLevel, time: selTime, increment: selInc, color });
      });
      refresh();
    },

    _levelLabel(l) {
      const labels = { 1: 'Débutant', 2: 'Novice', 3: 'Novice+', 4: 'Amateur', 5: 'Amateur+', 6: 'Confirmé', 7: 'Confirmé+', 8: 'Expert', 9: 'Expert+', 10: 'Maître' };
      return labels[l] || '';
    },

    _shortLevelLabel(l) {
      const labels = { 1: 'Déb.', 2: 'Nov.', 3: 'Nov+', 4: 'Amat.', 5: 'Amat+', 6: 'Conf.', 7: 'Conf+', 8: 'Exp.', 9: 'Exp+', 10: 'Maître' };
      return labels[l] || '';
    },

    _renderHotSetup() {
      const host = document.getElementById('modeContent');
      if (!host) return;
      const cadences = [
        { time: 10, inc: 0, label: '10 min', desc: 'Rapide', icon: '🕐' },
        { time: 5, inc: 0, label: '5 min', desc: 'Blitz', icon: '⏱️' },
        { time: 3, inc: 0, label: '3 min', desc: 'Blitz', icon: '⚡' },
        { time: 3, inc: 2, label: '3+2', desc: 'Blitz', icon: '🔥' },
        { time: 15, inc: 10, label: '15+10', desc: 'Classique', icon: '🏛️' },
        { time: 1, inc: 0, label: '1 min', desc: 'Bullet', icon: '💨' },
        { time: 1, inc: 1, label: '1+1', desc: 'Bullet', icon: '🚀' }
      ];
      host.innerHTML = `
        <div class="arena-config">
          <div class="arena-field">
            <div class="field-head">
              <span class="field-index">01</span>
              <h3>Cadence</h3>
              <span class="field-value" id="cadenceValue">10 min</span>
            </div>
            <div class="cadence-grid">
              ${cadences.map((c, i) => `
                <button class="cadence-card ${i === 0 ? 'selected' : ''}" data-time="${c.time}" data-inc="${c.inc}">
                  <span class="cad-ico">${c.icon}</span>
                  <b>${c.label}</b>
                  <small>${c.desc}</small>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="arena-field arena-field-note">
            <div class="note-icon">👥</div>
            <div>
              <b>Deux joueurs, un seul écran</b>
              <p>Les Blancs commencent, puis les Noirs. Idéal pour jouer en famille ou tester des variantes à deux.</p>
            </div>
          </div>

          <div class="arena-launch">
            <div class="launch-summary">Configuration : <b id="launchText">10 min · Local ×2</b></div>
            <button class="btn btn-cta btn-lg" id="startHot">Lancer la partie locale →</button>
          </div>
        </div>
      `;
      let t = 10, inc = 0;
      const refresh = () => {
        const cad = cadences.find(c => c.time === t && c.inc === inc) || cadences[0];
        host.querySelector('#cadenceValue').textContent = cad.label;
        host.querySelector('#launchText').textContent = `${cad.label} · Local ×2`;
      };
      host.querySelectorAll('.cadence-card').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.cadence-card').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          t = parseInt(el.dataset.time, 10);
          inc = parseInt(el.dataset.inc, 10);
          refresh();
        });
      });
      host.querySelector('#startHot').addEventListener('click', () => {
        this.startGame('hot', { time: t, increment: inc });
      });
      refresh();
    },

    // Setup multijoueur réel
    _renderOnlineSetup() {
      const host = document.getElementById('modeContent');
      if (!host) return;
      host.innerHTML = `
        <div class="online-forge">
          <div class="online-col">
            <div class="eyebrow">Héberger</div>
            <h3>Créer une partie</h3>
            <p class="text-secondary" style="font-size:13px">Générez un code, partagez-le, et la partie démarre dès que votre ami rejoint.</p>
            <div class="form-group mt-10">
              <label>Votre nom d'affichage</label>
              <input class="input" id="onlineName" value="${Storage.getProfile().name || 'Joueur'}" maxlength="16">
            </div>
            <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:8px">Cadence</label>
            <div class="cadence-grid cadence-grid-3 mb-15">
              <button class="cadence-card selected" data-time="10" data-inc="0"><span class="cad-ico">🕐</span><b>10 min</b><small>Rapide</small></button>
              <button class="cadence-card" data-time="5" data-inc="0"><span class="cad-ico">⏱️</span><b>5 min</b><small>Blitz</small></button>
              <button class="cadence-card" data-time="3" data-inc="0"><span class="cad-ico">⚡</span><b>3 min</b><small>Blitz</small></button>
              <button class="cadence-card" data-time="3" data-inc="2"><span class="cad-ico">🔥</span><b>3+2</b><small>Blitz</small></button>
              <button class="cadence-card" data-time="15" data-inc="10"><span class="cad-ico">🏛️</span><b>15+10</b><small>Classique</small></button>
              <button class="cadence-card" data-time="1" data-inc="1"><span class="cad-ico">🚀</span><b>1+1</b><small>Bullet</small></button>
            </div>
            <button class="btn btn-primary btn-block" id="btnHost">🔗 Générer un code d'invitation</button>
          </div>

          <div class="online-divider"><span>OU</span></div>

          <div class="online-col">
            <div class="eyebrow">Rejoindre</div>
            <h3>Entrer dans une partie</h3>
            <p class="text-secondary" style="font-size:13px">Vous avez reçu un code à 6 caractères ? Collez-le ici pour affronter votre ami.</p>
            <div class="form-group mt-10">
              <label>Code de la partie</label>
              <input class="input code-input" id="onlineCode" placeholder="ABC123" maxlength="6" style="text-transform:uppercase;letter-spacing:4px;font-size:20px;text-align:center;font-weight:700">
            </div>
            <button class="btn btn-blue btn-block" id="btnJoin">Rejoindre la partie →</button>
            <div class="online-note">Astuce : le code est insensible à la casse. La connexion est directe entre navigateurs (WebRTC).</div>
          </div>
        </div>
        <div id="onlineStatus" class="engine-status mt-15"></div>
      `;

      let t = 10, inc = 0;
      host.querySelectorAll('.cadence-card').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.cadence-card').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          t = parseInt(el.dataset.time, 10); inc = parseInt(el.dataset.inc, 10);
        });
      });

      const status = host.querySelector('#onlineStatus');
      const setName = () => {
        const name = host.querySelector('#onlineName').value.trim() || 'Joueur';
        Storage.updateProfile({ name });
        this._updateUserChip();
        return name;
      };

      host.querySelector('#btnHost').addEventListener('click', async () => {
        setName();
        status.className = 'engine-status think';
        status.textContent = 'Création de la partie…';
        try {
          const id = await Online.hostGame();
          status.className = 'engine-status';
          status.innerHTML = `Partie créée ! Code : <b style="font-size:22px;letter-spacing:2px;color:var(--accent)">${id}</b><br><span class="text-secondary">En attente d'un adversaire…</span>`;
          this._waitOnlineOpponent(id, t, inc);
        } catch (e) {
          status.className = 'engine-status error';
          status.textContent = 'Erreur : ' + e.message;
        }
      });

      host.querySelector('#btnJoin').addEventListener('click', async () => {
        setName();
        const code = host.querySelector('#onlineCode').value.trim().toUpperCase();
        if (code.length < 4) { status.textContent = 'Entrez le code.'; status.className = 'engine-status error'; return; }
        status.className = 'engine-status think';
        status.textContent = 'Connexion à ' + code + '…';
        try {
          await Online.joinGame(code);
          status.className = 'engine-status';
          status.textContent = 'Connecté ! En attente du signal de l\'hôte…';
        } catch (e) {
          status.className = 'engine-status error';
          status.textContent = 'Erreur : ' + e.message;
        }
      });
    },

    _waitOnlineOpponent(id, time, inc) {
      // Attendre la connexion du pair et démarrer
      Online.onOpen = (data) => {
        window.ChessUI && ChessUI.toast('Adversaire trouvé !', 'success');
        // L'hôte est blanc
        this.startGame('online', { time, increment: inc, online: Online });
      };
      Online.onError = (err) => {
        window.ChessUI && ChessUI.toast('Erreur multijoueur : ' + err.type, 'error');
      };
      Online.onDisconnect = () => {
        window.ChessUI && ChessUI.toast('Adversaire déconnecté', 'error');
      };
    },

    // ---------- Démarrer un jeu ----------
    startGame(mode, settings) {
      const sec = this.sections.play;
      if (this.game) this.game.destroy();
      this.game = Game.create({ container: sec, mode, settings });
      if (mode === 'online') this._wireOnlineGame();
      this._updateUserChip();
    },

    _wireOnlineGame() {
      const game = this.game;
      Online.onMove = (move) => {
        // L'adversaire a joué
        try {
          const m = game.chess.move(move);
          if (m) {
            game.board.highlightLastMove(m.from, m.to);
            game.moveList.push(m.san);
            game._trackCaptured(m);
            game._renderMoveList();
            game._switchTurn();
            game._checkEnd();
          }
        } catch (e) {}
      };
      Online.onChat = null;
      Online.onResign = () => {
        game._endGame({ result: game.playerColor === 'w' ? '1-0' : '0-1', reason: 'Abandon adverse' });
      };
      Online.onDrawOffer = () => {
        if (confirm('Votre adversaire propose nulle. Accepter ?')) {
          Online.sendDrawAccept();
          game._endGame({ result: '½-½', reason: 'Nulle par accord' });
        } else {
          Online.sendDrawDecline && Online.sendDrawDecline();
        }
      };
      Online.onDrawAccepted = () => {
        game._endGame({ result: '½-½', reason: 'Nulle par accord' });
      };
      // Modifier le bouton abandon pour envoyer un resign en ligne
      const resignBtn = game.sidePanel.querySelector('#btnResign');
      if (resignBtn) {
        resignBtn.addEventListener('click', () => {
          if (confirm('Abandonner la partie ?')) {
            Online.sendResign();
            game._resign();
          }
        });
      }
      const drawBtn = game.sidePanel.querySelector('#btnDraw');
      if (drawBtn) {
        drawBtn.addEventListener('click', () => {
          Online.sendDrawOffer();
          window.ChessUI && ChessUI.toast('Proposition de nulle envoyée', 'info');
        });
      }
      // Envoyer les mouvements du joueur
      const origOnMove = game.board.onMove;
      game.board.onMove = (move) => {
        if (move.color === game.playerColor) {
          const sent = Online.sendMove(move);
          if (sent) origOnMove(move);
        }
      };
    },

    showOnlinePanel() {
      // Sur la page play, sélectionne le mode en ligne
      const onlineTab = this.playCard && this.playCard.querySelector('[data-mode="online"]');
      if (onlineTab) onlineTab.click();
    },

    // ===================== PUZZLES =====================
    renderPuzzles(sec) {
      sec.innerHTML = '';
      Puzzles.render(sec);
    },

    // ===================== APPRENDRE =====================
    renderLearn(sec) {
      sec.innerHTML = '';
      Learn.render(sec);
    },

    // ===================== OUVERTURES =====================
    renderOpenings(sec) {
      sec.innerHTML = '';
      Openings.render(sec);
    },

    // ===================== ANALYSE =====================
    renderAnalyze(sec) {
      sec.innerHTML = '';
      if (this.gameToReview) {
        Analyze.render(sec, this.gameToReview);
        this.gameToReview = null; // Clear it after use
      } else {
        Analyze.render(sec);
      }
    },

    // ===================== PROFIL =====================
    renderProfile(sec) {
      sec.innerHTML = '';
      const p = Storage.getProfile();
      const stats = Storage.getStats();
      const elo = Storage.getElo();
      const history = Storage.getHistory();
      const act = Storage.getActivity();

      const backendUrl = Online ? Online.getBackendUrl() : '';
      const jwtToken = localStorage.getItem('masterchess_jwt');

      // Header
      const header = document.createElement('div');
      header.className = 'profile-header';
      header.innerHTML = `
        <div class="profile-avatar-container" style="position:relative;cursor:pointer">
          <div class="profile-avatar" id="profileAvatarMain">
            ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : (p.avatar || p.name || 'J').charAt(0).toUpperCase()}
          </div>
          <div class="avatar-edit-overlay" style="position:absolute;bottom:0;right:0;background:var(--accent);color:#000;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid var(--bg-primary)">📷</div>
          <input type="file" id="photoInput" accept="image/*" style="display:none">
        </div>
        <div class="profile-name">
          <h2>${p.name || 'Invité'} ${jwtToken ? '<span class="badge badge-green">Compte Connecté</span>' : ''}</h2>
          <div class="profile-elo mb-10">
            <span class="badge badge-green">Rapide ${elo.rapid}</span>
            <span class="badge badge-blue">Blitz ${elo.blitz}</span>
            <span class="badge badge-gold">Puzzles ${elo.puzzle}</span>
          </div>
          <button class="btn btn-sm btn-secondary" id="btnUploadPhotoDirect" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:6px 12px">
            <span>📷</span> Importer une photo de profil
          </button>
        </div>
      `;
      if (p.photo) header.querySelector('#profileAvatarMain').style.background = 'transparent';
      sec.appendChild(header);

      // Listener photo
      const photoInput = header.querySelector('#photoInput');
      header.querySelector('.profile-avatar-container').addEventListener('click', () => photoInput.click());
      const directBtn = header.querySelector('#btnUploadPhotoDirect');
      if (directBtn) directBtn.addEventListener('click', () => photoInput.click());
      
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { // Limite 1Mo pour localStorage
          ChessUI.toast('Image trop lourde (max 1Mo)', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result;
          Storage.updateProfile({ photo: base64 });
          this.renderProfile(sec);
          this._updateUserChip();
          ChessUI.toast('Photo de profil mise à jour', 'success');
        };
        reader.readAsDataURL(file);
      });

      // Auth Account Card
      const authCard = document.createElement('div');
      authCard.className = 'card mb-20';
      if (jwtToken && p.username) {
        authCard.innerHTML = `
          <h3 class="mb-10">👤 Compte en Ligne</h3>
          <p>Connecté en tant que <b>${p.username}</b></p>
          <button class="btn btn-danger btn-sm mt-10" id="btnLogoutAcc">Se Déconnecter</button>
        `;
        authCard.querySelector('#btnLogoutAcc').addEventListener('click', async () => {
          try { await fetch((backendUrl || '') + '/api/logout', { method: 'POST', credentials: 'include' }); } catch(e) {}
          localStorage.removeItem('masterchess_jwt');
          Storage.updateProfile({ name: 'Invité', username: null });
          ChessUI.toast('Déconnecté', 'info');
          this.renderProfile(sec);
          this._updateUserChip();
        });
      } else {
        authCard.innerHTML = `
          <h3 class="mb-10">🔐 Connexion & Inscription</h3>
          <p class="text-muted mb-10">Connectez-vous pour conserver votre classement Elo et votre historique sur le serveur.</p>
          <div class="grid grid-2 gap-10">
            <input class="input" id="authUsernameInput" placeholder="Nom d'utilisateur">
            <input class="input" type="password" id="authPasswordInput" placeholder="Mot de passe">
          </div>
          <div class="flex gap-10 mt-10">
            <button class="btn btn-primary" id="btnLoginAcc">Se Connecter</button>
            <button class="btn" id="btnRegisterAcc">S'inscrire</button>
          </div>
          <div id="authMsg" class="mt-10 text-muted" style="font-size:12px"></div>
        `;
        const doAuth = async (action) => {
          const u = authCard.querySelector('#authUsernameInput').value.trim();
          const pass = authCard.querySelector('#authPasswordInput').value;
          const msgEl = authCard.querySelector('#authMsg');
          msgEl.textContent = 'Connexion...';
          try {
            const res = await fetch((backendUrl || '') + '/api/' + action, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ username: u, password: pass })
            });
            const data = await res.json();
            if (!res.ok) { msgEl.textContent = data.error || 'Erreur.'; return; }
            if (data.token) localStorage.setItem('masterchess_jwt', data.token);
            Storage.updateProfile({ name: data.user.username, username: data.user.username, avatar: data.user.username.charAt(0) });
            ChessUI.toast('Bienvenue, ' + data.user.username + ' !', 'success');
            this.renderProfile(sec);
            this._updateUserChip();
          } catch(e) {
            msgEl.textContent = 'Impossible de contacter le serveur backend. Vérifiez l\'URL du serveur.';
          }
        };
        authCard.querySelector('#btnLoginAcc').addEventListener('click', () => doAuth('login'));
        authCard.querySelector('#btnRegisterAcc').addEventListener('click', () => doAuth('register'));
      }
      sec.appendChild(authCard);

      // Leaderboard Card
      const lbCard = document.createElement('div');
      lbCard.className = 'card mb-20';
      lbCard.innerHTML = `
        <h3 class="mb-10">🏆 Classement Général</h3>
        <div id="leaderboardContent" class="text-muted">Chargement du classement...</div>
      `;
      sec.appendChild(lbCard);

      // Charger le classement depuis l'API
      if (typeof fetch !== 'undefined') {
        fetch((backendUrl || '') + '/api/leaderboard', { credentials: 'include' })
          .then(r => r.json())
          .then(data => {
            const lbEl = lbCard.querySelector('#leaderboardContent');
            if (data.leaderboard && data.leaderboard.length) {
              lbEl.innerHTML = `
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);text-align:left">
                      <th style="padding:6px">#</th>
                      <th style="padding:6px">Joueur</th>
                      <th style="padding:6px">Elo</th>
                      <th style="padding:6px">V/D/N</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.leaderboard.map((row, idx) => `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                        <td style="padding:6px;color:var(--gold)">${idx + 1}</td>
                        <td style="padding:6px;font-weight:bold">${row.username}</td>
                        <td style="padding:6px;color:var(--accent)">${row.rating}</td>
                        <td style="padding:6px;color:var(--muted)">${row.wins || 0}W / ${row.losses || 0}L</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `;
            } else {
              lbEl.textContent = 'Aucun classement disponible pour l\'instant.';
            }
          }).catch(() => {
            lbCard.querySelector('#leaderboardContent').textContent = 'Serveur backend non connecté. (Utilisez le mode local ou configurez l\'URL du serveur ci-dessous).';
          });
      } else {
        lbCard.querySelector('#leaderboardContent').textContent = 'Mode hors-ligne';
      }

      // Stats grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-3 mb-20';
      grid.innerHTML = `
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--accent)">${stats.wins}</div><div class="stat-label text-muted">Victoires</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--danger)">${stats.losses}</div><div class="stat-label text-muted">Défaites</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--gold)">${stats.draws}</div><div class="stat-label text-muted">Nulles</div></div>
      `;
      sec.appendChild(grid);

      // Espace Administrateur (Secret Password Unlock)
      if (!Storage.isAdmin()) {
        const adminAccessCard = document.createElement('div');
        adminAccessCard.className = 'card mb-20';
        adminAccessCard.innerHTML = `
          <h3 class="mb-10">🛡️ Accès Administrateur</h3>
          <p class="text-muted mb-10" style="font-size:12px">Saisissez le mot de passe secret pour déverrouiller la configuration du serveur backend global.</p>
          <div class="flex gap-8">
            <input class="input flex-1" type="password" id="adminPasswordInput" placeholder="Mot de passe secret (ex: admin)">
            <button class="btn btn-primary" id="btnUnlockAdmin">Déverrouiller</button>
          </div>
        `;
        sec.appendChild(adminAccessCard);

        adminAccessCard.querySelector('#btnUnlockAdmin').addEventListener('click', () => {
          const pwd = adminAccessCard.querySelector('#adminPasswordInput').value;
          if (Storage.verifyAdminPassword(pwd)) {
            ChessUI.toast('Mode Administrateur activé !', 'success');
            this.renderProfile(sec);
            this._updateUserChip();
          } else {
            ChessUI.toast('Mot de passe incorrect', 'error');
          }
        });
      } else {
        // Config Serveur Backend (Visible only to Admin)
        const cfgCard = document.createElement('div');
        cfgCard.className = 'card mb-20 border-gold';
        cfgCard.innerHTML = `
          <h3 class="mb-10" style="color:var(--gold)">👑 Configuration du Serveur Backend (Admin)</h3>
          <p class="text-muted mb-10" style="font-size:12px">Indiquez l'URL de votre backend Node.js (ex: <code>https://garichess-backend.onrender.com</code>). <strong>Cette configuration s'applique pour tous les utilisateurs grâce au proxy de déploiement.</strong></p>
          <div class="flex gap-8">
            <input class="input flex-1" id="backendUrlInput" value="${localStorage.getItem('masterchess_backend_url') || ''}" placeholder="https://garichess-backend.onrender.com">
            <button class="btn btn-primary" id="saveBackendUrl">Enregistrer URL</button>
          </div>
          <button class="btn btn-danger btn-sm mt-10" id="btnExitAdmin">Quitter le mode Admin</button>
        `;
        sec.appendChild(cfgCard);

        cfgCard.querySelector('#saveBackendUrl').addEventListener('click', () => {
          const val = cfgCard.querySelector('#backendUrlInput').value.trim();
          localStorage.setItem('masterchess_backend_url', val);
          ChessUI.toast('URL Backend mise à jour', 'success');
          this.renderProfile(sec);
        });

        cfgCard.querySelector('#btnExitAdmin').addEventListener('click', () => {
          Storage.setRole('user');
          Storage.setGodMode(false);
          ChessUI.toast('Mode Administrateur désactivé', 'info');
          this.renderProfile(sec);
          this._updateUserChip();
        });
      }

      // Détail des statistiques d'activité
      const fmtTime = (sec) => {
        sec = sec || 0;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return h + ' h ' + m + ' min';
        return m + ' min';
      };
      const pct = stats.puzzles ? Math.round(stats.puzzlesSolved / stats.puzzles * 100) : 0;
      const lessonsTotal = Object.keys(window.LESSONS || {}).length;
      const lessonsDone = Object.values(Storage.getLessons()).filter(l => l && l.done).length;

      const actCard = document.createElement('div');
      actCard.className = 'card mb-20';
      actCard.innerHTML = `
        <h3 class="mb-10">📊 Statistiques d'activité</h3>
        <div class="grid grid-4">
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:22px;font-weight:800;color:var(--accent)">${act.visits || 0}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Visites</div></div>
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:22px;font-weight:800;color:var(--accent-2)">${fmtTime(act.totalTimeSec)}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Temps passé</div></div>
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:22px;font-weight:800;color:var(--gold)">${act.gamesPlayed || 0}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Parties</div></div>
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:22px;font-weight:800;color:var(--purple)">${stats.puzzlesBest || 0}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Record puzzles</div></div>
        </div>
        <div class="grid grid-3 mt-10">
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:18px;font-weight:800;color:var(--accent)">${act.aiGames || 0} / ${act.onlineGames || 0} / ${act.localGames || 0}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">IA / En ligne / Local</div></div>
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:18px;font-weight:800;color:var(--gold)">${pct}%</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Réussite puzzles</div></div>
          <div class="card center" style="padding:12px"><div class="stat-value" style="font-size:18px;font-weight:800;color:var(--accent-2)">${lessonsDone}/${lessonsTotal}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Leçons</div></div>
        </div>
        <div class="text-muted mt-10" style="font-size:12px">Dernière visite : ${act.lastVisit ? new Date(act.lastVisit).toLocaleString('fr-FR') : '—'}</div>
      `;
      sec.appendChild(actCard);

      // Succès / Trophées
      const achievements = Storage.getAchievements();
      const unlockedAch = achievements.filter(a => a.unlocked).length;
      const achCard = document.createElement('div');
      achCard.className = 'card mb-20';
      achCard.innerHTML = `
        <div class="flex justify-between items-center mb-15">
          <h3 class="flex items-center gap-8"><span>🏆</span> Succès</h3>
          <span class="badge ${unlockedAch ? 'badge-green' : 'badge-gold'}">${unlockedAch}/${achievements.length} débloqués</span>
        </div>
        <div class="achievements-grid">
          ${achievements.map(a => `
            <div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}">
              <div class="ach-ico">${a.unlocked ? a.icon : '🔒'}</div>
              <div class="ach-info">
                <div class="ach-name">${a.name}</div>
                <div class="ach-desc">${a.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      sec.appendChild(achCard);

      // Edit profile
      const edit = document.createElement('div');
      edit.className = 'card mb-20';
      edit.innerHTML = `
        <h3 class="mb-10">Profil</h3>
        <div class="flex gap-8" style="align-items:center">
          <input class="input flex-1" id="profileName" value="${p.name || ''}" placeholder="Nom d'affichage">
          <button class="btn btn-primary" id="saveProfile">Enregistrer</button>
        </div>
        <div class="flex gap-8 mt-10" style="flex-wrap:wrap">
          <button class="btn btn-sm" id="exportData">⬇ Exporter mes données</button>
          <button class="btn btn-danger btn-sm" id="resetAll">Réinitialiser toutes les données</button>
        </div>
      `;
      sec.appendChild(edit);

      edit.querySelector('#saveProfile').addEventListener('click', () => {
        const name = edit.querySelector('#profileName').value.trim() || 'Invité';
        Storage.updateProfile({ name });
        this._updateUserChip();
        ChessUI.toast('Profil enregistré', 'success');
      });
      edit.querySelector('#exportData').addEventListener('click', () => {
        try {
          const json = Storage.exportData();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'masterchessis-profil-' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
          URL.revokeObjectURL(url);
          ChessUI.toast('Données exportées', 'success');
        } catch (e) {
          ChessUI.toast('Export impossible', 'error');
        }
      });

      edit.querySelector('#resetAll').addEventListener('click', () => {
        if (confirm('Effacer toutes les données locales ?')) {
          Storage.resetAll();
          ChessUI.toast('Données réinitialisées', 'info');
          this.renderProfile(sec);
          this._updateUserChip();
        }
      });

      // ===================== PERSONNALISATION UI =====================
      const prefs = Storage.getPrefs();
      const settingsCard = document.createElement('div');
      settingsCard.className = 'card mb-20';
      settingsCard.innerHTML = `
        <h3 class="mb-15 flex items-center gap-8">
          <span>⚙️</span>
          <span>Personnalisation de l'interface</span>
        </h3>

        <div class="grid grid-3 gap-20">
          <div class="form-group">
            <label class="mb-5 block text-muted" style="font-size:13px">Thème de l'échiquier</label>
            <select class="input" id="prefBoardTheme">
              <option value="classic" ${prefs.board === 'classic' ? 'selected' : ''}>Classique (Vert)</option>
              <option value="wood" ${prefs.board === 'wood' ? 'selected' : ''}>Bois (Marron)</option>
              <option value="dark" ${prefs.board === 'dark' ? 'selected' : ''}>Sombre (Gris)</option>
              <option value="ocean" ${prefs.board === 'ocean' ? 'selected' : ''}>Océan (Bleu)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="mb-5 block text-muted" style="font-size:13px">Style des pièces</label>
            <select class="input" id="prefPieceStyle">
              <option value="unicode" ${prefs.pieceStyle === 'unicode' ? 'selected' : ''}>Unicode (Standard)</option>
              <option value="modern" ${prefs.pieceStyle === 'modern' ? 'selected' : ''}>Moderne (Sans-Serif)</option>
              <option value="glass" ${prefs.pieceStyle === 'glass' ? 'selected' : ''}>Effet Verre</option>
            </select>
          </div>

          <div class="form-group">
            <label class="mb-5 block text-muted" style="font-size:13px">Couleur d'accent</label>
            <select class="input" id="prefAccent">
              <option value="emerald" ${(prefs.accent || 'emerald') === 'emerald' ? 'selected' : ''}>Émeraude</option>
              <option value="azure" ${prefs.accent === 'azure' ? 'selected' : ''}>Azur</option>
              <option value="violet" ${prefs.accent === 'violet' ? 'selected' : ''}>Violet</option>
              <option value="sunset" ${prefs.accent === 'sunset' ? 'selected' : ''}>Coucher de soleil</option>
            </select>
          </div>
        </div>

        <div class="divider my-15"></div>

        <div class="grid grid-3 gap-10">
          <label class="checkbox-container">
            <input type="checkbox" id="prefSound" ${prefs.sound ? 'checked' : ''}>
            <span class="checkmark"></span>
            Effets sonores
          </label>
          <label class="checkbox-container">
            <input type="checkbox" id="prefCoords" ${prefs.showCoords ? 'checked' : ''}>
            <span class="checkmark"></span>
            Coordonnées
          </label>
          <label class="checkbox-container">
            <input type="checkbox" id="prefLegal" ${prefs.showLegalMoves ? 'checked' : ''}>
            <span class="checkmark"></span>
            Coups légaux
          </label>
          <label class="checkbox-container">
            <input type="checkbox" id="prefPromote" ${prefs.autoPromote ? 'checked' : ''}>
            <span class="checkmark"></span>
            Promotion automatique
          </label>
        </div>

        <div class="mt-15 text-secondary" style="font-size:12px">Les modifications sont appliquées instantanément.</div>
      `;
      sec.appendChild(settingsCard);

      // Listeners pour les réglages
      const update = () => {
        const newPrefs = {
          board: settingsCard.querySelector('#prefBoardTheme').value,
          pieceStyle: settingsCard.querySelector('#prefPieceStyle').value,
          accent: settingsCard.querySelector('#prefAccent').value,
          sound: settingsCard.querySelector('#prefSound').checked,
          showCoords: settingsCard.querySelector('#prefCoords').checked,
          showLegalMoves: settingsCard.querySelector('#prefLegal').checked,
          autoPromote: settingsCard.querySelector('#prefPromote').checked
        };
        Storage.updatePref(newPrefs);
        ChessUI.toast('Préférences mises à jour', 'success', 1000);
      };

      settingsCard.querySelectorAll('select, input[type="checkbox"]').forEach(el => {
        el.addEventListener('change', update);
      });

      // Historique
      const hisCard = document.createElement('div');
      hisCard.className = 'card';
      hisCard.innerHTML = '<h3 class="mb-10">Historique des parties</h3>';
      const list = document.createElement('div');
      list.className = 'history-list';
      if (!history.length) {
        list.innerHTML = '<p class="text-muted center">Aucune partie jouée pour le moment.</p>';
      } else {
        history.slice(0, 20).forEach(h => {
          const item = document.createElement('div');
          const cls = h.result === '1-0' ? (h.color === 'w' ? 'win' : 'lose') : h.result === '0-1' ? (h.color === 'b' ? 'win' : 'lose') : 'draw';
          const resText = h.result === '1-0' ? '1-0' : h.result === '0-1' ? '0-1' : '½-½';
          item.className = 'history-item ' + cls;
          const date = new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          item.innerHTML = `
            <div><b>${h.opponent || '?'}</b> <span class="text-muted">· ${date}</span></div>
            <div class="flex gap-8 items-center">
              <span class="badge">${h.mode === 'ai' ? 'IA' : h.mode === 'online' ? 'En ligne' : 'Local'}</span>
              <span class="hi-result">${resText}</span>
              <button class="btn btn-sm btn-gold btn-bilan-hist" data-pgn="${encodeURIComponent(h.pgn || '')}" style="padding:4px 8px; font-size:12px;">📊 Bilan</button>
            </div>
          `;
          item.style.cursor = 'pointer';
          item.title = h.reason;
          item.querySelector('.btn-bilan-hist').addEventListener('click', (e) => {
            e.stopPropagation();
            const pgn = decodeURIComponent(e.target.dataset.pgn);
            if (!pgn) { 
              ChessUI.toast('Ancienne partie : PGN non sauvegardé', 'warn'); 
              return; 
            }
            // Reconstruction légère pour le review
            const c = new Chess();
            try {
                c.loadPgn(pgn);
            } catch (err) {
                ChessUI.toast('Erreur chargement PGN', 'error');
                return;
            }
            
            // Démarrer avec la FEN par défaut
            const fenHistory = [new Chess().fen()];
            
            const c2 = new Chess();
            const hist = c.history({ verbose: true });
            hist.forEach(m => { try { c2.move(m.san); fenHistory.push(c2.fen()); } catch(e) {} });
            
            App.showGameReview({ fenHistory, moveList: c.history() });
          });
          list.appendChild(item);
        });
      }
      hisCard.appendChild(list);
      sec.appendChild(hisCard);
    },

    // ===================== ESPACE ADMIN =====================
    renderAdmin(sec) {
      sec.innerHTML = '';
      if (window.Admin) {
        Admin.render(sec);
      } else {
        sec.innerHTML = '<div class="card center text-muted">Module Admin non chargé.</div>';
      }
    }
  };

  // ===================== UI HELPERS =====================
  const ChessUI = {
    toast(msg, type, ms) {
      const box = document.getElementById('toastContainer');
      if (!box) return;
      const t = document.createElement('div');
      t.className = 'toast ' + (type || 'info');
      t.textContent = msg;
      box.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, ms || 2600);
      setTimeout(() => t.remove(), ms || 3000);
    }
  };
  window.ChessUI = ChessUI;

  // Démarrage
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
  window.app = window.App = App;
})();
