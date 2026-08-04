/* ============================================================
   ChessArena — data/openings.js
   Ouvertures principales avec ECO, nom, idées, coups
   ============================================================ */
(function () {
  'use strict';

  const OPENINGS = [
    {
      eco: 'B20', name: 'Défense Sicilienne', side: 'Noirs',
      moves: ['e4', 'c5'],
      ideas: 'Crée une structure asymétrique. Les Noirs disputent le centre et préparent une contre-attaque sur l\'aile dame.',
      difficulty: 2
    },
    {
      eco: 'C20', name: 'Partie Italienne', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      ideas: 'Développement rapide, combat pour le centre. Le fou en c4 vise f7, point faible des Noirs.',
      difficulty: 1
    },
    {
      eco: 'C60', name: 'Défense Espagnole (Ruy Lopez)', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      ideas: 'Pression sur le cavalier c6 qui défend e5. L\'Espagnole mène à des positions riches et stratégiques.',
      difficulty: 3
    },
    {
      eco: 'A00', name: 'Gambit Dame', side: 'Les deux',
      moves: ['d4', 'd5', 'c4'],
      ideas: 'Les Blancs offrent un pion pour gagner le centre. Les Noirs peuvent l\'accepter ou le refuser.',
      difficulty: 2
    },
    {
      eco: 'A45', name: 'Défense Indienne (Ouest)', side: 'Noirs',
      moves: ['d4', 'Nf6'],
      ideas: 'Fianchetto et développement hypermoderne. Les Noirs laissent les Blancs occuper le centre pour le contester.',
      difficulty: 3
    },
    {
      eco: 'B01', name: 'Défense Scandinave', side: 'Noirs',
      moves: ['e4', 'd5'],
      ideas: 'Les Noirs attaquent tout de suite le pion e4. Simple et solide pour débuter.',
      difficulty: 1
    },
    {
      eco: 'B10', name: 'Défense Caro-Kann', side: 'Noirs',
      moves: ['e4', 'c6'],
      ideas: 'Position solide et durable. Le fou c8 pourra se développer sans être bloqué.',
      difficulty: 2
    },
    {
      eco: 'C00', name: 'Défense Française', side: 'Noirs',
      moves: ['e4', 'e6'],
      ideas: 'Chaîne de pions solide. Le fou c8 est parfois bloqué mais la structure est très résistante.',
      difficulty: 2
    },
    {
      eco: 'A40', name: 'Défense Moderne', side: 'Noirs',
      moves: ['d4', 'g6', 'c4', 'Bg7'],
      ideas: 'Fianchetto du roi. Les Noirs laissent le centre aux Blancs puis le contrent à distance.',
      difficulty: 3
    },
    {
      eco: 'E60', name: 'Défense Est-Indienne', side: 'Noirs',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
      ideas: 'Contre-attaque dynamique sur l\'aile roi. Quantité d\'idées tactiques.',
      difficulty: 3
    },
    {
      eco: 'A03', name: 'Ouverture Bird', side: 'Blancs',
      moves: ['f4'],
      ideas: 'Rare mais surprenante. Attaque directement le centre et prépare un contrôle de e5.',
      difficulty: 2
    },
    {
      eco: 'A10', name: 'Ouverture Anglaise', side: 'Blancs',
      moves: ['c4'],
      ideas: 'Contrôle du centre par les ailes. Flexible, peut transposer dans de nombreux systèmes.',
      difficulty: 2
    },
    {
      eco: 'D00', name: 'Gambit de la Dame Refusé', side: 'Les deux',
      moves: ['d4', 'd5', 'c4', 'e6'],
      ideas: 'Les Noirs maintiennent leur pion central. Structure classique du pion dame.',
      difficulty: 2
    },
    {
      eco: 'C50', name: 'Giuoco Piano (Partie Italienne)', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
      ideas: 'La partie calme. Les deux camps développent rapidement et roquent rapidement.',
      difficulty: 1
    },
    {
      eco: 'C50', name: 'Gambit Scotch', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'],
      ideas: 'Ouverture du centre immédiat. Bonne formation pour les débutants à la tactique.',
      difficulty: 2
    },
    {
      eco: 'B02', name: 'Défense Alekhine', side: 'Noirs',
      moves: ['e4', 'Nf6'],
      ideas: 'Provocation. Le cavalier invite les pions blancs à avancer pour les attaquer ensuite.',
      difficulty: 3
    },
    {
      eco: 'B06', name: 'Défense Pirc', side: 'Noirs',
      moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
      ideas: 'Fianchetto sombre et contre-attaque centrale. Très robuste à tous les niveaux.',
      difficulty: 2
    },
    {
      eco: 'C02', name: 'Française, Variante d\'Avance', side: 'Les deux',
      moves: ['e4', 'e6', 'd4', 'd5', 'e5'],
      ideas: 'Chaîne de pions et attaque sur l\'aile roi. Positions fermes et manœuvrières.',
      difficulty: 2
    },
    {
      eco: 'A80', name: 'Défense Hollandaise', side: 'Noirs',
      moves: ['d4', 'f5'],
      ideas: 'Les Noirs attaquent immédiatement l\'aile roi. Jeu asymétrique dès le 1er coup.',
      difficulty: 2
    },
    {
      eco: 'C20', name: 'Gambit Roi', side: 'Les deux',
      moves: ['e4', 'e5', 'f4'],
      ideas: 'Le gambit le plus ancien. Les Blancs sacrifient un pion pour un développement foudroyant.',
      difficulty: 3
    }
  ];

  window.ChessOpenings = window.OPENINGS = OPENINGS;
})();
