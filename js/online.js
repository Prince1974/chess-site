/* ============================================================
   Masterchessis — online.js
   Mode multijoueur réel via PeerJS (WebRTC, broker public)
   - Héberger une partie (hosting) ou rejoindre un code
   - Échange de coups en temps réel, chat simple, resign
   ============================================================ */
(function () {
  'use strict';

  const Online = {
    peer: null,
    conn: null,
    myId: null,
    role: null,        // 'host' | 'guest'
    myColor: null,     // 'w' | 'b'
    opponentName: 'Adversaire',
    opponentRating: '?',
    connected: false,
    onOpen: null,      // (data) quand connecté au pair
    onMove: null,      // (moveObj) coup reçu
    onChat: null,      // (msg)
    onDisconnect: null,
    onError: null,

    peerReady: false,
    hostResolve: null,

    // Chargement dynamique de PeerJS (CDN)
    loadPeerJS() {
      return new Promise((resolve, reject) => {
        if (window.Peer) { resolve(window.Peer); return; }
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
        s.onload = () => resolve(window.Peer);
        s.onerror = () => reject(new Error('Impossible de charger PeerJS'));
        document.head.appendChild(s);
      });
    },

    // Génère un id court lisible
    makeId() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let id = '';
      for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
      return id;
    },

    // Hôte : crée sa Peer, écoute une connexion
    async hostGame(opts) {
      await this.loadPeerJS();
      const PeerCtor = window.Peer;
      const id = (opts && opts.id) || this.makeId();
      return new Promise((resolve, reject) => {
        // Si existe déjà, undestroy
        if (this.peer && !this.peer.destroyed) this.peer.destroy();
        this.role = 'host';
        this.myId = id;
        const peer = new PeerCtor(id);
        this.peer = peer;

        const timeout = setTimeout(() => { reject(new Error('Timeout création de la partie')); }, 20000);

        peer.on('open', (id) => {
          clearTimeout(timeout);
          // On ne sait pas encore la couleur : on choisit blanc pour l'hôte par défaut
          this.myColor = 'w';
          this.peerReady = true;
          resolve(id);
        });

        peer.on('connection', (conn) => {
          clearTimeout(timeout);
          console.log('Connexion entrante', conn.peer);
          this.conn = conn;
          this._setupConn(conn);
          conn.on('open', () => {
            console.log('Lien établi, envoi hello');
            // On envoie notre identité + la couleur (blanc à l'hôte)
            conn.send({ type: 'hello', name: Storage.getProfile().name || 'Invité', rating: Storage.getElo().rapid });
          });
        });

        peer.on('error', (err) => {
          clearTimeout(timeout);
          console.error('Peer error', err);
          if (this.onError) this.onError(err);
          reject(err);
        });
      });
    },

    // Invité : se connecte à un id hôte
    async joinGame(code, opts) {
      await this.loadPeerJS();
      const PeerCtor = window.Peer;
      const hostId = code.trim().toUpperCase();
      return new Promise((resolve, reject) => {
        if (this.peer && !this.peer.destroyed) this.peer.destroy();
        this.role = 'guest';
        const peer = new PeerCtor(); // id aléatoire
        this.peer = peer;

        const timeout = setTimeout(() => { reject(new Error('Timeout connexion')); }, 20000);

        peer.on('open', (id) => {
          this.myId = id;
          this.myColor = 'b'; // l'invité joue noir
          const conn = peer.connect(hostId, { reliable: true });
          this.conn = conn;
          this._setupConn(conn);
          conn.on('open', () => {
            conn.send({ type: 'hello', name: Storage.getProfile().name || 'Invité', rating: Storage.getElo().rapid });
          });
          // La connexion sera confirmée quand on reçoit le hello de l'hôte
          resolve(hostId);
        });

        peer.on('error', (err) => {
          clearTimeout(timeout);
          console.error('Peer error', err);
          if (this.onError) this.onError(err);
          reject(err);
        });
      });
    },

    _setupConn(conn) {
      conn.on('data', (data) => {
        this._handleData(data);
      });
      conn.on('close', () => {
        this.connected = false;
        if (this.onDisconnect) this.onDisconnect();
      });
      conn.on('error', (err) => {
        console.error('conn error', err);
        if (this.onError) this.onError(err);
      });
    },

    _handleData(data) {
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'hello':
          if (!this.connected) {
            this.connected = true;
            this.opponentName = data.name || 'Adversaire';
            this.opponentRating = data.rating != null ? data.rating : '?';
            // L'hôte est blanc, l'invité noir — confirmé aux deux
            if (this.role === 'host') this.myColor = 'w';
            else this.myColor = 'b';
            if (this.onOpen) this.onOpen({ opponent: this.opponentName, rating: this.opponentRating, color: this.myColor });
          }
          break;
        case 'move':
          if (this.onMove) this.onMove(data.move);
          break;
        case 'chat':
          if (this.onChat) this.onChat(data.text, data.name);
          break;
        case 'resign':
          if (this.onResign) this.onResign();
          break;
        case 'offerDraw':
          if (this.onDrawOffer) this.onDrawOffer();
          break;
        case 'drawAccepted':
          if (this.onDrawAccepted) this.onDrawAccepted();
          break;
      }
    },

    sendMove(moveObj) {
      if (this.conn && this.connected) {
        this.conn.send({ type: 'move', move: { from: moveObj.from, to: moveObj.to, promotion: moveObj.promotion || 'q', san: moveObj.san } });
        return true;
      }
      return false;
    },

    sendChat(text) {
      if (this.conn && this.connected) {
        this.conn.send({ type: 'chat', text, name: Storage.getProfile().name || 'Invité' });
        return true;
      }
      return false;
    },

    sendResign() {
      if (this.conn && this.connected) this.conn.send({ type: 'resign' });
    },

    sendDrawOffer() {
      if (this.conn && this.connected) this.conn.send({ type: 'offerDraw' });
    },

    sendDrawAccept() {
      if (this.conn && this.connected) this.conn.send({ type: 'drawAccepted' });
    },

    disconnect() {
      try {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
      } catch (e) {}
      this.connected = false;
      this.conn = null;
      this.peer = null;
      this.myColor = null;
      this.role = null;
    }
  };

  window.ChessOnline = window.Online = Online;
})();
