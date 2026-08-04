/* ============================================================
   ChessArena — engine.js
   Wrapper chess.js + gestionnaire Worker Stockfish
   Niveaux IA, getBestMove, analyse (score cp / mate)
   ============================================================ */
(function () {
  'use strict';

  const Engine = {
    chess: null,
    worker: null,
    workerReady: false,
    pendingCommands: [],
    currentCallback: null,
    analyzing: false,

    // ---------- chess.js ----------
    init() {
      this.chess = new Chess();
      return this.chess;
    },
    newGame(fen) {
      try {
        this.chess = fen ? new Chess(fen) : new Chess();
      } catch (e) {
        this.chess = new Chess();
      }
      return this.chess;
    },

    // ---------- Stockfish Worker ----------
    initWorker() {
      if (this.worker) return this.worker;
      try {
        const wasmSupported = typeof WebAssembly === 'object' &&
          WebAssembly.validate(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
        const file = wasmSupported ? 'vendor/stockfish/stockfish.wasm.js' : 'vendor/stockfish/stockfish.js';
        this.worker = new Worker(file);
        this.workerReady = false;
        this.pendingCommands = [];
        this.worker.addEventListener('message', (e) => this.onWorkerMessage(e));
        this.worker.postMessage('uci');
        this.worker.postMessage('setoption name Threads value 1');
        this.worker.postMessage('setoption name Hash value 32');
        return this.worker;
      } catch (err) {
        console.error('Stockfish init error:', err);
        return null;
      }
    },

    workerSend(cmd) {
      if (!this.worker) return;
      if (this.workerReady) {
        this.worker.postMessage(cmd);
      } else {
        this.pendingCommands.push(cmd);
      }
    },

    onWorkerMessage(e) {
      const data = e.data || '';
      if (typeof data !== 'string') return;
      if (data === 'uciok') {
        this.workerReady = true;
        if (this.pendingCommands.length) {
          const cmds = this.pendingCommands;
          this.pendingCommands = [];
          cmds.forEach(cmd => this.worker.postMessage(cmd));
        }
        return;
      }
      if (data === 'readyok') return;

      const cb = this.currentCallback;
      if (!cb) return;

      if (data.startsWith('info')) {
        const parsed = this.parseInfo(data);
        if (parsed && cb.onInfo) cb.onInfo(parsed);
      } else if (data.startsWith('bestmove')) {
        const parts = data.split(' ');
        const bm = parts[1] || '';
        if (cb.onMove) cb.onMove(bm !== '(none)' ? bm : null);
        this.currentCallback = null;
        this.analyzing = false;
      }
    },

    parseInfo(line) {
      const parts = line.split(' ');
      const info = { line };
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'depth') info.depth = parseInt(parts[i + 1], 10);
        if (parts[i] === 'score') {
          info.scoreKind = parts[i + 1];
          info.score = parseInt(parts[i + 2], 10);
        }
        if (parts[i] === 'pv') { info.pv = parts.slice(i + 1).join(' '); break; }
      }
      if (typeof info.score !== 'number') return null;
      return info;
    },

    // Coup le plus fort via Stockfish (optionnel avec randomisation selon niveau)
    getBestMove(fen, opts) {
      return new Promise((resolve) => {
        const worker = this.initWorker();
        if (!worker) {
          // Fallback : premier coup légal aléatoire
          try {
            const c = new Chess(fen);
            const moves = c.moves();
            resolve(moves.length ? moves[Math.floor(Math.random() * moves.length)] : null);
          } catch (e) { resolve(null); }
          return;
        }

        const level = (opts && opts.level != null) ? opts.level : 5;
        const depth = Math.max(1, Math.min(18, Math.round(level * 1.2 + 2)));

        this.currentCallback = {
          onInfo: (opts && opts.onInfo) ? opts.onInfo : null,
          onMove: (move) => resolve(move)
        };

        this.workerSend('position fen ' + fen);
        this.workerSend('go depth ' + depth);
      });
    },

    // Analyse complète d'une position
    analyze(fen, opts) {
      return new Promise((resolve) => {
        const worker = this.initWorker();
        if (!worker) { resolve(null); return; }
        const depth = (opts && opts.depth) || 12;

        const self = this;
        this.currentCallback = {
          lastInfo: null,
          onInfo(info) {
            self.currentCallback.lastInfo = info;
            if (opts && opts.onInfo) opts.onInfo(info);
          },
          onMove(move) {
            resolve({ bestMove: move, info: self.currentCallback.lastInfo });
          }
        };

        this.workerSend('position fen ' + fen);
        this.workerSend('go depth ' + depth);
      });
    },

    // Convertir score interne en texte lisible
    formatScore(info) {
      if (!info) return null;
      if (info.scoreKind === 'mate') {
        return info.score > 0 ? '#' + info.score : '#' + Math.abs(info.score);
      }
      return (info.score / 100).toFixed(1);
    },

    // Analyse séquentielle de plusieurs FEN
    analyzePgn(fenList, opts) {
      const results = [];
      let i = 0;
      const next = () => {
        if (i >= fenList.length) { opts.onDone && opts.onDone(results); return; }
        const fen = fenList[i++];
        this.analyze(fen, { depth: opts.depth || 10, onInfo: opts.onInfo }).then((res) => {
          results.push(Object.assign({ fen }, res));
          next();
        });
      };
      next();
    }
  };

  window.ChessEngine = window.Engine = Engine;
})();
