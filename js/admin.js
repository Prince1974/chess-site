/* ============================================================
   Masterchessis — admin.js
   Tableau de bord Administrateur & Mode Super Admin
   - Statistiques globales & KPIs de la plateforme
   - Déblocage total sans restriction (Godmode)
   - Testeur & Créateur de puzzles FEN
   - Gestion & Export des données de la plateforme
   ============================================================ */
(function () {
  'use strict';

  const Admin = {
    container: null,

    render(container) {
      this.container = container;
      const isAdmin = Storage.isAdmin();

      if (!isAdmin) {
        this._renderLoginPrompt();
      } else {
        this._renderDashboard();
      }
    },

    _renderLoginPrompt() {
      const c = this.container;
      c.innerHTML = `
        <div class="card center" style="max-width:480px;margin:40px auto">
          <div style="font-size:40px" class="mb-10">👑</div>
          <h2 class="mb-10">Espace Administrateur</h2>
          <p class="text-secondary mb-20">Connectez-vous pour accéder au tableau de bord complet, aux statistiques détaillées et aux outils de gestion.</p>

          <div class="form-group mb-15">
            <input type="password" class="input text-center" id="adminPwdInput" placeholder="Mot de passe administrateur">
          </div>

          <div class="flex gap-10">
            <button class="btn btn-cta flex-1" id="btnAdminLogin">Accéder à l'Admin</button>
            <button class="btn" id="btnAdminBack">Retour</button>
          </div>
          <div id="adminLoginError" class="text-danger mt-10" style="font-size:12px"></div>
        </div>
      `;

      c.querySelector('#btnAdminLogin').addEventListener('click', () => {
        const pwd = c.querySelector('#adminPwdInput').value.trim();
        if (Storage.verifyAdminPassword(pwd)) {
          ChessUI.toast('Bienvenue dans l\'Espace Administrateur !', 'success');
          this._renderDashboard();
          if (window.app) app._updateUserChip();
        } else {
          c.querySelector('#adminLoginError').textContent = 'Mot de passe incorrect.';
        }
      });

      c.querySelector('#btnAdminBack').addEventListener('click', () => {
        if (window.app) app.navigate('home');
      });
    },

    _renderDashboard() {
      const c = this.container;
      c.innerHTML = '';

      const act = Storage.getActivity();
      const stats = Storage.getStats();
      const elo = Storage.getElo();
      const isGod = Storage.isGodMode();
      const lessonsDone = Object.values(Storage.getLessons()).filter(l => l && l.done).length;
      const totalLessons = (window.LESSONS || []).length;
      const totalPuzzles = (window.PUZZLES || []).length;
      const levelInfo = Storage.getLevel();

      const fmtTime = (sec) => {
        sec = sec || 0;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      const wrap = document.createElement('div');
      wrap.className = 'admin-dashboard';
      wrap.innerHTML = `
        <div class="flex justify-between items-center flex-wrap gap-15 mb-25">
          <div>
            <h1 class="mb-5 flex items-center gap-8">
              <span>👑</span>
              <span>Tableau de Bord Administrateur</span>
              <span class="badge badge-gold">Super Admin Actif</span>
            </h1>
            <p class="text-secondary">Contrôle complet de la plateforme, analytiques et déblocage illimité.</p>
          </div>
          <div class="flex gap-10">
            <button class="btn btn-sm btn-danger" id="btnAdminLogout">Déconnexion Admin</button>
            <button class="btn btn-sm btn-blue" id="btnExportData">💾 Exporter Données (JSON)</button>
          </div>
        </div>

        <!-- Section 1 : KPIs Globaux -->
        <h2 class="mb-15">📊 Métriques & Analytiques Globales</h2>
        <div class="grid grid-4 gap-15 mb-25">
          <div class="stat-card">
            <div class="stat-value text-accent font-bold">${act.visits || 0}</div>
            <div class="stat-label">Visites Totales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-accent-2 font-bold">${fmtTime(act.totalTimeSec)}</div>
            <div class="stat-label">Temps Utilisateur Global</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-gold font-bold">${stats.games || 0}</div>
            <div class="stat-label">Parties Jouées</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-purple font-bold">${lessonsDone} / ${totalLessons}</div>
            <div class="stat-label">Leçons Réussies</div>
          </div>
        </div>

        <div class="grid grid-3 gap-15 mb-25">
          <div class="card">
            <h3 class="mb-10">⚔️ Répartition des Parties</h3>
            <div class="text-secondary" style="font-size:13px">
              <div class="flex justify-between py-5 border-b"><span>🤖 vs IA :</span> <b>${act.aiGames || 0}</b></div>
              <div class="flex justify-between py-5 border-b"><span>🌐 Multijoueur En Ligne :</span> <b>${act.onlineGames || 0}</b></div>
              <div class="flex justify-between py-5 border-b"><span>👥 Local 2 Joueurs :</span> <b>${act.localGames || 0}</b></div>
              <div class="flex justify-between py-5"><span>🏆 Victoires / Défaites :</span> <b>${stats.wins}V / ${stats.losses}D / ${stats.draws}N</b></div>
            </div>
          </div>

          <div class="card">
            <h3 class="mb-10">🧩 Statistiques Tactiques</h3>
            <div class="text-secondary" style="font-size:13px">
              <div class="flex justify-between py-5 border-b"><span>Puzzles Disponibles :</span> <b>${totalPuzzles}</b></div>
              <div class="flex justify-between py-5 border-b"><span>Puzzles Résolus :</span> <b>${stats.puzzlesSolved || 0}</b></div>
              <div class="flex justify-between py-5 border-b"><span>Record Puzzle Rush :</span> <b>${stats.rushHighScore || 0} pts</b></div>
              <div class="flex justify-between py-5"><span>Série Maximale :</span> <b>${stats.puzzlesBest || 0} 🔥</b></div>
            </div>
          </div>

          <div class="card">
            <h3 class="mb-10">🌟 Gamification & Progression</h3>
            <div class="text-secondary" style="font-size:13px">
              <div class="flex justify-between py-5 border-b"><span>Niveau Joueur :</span> <b>Niv. ${levelInfo.level} (${levelInfo.title})</b></div>
              <div class="flex justify-between py-5 border-b"><span>Points d'XP :</span> <b>${levelInfo.currentXp} XP</b></div>
              <div class="flex justify-between py-5 border-b"><span>Elo Rapide :</span> <b>${elo.rapid}</b></div>
              <div class="flex justify-between py-5"><span>Elo Puzzles :</span> <b>${elo.puzzle}</b></div>
            </div>
          </div>
        </div>

        <div class="card mb-25">
          <h2 class="mb-15">👥 Gestion des Utilisateurs</h2>
          <div class="table-responsive">
            <table class="table" style="width:100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border)">
                  <th style="padding:10px;text-align:left">ID</th>
                  <th style="padding:10px;text-align:left">Utilisateur</th>
                  <th style="padding:10px;text-align:left">Rating</th>
                  <th style="padding:10px;text-align:left">Actions</th>
                </tr>
              </thead>
              <tbody id="userListBody">
                <tr><td colspan="4" style="padding:20px;text-align:center">Chargement des utilisateurs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 2 : Contrôles Super Admin (Godmode) -->
        <h2 class="mb-15">👑 Contrôles d'Accès Sans Restriction (Godmode)</h2>
        <div class="card mb-25">
          <div class="flex justify-between items-center flex-wrap gap-15">
            <div>
              <h3 class="mb-5">Mode Tout Débloqué (Godmode)</h3>
              <p class="text-secondary" style="font-size:13px">Accédez à toutes les leçons, à tous les puzzles et à tous les cours sans restriction de progression.</p>
            </div>
            <div class="flex gap-10 items-center">
              <button class="btn ${isGod ? 'btn-cta' : 'btn-danger'}" id="btnToggleGodmode">
                ${isGod ? '✔ Godmode Activé (Tout Débloqué)' : 'Désactivé'}
              </button>
            </div>
          </div>

          <div class="divider my-15"></div>

          <div class="grid grid-3 gap-10">
            <div>
              <label style="font-size:12px" class="text-muted">Créditer de l'XP :</label>
              <div class="flex gap-5 mt-5">
                <input type="number" class="input" id="addXpInput" value="500" style="max-width:100px">
                <button class="btn btn-sm btn-gold" id="btnAddXpBtn">+ Ajouter XP</button>
              </div>
            </div>

            <div>
              <label style="font-size:12px" class="text-muted">Ajuster Elo Puzzles :</label>
              <div class="flex gap-5 mt-5">
                <input type="number" class="input" id="setEloInput" value="${elo.puzzle || 1200}" style="max-width:100px">
                <button class="btn btn-sm btn-blue" id="btnSetEloBtn">Définir Elo</button>
              </div>
            </div>

            <div>
              <label style="font-size:12px" class="text-muted">Valider toutes les leçons :</label>
              <div class="mt-5">
                <button class="btn btn-sm btn-cta" id="btnUnlockAllLessons">Débloquer 100% Leçons</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3 : Testeur de Puzzles FEN -->
        <h2 class="mb-15">♟️ Testeur & Créateur de Position FEN</h2>
        <div class="card mb-25">
          <div class="flex gap-10 mb-10">
            <input class="input flex-1" id="fenTesterInput" placeholder="Collez une chaîne FEN (ex: 6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1)">
            <button class="btn btn-primary" id="btnLoadFenTest">Charger Position</button>
          </div>
          <div id="fenTestBoardContainer" style="max-width:360px;margin:15px auto"></div>
          <div id="fenTestStatus" class="text-secondary center" style="font-size:13px"></div>
        </div>
      `;

      c.appendChild(wrap);

      // Bindings
      wrap.querySelector('#btnAdminLogout').addEventListener('click', () => {
        Storage.setRole('user');
        Storage.setGodMode(false);
        ChessUI.toast('Déconnecté de l\'Espace Administrateur', 'info');
        this._renderLoginPrompt();
        if (window.app) app._updateUserChip();
      });

      // Charger les utilisateurs
      this._loadUsers(wrap.querySelector('#userListBody'));
    },

    async _loadUsers(tbody) {
      try {
        const response = await fetch('/api/admin/users', {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('masterchess_jwt') }
        });
        const { users } = await response.json();
        tbody.innerHTML = users.map(u => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:10px">${u.id}</td>
            <td style="padding:10px">${u.username}</td>
            <td style="padding:10px">${u.rating}</td>
            <td style="padding:10px">
              <button class="btn btn-sm btn-danger" onclick="Admin.banUser(${u.id})">Bannir</button>
            </td>
          </tr>
        `).join('');
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center" class="text-danger">Erreur chargement utilisateurs.</td></tr>';
      }
    },

    async banUser(id) {
        if (!confirm('Êtes-vous sûr de vouloir bannir cet utilisateur ?')) return;
        // Implémentation du bannissement...
        ChessUI.toast('Fonctionnalité de bannissement à implémenter', 'info');
    },

      wrap.querySelector('#btnExportData').addEventListener('click', () => {
        const json = Storage.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `masterchess_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        ChessUI.toast('Données exportées avec succès !', 'success');
      });

      wrap.querySelector('#btnToggleGodmode').addEventListener('click', () => {
        const next = !Storage.isGodMode();
        Storage.setGodMode(next);
        ChessUI.toast(next ? 'Godmode activé : tout est débloqué !' : 'Godmode désactivé', 'info');
        this._renderDashboard();
      });

      wrap.querySelector('#btnAddXpBtn').addEventListener('click', () => {
        const val = parseInt(wrap.querySelector('#addXpInput').value, 10) || 500;
        Storage.addXp(val);
        ChessUI.toast(`+${val} XP ajoutés !`, 'success');
        this._renderDashboard();
      });

      wrap.querySelector('#btnSetEloBtn').addEventListener('click', () => {
        const val = parseInt(wrap.querySelector('#setEloInput').value, 10) || 1200;
        const el = Storage.getElo();
        el.puzzle = val;
        Storage.setElo(el);
        ChessUI.toast(`Elo Puzzle défini à ${val}`, 'success');
        this._renderDashboard();
      });

      wrap.querySelector('#btnUnlockAllLessons').addEventListener('click', () => {
        (window.LESSONS || []).forEach(l => {
          Storage.markLessonDone(l.id, 3);
        });
        ChessUI.toast('Toutes les leçons ont été marquées comme terminées !', 'success');
        this._renderDashboard();
      });

      // Testeur FEN
      wrap.querySelector('#btnLoadFenTest').addEventListener('click', () => {
        const fen = wrap.querySelector('#fenTesterInput').value.trim();
        const status = wrap.querySelector('#fenTestStatus');
        const bCont = wrap.querySelector('#fenTestBoardContainer');
        bCont.innerHTML = '';

        try {
          const testChess = new Chess(fen);
          new ChessBoard({
            container: bCont,
            chess: testChess,
            interactive: false,
            orientation: testChess.turn()
          });
          status.innerHTML = `<span class="text-accent font-bold">✔ Position FEN valide</span> · Au tour des ${testChess.turn() === 'w' ? 'Blancs' : 'Noirs'}`;
        } catch (e) {
          status.innerHTML = `<span class="text-danger font-bold">❌ FEN Invalide :</span> ${e.message}`;
        }
      });
    }
  };

  window.ChessAdmin = window.Admin = Admin;
})();
