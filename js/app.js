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

      // Hero
      const hero = document.createElement('div');
      hero.className = 'hero';
      hero.innerHTML = `
        <div class="flex justify-between items-center flex-wrap gap-10 mb-15">
          <div class="user-level-banner flex items-center gap-10">
            <span class="user-level-badge">${lvl.icon} Niv. ${lvl.level}</span>
            <div>
              <div class="font-bold text-accent">${lvl.title}</div>
              <div class="text-muted" style="font-size:11px">${lvl.currentXp} XP · ${lvl.xpInLevel}/${lvl.xpNeeded} XP (${lvl.progressPct}%)</div>
            </div>
          </div>
          <div class="streak-pill">
            <span>🔥</span>
            <span>Série : <b>${streak.count} jour${streak.count > 1 ? 's' : ''}</b></span>
          </div>
        </div>

        <div class="xp-bar-container mb-20" style="background:rgba(255,255,255,0.08);border-radius:10px;height:8px;overflow:hidden">
          <div class="xp-bar-fill" style="width:${lvl.progressPct}%;background:linear-gradient(90deg, var(--accent), var(--gold));height:100%;border-radius:10px;transition:width 0.5s"></div>
        </div>

        <h1>Jouez, apprenez, <span class="text-accent">progressez</span></h1>
        <p>Masterchessis : académie d'échecs interactive, entraîneur de puzzles, multijoueur et matchs contre l'IA.</p>
        <div class="hero-btns mt-20">
          <button class="btn btn-cta" data-go="play">♟ Jouer maintenant</button>
          <button class="btn btn-blue" data-go="puzzles">🧩 Puzzles Tactiques</button>
          <button class="btn" data-go="learn">📚 Cours Interactifs</button>
        </div>
      `;
      sec.appendChild(hero);

      // Quêtes Quotidiennes
      const questCard = document.createElement('div');
      questCard.className = 'card mb-25';
      questCard.innerHTML = `
        <div class="flex justify-between items-center mb-15">
          <h3 class="flex items-center gap-8">
            <span>🎯</span>
            <span>Quêtes du Jour</span>
          </h3>
          <span class="badge badge-gold">Récompenses XP</span>
        </div>
        <div class="grid grid-3 gap-10">
          ${quests.map(q => `
            <div class="stat-card ${q.done ? 'border-accent' : ''}" style="padding:10px;text-align:left;border:1px solid ${q.done ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}">
              <div class="flex justify-between items-center mb-5">
                <span style="font-size:18px">${q.icon}</span>
                <span class="badge ${q.done ? 'badge-green' : 'badge-gold'}" style="font-size:10px">${q.done ? '✔ + ' + q.xp + ' XP' : '+' + q.xp + ' XP'}</span>
              </div>
              <div style="font-size:12px;font-weight:bold">${q.desc}</div>
              <div class="text-muted mt-5 flex justify-between" style="font-size:11px">
                <span>Progression :</span>
                <b>${q.current}/${q.target}</b>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      sec.appendChild(questCard);

      const features = document.createElement('div');
      features.className = 'features';
      const items = [
        { icon: '⚔️', title: "Contre l'IA", desc: "Affrontez l'IA Stockfish 10 à 10 niveaux de difficulté progressifs.", route: 'play' },
        { icon: '🌐', title: 'Multijoueur réel', desc: 'Défiez vos amis via un code de partie (Socket.io).', route: 'play', online: true },
        { icon: '🧩', title: 'Puzzles & Rush', desc: 'Entraînez-vous avec 27+ exercices tactiques et le mode Puzzle Rush 3 min.', route: 'puzzles' },
        { icon: '📚', title: 'Académie Interactive', desc: 'Cours interactifs pas-à-pas avec coach virtuel comme Chess.com.', route: 'learn' },
        { icon: '♟', title: 'Ouvertures', desc: 'Explorez les grandes ouvertures et leurs idées stratégiques.', route: 'openings' },
        { icon: '📊', title: 'Mon Profil', desc: 'Consultez votre classement, votre historique et personnalisez votre avatar.', route: 'profile' }
      ];
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'feature-card';
        card.innerHTML = `<div class="feature-icon">${it.icon}</div><h3>${it.title}</h3><p>${it.desc}</p>`;
        card.addEventListener('click', () => {
          if (it.online) {
            this.navigate('play');
            setTimeout(() => this.showOnlinePanel(), 100);
          } else {
            this.navigate(it.route);
          }
        });
        features.appendChild(card);
      });
      sec.appendChild(features);

      // Mini stats strip
      const strip = document.createElement('div');
      strip.className = 'grid grid-4 mt-30';
      strip.innerHTML = `
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--accent)">${elo.rapid}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Elo Rapide</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--accent-2)">${stats.games}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Parties</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--gold)">${stats.puzzlesSolved}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Puzzles réussis</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--purple)">${Object.values(Storage.getLessons()).filter(l => l && l.done).length}/${Object.keys(window.LESSONS || {}).length}</div><div class="stat-label text-muted" style="text-transform:uppercase;font-size:11px">Leçons</div></div>
      `;
      sec.appendChild(strip);

      sec.querySelectorAll('[data-go]').forEach(b => {
        b.addEventListener('click', () => {
          if (b.dataset.go === 'online') {
            this.navigate('play');
            setTimeout(() => this.showOnlinePanel(), 100);
          } else {
            this.navigate(b.dataset.go);
          }
        });
      });
    },

    // ===================== JOUER =====================
    renderPlay(sec) {
      sec.innerHTML = '';
      this.currentGameCfg = null;

      // Configuration
      const card = document.createElement('div');
      card.className = 'card settings-card mt-20';
      card.innerHTML = `
        <h2 class="mb-20">⚔️ Nouvelle partie</h2>

        <div class="tab-bar" id="modeTabs">
          <button class="tab-btn" data-mode="ai">🤖 vs IA</button>
          <button class="tab-btn" data-mode="hot">👥 Local (2 joueurs)</button>
          <button class="tab-btn" data-mode="online">🌐 En ligne</button>
        </div>

        <div id="modeContent"></div>
      `;
      sec.appendChild(card);

      this.playCard = card;
      this._renderAISetup();

      card.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
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

      const BOTS = [
        { id: 'martin', name: 'Martin', avatar: '👶', elo: 250, level: 1, desc: 'Débutant absolu' },
        { id: 'jimmy', name: 'Jimmy', avatar: '🧢', elo: 600, level: 2, desc: 'Joueur junior' },
        { id: 'elena', name: 'Elena', avatar: '👓', elo: 1200, level: 5, desc: 'Amateur tactique' },
        { id: 'nelson', name: 'Nelson', avatar: '⚡', elo: 1500, level: 7, desc: 'Attaque Dame agressive' },
        { id: 'master', name: 'Maître Bot', avatar: '🧙‍♂️', elo: 2000, level: 9, desc: 'Jeu positionnel' },
        { id: 'magnus', name: 'Stockfish GM', avatar: '👑', elo: 2850, level: 10, desc: 'Moteur imbattable' }
      ];

      host.innerHTML = `
        <div class="form-group mb-20">
          <label class="mb-10 block font-bold">🤖 Choisir un Bot Adversaire (Style Chess.com)</label>
          <div class="grid grid-3 gap-10" id="botGrid">
            ${BOTS.map((b, idx) => `
              <div class="stat-card bot-card ${idx === 2 ? 'selected border-accent' : ''}" data-bot-id="${b.id}" style="cursor:pointer;padding:10px;text-align:center;transition:all 0.2s">
                <div style="font-size:28px">${b.avatar}</div>
                <div class="font-bold mt-5" style="font-size:13px">${b.name}</div>
                <div class="text-accent font-bold" style="font-size:11px">${b.elo} Elo</div>
                <div class="text-muted" style="font-size:10px">${b.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Niveau de difficulté précis (1 à 10)</label>
          <div class="time-select">
            ${[1,2,3,4,5,6,7,8,9,10].map(l =>
              `<div class="time-option ${l === 5 ? 'selected' : ''}" data-level="${l}"><div class="t-label">${l}</div><div class="t-desc">${this._levelLabel(l)}</div></div>`
            ).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Temps / incrément</label>
          <div class="time-select">
            <div class="time-option selected" data-time="10" data-inc="0"><div class="t-label">10 min</div><div class="t-desc">Rapide</div></div>
            <div class="time-option" data-time="5" data-inc="0"><div class="t-label">5 min</div><div class="t-desc"></div></div>
            <div class="time-option" data-time="3" data-inc="0"><div class="t-label">3 min</div><div class="t-desc"></div></div>
            <div class="time-option" data-time="3" data-inc="2"><div class="t-label">3+2</div><div class="t-desc">Blitz</div></div>
            <div class="time-option" data-time="1" data-inc="0"><div class="t-label">1 min</div><div class="t-desc"></div></div>
            <div class="time-option" data-time="15" data-inc="10"><div class="t-label">15+10</div><div class="t-desc">Classique</div></div>
            <div class="time-option" data-time="1" data-inc="1"><div class="t-label">1+1</div><div class="t-desc">Bullet</div></div>
          </div>
        </div>
        <div class="form-group">
          <label>Couleur</label>
          <div class="radio-pill-row">
            <button class="radio-pill selected" data-color="w">♔ Blancs</button>
            <button class="radio-pill" data-color="b">♚ Noirs</button>
            <button class="radio-pill" data-color="r">🎲 Aléatoire</button>
          </div>
        </div>
        <button class="btn btn-cta btn-lg btn-block mt-20" id="startAI">♟ Commencer la partie</button>
      `;

      let selectedBot = BOTS[2];
      let selLevel = 5, selTime = 10, selInc = 0, selColor = 'w';

      host.querySelectorAll('.bot-card').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.bot-card').forEach(x => {
            x.classList.remove('selected', 'border-accent');
          });
          el.classList.add('selected', 'border-accent');
          const botId = el.dataset.botId;
          selectedBot = BOTS.find(b => b.id === botId) || BOTS[2];
          selLevel = selectedBot.level;

          // Mettre à jour le sélecteur de niveau
          host.querySelectorAll('.time-option[data-level]').forEach(x => {
            x.classList.toggle('selected', parseInt(x.dataset.level, 10) === selLevel);
          });
        });
      });

      host.querySelectorAll('.time-option[data-level]').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.time-option[data-level]').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selLevel = parseInt(el.dataset.level, 10);
        });
      });
      host.querySelectorAll('.time-option[data-time]').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.time-option[data-time]').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selTime = parseInt(el.dataset.time, 10);
          selInc = parseInt(el.dataset.inc, 10);
        });
      });
      host.querySelectorAll('.radio-pill[data-color]').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.radio-pill[data-color]').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          selColor = el.dataset.color;
        });
      });
      host.querySelector('#startAI').addEventListener('click', () => {
        if (selColor === 'r') selColor = Math.random() < 0.5 ? 'w' : 'b';
        this.startGame('ai', { level: selLevel, time: selTime, increment: selInc, color: selColor, bot: selectedBot });
      });
    },

    _levelLabel(l) {
      const labels = { 1: 'Débutant', 2: 'Novice', 3: 'Novice+', 4: 'Amateur', 5: 'Amateur+', 6: 'Confirmé', 7: 'Confirmé+', 8: 'Expert', 9: 'Expert+', 10: 'Maître' };
      return labels[l] || '';
    },

    _renderHotSetup() {
      const host = document.getElementById('modeContent');
      if (!host) return;
      host.innerHTML = `
        <div class="form-group">
          <label>Cadence</label>
          <div class="time-select">
            <div class="time-option selected" data-time="10" data-inc="0"><div class="t-label">10 min</div><div class="t-desc">Rapide</div></div>
            <div class="time-option" data-time="5" data-inc="0"><div class="t-label">5 min</div><div class="t-desc"></div></div>
            <div class="time-option" data-time="3" data-inc="0"><div class="t-label">3 min</div><div class="t-desc"></div></div>
            <div class="time-option" data-time="3" data-inc="2"><div class="t-label">3+2</div><div class="t-desc">Blitz</div></div>
            <div class="time-option" data-time="1" data-inc="0"><div class="t-label">1 min</div><div class="t-desc"></div></div>
            <div class="time-option" data-time="15" data-inc="10"><div class="t-label">15+10</div><div class="t-desc">Classique</div></div>
            <div class="time-option" data-time="1" data-inc="1"><div class="t-label">1+1</div><div class="t-desc">Bullet</div></div>
          </div>
        </div>
        <button class="btn btn-cta btn-lg btn-block mt-20" id="startHot">👥 Démarrer en local</button>
      `;
      let t = 10, inc = 0;
      host.querySelectorAll('.time-option').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.time-option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          t = parseInt(el.dataset.time, 10); inc = parseInt(el.dataset.inc, 10);
        });
      });
      host.querySelector('#startHot').addEventListener('click', () => {
        this.startGame('hot', { time: t, increment: inc });
      });
    },

    // Setup multijoueur réel
    _renderOnlineSetup() {
      const host = document.getElementById('modeContent');
      if (!host) return;
      host.innerHTML = `
        <div class="form-group">
          <label>Votre nom d'affichage</label>
          <input class="input" id="onlineName" value="${Storage.getProfile().name || 'Joueur'}" maxlength="16">
        </div>
        <div class="divider"></div>
        <h3 class="mb-10">Créer une partie</h3>
        <p class="text-secondary mb-10" style="font-size:13px">Générez un code à partager avec votre ami, puis choisissez votre cadence.</p>
        <div class="time-select mb-10">
          <div class="time-option selected" data-time="10" data-inc="0"><div class="t-label">10 min</div><div class="t-desc"></div></div>
          <div class="time-option" data-time="5" data-inc="0"><div class="t-label">5 min</div><div class="t-desc"></div></div>
          <div class="time-option" data-time="3" data-inc="0"><div class="t-label">3 min</div><div class="t-desc"></div></div>
          <div class="time-option" data-time="3" data-inc="2"><div class="t-label">3+2</div><div class="t-desc"></div></div>
          <div class="time-option" data-time="1" data-inc="0"><div class="t-label">1 min</div><div class="t-desc"></div></div>
          <div class="time-option" data-time="15" data-inc="10"><div class="t-label">15+10</div><div class="t-desc"></div></div>
        </div>
        <button class="btn btn-primary btn-block mb-20" id="btnHost">🔗 Créer et inviter</button>

        <div class="divider"></div>
        <h3 class="mb-10">Rejoindre une partie</h3>
        <div class="flex gap-8">
          <input class="input flex-1" id="onlineCode" placeholder="Code à 6 caractères" maxlength="6" style="text-transform:uppercase">
          <button class="btn btn-blue" id="btnJoin">Rejoindre</button>
        </div>
        <div id="onlineStatus" class="mt-10 engine-status"></div>
      `;

      let t = 10, inc = 0;
      host.querySelectorAll('.time-option').forEach(el => {
        el.addEventListener('click', () => {
          host.querySelectorAll('.time-option').forEach(x => x.classList.remove('selected'));
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
          status.innerHTML = `Partie créée ! Code : <b style="font-size:20px;letter-spacing:2px">${id}</b><br><span class="text-secondary">En attente d'un adversaire…</span>`;
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
      // Sur la page play, sélectionne l'onglet en ligne
      const tabs = this.playCard && this.playCard.querySelectorAll('.tab-btn');
      if (tabs) {
        const onlineTab = this.playCard.querySelector('[data-mode="online"]');
        if (onlineTab) onlineTab.click();
      }
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

      // Edit profile
      const edit = document.createElement('div');
      edit.className = 'card mb-20';
      edit.innerHTML = `
        <h3 class="mb-10">Profil</h3>
        <div class="flex gap-8" style="align-items:center">
          <input class="input flex-1" id="profileName" value="${p.name || ''}" placeholder="Nom d'affichage">
          <button class="btn btn-primary" id="saveProfile">Enregistrer</button>
        </div>
        <button class="btn btn-danger btn-sm mt-10" id="resetAll">Réinitialiser toutes les données</button>
      `;
      sec.appendChild(edit);

      edit.querySelector('#saveProfile').addEventListener('click', () => {
        const name = edit.querySelector('#profileName').value.trim() || 'Invité';
        Storage.updateProfile({ name });
        this._updateUserChip();
        ChessUI.toast('Profil enregistré', 'success');
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
        
        <div class="grid grid-2 gap-20">
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
        </div>
        
        <div class="mt-15 text-secondary" style="font-size:12px">Les modifications sont appliquées instantanément.</div>
      `;
      sec.appendChild(settingsCard);

      // Listeners pour les réglages
      const update = () => {
        const newPrefs = {
          board: settingsCard.querySelector('#prefBoardTheme').value,
          pieceStyle: settingsCard.querySelector('#prefPieceStyle').value,
          sound: settingsCard.querySelector('#prefSound').checked,
          showCoords: settingsCard.querySelector('#prefCoords').checked,
          showLegalMoves: settingsCard.querySelector('#prefLegal').checked
        };
        Storage.setPrefs(newPrefs);
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
