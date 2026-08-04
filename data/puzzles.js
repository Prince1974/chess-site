/* ============================================================
   ChessArena — data/puzzles.js
   Puzzles authentiques classés par difficulté (rating)
   Chaque puzzle : fen initiale, solution (SAN), thème, description
   La solution est en coups complets intercalés (le joueur commence
   et termine) : la longueur est impaire.
   ============================================================ */
(function () {
  'use strict';

  const PUZZLES = [
    // --- Débutant ---
    {
      id: 1, rating: 300, theme: 'Échec et mat en 1',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
      solution: ['Qxf7#'],
      desc: 'Le classique mat du berger : la dame, protégée par le fou, mate sur f7.'
    },
    {
      id: 2, rating: 350, theme: 'Échec et mat en 1',
      fen: '6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
      solution: ['Rc8#'],
      desc: 'Le mat du couloir : la tour exploite la dernière rangée sans défense.'
    },
    {
      id: 3, rating: 400, theme: 'Échec et mat en 1',
      fen: '6k1/5ppp/4p3/8/8/8/8/3R2K1 w - - 0 1',
      solution: ['Rd8#'],
      desc: 'La tour profite de la colonne d ouverte pour mater sur la dernière rangée.'
    },
    {
      id: 4, rating: 450, theme: 'Gagner une pièce',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      solution: ['Nxe5'],
      desc: 'Le cavalier en f3 capture le pion central e5 et gagne du matériel.'
    },

    // --- Intermédiaire ---
    {
      id: 5, rating: 600, theme: 'Fourchette',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4',
      solution: ['Nxe4'],
      desc: 'Le cavalier noir reprend e4 et attaque à la fois la dame et le fou.'
    },
    {
      id: 6, rating: 700, theme: 'Clouage',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 3 3',
      solution: ['Bb4+'],
      desc: 'Le fou noir attaque en b4, menaçant le centre et le roi.'
    },
    {
      id: 7, rating: 800, theme: 'Combinaison',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Bxf7+', 'Rxf7', 'Nxe5'],
      desc: 'Le sacrifice du fou en f7 ouvre la colonne f et gagne du matériel.'
    },
    {
      id: 8, rating: 900, theme: 'Ouverture du centre',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Nxe5', 'Nxe5', 'd4'],
      desc: 'Le cavalier gagne le pion central e5, puis ouvre le centre avec d4.'
    },

    // --- Avancé ---
    {
      id: 9, rating: 1200, theme: 'Attaque Grecque',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1P3/8/3B1N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5'],
      desc: 'La fameuse attaque Grecque : sacrifice du fou en h7 pour ouvrir la diagonale.'
    },
    {
      id: 10, rating: 1400, theme: 'Poussée centrale',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Nxe5', 'Nxe5', 'd4', 'Nc6', 'd5'],
      desc: 'Une poussée centrale qui ouvre le jeu et gagne de l\'espace.'
    },
    {
      id: 11, rating: 1600, theme: 'Attaque décisive',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1P3/8/3B1N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
      solution: ['Bxh7+', 'Kxh7', 'Ng5+', 'Kg8', 'Qh5', 'Re8', 'Qxf7+'],
      desc: 'L\'attaque Grecque complète : le sacrifice initial mène à un mat imparable.'
    },
    {
      id: 12, rating: 1800, theme: 'Enfilade',
      fen: '3qk3/8/8/8/8/8/8/R5K1 w - - 0 1',
      solution: ['Ra8+'],
      desc: 'L\'enfilade : la tour attaque le roi, qui doit s\'éloigner et laisser la dame en prise.'
    }
  ];

  window.ChessPuzzles = window.PUZZLES = PUZZLES;
})();
