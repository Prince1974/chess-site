/* ============================================================
   Masterchessis — auth.js
   Comptes : inscription email, connexion, Google, mot de passe oublié
   et changement de mot de passe.
   ============================================================ */
(function () {
  'use strict';

  const TOKEN_KEY = 'masterchess_jwt';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function baseUrl() {
    if (window.Online && Online.getBackendUrl) return Online.getBackendUrl();
    const custom = localStorage.getItem('masterchess_backend_url');
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
    if (window.MASTERCHESS_BACKEND) return String(window.MASTERCHESS_BACKEND).replace(/\/+$/, '');
    return '';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const Auth = {
    modal: null,
    config: null,
    mode: 'login',
    busy: false,

    getToken() {
      return localStorage.getItem(TOKEN_KEY) || '';
    },

    isLogged() {
      const p = window.Storage ? Storage.getProfile() : {};
      return !!this.getToken() && !!p.username;
    },

    async api(path, opts) {
      opts = opts || {};
      const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      const token = this.getToken();
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await fetch(baseUrl() + path, Object.assign({ credentials: 'include', headers }, opts));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'Erreur serveur');
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    },

    applyUser(user) {
      if (!user || !window.Storage) return;
      Storage.updateProfile({
        name: user.username || 'Joueur',
        username: user.username || null,
        email: user.email || null,
        avatar: (user.username || 'J').charAt(0).toUpperCase(),
        region: user.region || '',
        rating: user.rating || 1200,
        serverUser: user
      });
      if (window.App && App._updateUserChip) App._updateUserChip();
    },

    async restore() {
      if (!this.getToken()) return null;
      try {
        const data = await this.api('/api/me');
        if (data && data.user) {
          this.applyUser(data.user);
          if (window.App && App.currentRoute === 'profile') {
            const sec = document.querySelector('section[data-view="profile"]');
            if (sec) App.renderProfile(sec);
          }
          return data.user;
        }
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        if (e.status === 401) localStorage.removeItem(TOKEN_KEY);
      }
      return null;
    },

    async logout() {
      try { await this.api('/api/logout', { method: 'POST' }); } catch (e) {}
      localStorage.removeItem(TOKEN_KEY);
      if (window.Storage) Storage.updateProfile({ name: 'Invité', username: null, email: null, serverUser: null });
      if (window.App && App._updateUserChip) App._updateUserChip();
    },

    async _loadConfig() {
      if (this.config) return this.config;
      try {
        const res = await fetch(baseUrl() + '/api/auth/config');
        this.config = await res.json();
      } catch (e) {
        this.config = { googleClientId: '' };
      }
      return this.config;
    },

    openModal(mode, prefill) {
      this.mode = mode || 'login';
      this.prefill = prefill || {};
      this.closeModal();
      const modal = document.createElement('div');
      modal.className = 'modal-overlay auth-overlay';
      modal.innerHTML = `
        <div class="auth-modal" role="dialog" aria-modal="true" aria-label="Compte Masterchessis">
          <button class="auth-close" id="authClose" type="button" aria-label="Fermer">✕</button>
          <aside class="auth-aside">
            <div class="auth-brand">♞ Master<span>chessis</span></div>
            <h2>Votre progression,<br>sur tous vos écrans.</h2>
            <p>Un compte gratuit pour conserver votre Elo, votre historique, vos amis et vos bilans de parties.</p>
            <ul class="auth-features">
              <li><span>☁️</span> Sauvegarde de votre progression</li>
              <li><span>🏆</span> Classement et défis entre amis</li>
              <li><span>📊</span> Bilans de parties détaillés</li>
              <li><span>🔐</span> Connexion par email ou Google</li>
            </ul>
            <div class="auth-aside-foot">Gratuit · Sans publicité pendant vos parties</div>
          </aside>
          <section class="auth-main">
            <div class="auth-tabs" id="authTabs">
              <button type="button" data-mode="login">Connexion</button>
              <button type="button" data-mode="register">Inscription</button>
            </div>
            <div id="authPanel"></div>
          </section>
        </div>
      `;
      document.body.appendChild(modal);
      this.modal = modal;
      document.body.classList.add('modal-open');

      modal.querySelector('#authClose').addEventListener('click', () => this.closeModal());
      modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
      modal._keyHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
      document.addEventListener('keydown', modal._keyHandler);
      modal.querySelectorAll('#authTabs [data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.mode = btn.dataset.mode;
          this._renderPanel();
        });
      });
      this._renderPanel();
    },

    closeModal() {
      if (this.modal) {
        if (this.modal._keyHandler) document.removeEventListener('keydown', this.modal._keyHandler);
        this.modal.remove();
      }
      this.modal = null;
      this.busy = false;
      document.body.classList.remove('modal-open');
    },

    _setMode(mode) {
      this.mode = mode;
      this._renderPanel();
    },

    _renderPanel() {
      if (!this.modal) return;
      const panel = this.modal.querySelector('#authPanel');
      const tabs = this.modal.querySelector('#authTabs');
      const showTabs = this.mode === 'login' || this.mode === 'register';
      if (tabs) tabs.style.display = showTabs ? '' : 'none';
      if (tabs) {
        tabs.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
      }

      if (this.mode === 'login') {
        panel.innerHTML = `
          <div class="auth-title"><span class="eyebrow">Bon retour</span><h3>Connectez-vous</h3><p>Email ou pseudo, puis votre mot de passe.</p></div>
          <form class="auth-form" id="authForm" novalidate>
            <label>Email ou pseudo<input class="input" id="authIdentifier" autocomplete="username" placeholder="vous@exemple.com" required></label>
            <label>Mot de passe
              <span class="auth-password"><input class="input" id="authPassword" type="password" autocomplete="current-password" placeholder="Votre mot de passe" required><button type="button" class="auth-eye" data-target="authPassword" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <div class="auth-alert" id="authAlert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit" id="authSubmit">Se connecter</button>
          </form>
          <div class="auth-or"><span>ou</span></div>
          <div class="auth-google" id="authGoogle"></div>
          <div class="auth-links">
            <button type="button" data-action="forgot">Mot de passe oublié ?</button>
            <button type="button" data-action="register">Créer un compte</button>
          </div>
        `;
        this._bindCommon(panel);
        panel.querySelector('#authForm').addEventListener('submit', (e) => {
          e.preventDefault();
          this._login(panel);
        });
        this._mountGoogle(panel);
      } else if (this.mode === 'register') {
        panel.innerHTML = `
          <div class="auth-title"><span class="eyebrow">Nouveau joueur</span><h3>Créez votre compte</h3><p>30 secondes suffisent pour sauvegarder votre progression.</p></div>
          <form class="auth-form" id="authForm" novalidate>
            <label>Pseudo<input class="input" id="authUsername" autocomplete="nickname" placeholder="Votre pseudo" minlength="3" maxlength="24" required></label>
            <label>Email<input class="input" id="authEmail" type="email" autocomplete="email" placeholder="vous@exemple.com" required></label>
            <label>Mot de passe
              <span class="auth-password"><input class="input" id="authPassword" type="password" autocomplete="new-password" placeholder="6 caractères minimum" minlength="6" required><button type="button" class="auth-eye" data-target="authPassword" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <label>Confirmer le mot de passe
              <span class="auth-password"><input class="input" id="authPassword2" type="password" autocomplete="new-password" placeholder="Retapez votre mot de passe" required><button type="button" class="auth-eye" data-target="authPassword2" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <label>Pays / région
              <select class="input" id="authRegion">${window.Countries ? Countries.options(Storage.getProfile().region || '', true) : '<option value="">—</option>'}</select>
            </label>
            <div class="auth-alert" id="authAlert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit" id="authSubmit">Créer mon compte</button>
          </form>
          <div class="auth-or"><span>ou</span></div>
          <div class="auth-google" id="authGoogle"></div>
          <div class="auth-links"><button type="button" data-action="login">J’ai déjà un compte</button></div>
        `;
        this._bindCommon(panel);
        panel.querySelector('#authForm').addEventListener('submit', (e) => {
          e.preventDefault();
          this._register(panel);
        });
        this._mountGoogle(panel);
      } else if (this.mode === 'forgot') {
        panel.innerHTML = `
          <div class="auth-title"><span class="eyebrow">Récupération</span><h3>Mot de passe oublié</h3><p>Indiquez votre email : nous vous envoyons un lien sécurisé pour choisir un nouveau mot de passe.</p></div>
          <form class="auth-form" id="authForm" novalidate>
            <label>Email du compte<input class="input" id="authEmail" type="email" autocomplete="email" placeholder="vous@exemple.com" required></label>
            <div class="auth-alert" id="authAlert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit" id="authSubmit">Envoyer le lien</button>
          </form>
          <div class="auth-links"><button type="button" data-action="login">← Retour à la connexion</button></div>
        `;
        this._bindCommon(panel);
        panel.querySelector('#authForm').addEventListener('submit', (e) => {
          e.preventDefault();
          this._forgot(panel);
        });
      } else if (this.mode === 'reset') {
        const email = (this.prefill && this.prefill.email) || '';
        panel.innerHTML = `
          <div class="auth-title"><span class="eyebrow">Nouveau mot de passe</span><h3>Réinitialisez votre accès</h3><p>${email ? 'Compte : <b>' + esc(email) + '</b>' : 'Choisissez un nouveau mot de passe sécurisé.'}</p></div>
          <form class="auth-form" id="authForm" novalidate>
            <label>Nouveau mot de passe
              <span class="auth-password"><input class="input" id="authPassword" type="password" autocomplete="new-password" placeholder="6 caractères minimum" minlength="6" required><button type="button" class="auth-eye" data-target="authPassword" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <label>Confirmer
              <span class="auth-password"><input class="input" id="authPassword2" type="password" autocomplete="new-password" placeholder="Retapez le mot de passe" required><button type="button" class="auth-eye" data-target="authPassword2" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <div class="auth-alert" id="authAlert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit" id="authSubmit">Enregistrer le mot de passe</button>
          </form>
          <div class="auth-links"><button type="button" data-action="forgot">Renvoyer un lien</button></div>
        `;
        this._bindCommon(panel);
        panel.querySelector('#authForm').addEventListener('submit', (e) => {
          e.preventDefault();
          this._reset(panel);
        });
      } else if (this.mode === 'password') {
        panel.innerHTML = `
          <div class="auth-title"><span class="eyebrow">Sécurité</span><h3>Changer le mot de passe</h3><p>Confirmez votre mot de passe actuel, puis choisissez le nouveau.</p></div>
          <form class="auth-form" id="authForm" novalidate>
            <label>Mot de passe actuel
              <span class="auth-password"><input class="input" id="authCurrent" type="password" autocomplete="current-password" placeholder="Mot de passe actuel" required><button type="button" class="auth-eye" data-target="authCurrent" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <label>Nouveau mot de passe
              <span class="auth-password"><input class="input" id="authPassword" type="password" autocomplete="new-password" placeholder="6 caractères minimum" minlength="6" required><button type="button" class="auth-eye" data-target="authPassword" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <label>Confirmer
              <span class="auth-password"><input class="input" id="authPassword2" type="password" autocomplete="new-password" placeholder="Retapez le mot de passe" required><button type="button" class="auth-eye" data-target="authPassword2" aria-label="Afficher le mot de passe">👁</button></span>
            </label>
            <div class="auth-alert" id="authAlert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit" id="authSubmit">Mettre à jour</button>
          </form>
          <div class="auth-links"><button type="button" data-action="profile">← Retour au profil</button></div>
        `;
        this._bindCommon(panel);
        panel.querySelector('#authForm').addEventListener('submit', (e) => {
          e.preventDefault();
          this._changePassword(panel);
        });
      }
    },

    _bindCommon(panel) {
      panel.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action === 'forgot') this._setMode('forgot');
          else if (action === 'register') this._setMode('register');
          else if (action === 'login') this._setMode('login');
          else if (action === 'profile') this.closeModal();
        });
      });
      panel.querySelectorAll('.auth-eye').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = panel.querySelector('#' + btn.dataset.target);
          if (!input) return;
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          btn.textContent = show ? '🙈' : '👁';
        });
      });
    },

    _alert(panel, message, type) {
      const el = panel.querySelector('#authAlert');
      if (!el) return;
      if (!message) { el.hidden = true; el.textContent = ''; el.className = 'auth-alert'; return; }
      el.hidden = false;
      el.className = 'auth-alert ' + (type || 'error');
      el.textContent = message;
    },

    _busy(panel, on, label) {
      this.busy = on;
      const btn = panel.querySelector('#authSubmit');
      if (!btn) return;
      btn.disabled = on;
      if (on) {
        btn.dataset.label = btn.textContent;
        btn.innerHTML = '<span class="auth-spinner"></span> ' + (label || 'Veuillez patienter…');
      } else if (btn.dataset.label) {
        btn.textContent = btn.dataset.label;
      }
    },

    async _login(panel) {
      const identifier = panel.querySelector('#authIdentifier').value.trim();
      const password = panel.querySelector('#authPassword').value;
      if (!identifier || !password) return this._alert(panel, 'Renseignez votre email/pseudo et votre mot de passe.');
      this._alert(panel, '');
      this._busy(panel, true, 'Connexion…');
      try {
        const data = await this.api('/api/login', { method: 'POST', body: JSON.stringify({ identifier, username: identifier, password }) });
        this._success(data, panel, 'Connexion réussie');
      } catch (e) {
        this._alert(panel, e.message || 'Connexion impossible.');
        this._busy(panel, false);
      }
    },

    async _register(panel) {
      const username = panel.querySelector('#authUsername').value.trim();
      const email = panel.querySelector('#authEmail').value.trim();
      const password = panel.querySelector('#authPassword').value;
      const password2 = panel.querySelector('#authPassword2').value;
      const region = panel.querySelector('#authRegion') ? panel.querySelector('#authRegion').value : '';
      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) return this._alert(panel, 'Le pseudo doit contenir 3 à 24 lettres, chiffres, - ou _.');
      if (!EMAIL_RE.test(email)) return this._alert(panel, 'Adresse email invalide.');
      if (password.length < 6) return this._alert(panel, 'Le mot de passe doit contenir au moins 6 caractères.');
      if (password !== password2) return this._alert(panel, 'Les deux mots de passe ne correspondent pas.');
      this._alert(panel, '');
      this._busy(panel, true, 'Création…');
      try {
        const data = await this.api('/api/register', { method: 'POST', body: JSON.stringify({ username, email, password, region }) });
        this._success(data, panel, 'Compte créé');
      } catch (e) {
        this._alert(panel, e.message || 'Inscription impossible.');
        this._busy(panel, false);
      }
    },

    async _forgot(panel) {
      const email = panel.querySelector('#authEmail').value.trim();
      if (!EMAIL_RE.test(email)) return this._alert(panel, 'Adresse email invalide.');
      this._alert(panel, '');
      this._busy(panel, true, 'Envoi…');
      try {
        const data = await this.api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
        const extra = data.resetUrl ? ` Lien de test : ${data.resetUrl}` : '';
        this._alert(panel, (data.message || 'Si ce compte existe, un lien vient d’être envoyé.') + extra, 'success');
        this._busy(panel, false);
      } catch (e) {
        this._alert(panel, e.message || 'Envoi impossible.');
        this._busy(panel, false);
      }
    },

    async _reset(panel) {
      const password = panel.querySelector('#authPassword').value;
      const password2 = panel.querySelector('#authPassword2').value;
      const token = (this.prefill && this.prefill.token) || '';
      if (!token) return this._alert(panel, 'Lien invalide. Demandez un nouveau lien.');
      if (password.length < 6) return this._alert(panel, 'Le mot de passe doit contenir au moins 6 caractères.');
      if (password !== password2) return this._alert(panel, 'Les deux mots de passe ne correspondent pas.');
      this._alert(panel, '');
      this._busy(panel, true, 'Enregistrement…');
      try {
        const data = await this.api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
        this._success(data, panel, 'Mot de passe mis à jour');
      } catch (e) {
        this._alert(panel, e.message || 'Lien invalide ou expiré.');
        this._busy(panel, false);
      }
    },

    async _changePassword(panel) {
      const currentPassword = panel.querySelector('#authCurrent').value;
      const password = panel.querySelector('#authPassword').value;
      const password2 = panel.querySelector('#authPassword2').value;
      if (!currentPassword) return this._alert(panel, 'Saisissez votre mot de passe actuel.');
      if (password.length < 6) return this._alert(panel, 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      if (password !== password2) return this._alert(panel, 'Les deux mots de passe ne correspondent pas.');
      this._alert(panel, '');
      this._busy(panel, true, 'Mise à jour…');
      try {
        await this.api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword: password }) });
        this._alert(panel, 'Mot de passe mis à jour.', 'success');
        this._busy(panel, false);
        setTimeout(() => this.closeModal(), 900);
      } catch (e) {
        this._alert(panel, e.message || 'Impossible de modifier le mot de passe.');
        this._busy(panel, false);
      }
    },

    _success(data, panel, message) {
      if (data && data.token) localStorage.setItem(TOKEN_KEY, data.token);
      if (data && data.user) this.applyUser(data.user);
      if (window.ChessUI) ChessUI.toast(message + ' : ' + (data.user ? data.user.username : ''), 'success');
      this.closeModal();
      if (window.App) {
        App._updateUserChip();
        if (App.currentRoute === 'profile') {
          const sec = document.querySelector('section[data-view="profile"]');
          if (sec) App.renderProfile(sec);
        }
      }
      if (window.Social && Social._loadFriends) Social._loadFriends().catch(() => {});
    },

    async googleLogin(credential) {
      const panel = this.modal && this.modal.querySelector('#authPanel');
      if (!panel) return;
      this._alert(panel, '');
      this._busy(panel, true, 'Connexion Google…');
      try {
        const data = await this.api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
        this._success(data, panel, 'Connecté avec Google');
      } catch (e) {
        this._alert(panel, e.message || 'Connexion Google impossible.');
        this._busy(panel, false);
      }
    },

    _loadGoogleScript() {
      if (window.google && google.accounts && google.accounts.id) return Promise.resolve(true);
      if (this._googlePromise) return this._googlePromise;
      this._googlePromise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
      return this._googlePromise;
    },

    async _mountGoogle(panel) {
      const host = panel.querySelector('#authGoogle');
      if (!host) return;
      const config = await this._loadConfig();
      if (!host.isConnected) return;
      if (!config || !config.googleClientId) {
        host.innerHTML = '<button type="button" class="auth-google-btn disabled" disabled>G Google — non configuré</button><p class="auth-hint">Ajoutez GOOGLE_CLIENT_ID côté serveur pour activer Google.</p>';
        return;
      }
      const loaded = await this._loadGoogleScript();
      if (!host.isConnected) return;
      if (!loaded || !window.google || !google.accounts || !google.accounts.id) {
        host.innerHTML = '<div class="auth-hint">Google est momentanément indisponible. Utilisez l’email.</div>';
        return;
      }
      host.innerHTML = '<div class="auth-google-slot" id="googleButtonSlot"></div>';
      try {
        google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: (res) => { if (res && res.credential) this.googleLogin(res.credential); }
        });
        google.accounts.id.renderButton(host.querySelector('#googleButtonSlot'), {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'fr',
          width: 320
        });
      } catch (e) {
        host.innerHTML = '<div class="auth-hint">Google indisponible. Utilisez l’email.</div>';
      }
    },

    handleResetLink() {
      const params = new URLSearchParams(window.location.search || '');
      let token = params.get('reset_token') || params.get('token');
      let email = params.get('email') || '';
      const hash = window.location.hash || '';
      if (!token && hash.indexOf('reset_token=') !== -1) {
        const hp = new URLSearchParams(hash.replace(/^#/, ''));
        token = hp.get('reset_token') || hp.get('token');
        email = hp.get('email') || email;
      }
      if (!token) return false;
      this.openModal('reset', { token, email });
      try {
        const url = new URL(window.location.href);
        ['reset_token', 'token', 'email'].forEach(k => url.searchParams.delete(k));
        url.hash = '';
        history.replaceState(null, '', url.pathname + (url.search || ''));
      } catch (e) {}
      return true;
    }
  };

  window.Auth = Auth;
  window.ChessAuth = Auth;
})();
