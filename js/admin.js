/* ============================================================
   Masterchessis — admin.js
   Tableau de bord Administrateur Professionnel (Inspiré de Chess.com)
   - Statistiques globales & KPIs de la plateforme
   - Gestion avancée des utilisateurs (recherche, filtres, ban, reset Elo, rôles, création)
   - Synchronisation Backend REST + Fallback Local haute disponibilité
   - Déblocage total sans restriction (Godmode & Cheat Tools)
   - Testeur & Créateur de puzzles / positions FEN
   ============================================================ */
(function () {
  'use strict';

  const Admin = {
    container: null,
    usersCache: [],
    searchQuery: '',
    roleFilter: 'all',

    render(container) {
      this.container = container;
      const isAdmin = Storage.isAdmin();

      if (!isAdmin) {
        this._renderLoginPrompt();
      } else {
        this._renderDashboard();
      }
    },

    _getBackendUrl() {
      if (window.Online && typeof Online.getBackendUrl === 'function') {
        return Online.getBackendUrl();
      }
      return localStorage.getItem('masterchess_backend_url') || '';
    },

    _getAuthHeaders() {
      const token = localStorage.getItem('masterchess_jwt') || 'masterchess2026';
      return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      };
    },

    _renderLoginPrompt() {
      const c = this.container;
      c.innerHTML = `
        <div class="card center" style="max-width:480px;margin:40px auto;box-shadow:var(--shadow)">
          <div style="font-size:48px" class="mb-10">👑</div>
          <h2 class="mb-10">Espace Administrateur Masterchessis</h2>
          <p class="text-secondary mb-20" style="font-size:14px">Connectez-vous avec vos identifiants administrateur pour accéder à la gestion des utilisateurs, aux analytiques globales et aux outils avancés.</p>

          <div class="form-group mb-15">
            <input type="password" class="input text-center" id="adminPwdInput" placeholder="Mot de passe administrateur (ex: masterchess2026)">
          </div>

          <div class="flex gap-10">
            <button class="btn btn-cta flex-1" id="btnAdminLogin">Accéder au Dashboard</button>
            <button class="btn" id="btnAdminBack">Retour au site</button>
          </div>
          <div id="adminLoginError" class="text-danger mt-10" style="font-size:13px;min-height:20px"></div>
        </div>
      `;

      c.querySelector('#adminPwdInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') c.querySelector('#btnAdminLogin').click();
      });

      c.querySelector('#btnAdminLogin').addEventListener('click', async () => {
        const pwd = c.querySelector('#adminPwdInput').value.trim();
        const errEl = c.querySelector('#adminLoginError');
        errEl.textContent = 'Vérification...';

        // 1. Tenter l'authentification backend si disponible
        const backendUrl = this._getBackendUrl();
        let authSuccess = false;

        try {
          const res = await fetch((backendUrl || '') + '/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd })
          });
          const data = await res.json();
          if (res.ok && data.token) {
            localStorage.setItem('masterchess_jwt', data.token);
            authSuccess = true;
          }
        } catch (e) {
          // Backend hors-ligne, fallback local
        }

        // 2. Vérification locale
        if (authSuccess || Storage.verifyAdminPassword(pwd)) {
          Storage.setRole('admin');
          Storage.setGodMode(true);
          ChessUI.toast('Bienvenue dans le Tableau de bord Administrateur !', 'success');
          this._renderDashboard();
          if (window.app) app._updateUserChip();
        } else {
          errEl.textContent = 'Mot de passe incorrect.';
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
            <p class="text-secondary">Contrôle complet de la plateforme, gestion des comptes, analytiques et réglages système.</p>
          </div>
          <div class="flex gap-10 flex-wrap">
            <button class="btn btn-sm btn-blue" id="btnExportData">💾 Exporter Données (JSON)</button>
            <button class="btn btn-sm btn-danger" id="btnAdminLogout">Déconnexion Admin</button>
          </div>
        </div>

        <!-- Section 1 : KPIs & Analytiques Globales -->
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
              <div class="flex justify-between py-5 border-b"><span>🤖 vs IA Stockfish :</span> <b>${act.aiGames || 0}</b></div>
              <div class="flex justify-between py-5 border-b"><span>🌐 Multijoueur En Ligne :</span> <b>${act.onlineGames || 0}</b></div>
              <div class="flex justify-between py-5 border-b"><span>👥 Local 2 Joueurs :</span> <b>${act.localGames || 0}</b></div>
              <div class="flex justify-between py-5"><span>🏆 Ratio V/D/N :</span> <b>${stats.wins}V / ${stats.losses}D / ${stats.draws}N</b></div>
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

        <!-- Section 2 : Gestion des Utilisateurs -->
        <div class="card mb-25">
          <div class="flex justify-between items-center flex-wrap gap-15 mb-15">
            <div>
              <h2 class="mb-5 flex items-center gap-8">
                <span>👥</span>
                <span>Gestion des Utilisateurs</span>
                <span class="badge badge-green" id="userCountBadge">...</span>
              </h2>
              <p class="text-secondary" style="font-size:13px">Recherchez, gérez les rôles, réinitialisez les classements ou bannissez des comptes.</p>
            </div>
            <div class="flex gap-10 flex-wrap">
              <button class="btn btn-sm btn-cta" id="btnOpenCreateUserModal">➕ Ajouter un Joueur</button>
              <button class="btn btn-sm" id="btnRefreshUsers">🔄 Rafraîchir</button>
            </div>
          </div>

          <div class="grid grid-3 gap-10 mb-15">
            <input class="input" id="adminUserSearch" placeholder="🔍 Rechercher par pseudo ou ID...">
            <select class="input" id="adminRoleFilter">
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs uniquement</option>
              <option value="user">Joueurs uniquement</option>
            </select>
            <select class="input" id="adminSortUsers">
              <option value="rating_desc">Trier par Elo (Décroissant)</option>
              <option value="rating_asc">Trier par Elo (Croissant)</option>
              <option value="id_asc">Trier par ID (Ancien -> Récent)</option>
              <option value="name_asc">Trier par Nom (A-Z)</option>
            </select>
          </div>

          <div class="table-responsive" style="overflow-x:auto">
            <table class="table" style="width:100%; border-collapse: collapse; min-width: 600px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                  <th style="padding:12px 10px">ID</th>
                  <th style="padding:12px 10px">Utilisateur</th>
                  <th style="padding:12px 10px">Rôle</th>
                  <th style="padding:12px 10px">Elo</th>
                  <th style="padding:12px 10px">Stats V/D/N</th>
                  <th style="padding:12px 10px; text-align: right">Actions</th>
                </tr>
              </thead>
              <tbody id="userListBody">
                <tr><td colspan="6" style="padding:25px;text-align:center" class="text-muted">Chargement des utilisateurs en cours...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3 : Contrôles Godmode & Outils Système -->
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

          <div class="grid grid-3 gap-15">
            <div>
              <label style="font-size:12px" class="text-muted block mb-5">Créditer de l'XP au profil actif :</label>
              <div class="flex gap-5">
                <input type="number" class="input" id="addXpInput" value="500" style="max-width:110px">
                <button class="btn btn-sm btn-gold flex-1" id="btnAddXpBtn">+ Ajouter XP</button>
              </div>
            </div>

            <div>
              <label style="font-size:12px" class="text-muted block mb-5">Ajuster Elo Puzzles :</label>
              <div class="flex gap-5">
                <input type="number" class="input" id="setEloInput" value="${elo.puzzle || 1200}" style="max-width:110px">
                <button class="btn btn-sm btn-blue flex-1" id="btnSetEloBtn">Définir Elo</button>
              </div>
            </div>

            <div>
              <label style="font-size:12px" class="text-muted block mb-5">Valider 100% des leçons :</label>
              <div>
                <button class="btn btn-sm btn-cta btn-block" id="btnUnlockAllLessons">Débloquer Toutes les Leçons</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 4 : Testeur & Créateur de Position FEN -->
        <h2 class="mb-15">♟️ Studio FEN & Créateur de Positions</h2>
        <div class="card mb-25">
          <p class="text-secondary mb-10" style="font-size:13px">Testez n'importe quelle position échiquéenne par sa notation Forsyth-Edwards (FEN) pour concevoir des cours ou des puzzles.</p>
          <div class="flex gap-10 mb-15 flex-wrap">
            <input class="input flex-1" id="fenTesterInput" value="r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4" placeholder="Collez une chaîne FEN...">
            <button class="btn btn-primary" id="btnLoadFenTest">Charger Position</button>
            <button class="btn" id="btnResetFenTest">Position Initiale</button>
          </div>
          <div id="fenTestBoardContainer" style="max-width:380px;margin:15px auto"></div>
          <div id="fenTestStatus" class="text-secondary center" style="font-size:13px"></div>
        </div>

        <!-- Modal de création d'utilisateur -->
        <div id="createUserModal" class="modal-overlay" style="display:none">
          <div class="card modal-content" style="max-width:440px;width:90vw">
            <h3 class="mb-15">➕ Créer un Nouvel Utilisateur</h3>
            <div class="form-group mb-10">
              <label style="font-size:12px" class="text-muted">Nom d'utilisateur :</label>
              <input class="input mt-5" id="newUsernameInput" placeholder="Ex: MagnusFan99">
            </div>
            <div class="form-group mb-10">
              <label style="font-size:12px" class="text-muted">Mot de passe :</label>
              <input class="input mt-5" type="password" id="newPasswordInput" placeholder="Minimum 4 caractères">
            </div>
            <div class="form-group mb-15">
              <label style="font-size:12px" class="text-muted">Rôle :</label>
              <select class="input mt-5" id="newUserRoleSelect">
                <option value="user">Joueur standard</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div class="flex gap-10 justify-end">
              <button class="btn" id="btnCloseCreateModal">Annuler</button>
              <button class="btn btn-cta" id="btnSubmitCreateUser">Créer le Compte</button>
            </div>
          </div>
        </div>
      `;

      c.appendChild(wrap);

      this._bindDashboardBindings(wrap);
      this._loadUsers();
    },

    async _loadUsers() {
      const tbody = document.querySelector('#userListBody');
      const countBadge = document.querySelector('#userCountBadge');
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center" class="text-muted">Chargement de la base de données...</td></tr>';

      const backendUrl = this._getBackendUrl();
      let users = null;

      // 1. Essayer le backend API
      try {
        const response = await fetch((backendUrl || '') + '/api/admin/users', {
          headers: this._getAuthHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.users)) {
            users = data.users;
          }
        }
      } catch (err) {
        console.warn('Backend users unavailable, fallback to local users store.');
      }

      // 2. Fallback local / local storage si le backend est hors ligne
      if (!users || !users.length) {
        let localUsers = Storage.get('admin_local_users', null);
        if (!localUsers) {
          // Créer une liste de départ réaliste
          const currentProf = Storage.getProfile();
          localUsers = [
            { id: 1, username: currentProf.username || currentProf.name || 'Admin', role: 'admin', rating: Storage.getElo().rapid || 1500, wins: Storage.getStats().wins || 12, losses: Storage.getStats().losses || 2, draws: Storage.getStats().draws || 1, created_at: new Date().toISOString() },
            { id: 2, username: 'Alex_GrandMaster', role: 'user', rating: 1845, wins: 45, losses: 12, draws: 6, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
            { id: 3, username: 'TacticsHero', role: 'user', rating: 1620, wins: 28, losses: 19, draws: 4, created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
            { id: 4, username: 'Elena_Chess', role: 'user', rating: 1410, wins: 15, losses: 18, draws: 2, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
            { id: 5, username: 'BeginnerBob', role: 'user', rating: 1050, wins: 4, losses: 14, draws: 1, created_at: new Date(Date.now() - 86400000 * 25).toISOString() }
          ];
          Storage.set('admin_local_users', localUsers);
        }
        users = localUsers;
      }

      this.usersCache = users;
      if (countBadge) countBadge.textContent = `${users.length} utilisateur${users.length > 1 ? 's' : ''}`;
      this._renderUserTable();
    },

    _renderUserTable() {
      const tbody = document.querySelector('#userListBody');
      if (!tbody) return;

      const q = (this.searchQuery || '').toLowerCase().trim();
      const roleFilter = this.roleFilter || 'all';
      const sortType = document.querySelector('#adminSortUsers')?.value || 'rating_desc';

      let filtered = this.usersCache.filter(u => {
        const matchesQuery = !q || String(u.id).includes(q) || (u.username && u.username.toLowerCase().includes(q));
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesQuery && matchesRole;
      });

      // Tri
      filtered.sort((a, b) => {
        if (sortType === 'rating_desc') return (b.rating || 1200) - (a.rating || 1200);
        if (sortType === 'rating_asc') return (a.rating || 1200) - (b.rating || 1200);
        if (sortType === 'id_asc') return (a.id || 0) - (b.id || 0);
        if (sortType === 'name_asc') return String(a.username).localeCompare(String(b.username));
        return 0;
      });

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center" class="text-secondary">Aucun utilisateur ne correspond à votre recherche.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(u => {
        const isAdmin = u.role === 'admin';
        return `
          <tr style="border-bottom:1px solid var(--border); transition: background 0.2s">
            <td style="padding:12px 10px; font-weight: bold; color: var(--text-muted)">#${u.id}</td>
            <td style="padding:12px 10px">
              <div class="flex items-center gap-8">
                <span class="avatar" style="width:28px;height:28px;font-size:12px">${(u.username || 'J').charAt(0).toUpperCase()}</span>
                <b>${u.username}</b>
              </div>
            </td>
            <td style="padding:12px 10px">
              <span class="badge ${isAdmin ? 'badge-gold' : 'badge-blue'}">${isAdmin ? '👑 Admin' : '♟ Joueur'}</span>
            </td>
            <td style="padding:12px 10px; font-weight:bold; color:var(--accent)">${u.rating || 1200}</td>
            <td style="padding:12px 10px; font-size:13px; color:var(--text-secondary)">
              <span class="text-accent">${u.wins || 0}V</span> / 
              <span class="text-danger">${u.losses || 0}D</span> / 
              <span class="text-gold">${u.draws || 0}N</span>
            </td>
            <td style="padding:12px 10px; text-align: right">
              <div class="flex gap-5 justify-end">
                <button class="btn btn-sm ${isAdmin ? 'btn-blue' : 'btn-secondary'}" onclick="Admin.toggleRole(${u.id}, '${isAdmin ? 'user' : 'admin'}')" title="Changer le rôle">
                  ${isAdmin ? 'Rétrograder' : 'Promouvoir Admin'}
                </button>
                <button class="btn btn-sm btn-blue" onclick="Admin.resetRating(${u.id})" title="Réinitialiser l'Elo à 1200">Reset Elo</button>
                <button class="btn btn-sm btn-danger" onclick="Admin.banUser(${u.id})" title="Supprimer définitivement ce compte">Suppr.</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    async banUser(id) {
      if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur #${id} ?`)) return;

      const backendUrl = this._getBackendUrl();
      let done = false;

      try {
        const res = await fetch(`${backendUrl || ''}/api/admin/users/${id}/ban`, {
          method: 'POST',
          headers: this._getAuthHeaders()
        });
        if (res.ok) done = true;
      } catch (e) {}

      // Mise à jour cache local
      this.usersCache = this.usersCache.filter(u => Number(u.id) !== Number(id));
      Storage.set('admin_local_users', this.usersCache);

      ChessUI.toast(`Utilisateur #${id} supprimé avec succès`, 'success');
      this._renderUserTable();
      const countBadge = document.querySelector('#userCountBadge');
      if (countBadge) countBadge.textContent = `${this.usersCache.length} utilisateur${this.usersCache.length > 1 ? 's' : ''}`;
    },

    async resetRating(id) {
      if (!confirm(`Réinitialiser l'Elo de l'utilisateur #${id} à 1200 ?`)) return;

      const backendUrl = this._getBackendUrl();
      try {
        await fetch(`${backendUrl || ''}/api/admin/users/${id}/reset-rating`, {
          method: 'POST',
          headers: this._getAuthHeaders()
        });
      } catch (e) {}

      const user = this.usersCache.find(u => Number(u.id) === Number(id));
      if (user) user.rating = 1200;
      Storage.set('admin_local_users', this.usersCache);

      ChessUI.toast(`Rating de l'utilisateur #${id} réinitialisé à 1200`, 'success');
      this._renderUserTable();
    },

    async toggleRole(id, newRole) {
      const backendUrl = this._getBackendUrl();
      try {
        await fetch(`${backendUrl || ''}/api/admin/users/${id}/role`, {
          method: 'POST',
          headers: this._getAuthHeaders(),
          body: JSON.stringify({ role: newRole })
        });
      } catch (e) {}

      const user = this.usersCache.find(u => Number(u.id) === Number(id));
      if (user) user.role = newRole;
      Storage.set('admin_local_users', this.usersCache);

      ChessUI.toast(`Rôle mis à jour : ${newRole === 'admin' ? 'Administrateur' : 'Joueur'}`, 'success');
      this._renderUserTable();
    },

    async createUser(username, password, role) {
      const backendUrl = this._getBackendUrl();
      let created = null;

      try {
        const res = await fetch(`${backendUrl || ''}/api/admin/users/create`, {
          method: 'POST',
          headers: this._getAuthHeaders(),
          body: JSON.stringify({ username, password, role })
        });
        if (res.ok) {
          const data = await res.json();
          created = data.user;
        }
      } catch (e) {}

      if (!created) {
        created = {
          id: this.usersCache.length ? Math.max(...this.usersCache.map(u => u.id || 0)) + 1 : 1,
          username,
          role,
          rating: 1200,
          wins: 0,
          losses: 0,
          draws: 0,
          created_at: new Date().toISOString()
        };
      }

      this.usersCache.unshift(created);
      Storage.set('admin_local_users', this.usersCache);
      ChessUI.toast(`Utilisateur "${username}" créé avec succès !`, 'success');
      this._renderUserTable();
      const countBadge = document.querySelector('#userCountBadge');
      if (countBadge) countBadge.textContent = `${this.usersCache.length} utilisateur${this.usersCache.length > 1 ? 's' : ''}`;
    },

    // Bindings de tout le tableau de bord
    _bindDashboardBindings(wrap) {
      // Déconnexion
      wrap.querySelector('#btnAdminLogout').addEventListener('click', () => {
        Storage.setRole('user');
        Storage.setGodMode(false);
        ChessUI.toast('Déconnecté de l\'Espace Administrateur', 'info');
        this._renderLoginPrompt();
        if (window.app) app._updateUserChip();
      });

      // Export Données JSON
      wrap.querySelector('#btnExportData').addEventListener('click', () => {
        const json = Storage.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `masterchess_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        ChessUI.toast('Données complètes exportées avec succès !', 'success');
      });

      // Godmode
      wrap.querySelector('#btnToggleGodmode').addEventListener('click', () => {
        const next = !Storage.isGodMode();
        Storage.setGodMode(next);
        ChessUI.toast(next ? 'Godmode activé : tout est débloqué !' : 'Godmode désactivé', 'info');
        this._renderDashboard();
      });

      // Ajout XP
      wrap.querySelector('#btnAddXpBtn').addEventListener('click', () => {
        const val = parseInt(wrap.querySelector('#addXpInput').value, 10) || 500;
        Storage.addXp(val);
        ChessUI.toast(`+${val} XP ajoutés au profil actif !`, 'success');
        this._renderDashboard();
      });

      // Définir Elo Puzzles
      wrap.querySelector('#btnSetEloBtn').addEventListener('click', () => {
        const val = parseInt(wrap.querySelector('#setEloInput').value, 10) || 1200;
        const el = Storage.getElo();
        el.puzzle = val;
        Storage.setElo(el);
        ChessUI.toast(`Elo Puzzles défini à ${val}`, 'success');
        this._renderDashboard();
      });

      // Débloquer 100% Leçons
      wrap.querySelector('#btnUnlockAllLessons').addEventListener('click', () => {
        (window.LESSONS || []).forEach(l => {
          Storage.markLessonDone(l.id, 3);
        });
        ChessUI.toast('Toutes les leçons ont été marquées comme terminées ⭐⭐⭐ !', 'success');
        this._renderDashboard();
      });

      // Recherche & Filtres utilisateurs
      const searchInput = wrap.querySelector('#adminUserSearch');
      const roleFilterSelect = wrap.querySelector('#adminRoleFilter');
      const sortSelect = wrap.querySelector('#adminSortUsers');

      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this._renderUserTable();
      });

      roleFilterSelect.addEventListener('change', (e) => {
        this.roleFilter = e.target.value;
        this._renderUserTable();
      });

      sortSelect.addEventListener('change', () => {
        this._renderUserTable();
      });

      wrap.querySelector('#btnRefreshUsers').addEventListener('click', () => {
        this._loadUsers();
        ChessUI.toast('Données utilisateurs rafraîchies', 'info');
      });

      // Modal création utilisateur
      const modal = wrap.querySelector('#createUserModal');
      wrap.querySelector('#btnOpenCreateUserModal').addEventListener('click', () => {
        modal.style.display = 'flex';
        wrap.querySelector('#newUsernameInput').value = '';
        wrap.querySelector('#newPasswordInput').value = '';
      });

      wrap.querySelector('#btnCloseCreateModal').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      wrap.querySelector('#btnSubmitCreateUser').addEventListener('click', () => {
        const u = wrap.querySelector('#newUsernameInput').value.trim();
        const p = wrap.querySelector('#newPasswordInput').value;
        const r = wrap.querySelector('#newUserRoleSelect').value;

        if (!u || u.length < 3) {
          ChessUI.toast('Pseudo trop court (min 3 caractères)', 'error');
          return;
        }
        if (!p || p.length < 4) {
          ChessUI.toast('Mot de passe trop court (min 4 caractères)', 'error');
          return;
        }

        this.createUser(u, p, r);
        modal.style.display = 'none';
      });

      // Studio FEN
      const loadFen = () => {
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
          status.innerHTML = `<span class="text-accent font-bold">✔ Position FEN valide</span> · Au tour des ${testChess.turn() === 'w' ? 'Blancs ♔' : 'Noirs ♚'}`;
        } catch (e) {
          status.innerHTML = `<span class="text-danger font-bold">❌ FEN Invalide :</span> ${e.message}`;
        }
      };

      wrap.querySelector('#btnLoadFenTest').addEventListener('click', loadFen);
      wrap.querySelector('#btnResetFenTest').addEventListener('click', () => {
        wrap.querySelector('#fenTesterInput').value = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        loadFen();
      });

      // Initialiser preview FEN
      setTimeout(loadFen, 100);
    }
  };

  window.ChessAdmin = window.Admin = Admin;
})();

