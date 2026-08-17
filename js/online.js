/* ============================================================
   Masterchessis — online.js
   Mode multijoueur temps réel : Socket.io avec fallback WebRTC (PeerJS)
   - Héberger / créer une partie ou rejoindre avec un code
   - Échange de coups en temps réel, chat, abandon
   ============================================================ */
(function () {
  'use strict';

  const Online = {
    socket: null,
    peer: null,
    conn: null,
    mode: 'socket', // 'socket' | 'peer'
    myId: null,
    role: null,        // 'host' | 'guest'
    myColor: null,     // 'w' | 'b'
    opponentName: 'Adversaire',
    opponentRating: '?',
    connected: false,
    onOpen: null,      // (data)
    onMove: null,      // (moveObj)
    onChat: null,      // (text, name)
    onResign: null,
    onDisconnect: null,
    onError: null,

    getBackendUrl() {
      const custom = localStorage.getItem('masterchess_backend_url');
      if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
      if (window.MASTERCHESS_BACKEND) return window.MASTERCHESS_BACKEND.replace(/\/+$/, '');
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'http://localhost:8080';
      return '/api';
    },

    loadSocketIo() {
      return new Promise((resolve, reject) => {
        if (window.io) return resolve(window.io);
        const s = document.createElement('script');
        s.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        s.onload = () => resolve(window.io);
        s.onerror = () => reject(new Error('Socket.io non disponible'));
        document.head.appendChild(s);
      });
    },

    loadPeerJS() {
      return new Promise((resolve, reject) => {
        if (window.Peer) return resolve(window.Peer);
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
        s.onload = () => resolve(window.Peer);
        s.onerror = () => reject(new Error('PeerJS non disponible'));
        document.head.appendChild(s);
      });
    },

    makeId() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let id = '';
      for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
      return id;
    },

    // Crée une partie en ligne
    async hostGame(opts) {
      this.disconnect();
      this.role = 'host';
      this.myColor = 'w';

      try {
        await this.loadSocketIo();
        const baseUrl = this.getBackendUrl();
        const token = localStorage.getItem('masterchess_jwt') || '';

        const socket = window.io(baseUrl || window.location.origin, {
          withCredentials: true,
          auth: { token },
          timeout: 5000
        });
        this.socket = socket;
        this.mode = 'socket';

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('Socket.io timeout, fallback WebRTC PeerJS');
            socket.disconnect();
            this.hostGamePeerJS(opts).then(resolve).catch(reject);
          }, 4000);

          socket.on('connect_error', () => {
            clearTimeout(timeout);
            socket.disconnect();
            this.hostGamePeerJS(opts).then(resolve).catch(reject);
          });

          socket.on('room_created', ({ code, color }) => {
            clearTimeout(timeout);
            this.myId = code;
            this.myColor = color || 'w';
            this._setupSocketEvents(socket);
            resolve(code);
          });

          socket.emit('create_room');
        });
      } catch (err) {
        return this.hostGamePeerJS(opts);
      }
    },

    async hostGamePeerJS(opts) {
      await this.loadPeerJS();
      const PeerCtor = window.Peer;
      const id = (opts && opts.id) || this.makeId();
      this.mode = 'peer';
      return new Promise((resolve, reject) => {
        const peer = new PeerCtor(id);
        this.peer = peer;
        this.myId = id;

        peer.on('open', (id) => resolve(id));
        peer.on('connection', (conn) => {
          this.conn = conn;
          this._setupPeerConn(conn);
          conn.on('open', () => {
            const prof = Storage ? Storage.getProfile() : { name: 'Invité' };
            conn.send({ type: 'hello', name: prof.name || 'Invité', rating: 1200 });
          });
        });
        peer.on('error', (err) => {
          if (this.onError) this.onError(err);
          reject(err);
        });
      });
    },

    // Rejoindre une partie
    async joinGame(code, opts) {
      this.disconnect();
      this.role = 'guest';
      this.myColor = 'b';
      const cleanCode = (code || '').trim().toUpperCase();

      try {
        await this.loadSocketIo();
        const baseUrl = this.getBackendUrl();
        const token = localStorage.getItem('masterchess_jwt') || '';

        const socket = window.io(baseUrl || window.location.origin, {
          withCredentials: true,
          auth: { token },
          timeout: 5000
        });
        this.socket = socket;
        this.mode = 'socket';

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.disconnect();
            this.joinGamePeerJS(cleanCode, opts).then(resolve).catch(reject);
          }, 4000);

          socket.on('connect_error', () => {
            clearTimeout(timeout);
            socket.disconnect();
            this.joinGamePeerJS(cleanCode, opts).then(resolve).catch(reject);
          });

          socket.on('room_joined', ({ code, color, opponent }) => {
            clearTimeout(timeout);
            this.myId = code;
            this.myColor = color || 'b';
            this.opponentName = opponent || 'Adversaire';
            this.connected = true;
            this._setupSocketEvents(socket);
            if (this.onOpen) this.onOpen({ opponent: this.opponentName, rating: '?', color: this.myColor });
            resolve(code);
          });

          socket.on('room_error', ({ message }) => {
            clearTimeout(timeout);
            reject(new Error(message || 'Impossible de rejoindre'));
          });

          socket.emit('join_room', { code: cleanCode });
        });
      } catch (err) {
        return this.joinGamePeerJS(cleanCode, opts);
      }
    },

    async joinGamePeerJS(code, opts) {
      await this.loadPeerJS();
      const PeerCtor = window.Peer;
      this.mode = 'peer';
      return new Promise((resolve, reject) => {
        const peer = new PeerCtor();
        this.peer = peer;

        peer.on('open', (id) => {
          const conn = peer.connect(code, { reliable: true });
          this.conn = conn;
          this._setupPeerConn(conn);
          conn.on('open', () => {
            const prof = Storage ? Storage.getProfile() : { name: 'Invité' };
            conn.send({ type: 'hello', name: prof.name || 'Invité', rating: 1200 });
          });
          resolve(code);
        });
        peer.on('error', (err) => reject(err));
      });
    },

    _setupSocketEvents(socket) {
      socket.on('opponent_joined', ({ username }) => {
        this.connected = true;
        this.opponentName = username || 'Adversaire';
        if (this.onOpen) this.onOpen({ opponent: this.opponentName, rating: '?', color: this.myColor });
      });

      socket.on('move_made', ({ from, to, san }) => {
        if (this.onMove) this.onMove({ from, to, san });
      });

      socket.on('chat', ({ username, text }) => {
        if (this.onChat) this.onChat(text, username);
      });

      socket.on('opponent_resigned', () => {
        if (this.onResign) this.onResign();
      });

      socket.on('opponent_left', () => {
        this.connected = false;
        if (this.onDisconnect) this.onDisconnect();
      });
    },

    _setupPeerConn(conn) {
      conn.on('data', (data) => {
        if (!data) return;
        if (data.type === 'hello') {
          this.connected = true;
          this.opponentName = data.name || 'Adversaire';
          if (this.onOpen) this.onOpen({ opponent: this.opponentName, rating: data.rating, color: this.myColor });
        } else if (data.type === 'move') {
          if (this.onMove) this.onMove(data.move);
        } else if (data.type === 'chat') {
          if (this.onChat) this.onChat(data.text, data.name);
        } else if (data.type === 'resign') {
          if (this.onResign) this.onResign();
        }
      });
      conn.on('close', () => {
        this.connected = false;
        if (this.onDisconnect) this.onDisconnect();
      });
    },

    sendMove(moveObj) {
      if (this.mode === 'socket' && this.socket && this.myId) {
        this.socket.emit('move', { code: this.myId, from: moveObj.from, to: moveObj.to, promotion: moveObj.promotion || 'q' });
        return true;
      }
      if (this.mode === 'peer' && this.conn && this.connected) {
        this.conn.send({ type: 'move', move: { from: moveObj.from, to: moveObj.to, promotion: moveObj.promotion || 'q', san: moveObj.san } });
        return true;
      }
      return false;
    },

    sendChat(text) {
      if (this.mode === 'socket' && this.socket && this.myId) {
        this.socket.emit('chat', { code: this.myId, text });
        return true;
      }
      if (this.mode === 'peer' && this.conn && this.connected) {
        const prof = Storage ? Storage.getProfile() : { name: 'Invité' };
        this.conn.send({ type: 'chat', text, name: prof.name || 'Invité' });
        return true;
      }
      return false;
    },

    sendResign() {
      if (this.mode === 'socket' && this.socket && this.myId) {
        this.socket.emit('resign', { code: this.myId });
      }
      if (this.mode === 'peer' && this.conn && this.connected) {
        this.conn.send({ type: 'resign' });
      }
    },

    disconnect() {
      try {
        if (this.socket) this.socket.disconnect();
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
      } catch (e) {}
      this.socket = null;
      this.conn = null;
      this.peer = null;
      this.connected = false;
    }
  };

  window.ChessOnline = window.Online = Online;
})();
