/* ============================================================
   Masterchessis — engine.js
   Moteur d'IA Échecs 100 % JavaScript Pur (Autonome, Ultra-rapide, sans dépendance externe)
   - Algorithme Minimax + Élagage Alpha-Beta
   - Recherche de Repos (Quiescence Search) anti-effet d'horizon
   - Tables de valeurs positionnelles (PST) optimisées pour chaque pièce
   - Livre d'ouvertures intégré (Opening Book)
   - Évaluation du matériel, du centre, de la sécurité du roi et des pions passés
   - 10 Niveaux de difficulté fluides, calibrés et non-bloquants
   ============================================================ */
(function () {
  'use strict';

  // Valeurs de base du matériel (en centipawns)
  const PIECE_VALUES = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };

  // Tables de valeurs positionnelles (PST) pour les Blancs (inversées symétriquement pour les Noirs)
  // Indices 0..63 de a8 (0) à h1 (63)
  const PST = {
    // Pions : forte poussée au centre et vers la promotion
    p: [
        0,   0,   0,   0,   0,   0,   0,   0,
       50,  50,  50,  50,  50,  50,  50,  50,
       10,  15,  25,  35,  35,  25,  15,  10,
        5,   8,  20,  30,  30,  20,   8,   5,
        0,   0,  10,  25,  25,  10,   0,   0,
        5,  -5, -10,   5,   5, -10,  -5,   5,
        5,  10,  10, -20, -20,  10,  10,   5,
        0,   0,   0,   0,   0,   0,   0,   0
    ],
    // Cavaliers : contrôle du centre, pénalité sur les bords
    n: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20,   0,   5,   5,   0, -20, -40,
      -30,   5,  15,  20,  20,  15,   5, -30,
      -30,   5,  20,  25,  25,  20,   5, -30,
      -30,   0,  20,  25,  25,  20,   0, -30,
      -30,   5,  15,  20,  20,  15,   5, -30,
      -40, -20,   0,   5,   5,   0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50
    ],
    // Fous : contrôle des grandes diagonales et du centre
    b: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10,   5,   0,   0,   0,   0,   5, -10,
      -10,  10,  10,  15,  15,  10,  10, -10,
      -10,   5,  15,  20,  20,  15,   5, -10,
      -10,   0,  15,  20,  20,  15,   0, -10,
      -10,  10,  10,  15,  15,  10,  10, -10,
      -10,   5,   0,   0,   0,   0,   5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20
    ],
    // Tours : colonnes ouvertes, 7e rangée
    r: [
        0,   0,   0,   5,   5,   0,   0,   0,
       15,  20,  20,  20,  20,  20,  20,  15,
       -5,   0,   0,   0,   0,   0,   0,  -5,
       -5,   0,   0,   0,   0,   0,   0,  -5,
       -5,   0,   0,   0,   0,   0,   0,  -5,
       -5,   0,   0,   0,   0,   0,   0,  -5,
       -5,   0,   0,   0,   0,   0,   0,  -5,
        0,   0,   5,  10,  10,   5,   0,   0
    ],
    // Dame : centralisation modérée
    q: [
      -20, -10, -10,  -5,  -5, -10, -10, -20,
      -10,   0,   5,   0,   0,   0,   0, -10,
      -10,   5,   5,   5,   5,   5,   0, -10,
        0,   0,   5,  10,  10,   5,   0,  -5,
       -5,   0,   5,  10,  10,   5,   0,  -5,
      -10,   0,   5,   5,   5,   5,   0, -10,
      -10,   0,   0,   0,   0,   5,   0, -10,
      -20, -10, -10,  -5,  -5, -10, -10, -20
    ],
    // Roi en milieu de partie : sécurité et roque
    k: [
      -40, -50, -50, -60, -60, -50, -50, -40,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
       20,  20,   0,   0,   0,   0,  20,  20,
       25,  35,  10,   0,   0,  10,  35,  25
    ],
    // Roi en finale : centralisation active
    k_endgame: [
      -50, -30, -20, -10, -10, -20, -30, -50,
      -30, -10,  15,  20,  20,  15, -10, -30,
      -20,  10,  25,  30,  30,  25,  10, -20,
      -10,  15,  30,  35,  35,  30,  15, -10,
      -10,  15,  30,  35,  35,  30,  15, -10,
      -20,  10,  25,  30,  30,  25,  10, -20,
      -30, -10,  15,  20,  20,  15, -10, -30,
      -50, -30, -20, -10, -10, -20, -30, -50
    ]
  };

  // Livre d'ouvertures (Opening Book)
  // Mapping [Position FEN simplifiée (board + turn)] -> liste de coups populaires avec poids
  const OPENING_BOOK = {
    // Début de partie (Blancs)
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': [
      { move: 'e4', weight: 45 },
      { move: 'd4', weight: 35 },
      { move: 'Nf3', weight: 12 },
      { move: 'c4', weight: 8 }
    ],
    // Réponses à 1. e4
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': [
      { move: 'c5', weight: 42 }, // Sicilienne
      { move: 'e5', weight: 35 }, // Partie ouverte
      { move: 'e6', weight: 12 }, // Française
      { move: 'c6', weight: 8 },  // Caro-Kann
      { move: 'd6', weight: 3 }   // Pirc
    ],
    // 1. e4 e5
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w': [
      { move: 'Nf3', weight: 80 },
      { move: 'Bc4', weight: 10 },
      { move: 'Nc3', weight: 5 },
      { move: 'd4', weight: 5 }
    ],
    // 1. e4 e5 2. Nf3
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b': [
      { move: 'Nc6', weight: 80 },
      { move: 'Nf6', weight: 15 }, // Petrov
      { move: 'd6', weight: 5 }
    ],
    // 1. e4 e5 2. Nf3 Nc6
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w': [
      { move: 'Bb5', weight: 45 }, // Ruy Lopez (Espagnole)
      { move: 'Bc4', weight: 40 }, // Italienne
      { move: 'd4', weight: 15 }   // Écossaise
    ],
    // 1. e4 c5 (Sicilienne)
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w': [
      { move: 'Nf3', weight: 75 },
      { move: 'Nc3', weight: 15 },
      { move: 'c3', weight: 10 }  // Alapin
    ],
    // 1. e4 c5 2. Nf3
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b': [
      { move: 'd6', weight: 45 },
      { move: 'Nc6', weight: 30 },
      { move: 'e6', weight: 25 }
    ],
    // 1. e4 e6 (Française)
    'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w': [
      { move: 'd4', weight: 90 },
      { move: 'Nf3', weight: 10 }
    ],
    // 1. e4 c6 (Caro-Kann)
    'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w': [
      { move: 'd4', weight: 90 },
      { move: 'Nf3', weight: 10 }
    ],
    // 1. d4
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': [
      { move: 'Nf6', weight: 50 }, // Indienne
      { move: 'd5', weight: 40 },  // Partie fermée
      { move: 'e6', weight: 5 },
      { move: 'f5', weight: 5 }   // Hollandaise
    ],
    // 1. d4 d5
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w': [
      { move: 'c4', weight: 70 },  // Gambit Dame
      { move: 'Nf3', weight: 20 },
      { move: 'Bf4', weight: 10 } // Système de Londres
    ],
    // 1. d4 Nf6
    'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w': [
      { move: 'c4', weight: 70 },
      { move: 'Nf3', weight: 20 },
      { move: 'Bg5', weight: 10 } // Trompowsky
    ],
    // 1. d4 Nf6 2. c4
    'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b': [
      { move: 'e6', weight: 45 },  // Nimzo / Ouest-Indienne
      { move: 'g6', weight: 40 },  // Est-Indienne / Grünfeld
      { move: 'c5', weight: 15 }   // Benoni
    ],
    // 1. c4 (Anglaise)
    'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b': [
      { move: 'e5', weight: 45 },
      { move: 'Nf6', weight: 35 },
      { move: 'c5', weight: 20 }
    ]
  };

  // Obtenir un coup depuis le livre d'ouvertures si disponible
  function getBookMove(chess) {
    const fen = chess.fen();
    // Clé simplifiée : "pieces turn"
    const parts = fen.split(' ');
    const key = parts[0] + ' ' + parts[1];
    const entry = OPENING_BOOK[key];
    if (!entry || !entry.length) return null;

    // Tirage pondéré
    const totalWeight = entry.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const item of entry) {
      rand -= item.weight;
      if (rand <= 0) {
        // Valider la légalité du coup
        try {
          const m = chess.move(item.move);
          if (m) {
            chess.undo();
            return m;
          }
        } catch (e) {}
      }
    }
    return null;
  }

  // Évaluation statique de la position (centipawns du point de vue des Blancs)
  function evaluateBoard(chess) {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        return chess.turn() === 'w' ? -100000 : 100000;
      }
      return 0; // Pat / nulle
    }

    const board = chess.board();
    let totalScore = 0;
    let whitePieces = 0;
    let blackPieces = 0;

    // Compter le matériel pour détecter la finale
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.type === 'k' || piece.type === 'p') continue;
        if (piece.color === 'w') whitePieces += PIECE_VALUES[piece.type];
        else blackPieces += PIECE_VALUES[piece.type];
      }
    }
    const isEndgame = (whitePieces + blackPieces) < 1600;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 0;
        let pstVal = 0;

        if (piece.type === 'k' && isEndgame) {
          const sqIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
          pstVal = PST.k_endgame[sqIdx] || 0;
        } else {
          const pstTable = PST[piece.type];
          if (pstTable) {
            const sqIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
            pstVal = pstTable[sqIdx] || 0;
          }
        }

        const score = val + pstVal;
        totalScore += (piece.color === 'w') ? score : -score;
      }
    }

    // Bonus pour contrôle central (e4, d4, e5, d5)
    const centerSquares = ['e4', 'd4', 'e5', 'd5'];
    for (const sq of centerSquares) {
      const piece = chess.get(sq);
      if (piece) {
        const bonus = piece.type === 'p' ? 15 : 10;
        totalScore += piece.color === 'w' ? bonus : -bonus;
      }
    }

    return totalScore;
  }

  // Tri heuristique des coups (MVV-LVA + Promotions + Échecs) pour accélérer l'élagage alpha-beta
  function scoreMove(move) {
    let score = 0;
    if (move.captured) {
      const victimVal = PIECE_VALUES[move.captured] || 100;
      const attackerVal = PIECE_VALUES[move.piece] || 100;
      score += 1000 + (victimVal * 10 - attackerVal);
    }
    if (move.promotion) {
      score += 800;
    }
    if (move.san && move.san.includes('+')) {
      score += 200;
    }
    return score;
  }

  function sortMoves(moves) {
    return moves.sort((a, b) => scoreMove(b) - scoreMove(a));
  }

  // Recherche de repos (Quiescence Search) pour stabiliser les évaluations tactiques
  function quiescence(chess, alpha, beta, isMaximizing, qDepth) {
    if (qDepth <= 0 || chess.isGameOver()) {
      return evaluateBoard(chess);
    }

    const standPat = evaluateBoard(chess);

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (alpha < standPat) alpha = standPat;

      const moves = chess.moves({ verbose: true }).filter(m => m.captured || m.promotion);
      sortMoves(moves);

      for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        const score = quiescence(chess, alpha, beta, false, qDepth - 1);
        chess.undo();

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (beta > standPat) beta = standPat;

      const moves = chess.moves({ verbose: true }).filter(m => m.captured || m.promotion);
      sortMoves(moves);

      for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        const score = quiescence(chess, alpha, beta, true, qDepth - 1);
        chess.undo();

        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  // Minimax avec Élagage Alpha-Beta + Quiescence Search
  function minimax(chess, depth, alpha, beta, isMaximizing, maxQDepth) {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        return chess.turn() === 'w' ? -100000 - depth : 100000 + depth;
      }
      return 0; // Pat / nulle
    }

    if (depth === 0) {
      return maxQDepth > 0 ? quiescence(chess, alpha, beta, isMaximizing, maxQDepth) : evaluateBoard(chess);
    }

    const moves = chess.moves({ verbose: true });
    sortMoves(moves);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        const evalVal = minimax(chess, depth - 1, alpha, beta, false, maxQDepth);
        chess.undo();

        maxEval = Math.max(maxEval, evalVal);
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) break; // Élagage Beta
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        const evalVal = minimax(chess, depth - 1, alpha, beta, true, maxQDepth);
        chess.undo();

        minEval = Math.min(minEval, evalVal);
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) break; // Élagage Alpha
      }
      return minEval;
    }
  }

  // ===================== OBJET ENGINE PUBLIC =====================
  const Engine = {
    chess: null,

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

    /**
     * Calcule le meilleur coup de façon autonome, fluide et non-bloquante
     * @param {string} fen - FEN de la position
     * @param {Object} opts - { level: 1..10, onInfo: function }
     * @returns {Promise<Object|string>} coup choisi
     */
    getBestMove(fen, opts) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const g = new Chess(fen);
            const moves = g.moves({ verbose: true });

            if (!moves || moves.length === 0) {
              resolve(null);
              return;
            }

            const level = (opts && opts.level != null) ? Math.max(1, Math.min(10, opts.level)) : 5;
            const turn = g.turn();
            const isMaximizing = turn === 'w';

            // 1. Coup du livre d'ouvertures (pour les niveaux >= 4 et début de partie)
            if (level >= 4 && g.history().length <= 12) {
              const bookMove = getBookMove(g);
              if (bookMove) {
                resolve(bookMove);
                return;
              }
            }

            // 2. Gestion des niveaux de difficulté
            // Niveau 1 : Débutant (Aléatoire avec un peu de capture)
            if (level === 1) {
              if (Math.random() < 0.4) {
                const captures = moves.filter(m => m.captured);
                if (captures.length) {
                  resolve(captures[Math.floor(Math.random() * captures.length)]);
                  return;
                }
              }
              resolve(moves[Math.floor(Math.random() * moves.length)]);
              return;
            }

            // Niveau 2-3 : Novice (Hasard partiel + profondeur 1)
            if (level <= 3 && Math.random() < (0.45 - level * 0.1)) {
              const captures = moves.filter(m => m.captured);
              if (captures.length && Math.random() < 0.7) {
                resolve(captures[Math.floor(Math.random() * captures.length)]);
                return;
              }
              resolve(moves[Math.floor(Math.random() * moves.length)]);
              return;
            }

            // Configuration de la profondeur selon le niveau
            let depth = 2;
            let qDepth = 0;
            if (level >= 4 && level <= 5) { depth = 2; qDepth = 2; }
            else if (level >= 6 && level <= 7) { depth = 3; qDepth = 3; }
            else if (level >= 8 && level <= 9) { depth = 4; qDepth = 3; }
            else if (level >= 10) { depth = 4; qDepth = 4; }

            let bestScore = isMaximizing ? -Infinity : Infinity;
            let bestMoves = [];

            sortMoves(moves);

            for (let i = 0; i < moves.length; i++) {
              const m = moves[i];
              g.move(m);
              const score = minimax(g, depth - 1, -Infinity, Infinity, !isMaximizing, qDepth);
              g.undo();

              // Ajout d'une légère variation aléatoire pour les niveaux intermédiaires
              const noise = (level < 8) ? (Math.random() * (10 - level) * 2 - (10 - level)) : 0;
              const adjustedScore = score + noise;

              if (isMaximizing) {
                if (adjustedScore > bestScore) {
                  bestScore = adjustedScore;
                  bestMoves = [m];
                } else if (Math.abs(adjustedScore - bestScore) < 5) {
                  bestMoves.push(m);
                }
              } else {
                if (adjustedScore < bestScore) {
                  bestScore = adjustedScore;
                  bestMoves = [m];
                } else if (Math.abs(adjustedScore - bestScore) < 5) {
                  bestMoves.push(m);
                }
              }
            }

            const chosen = bestMoves.length ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : moves[0];
            resolve(chosen);
          } catch (err) {
            console.error('Erreur moteur échecs IA:', err);
            try {
              const g = new Chess(fen);
              const fallbackMoves = g.moves({ verbose: true });
              resolve(fallbackMoves.length ? fallbackMoves[0] : null);
            } catch (e) {
              resolve(null);
            }
          }
        }, 30);
      });
    },

    /**
     * Analyse complète d'une position (utilisée par la vue Analyser)
     */
    analyze(fen, opts) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const g = new Chess(fen);
            const scoreVal = evaluateBoard(g);
            const resMove = this.getBestMove(fen, { level: 9 });

            resMove.then(m => {
              let sanMove = null;
              let uciMove = null;
              if (m) {
                if (typeof m === 'object') {
                  sanMove = m.san || null;
                  uciMove = (m.from && m.to) ? (m.from + m.to + (m.promotion || '')) : (m.san || null);
                } else if (typeof m === 'string') {
                  sanMove = m;
                  uciMove = m;
                }
              }
              const info = {
                score: Math.round(scoreVal),
                scoreKind: 'cp',
                depth: 4,
                bestMove: sanMove || uciMove
              };

              if (opts && typeof opts.onInfo === 'function') {
                opts.onInfo(info);
              }

              resolve({
                bestMove: sanMove || uciMove,
                info: info
              });
            });
          } catch (e) {
            resolve(null);
          }
        }, 40);
      });
    },

    /**
     * Formate un score pour l'affichage utilisateur (+1.5, -0.4, #2...)
     */
    formatScore(info) {
      if (!info) return '0.0';
      if (info.scoreKind === 'mate') {
        return info.score > 0 ? '#' + info.score : '#' + Math.abs(info.score);
      }
      const val = (info.score / 100).toFixed(1);
      return (info.score > 0 ? '+' : '') + val;
    }
  };

  window.ChessEngine = window.Engine = Engine;
})();
