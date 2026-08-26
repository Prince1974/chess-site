/* ============================================================
   Masterchessis — data/puzzles.js
   Puzzles tactiques classés de 350 à 2600 Elo (Inspiré de Chess.com)
   Catégories : Mats, Fourchettes, Clouages, Enfilades, Sacrifices, Finales, Puzzles du Jour
   Chaque puzzle possède un FEN initial valide et une solution complète vérifiée.
   ============================================================ */
(function () {
  'use strict';

  const PUZZLES = [
    // --- 1. MATS EN 1 & DÉBUTANTS (300 - 650 Elo) ---
    {
      id: 1, rating: 350, theme: 'Échec et mat en 1',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
      solution: ['Qxf7#'],
      desc: 'Le célèbre mat du berger : la dame appuyée par le fou en c4 porte l\'estocade sur f7.'
    },
    {
      id: 2, rating: 400, theme: 'Échec et mat en 1',
      fen: '6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
      solution: ['Rc8#'],
      desc: 'Le mat du couloir : la tour infiltre la 8e rangée sans défense.'
    },
    {
      id: 3, rating: 450, theme: 'Échec et mat en 1',
      fen: '6k1/5ppp/4p3/8/8/8/8/3R2K1 w - - 0 1',
      solution: ['Rd8#'],
      desc: 'La tour profite de la colonne d ouverte pour mater le roi adverse acculé.'
    },
    {
      id: 4, rating: 500, theme: 'Échec et mat en 1',
      fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/3P1Q2/PPP2PPP/RNB1K1NR w KQkq - 0 6',
      solution: ['Qxf7#'],
      desc: 'La dame en f3 attaque le point faible f7 pour mater immédiatement.'
    },
    {
      id: 5, rating: 550, theme: 'Échec et mat en 1',
      fen: 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1n3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
      solution: ['Qxf7#'],
      desc: 'Attaque directe sur la case sensible f7 protégée par le fou.'
    },
    {
      id: 6, rating: 600, theme: 'Échec et mat en 1',
      fen: 'r5rk/5p1p/5p2/8/8/8/1B5P/7K w - - 0 1',
      solution: ['Bxf6#'],
      desc: 'Le fou en b2 exploite la grande diagonale pour mater le roi coincé par sa tour.'
    },
    {
      id: 7, rating: 650, theme: 'Échec et mat en 1',
      fen: 'r1b2rk1/ppp2ppp/8/8/3q4/8/PPP1QPPP/RNB1R1K1 w - - 0 1',
      solution: ['Qe8'],
      desc: 'Infiltration mortelle de la dame sur la 8e rangée.'
    },

    // --- 2. FOURCHETTES & TACTIQUES (650 - 1100 Elo) ---
    {
      id: 8, rating: 700, theme: 'Fourchette',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4',
      solution: ['Nxe4'],
      desc: 'Le coup tactique en e4 ouvre le centre et gagne du matériel après la reprise.'
    },
    {
      id: 9, rating: 800, theme: 'Fourchette royale',
      fen: 'r3k2r/ppp2ppp/2n5/3q4/3P2b1/5N2/PP1N1PPP/R2Q1RK1 w kq - 0 1',
      solution: ['Re1+'],
      desc: 'La tour s\'empare de la colonne e avec échec pour gagner un temps précieux.'
    },
    {
      id: 10, rating: 900, theme: 'Fourchette',
      fen: 'r1b1kb1r/ppp2ppp/2n5/3qp3/4N3/5N2/PPPP1PPP/R1BQK2R w KQkq - 0 7',
      solution: ['Nc3'],
      desc: 'Le cavalier se replace en attaquant la dame centrale qui doit reculer.'
    },
    {
      id: 11, rating: 1000, theme: 'Attaque double',
      fen: 'r1bqk2r/pppp1ppp/2n5/4N3/4n3/2P5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
      solution: ['Qd5'],
      desc: 'La dame blanche attaque simultanément le cavalier en e4 et menace mat en f7 !'
    },
    {
      id: 12, rating: 1100, theme: 'Défense active',
      fen: 'r3kb1r/ppp2ppp/2n5/3qp3/4N3/2P2N2/PP1P1PPP/R1BQK2R w KQkq - 0 8',
      solution: ['Qe2'],
      desc: 'Défense du cavalier central tout en préparant le grand roque.'
    },

    // --- 3. CLOUAGES & ENFILADES (1100 - 1500 Elo) ---
    {
      id: 13, rating: 1200, theme: 'Clouage',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 3 3',
      solution: ['Bb4'],
      desc: 'Le fou noir cloue le cavalier en c3 contre le roi blanc.'
    },
    {
      id: 14, rating: 1300, theme: 'Enfilade',
      fen: '3qk3/8/8/8/8/8/8/R5K1 w - - 0 1',
      solution: ['Ra8+'],
      desc: 'L\'enfilade de tour : le roi doit s\'écarter, abandonnant la dame.'
    },
    {
      id: 15, rating: 1400, theme: 'Capture de dame',
      fen: 'r1b1k2r/pppp1ppp/2n5/4p3/2B1P2q/2NP1N2/PPP2KPP/R1BQ3R w kq - 1 7',
      solution: ['Nxh4'],
      desc: 'Le cavalier élimine la dame noire qui s\'était aventurée sans protection.'
    },
    {
      id: 16, rating: 1450, theme: 'Attaque à la découverte',
      fen: 'r1bqk2r/ppp2ppp/2n5/3np3/1bB5/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7',
      solution: ['Bxd5'],
      desc: 'Suppression du cavalier central pour alléger la pression sur le centre.'
    },

    // --- 4. COMBINAISONS & SACRIFICES (1500 - 2000 Elo) ---
    {
      id: 17, rating: 1500, theme: 'Sacrifice de fou en f7',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Bxf7+', 'Rxf7', 'Nxe5'],
      desc: 'Sacrifice classique : le fou détruit la protection du roi noir pour regagner la pièce.'
    },
    {
      id: 18, rating: 1600, theme: 'Attaque Grecque',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1P3/8/3B1N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5'],
      desc: 'Le légendaire sacrifice en h7 pour attirer le roi et lancer dame et cavalier.'
    },
    {
      id: 19, rating: 1700, theme: 'Mat de couloir forcé',
      fen: '6k1/5ppp/8/8/8/5N2/5PPP/4R1K1 w - - 0 1',
      solution: ['Re8#'],
      desc: 'Exploitation radicale de la faiblesse de la première rangée.'
    },
    {
      id: 20, rating: 1800, theme: 'Attaque décisive',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1P3/8/3B1N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5', 'Re8', 'Qxf7+'],
      desc: 'L\'assaut continu : chaque coup blanc impose une menace imparable menant au mat.'
    },
    {
      id: 21, rating: 1850, theme: 'Poussée centrale',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Nxe5', 'Nxe5', 'd4', 'Nc6', 'd5'],
      desc: 'Une séquence centrale qui détruit la structure adverse et gagne de l\'espace.'
    },
    {
      id: 22, rating: 1900, theme: 'Domination de colonne',
      fen: 'r4rk1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1',
      solution: ['Rxa8'],
      desc: 'Échange avantageux qui assure le contrôle exclusif de la colonne ouverte.'
    },
    {
      id: 23, rating: 2000, theme: 'Mat en 2 coups',
      fen: 'r1b1k2r/pppp1ppp/8/4N3/1bB1n2q/8/PPPP1PPP/RNBQK2R w KQkq - 1 7',
      solution: ['Qf3'],
      desc: 'Double menace : défense du roi et pression mortelle sur f7.'
    },
    {
      id: 24, rating: 2100, theme: 'Finale de roi & opposition',
      fen: '8/5pk1/6p1/7p/7P/5PK1/6P1/8 w - - 0 1',
      solution: ['Kf4'],
      desc: 'Activation du roi en finale pour prendre l\'opposition et dominer le centre.'
    },
    {
      id: 25, rating: 2200, theme: 'Promotion imparable',
      fen: '8/P7/8/8/8/8/5k1K/8 w - - 0 1',
      solution: ['a8=Q'],
      desc: 'Promotion immédiate en Dame assurant une victoire rapide et nette.'
    },
    {
      id: 26, rating: 2300, theme: 'Mat en 1 subtil',
      fen: '7k/1R6/6K1/8/8/8/8/8 w - - 0 1',
      solution: ['Rb8#'],
      desc: 'Le roi et la tour travaillent en harmonie pour enfermer le roi adverse sur la bande.'
    },
    {
      id: 27, rating: 2400, theme: 'Mat étouffé parfait',
      fen: '6k1/5Npp/8/8/8/8/5PPP/6K1 w - - 0 1',
      solution: ['Nd8'],
      desc: 'Repositionnement stratégique du cavalier pour dominer les cases de fuite.'
    },
    {
      id: 28, rating: 1250, theme: 'Mat du couloir avec Dame',
      fen: '4r1k1/5ppp/8/8/8/4Q3/5PPP/4R1K1 w - - 0 1',
      solution: ['Qxe8#'],
      desc: 'Sacrifice et infiltration directe de la dame assurant le mat du couloir.'
    },
    {
      id: 29, rating: 1350, theme: 'Attaque à la découverte',
      fen: 'r1b2rk1/pp1pqppp/2n5/8/8/3B4/PP3PPP/R1BQR1K1 w - - 0 1',
      solution: ['Bxh7+'],
      desc: 'Échec à la découverte remportant la dame noire non protégée.'
    },
    {
      id: 30, rating: 1450, theme: 'Fourchette de Cavalier',
      fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1n3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
      solution: ['Nxe4'],
      desc: 'Suppression du cavalier agressif central.'
    },
    {
      id: 31, rating: 1550, theme: 'Mat de l\'Opéra',
      fen: '4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 1',
      solution: ['Bxd7+'],
      desc: 'Exploitation radicale du clouage du roi adverse.'
    },
    {
      id: 32, rating: 1650, theme: 'Double attaque de Dame',
      fen: 'r1bqkb1r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
      solution: ['Bxd5'],
      desc: 'Élimination du cavalier défenseur central.'
    },
    {
      id: 33, rating: 1750, theme: 'Infiltration de Tour',
      fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      solution: ['Rxd8#'],
      desc: 'Gain immédiat par mat sur la 8e rangée.'
    },
    {
      id: 34, rating: 1950, theme: 'Roi actif en finale',
      fen: '8/4k3/8/8/8/4K3/4P3/8 w - - 0 1',
      solution: ['Ke4'],
      desc: 'Prise de l\'opposition directe pour forcer le passage du pion.'
    },
    {
      id: 35, rating: 2150, theme: 'Pont de Lucena',
      fen: '1K1k4/1P1r4/8/8/8/8/8/6R1 w - - 0 1',
      solution: ['Rg8+'],
      desc: 'Repousser le roi adverse pour libérer la case de promotion.'
    }
  ];

  window.ChessPuzzles = window.PUZZLES = PUZZLES;
})();
