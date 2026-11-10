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
    onLobbyChat: null,
    onPresence: null,
    onQueue: null,
    onMatch: null,
    onChallenge: null,
    onChallengeSent: null,
    onChallengeDeclined: null,
    onChallengeError: null,
    onFriendRequest: null,
    onFriendAccepted: null,
    onDrawOffered: null,
    onDrawAccepted: null,
    onDrawDeclined: null,
    onGameOver: null,
    onRematchOffered: null,
    onRematchDeclined: null,
    lobbySocket: null,
    _lobbyBound: false,

    getBackendUrl() {
      const custom = localStorage.getItem('masterchess_backend_url');
      if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
      if (window.MASTERCHESS_BACKEND) return window.MASTERCHESS_BACKEND.replace(/\/+$/, '');
      // URL par défaut pour tous les utilisateurs (Expert fix)
      return 'https://masterchessis.onrender.com';
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
      this._resetGameSocket();
      this.role = 'host';
      this.myColor = 'w';

      try {
        await this.loadSocketIo();
        const baseUrl = this.getBackendUrl();
        const token = localStorage.getItem('masterchess_jwt') || '';

        const socket = window.io(baseUrl || window.location.origin, {
          withCredentials: true,
          auth: { token },
          timeout: 8000, // Augmenté pour la fiabilité
          reconnectionAttempts: 3
        });
        this.socket = socket;
        this.mode = 'socket';

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('Socket.io timeout, fallback WebRTC PeerJS');
            this.disconnect();
            this.hostGamePeerJS(opts).then(resolve).catch(reject);
          }, 8000);

          socket.on('connect_error', (err) => {
            console.error('Socket connect error:', err);
            clearTimeout(timeout);
            this.disconnect();
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
        console.error('Socket fatal error, fallback to PeerJS:', err);
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
      this._resetGameSocket();
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
      if (socket._mcSetup) return;
      socket._mcSetup = true;

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

      socket.on('draw_offered', (d) => { if (this.onDrawOffered) this.onDrawOffered(d.from); });
      socket.on('draw_accepted', () => { if (this.onDrawAccepted) this.onDrawAccepted(); });
      socket.on('draw_declined', (d) => { if (this.onDrawDeclined) this.onDrawDeclined(d.by); });
      socket.on('game_over', (d) => {
        const result = d && d.result === '1/2-1/2' ? '½-½' : (d && d.result);
        if (this.onGameOver) this.onGameOver(Object.assign({}, d, { result }));
      });
      socket.on('rematch_offered', (d) => { if (this.onRematchOffered) this.onRematchOffered(d.from); });
      socket.on('rematch_declined', () => { if (this.onRematchDeclined) this.onRematchDeclined(); });
      socket.on('rematch_waiting', () => { if (this.onQueue) this.onQueue({ status: 'rematch_waiting' }); });

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

    async connectLobby() {
      if (this.lobbySocket) return this.lobbySocket;
      await this.loadSocketIo();
      const baseUrl = this.getBackendUrl();
      const token = localStorage.getItem('masterchess_jwt') || '';
      const socket = window.io(baseUrl || window.location.origin, {
        withCredentials: true, auth: { token }, timeout: 8000, reconnectionAttempts: 5
      });
      this.lobbySocket = socket;
      socket.on('connect_error', () => { if (this.onError) this.onError(new Error('Serveur social indisponible')); });
      socket.on('presence_update', (d) => { if (this.onPresence) this.onPresence(d.players || []); });
      socket.on('lobby_message', (d) => { if (this.onLobbyChat) this.onLobbyChat(d); });
      socket.on('queue_status', (d) => { if (this.onQueue) this.onQueue(d); });
      socket.on('match_found', (d) => this._handleMatchFound(d));
      socket.on('challenge_received', (d) => { if (this.onChallenge) this.onChallenge(d); });
      socket.on('challenge_sent', (d) => { if (this.onChallengeSent) this.onChallengeSent(d); });
      socket.on('challenge_declined', (d) => { if (this.onChallengeDeclined) this.onChallengeDeclined(d); });
      socket.on('challenge_error', (d) => { if (this.onChallengeError) this.onChallengeError(d); });
      socket.on('friend_request', (d) => { if (this.onFriendRequest) this.onFriendRequest(d); });
      socket.on('friend_accepted', (d) => { if (this.onFriendAccepted) this.onFriendAccepted(d); });
      return socket;
    },

    _handleMatchFound(data) {
      this.mode = 'socket';
      this.socket = this.lobbySocket;
      this.myId = data.code;
      this.myColor = data.color;
      this.opponentName = data.opponent ? data.opponent.username : 'Adversaire';
      this.opponentRating = data.opponent ? data.opponent.rating : '?';
      this.opponentRegion = data.opponent ? data.opponent.region : '';
      this.gameTime = data.time;
      this.gameInc = data.inc;
      this.connected = true;
      this._setupSocketEvents(this.lobbySocket);
      if (this.onMatch) this.onMatch(data);
    },

    async quickMatch({ time, inc } = {}) {
      await this.connectLobby();
      this.role = 'quick';
      this.lobbySocket.emit('matchmaking_join', { time: time || 10, inc: inc || 0 });
    },

    leaveQueue() {
      if (this.lobbySocket) this.lobbySocket.emit('matchmaking_leave');
    },

    async challenge(username, time, inc) {
      await this.connectLobby();
      this.lobbySocket.emit('challenge_friend', { username, time: time || 10, inc: inc || 0 });
    },

    async acceptChallenge(from, time, inc) {
      await this.connectLobby();
      this.lobbySocket.emit('challenge_accept', { from, time: time || 10, inc: inc || 0 });
    },

    declineChallenge(from) {
      if (this.lobbySocket) this.lobbySocket.emit('challenge_decline', { from });
    },

    sendLobbyChat(text) {
      if (this.lobbySocket && text) this.lobbySocket.emit('lobby_message', { text });
    },

    sendDrawOffer() {
      if (this.socket && this.myId) this.socket.emit('draw_offer', { code: this.myId });
    },

    sendDrawAccept() {
      if (this.socket && this.myId) this.socket.emit('draw_accept', { code: this.myId });
    },

    sendDrawDecline() {
      if (this.socket && this.myId) this.socket.emit('draw_decline', { code: this.myId });
    },

    sendRematch() {
      if (this.socket && this.myId) this.socket.emit('rematch_request', { code: this.myId });
    },

    declineRematch() {
      if (this.socket && this.myId) this.socket.emit('rematch_decline', { code: this.myId });
    },

    leaveGame(code) {
      const room = code || this.myId;
      if (!room) return;
      try {
        if (this.socket) this.socket.emit('leave_room', { code: room });
        if (this.socket && this.socket !== this.lobbySocket) this.socket.disconnect();
      } catch (e) {}
      if (!code || this.myId === code) {
        this.socket = null;
        this.myId = null;
        this.connected = false;
      }
      this.onMove = null; this.onChat = null; this.onResign = null; this.onDisconnect = null;
      this.onDrawOffered = null; this.onDrawAccepted = null; this.onGameOver = null;
      this.onRematchOffered = null;
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

    _resetGameSocket() {
      try {
        if (this.myId && this.socket) this.socket.emit('leave_room', { code: this.myId });
        if (this.socket && this.socket !== this.lobbySocket) this.socket.disconnect();
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
      } catch (e) {}
      this.socket = null;
      this.conn = null;
      this.peer = null;
      this.myId = null;
      this.connected = false;
    },

    disconnect() {
      this._resetGameSocket();
      if (this.lobbySocket) { try { this.lobbySocket.disconnect(); } catch (e) {} }
      this.lobbySocket = null;
    }
  };

  window.ChessOnline = window.Online = Online;
})();
