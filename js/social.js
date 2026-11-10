/* ============================================================
   Masterchessis — social.js
   Communauté : présence, amis, défis, salon, rencontres, régions.
   ============================================================ */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const flag = (code) => (window.Countries && code ? Countries.flag(code) : '🌍');
  const country = (code) => (window.Countries ? Countries.name(code) : '');
  const logged = () => !!localStorage.getItem('masterchess_jwt');

  async function api(path, opts) {
    opts = opts || {};
    const base = window.Online ? Online.getBackendUrl() : '';
    const token = localStorage.getItem('masterchess_jwt') || '';
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(base + path, Object.assign({ credentials: 'include', headers }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  }

  const Social = {
    state: {
      online: [],
      players: [],
      leaderboard: [],
      friends: { friends: [], incoming: [], outgoing: [] },
      lobby: [],
      loading: true
    },
    root: null,

    render(sec) {
      this.root = sec;
      Storage.set('communityVisited', true);
      const p = Storage.getProfile();
      const region = p.region || '';
      const isLogged = logged();
      sec.innerHTML = `
        <div class="community-page">
          <section class="community-hero">
            <div class="community-hero-copy">
              <span class="community-kicker">LE CLUB MONDIAL MASTERCHESSIS</span>
              <h1>Le monde joue ici.<br><em>Et vous ?</em></h1>
              <p>Trouvez un adversaire en un clic, gardez le contact, défiez vos amis et rejoignez les rencontres de votre région.</p>
              <div class="community-actions">
                <button class="btn btn-primary btn-lg" id="communityQuick">⚡ Partie automatique</button>
                <button class="btn btn-secondary" id="communityFind">👥 Trouver un joueur</button>
              </div>
              <div class="community-mini-stats" id="communityMiniStats">
                <span><b>${isLogged ? '●' : '○'}</b> ${isLogged ? 'Compte connecté' : 'Mode invité'}</span>
                <span><b id="communityOnlineCount">0</b> en ligne</span>
              </div>
            </div>
            <div class="community-orbit" aria-hidden="true">
              <div class="orbit-ring ring-1"></div>
              <div class="orbit-ring ring-2"></div>
              <div class="orbit-core">${flag(region || 'CD')}<span>♞</span></div>
              <span class="orbit-flag f1">🇫🇷</span><span class="orbit-flag f2">🇨🇩</span>
              <span class="orbit-flag f3">🇧🇷</span><span class="orbit-flag f4">🇺🇸</span>
              <span class="orbit-flag f5">🇯🇵</span><span class="orbit-flag f6">🇲🇦</span>
            </div>
          </section>

          <div class="community-toolbar card">
            <div class="region-picker">
              <span class="region-big-flag">${flag(region || 'CD')}</span>
              <div>
                <div class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.1em">Votre région</div>
                <select class="input region-select" id="communityRegionSelect">${Countries.options(region, true)}</select>
              </div>
            </div>
            <div class="cadence-picker">
              <label class="text-muted" for="communityTime">Tempo du défi</label>
              <select class="input" id="communityTime">
                <option value="10|0">10 min · Rapide</option>
                <option value="5|0">5 min · Blitz</option>
                <option value="3|2">3+2 · Blitz</option>
                <option value="3|0">3 min · Blitz</option>
                <option value="1|0">1 min · Bullet</option>
                <option value="15|10">15+10 · Classique</option>
              </select>
            </div>
            <button class="btn btn-primary" id="communityQuick2">Chercher une partie</button>
          </div>

          <div class="community-grid">
            <div class="community-col">
              <div class="card community-card">
                <div class="community-card-head">
                  <h3>🟢 Joueurs en ligne</h3>
                  <span class="badge badge-green" id="communityOnlineBadge">0</span>
                </div>
                <div id="communityOnlineList" class="player-list"><div class="community-empty">Le salon se réveille…</div></div>
              </div>

              <div class="card community-card">
                <div class="community-card-head">
                  <h3>🤝 Mes amis</h3>
                  <span class="badge badge-blue" id="communityFriendBadge">0</span>
                </div>
                <div id="communityFriendList" class="player-list"></div>
                <div id="communityRequests"></div>
                <form id="communityFriendForm" class="friend-form">
                  <input class="input" id="communityFriendName" maxlength="24" placeholder="Pseudo d’un joueur">
                  <button class="btn btn-secondary" type="submit">Ajouter</button>
                </form>
              </div>
            </div>

            <div class="community-col">
              <div class="card community-card lobby-card">
                <div class="community-card-head">
                  <h3>💬 Salon du club</h3>
                  <span class="live-pill"><span></span> LIVE</span>
                </div>
                <div class="lobby-messages" id="communityLobbyMessages">
                  <div class="lobby-system">Bienvenue au salon. Présentez-vous, proposez un défi, trouvez un partenaire d’entraînement.</div>
                </div>
                <form class="lobby-form" id="communityLobbyForm">
                  <input class="input" id="communityLobbyInput" maxlength="240" placeholder="Écrire au salon…" autocomplete="off">
                  <button class="btn btn-primary" type="submit">➤</button>
                </form>
              </div>

              <div class="card community-card">
                <div class="community-card-head">
                  <h3>📍 Rencontres près de vous</h3>
                  <button class="btn btn-sm btn-secondary" id="communityMeetupToggle">+ Créer</button>
                </div>
                <div id="communityMeetups" class="meetup-list"></div>
                <form id="communityMeetupForm" class="meetup-form" style="display:none">
                  <input class="input" id="meetupTitle" maxlength="48" placeholder="Nom de la rencontre" required>
                  <input class="input" id="meetupCity" maxlength="32" placeholder="Ville / lieu" required>
                  <input class="input" id="meetupDate" type="date" required>
                  <button class="btn btn-primary" type="submit">Publier</button>
                </form>
              </div>
            </div>
          </div>

          <div class="card community-card leaderboard-card">
            <div class="community-card-head">
              <h3>🏆 Classement régional</h3>
              <span class="text-muted" id="communityRegionLabel">${region ? country(region) : 'Monde'}</span>
            </div>
            <div id="communityLeaderboard" class="leaderboard-list"><div class="community-empty">Chargement…</div></div>
          </div>
        </div>
      `;

      this._bind(sec);
      this._renderMeetups();
      this._load();
      this._connect();
    },

    _connect() {
      if (!window.Online) return;
      Online.onPresence = (players) => {
        this.state.online = players || [];
        this._renderOnline();
        this._renderMiniStats();
      };
      Online.onLobbyChat = (msg) => {
        this.state.lobby.push(msg);
        this._appendLobby(msg);
      };
      Online.connectLobby().catch(() => {});
    },

    async _load() {
      const region = this._region();
      this.state.loading = true;
      const tasks = [
        api('/api/community/online').then(d => { this.state.online = d.players || []; }).catch(() => {}),
        api('/api/community/players' + (region ? '?region=' + encodeURIComponent(region) : '')).then(d => { this.state.players = d.players || []; }).catch(() => {}),
        api('/api/community/leaderboard' + (region ? '?region=' + encodeURIComponent(region) : '')).then(d => { this.state.leaderboard = d.leaderboard || []; }).catch(() => {})
      ];
      if (logged()) {
        tasks.push(api('/api/friends').then(d => { this.state.friends = d; }).catch(() => {}));
        tasks.push(api('/api/me').then(d => {
          if (d.user) {
            Storage.updateProfile({ region: d.user.region || '', username: d.user.username, rating: d.user.rating });
            const sel = this.root && this.root.querySelector('#communityRegionSelect');
            if (sel && d.user.region) sel.value = d.user.region;
          }
        }).catch(() => {}));
      }
      await Promise.all(tasks);
      this.state.loading = false;
      this._renderAll();
    },

    _region() {
      const p = Storage.getProfile();
      return (p.region || '').toUpperCase();
    },

    _bind(sec) {
      if (!sec._socialDelegated) {
        sec._socialDelegated = true;
        sec.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          const user = btn.dataset.user;
          if (action === 'challenge') this.challenge(user);
          else if (action === 'add') this.addFriend(user);
          else if (action === 'accept') this.acceptFriend(btn.dataset.id);
          else if (action === 'remove') this.removeFriend(btn.dataset.id);
          else if (action === 'meetup-join') this.toggleMeetup(btn.dataset.id);
        });
      }
      const quick = () => this.quickMatch();
      sec.querySelector('#communityQuick').addEventListener('click', quick);
      sec.querySelector('#communityQuick2').addEventListener('click', quick);
      sec.querySelector('#communityFind').addEventListener('click', () => {
        const list = sec.querySelector('#communityOnlineList');
        if (list) { list.scrollIntoView({ behavior: 'smooth', block: 'center' }); list.classList.add('pulse-once'); setTimeout(() => list.classList.remove('pulse-once'), 900); }
      });
      sec.querySelector('#communityRegionSelect').addEventListener('change', (e) => this.setRegion(e.target.value));
      sec.querySelector('#communityFriendForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = sec.querySelector('#communityFriendName');
        this.addFriend(input.value.trim());
        input.value = '';
      });
      sec.querySelector('#communityLobbyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = sec.querySelector('#communityLobbyInput');
        const text = input.value.trim();
        if (!text) return;
        if (!window.Online) return;
        Storage.set('chatUsed', true);
        Online.sendLobbyChat(text);
        input.value = '';
      });
      sec.querySelector('#communityMeetupToggle').addEventListener('click', () => {
        const form = sec.querySelector('#communityMeetupForm');
        form.style.display = form.style.display === 'none' ? 'grid' : 'none';
      });
      sec.querySelector('#communityMeetupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = sec.querySelector('#meetupTitle').value.trim();
        const city = sec.querySelector('#meetupCity').value.trim();
        const date = sec.querySelector('#meetupDate').value;
        if (!title || !city || !date) return;
        const list = Storage.get('communityMeetups', []);
        list.unshift({ id: 'm' + Date.now(), title, city, date, region: this._region(), custom: true, joined: false });
        Storage.set('communityMeetups', list);
        sec.querySelector('#communityMeetupForm').reset();
        sec.querySelector('#communityMeetupForm').style.display = 'none';
        this._renderMeetups();
        ChessUI.toast('Rencontre publiée dans votre région', 'success');
      });
    },

    _renderAll() {
      this._renderOnline();
      this._renderFriends();
      this._renderLeaderboard();
      this._renderMiniStats();
    },

    _renderMiniStats() {
      const el = this.root && this.root.querySelector('#communityOnlineCount');
      if (el) el.textContent = this.state.online.length;
    },

    _renderOnline() {
      const box = this.root && this.root.querySelector('#communityOnlineList');
      const badge = this.root && this.root.querySelector('#communityOnlineBadge');
      if (!box) return;
      if (badge) badge.textContent = this.state.online.length;
      const me = Storage.getProfile().username;
      if (!this.state.online.length) {
        const fallback = this.state.players.filter(p => p.username !== me).slice(0, 8);
        if (!fallback.length) {
          box.innerHTML = '<div class="community-empty">Personne n’est encore en ligne. Lancez une partie automatique : quelqu’un vous rejoindra.</div>';
          return;
        }
        box.innerHTML = fallback.map(p => this._playerRow(p, 'Hors ligne')).join('');
        return;
      }
      box.innerHTML = this.state.online.map(p => this._playerRow(p, p.username === me ? 'Vous' : 'En ligne')).join('');
    },

    _playerRow(p, status, friendId) {
      const canAct = logged() && p.username !== Storage.getProfile().username;
      return `
        <div class="player-row">
          <span class="player-flag">${flag(p.region)}</span>
          <div class="player-id">
            <b>${esc(p.username)}${p.is_pro ? ' <span class="badge badge-accent" style="font-size:9px">PRO</span>' : ''}</b>
            <small>${p.region ? esc(country(p.region)) + ' · ' : ''}${p.rating || 1200} Elo</small>
          </div>
          <span class="player-presence ${status === 'En ligne' || status === 'Vous' ? 'on' : ''}">${status === 'Vous' ? 'Vous' : '●'}</span>
          ${canAct ? `<button class="btn btn-sm btn-secondary" data-action="challenge" data-user="${esc(p.username)}">Défier</button>` : ''}
          ${canAct && !friendId ? `<button class="icon-btn" title="Ajouter en ami" data-action="add" data-user="${esc(p.username)}">＋</button>` : ''}
          ${friendId ? `<button class="icon-btn" title="Retirer cet ami" data-action="remove" data-id="${esc(friendId)}">✕</button>` : ''}
        </div>`;
    },

    _renderFriends() {
      const box = this.root && this.root.querySelector('#communityFriendList');
      const req = this.root && this.root.querySelector('#communityRequests');
      const badge = this.root && this.root.querySelector('#communityFriendBadge');
      if (!box) return;
      if (!logged()) {
        box.innerHTML = `<div class="community-empty">Connectez-vous pour garder vos amis, recevoir leurs défis et les retrouver en ligne.<br><button class="btn btn-sm btn-primary mt-10" onclick="app.navigate('profile')">Créer un compte</button></div>`;
        if (req) req.innerHTML = '';
        return;
      }
      const f = this.state.friends;
      if (badge) badge.textContent = f.friends.length;
      box.innerHTML = f.friends.length
        ? f.friends.map(p => this._playerRow(p, p.online ? 'En ligne' : 'Hors ligne', p.id)).join('')
        : '<div class="community-empty">Votre liste est vide. Ajoutez un adversaire avec son pseudo, ou cliquez sur ＋ à côté d’un joueur.</div>';
      if (req) {
        req.innerHTML = (f.incoming && f.incoming.length)
          ? `<div class="request-stack"><div class="request-title">Demandes reçues</div>${f.incoming.map(r => `
              <div class="request-row">
                <span>${flag(r.region)} <b>${esc(r.username)}</b></span>
                <div class="flex gap-6">
                  <button class="btn btn-sm btn-primary" data-action="accept" data-id="${r.id}">Accepter</button>
                  <button class="btn btn-sm btn-danger" data-action="remove" data-id="${r.id}">Refuser</button>
                </div>
              </div>`).join('')}</div>`
          : '';
      }
    },

    _renderLeaderboard() {
      const box = this.root && this.root.querySelector('#communityLeaderboard');
      const label = this.root && this.root.querySelector('#communityRegionLabel');
      const region = this._region();
      if (label) label.textContent = region ? country(region) : 'Monde';
      if (!box) return;
      if (!this.state.leaderboard.length) {
        box.innerHTML = '<div class="community-empty">Le classement régional apparaîtra dès que des joueurs auront enregistré des parties.</div>';
        return;
      }
      box.innerHTML = this.state.leaderboard.map((u, i) => `
        <div class="leaderboard-row">
          <span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>
          <span class="player-flag">${flag(u.region)}</span>
          <span class="leaderboard-name">${esc(u.username)}</span>
          <span class="leaderboard-rating">${u.rating}</span>
          <span class="leaderboard-record">${u.wins || 0}V · ${u.losses || 0}D</span>
        </div>`).join('');
    },

    _renderLobby() {
      const box = this.root && this.root.querySelector('#communityLobbyMessages');
      if (!box) return;
      if (!this.state.lobby.length) return;
      box.innerHTML = '<div class="lobby-system">Bienvenue au salon. Présentez-vous, proposez un défi, trouvez un partenaire d’entraînement.</div>' +
        this.state.lobby.map(m => this._lobbyMessage(m)).join('');
      box.scrollTop = box.scrollHeight;
    },

    _appendLobby(msg) {
      const box = this.root && this.root.querySelector('#communityLobbyMessages');
      if (!box) return;
      const empty = box.querySelector('.lobby-system');
      if (empty && box.children.length === 1) box.innerHTML = '';
      box.insertAdjacentHTML('beforeend', this._lobbyMessage(msg));
      box.scrollTop = box.scrollHeight;
    },

    _lobbyMessage(m) {
      const me = Storage.getProfile().username;
      return `<div class="lobby-message ${m.username === me ? 'mine' : ''}">
        <div class="lobby-meta"><span>${flag(m.region)} <b>${esc(m.username)}</b></span><time>${new Date(m.ts || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time></div>
        <div class="lobby-text">${esc(m.text)}</div>
      </div>`;
    },

    _renderMeetups() {
      const box = this.root && this.root.querySelector('#communityMeetups');
      if (!box) return;
      const seeds = [
        { id: 'seed-cd', title: 'Café échecs de Kinshasa', city: 'Kinshasa, RD Congo', date: 'Chaque samedi · 15h', region: 'CD' },
        { id: 'seed-fr', title: 'Blitz au parc', city: 'Paris, France', date: 'Dimanche · 14h', region: 'FR' },
        { id: 'seed-ci', title: 'Club des jeunes pousses', city: 'Abidjan, Côte d’Ivoire', date: 'Vendredi · 17h', region: 'CI' }
      ];
      const custom = Storage.get('communityMeetups', []);
      const region = this._region();
      const list = custom.concat(seeds).sort((a, b) => (b.region === region) - (a.region === region));
      box.innerHTML = list.slice(0, 5).map(m => {
        const joined = !!Storage.get('joinedMeetup_' + m.id, false);
        return `<div class="meetup-row">
          <div class="meetup-date">${flag(m.region)}</div>
          <div class="meetup-info"><b>${esc(m.title)}</b><small>${esc(m.city)} · ${esc(m.date)}</small></div>
          <button class="btn btn-sm ${joined ? 'btn-secondary' : 'btn-primary'}" data-action="meetup-join" data-id="${esc(m.id)}">${joined ? 'Inscrit ✓' : 'Rejoindre'}</button>
        </div>`;
      }).join('');
    },

    toggleMeetup(id) {
      const key = 'joinedMeetup_' + id;
      const joined = !!Storage.get(key, false);
      Storage.set(key, !joined);
      this._renderMeetups();
      ChessUI.toast(joined ? 'Inscription annulée' : 'Vous êtes inscrit à la rencontre !', joined ? 'info' : 'success');
    },

    _tempo() {
      const raw = this.root && this.root.querySelector('#communityTime') ? this.root.querySelector('#communityTime').value : '10|0';
      const bits = raw.split('|');
      return { time: Number(bits[0]) || 10, inc: Number(bits[1]) || 0 };
    },

    quickMatch() {
      const t = this._tempo();
      App.navigate('play');
      setTimeout(() => {
        if (window.Online) Online.quickMatch(t);
        ChessUI.toast('Recherche d’un adversaire ' + t.time + ' min…', 'info', 4000);
      }, 60);
    },

    async challenge(username) {
      if (!logged()) return this._needLogin();
      const t = this._tempo();
      try {
        await Online.challenge(username, t.time, t.inc);
        ChessUI.toast('Défi envoyé à ' + username, 'success');
      } catch (e) {
        ChessUI.toast(e.message || 'Défi impossible', 'error');
      }
    },

    async addFriend(username) {
      if (!logged()) return this._needLogin();
      if (!username) return;
      try {
        const d = await api('/api/friends/request', { method: 'POST', body: JSON.stringify({ username }) });
        ChessUI.toast(d.message || 'Demande envoyée', 'success');
        await this._loadFriends();
      } catch (e) {
        ChessUI.toast(e.message, 'error');
      }
    },

    async acceptFriend(id) {
      try {
        await api('/api/friends/accept', { method: 'POST', body: JSON.stringify({ id }) });
        ChessUI.toast('Ami ajouté', 'success');
        await this._loadFriends();
      } catch (e) { ChessUI.toast(e.message, 'error'); }
    },

    async removeFriend(id) {
      try {
        await api('/api/friends/remove', { method: 'POST', body: JSON.stringify({ id }) });
        ChessUI.toast('Contact retiré', 'info');
        await this._loadFriends();
      } catch (e) { ChessUI.toast(e.message, 'error'); }
    },

    async _loadFriends() {
      if (!logged()) return;
      try {
        this.state.friends = await api('/api/friends');
        this._renderFriends();
      } catch (e) {}
    },

    async setRegion(code) {
      code = (code || '').toUpperCase();
      Storage.updateProfile({ region: code });
      if (logged()) {
        try { await api('/api/profile/region', { method: 'POST', body: JSON.stringify({ region: code }) }); } catch (e) {}
      }
      const p = this.root.querySelector('.region-big-flag');
      if (p) p.textContent = flag(code);
      if (this.root.querySelector('.orbit-core')) this.root.querySelector('.orbit-core').firstChild.textContent = flag(code);
      this._renderMeetups();
      this._load();
      ChessUI.toast(code ? 'Région mise à jour : ' + country(code) : 'Région effacée', 'success');
    },

    _needLogin() {
      ChessUI.toast('Connectez-vous pour utiliser le réseau du club.', 'info', 3500);
      App.navigate('profile');
    }
  };

  window.Social = Social;
})();
