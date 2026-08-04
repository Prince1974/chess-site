/* ============================================================
   ChessArena — app.js
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
      this._bindNav();
      this._initRoot();
      // Écouter le hash pour le routing
      window.addEventListener('hashchange', () => this._onHash());
      const route = window.location.hash.replace('#/', '') || 'home';
      this.navigate(route);
      this._updateUserChip();
      // Boucle d'horloge
      setInterval(() => {
        if (this.game) this.game.updateClockDisplay();
      }, 200);
    },

    _initRoot() {
      document.getElementById('appRoot').innerHTML = '<section data-view="home"></section><section data-view="play"></section><section data-view="puzzles"></section><section data-view="learn"></section><section data-view="openings"></section><section data-view="analyze"></section><section data-view="profile"></section>';
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
      document.querySelector('.brand').addEventListener('click', () => this.navigate('home'));
      document.getElementById('hamburger').addEventListener('click', () => {
        document.getElementById('mainNav').classList.toggle('open');
      });
    },

    navigate(route) {
      const valid = ['home', 'play', 'puzzles', 'learn', 'openings', 'analyze', 'profile'];
      if (!valid.includes(route)) route = 'home';
      // Fermer la nav mobile
      document.getElementById('mainNav').classList.remove('open');
      // Mettre à jour hash
      if (window.location.hash !== '#/' + route) {
        history.pushState(null, '', '#/' + route);
      }
      this._activate(route);
    },

    _onHash() {
      const route = window.location.hash.replace('#/', '') || 'home';
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
        profile: () => this.renderProfile(sec)
      };
      renderers[route]();
    },

    _updateUserChip() {
      const p = Storage.getProfile();
      document.getElementById('userName').textContent = p.name || 'Invité';
      document.getElementById('avatarLetter').textContent = (p.avatar || p.name || 'J').charAt(0).toUpperCase();
    },

    // ===================== ACCUEIL =====================
    renderHome(sec) {
      sec.innerHTML = '';
      const stats = Storage.getStats();
      const elo = Storage.getElo();

      // Hero
      const hero = document.createElement('div');
      hero.className = 'hero';
      hero.innerHTML = `
        <h1>Jouez, apprenez, <span class="text-accent">progressez</span></h1>
        <p>ChessArena : échecs en ligne contre l'IA ou des joueurs réels, puzzles, cours et analyse par Stockfish.</p>
        <div class="hero-btns">
          <button class="btn btn-cta" data-go="play">♟ Jouer maintenant</button>
          <button class="btn" data-go="online">🌐 Multijoueur</button>
          <button class="btn btn-blue" data-go="puzzles">🧩 Puzzles</button>
        </div>
      `;
      sec.appendChild(hero);

      const features = document.createElement('div');
      features.className = 'features';
      const items = [
        { icon: '⚔️', title: 'Contre l\'IA', desc: 'Affrontez Stockfish à 10 niveaux de difficulté.', route: 'play' },
        { icon: '🌐', title: 'Multijoueur réel', desc: 'Défiez vos amis via un code de partie (WebRTC).', route: 'play', online: true },
        { icon: '🧩', title: 'Puzzles', desc: 'Entraînez-vous avec des exercices tactiques classés.', route: 'puzzles' },
        { icon: '📚', title: 'Leçons', desc: 'Cours progressifs du niveau débutant au avancé.', route: 'learn' },
        { icon: '♟', title: 'Ouvertures', desc: 'Explorez les grandes ouvertures et leurs idées.', route: 'openings' },
        { icon: '📊', title: 'Analyse', desc: 'Analysez vos parties avec Stockfish en profondeur.', route: 'analyze' }
      ];
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'feature-card';
        card.innerHTML = `<div class="feature-icon">${it.icon}</div><h3>${it.title}</h3><p>${it.desc}</p>`;
        card.addEventListener('click', () => it.online ? this.navigate('play#online') : this.navigate(it.route));
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

    _renderAISetup() {
      const host = document.getElementById('modeContent');
      if (!host) return;
      host.innerHTML = `
        <div class="form-group">
          <label>Niveau de difficulté</label>
          <div class="time-select">
            ${[1,2,3,4,5,6,7,8,9,10].map(l =>
              `<div class="time-option" data-level="${l}"><div class="t-label">${l}</div><div class="t-desc">${this._levelLabel(l)}</div></div>`
            ).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Temps / incrément</label>
          <div class="time-select">
            <div class="time-option selected" data-time="10" data-inc="0"><div class="t-label">10 min</div><div class="t-desc">Rapide</div></div>
            <div class="time-option" data-time="3" data-inc="2"><div class="t-label">3+2</div><div class="t-desc">Blitz</div></div>
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

      let selLevel = 5, selTime = 10, selInc = 0, selColor = 'w';

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
        this.startGame('ai', { level: selLevel, time: selTime, increment: selInc, color: selColor });
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
            <div class="time-option" data-time="3" data-inc="2"><div class="t-label">3+2</div><div class="t-desc">Blitz</div></div>
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
          <div class="time-option" data-time="3" data-inc="2"><div class="t-label">3+2</div><div class="t-desc"></div></div>
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
      Analyze.render(sec);
    },

    // ===================== PROFIL =====================
    renderProfile(sec) {
      sec.innerHTML = '';
      const p = Storage.getProfile();
      const stats = Storage.getStats();
      const elo = Storage.getElo();
      const history = Storage.getHistory();

      // Header
      const header = document.createElement('div');
      header.className = 'profile-header';
      header.innerHTML = `
        <div class="profile-avatar">${(p.avatar || p.name || 'J').charAt(0).toUpperCase()}</div>
        <div class="profile-name">
          <h2>${p.name || 'Invité'}</h2>
          <div class="profile-elo">
            <span class="badge badge-green">Rapide ${elo.rapid}</span>
            <span class="badge badge-blue">Blitz ${elo.blitz}</span>
            <span class="badge badge-gold">Puzzles ${elo.puzzle}</span>
          </div>
        </div>
      `;
      sec.appendChild(header);

      // Stats grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-3 mb-20';
      grid.innerHTML = `
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--accent)">${stats.wins}</div><div class="stat-label text-muted">Victoires</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--danger)">${stats.losses}</div><div class="stat-label text-muted">Défaites</div></div>
        <div class="card center"><div class="stat-value" style="font-size:26px;font-weight:800;color:var(--gold)">${stats.draws}</div><div class="stat-label text-muted">Nulles</div></div>
      `;
      sec.appendChild(grid);

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
            </div>
          `;
          item.style.cursor = 'pointer';
          item.title = h.reason;
          list.appendChild(item);
        });
      }
      hisCard.appendChild(list);
      sec.appendChild(hisCard);
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
