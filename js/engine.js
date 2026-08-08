/* ============================================================
   Masterchessis — engine.js
   Wrapper chess.js + gestionnaire Worker Stockfish + Minimax Backup
   Niveaux IA, getBestMove avec secours automatique anti-freeze
   ============================================================ */
(function () {
  'use strict';

  const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const PST_PAWN = [0,0,0,0,0,0,0,0, 5,5,5,5,5,5,5,5, 1,1,2,3,3,2,1,1, 0.5,0.5,1,2.5,2.5,1,0.5,0.5, 0,0,0,2,2,0,0,0, 0.5,-0.5,-1,0,0,-1,-0.5,0.5, 0.5,1,1,-2,-2,1,1,0.5, 0,0,0,0,0,0,0,0];

  function evaluatePos(g) {
    const b = g.board(); let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const c = b[r][f]; if (!c) continue;
        let v = VALUES[c.type] * 10;
        if (c.type === 'p') { const idx = c.color === 'w' ? r * 8 + f : (7 - r) * 8 + f; v += PST_PAWN[idx]; }
        score += (c.color === 'w') ? v : -v;
      }
    }
    if (g.in_checkmate()) score += (g.turn() === 'w' ? -10000 : 10000);
    return score;
  }

  function minimaxFallback(g, depth, alpha, beta, maximizing) {
    if (depth === 0 || g.game_over()) return evaluatePos(g);
    const moves = g.moves();
    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) { g.move(m); best = Math.max(best, minimaxFallback(g, depth - 1, alpha, beta, false)); g.undo(); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) { g.move(m); best = Math.min(best, minimaxFallback(g, depth - 1, alpha, beta, true)); g.undo(); beta = Math.min(beta, best); if (beta <= alpha) break; }
      return best;
    }
  }

  function getMinimaxMove(fen, depth) {
    try {
      const g = new Chess(fen);
      const moves = g.moves({ verbose: true });
      if (!moves || !moves.length) return null;
      const maximizing = g.turn() === 'w';
      let bestScore = maximizing ? -Infinity : Infinity;
      let bestMoves = [];
      for (const m of moves) {
        g.move(m.san);
        const sc = minimaxFallback(g, Math.max(0, depth - 1), -Infinity, Infinity, !maximizing);
        g.undo();
        if (maximizing ? sc > bestScore : sc < bestScore) { bestScore = sc; bestMoves = [m]; }
        else if (sc === bestScore) bestMoves.push(m);
      }
      const chosen = bestMoves.length ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : moves[0];
      return chosen ? (chosen.from + chosen.to + (chosen.promotion || '')) : null;
    } catch (e) {
      return null;
    }
  }

  const Engine = {
    chess: null,
    worker: null,
    workerReady: false,
    pendingCommands: [],
    currentCallback: null,
    analyzing: false,

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
        this.worker.postMessage('setoption name Hash value 16');
        return this.worker;
      } catch (err) {
        console.warn('Stockfish init warning:', err);
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

    // Coup IA sécurisé avec timeout et fallback Minimax
    getBestMove(fen, opts) {
      return new Promise((resolve) => {
        let isResolved = false;
        const level = (opts && opts.level != null) ? opts.level : 5;

        const safeResolve = (move) => {
          if (!isResolved) {
            isResolved = true;
            if (timer) clearTimeout(timer);
            resolve(move);
          }
        };

        // Fallback immédiat si pas de worker
        const worker = this.initWorker();
        if (!worker) {
          setTimeout(() => {
            const fallbackMove = getMinimaxMove(fen, Math.min(2, Math.ceil(level / 3)));
            safeResolve(fallbackMove);
          }, 50);
          return;
        }

        // Timeout de sécurité 2500ms
        const timer = setTimeout(() => {
          if (!isResolved) {
            console.warn('Stockfish timeout, utilisation du moteur Minimax de secours');
            const fallbackMove = getMinimaxMove(fen, Math.min(2, Math.ceil(level / 3)));
            safeResolve(fallbackMove);
          }
        }, 2500);

        const depth = Math.max(1, Math.min(12, Math.round(level * 1.0 + 1)));

        this.currentCallback = {
          onInfo: (opts && opts.onInfo) ? opts.onInfo : null,
          onMove: (move) => safeResolve(move)
        };

        this.workerSend('position fen ' + fen);
        this.workerSend('go depth ' + depth);
      });
    },

    analyze(fen, opts) {
      return new Promise((resolve) => {
        const worker = this.initWorker();
        if (!worker) { resolve(null); return; }
        const depth = (opts && opts.depth) || 10;

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

    formatScore(info) {
      if (!info) return null;
      if (info.scoreKind === 'mate') {
        return info.score > 0 ? '#' + info.score : '#' + Math.abs(info.score);
      }
      return (info.score / 100).toFixed(1);
    }
  };

  window.ChessEngine = window.Engine = Engine;
})();
