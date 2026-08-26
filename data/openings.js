/* ============================================================
   Masterchessis — data/openings.js
   Explorateur d'ouvertures d'échecs professionnelles (Inspiré de Chess.com)
   Codes ECO, noms, variantes, statistiques de victoires (Blancs / Nulles / Noirs)
   ============================================================ */
(function () {
  'use strict';

  const OPENINGS = [
    // --- 1. OUVERTURES DU PION ROI (1.e4) ---
    {
      eco: 'B20', name: 'Défense Sicilienne', side: 'Noirs',
      moves: ['e4', 'c5'],
      ideas: 'Crée une structure asymétrique. Les Noirs disputent le centre et préparent une contre-attaque sur l\'aile dame.',
      difficulty: 2,
      winRate: { w: 38, d: 30, b: 32 }
    },
    {
      eco: 'B90', name: 'Sicilienne Najdorf', side: 'Noirs',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      ideas: 'L\'arme favorite de Kasparov et Fischer. Grande flexibilité et contre-attaques tranchantes.',
      difficulty: 3,
      winRate: { w: 38, d: 33, b: 29 }
    },
    {
      eco: 'B33', name: 'Sicilienne Sveshnikov', side: 'Noirs',
      moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5'],
      ideas: 'Affaiblissement volontaire de la case d5 pour un dynamisme colossal de pièces.',
      difficulty: 3,
      winRate: { w: 36, d: 37, b: 27 }
    },
    {
      eco: 'C20', name: 'Partie Italienne', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      ideas: 'Développement rapide, combat pour le centre. Le fou en c4 vise f7, point faible des Noirs.',
      difficulty: 1,
      winRate: { w: 41, d: 34, b: 25 }
    },
    {
      eco: 'C50', name: 'Giuoco Piano (Partie Italienne)', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
      ideas: 'La partie calme. Les deux camps développent harmonieusement et roquent rapidement.',
      difficulty: 1,
      winRate: { w: 40, d: 36, b: 24 }
    },
    {
      eco: 'C51', name: 'Gambit Evans', side: 'Blancs',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
      ideas: 'Sacrifice d\'un pion pour un développement foudroyant et le contrôle total du centre.',
      difficulty: 2,
      winRate: { w: 46, d: 24, b: 30 }
    },
    {
      eco: 'C60', name: 'Défense Espagnole (Ruy Lopez)', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      ideas: 'Pression sur le cavalier c6 qui défend e5. L\'Espagnole mène à des positions riches et stratégiques.',
      difficulty: 3,
      winRate: { w: 42, d: 36, b: 22 }
    },
    {
      eco: 'C50', name: 'Gambit Scotch', side: 'Les deux',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'],
      ideas: 'Ouverture du centre immédiate pour libérer les fous et les cavaliers.',
      difficulty: 2,
      winRate: { w: 43, d: 33, b: 24 }
    },
    {
      eco: 'B01', name: 'Défense Scandinave', side: 'Noirs',
      moves: ['e4', 'd5'],
      ideas: 'Les Noirs attaquent tout de suite le pion e4. Simple et solide pour débuter.',
      difficulty: 1,
      winRate: { w: 45, d: 27, b: 28 }
    },
    {
      eco: 'B10', name: 'Défense Caro-Kann', side: 'Noirs',
      moves: ['e4', 'c6'],
      ideas: 'Position solide et durable. Le fou c8 pourra se développer sans être bloqué.',
      difficulty: 2,
      winRate: { w: 39, d: 38, b: 23 }
    },
    {
      eco: 'C00', name: 'Défense Française', side: 'Noirs',
      moves: ['e4', 'e6'],
      ideas: 'Chaîne de pions solide. Les Noirs contre-attaquent le centre blanc avec d5 et c5.',
      difficulty: 2,
      winRate: { w: 41, d: 31, b: 28 }
    },
    {
      eco: 'C02', name: 'Française, Variante d\'Avance', side: 'Les deux',
      moves: ['e4', 'e6', 'd4', 'd5', 'e5'],
      ideas: 'Chaîne de pions et attaque sur l\'aile roi. Positions fermes et manœuvrières.',
      difficulty: 2,
      winRate: { w: 43, d: 29, b: 28 }
    },
    {
      eco: 'B02', name: 'Défense Alekhine', side: 'Noirs',
      moves: ['e4', 'Nf6'],
      ideas: 'Provocation. Le cavalier invite les pions blancs à avancer pour les attaquer ensuite.',
      difficulty: 3,
      winRate: { w: 44, d: 28, b: 28 }
    },
    {
      eco: 'B06', name: 'Défense Pirc', side: 'Noirs',
      moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
      ideas: 'Fianchetto sombre et contre-attaque centrale. Très robuste à tous les niveaux.',
      difficulty: 2,
      winRate: { w: 42, d: 31, b: 27 }
    },
    {
      eco: 'B21', name: 'Gambit Morra', side: 'Blancs',
      moves: ['e4', 'c5', 'd4', 'cxd4', 'c3'],
      ideas: 'Les Blancs sacrifient le pion c pour ouvrir les lignes contre la Sicilienne.',
      difficulty: 2,
      winRate: { w: 45, d: 23, b: 32 }
    },
    {
      eco: 'C20', name: 'Gambit Roi', side: 'Les deux',
      moves: ['e4', 'e5', 'f4'],
      ideas: 'Le gambit le plus romantique. Sacrifie un pion pour ouvrir la colonne f.',
      difficulty: 3,
      winRate: { w: 43, d: 22, b: 35 }
    },

    // --- 2. OUVERTURES DU PION DAME (1.d4) ---
    {
      eco: 'A00', name: 'Gambit Dame', side: 'Les deux',
      moves: ['d4', 'd5', 'c4'],
      ideas: 'Les Blancs offrent un pion de l\'aile pour gagner le contrôle du centre.',
      difficulty: 2,
      winRate: { w: 44, d: 35, b: 21 }
    },
    {
      eco: 'D00', name: 'Gambit de la Dame Refusé', side: 'Les deux',
      moves: ['d4', 'd5', 'c4', 'e6'],
      ideas: 'Les Noirs maintiennent fermement leur pion central d5. Structure classique et éprouvée.',
      difficulty: 2,
      winRate: { w: 42, d: 38, b: 20 }
    },
    {
      eco: 'D10', name: 'Défense Slave', side: 'Noirs',
      moves: ['d4', 'd5', 'c4', 'c6'],
      ideas: 'Soutient d5 avec le pion c sans bloquer le fou de cases claires c8.',
      difficulty: 2,
      winRate: { w: 39, d: 41, b: 20 }
    },
    {
      eco: 'D02', name: 'Système de Londres', side: 'Blancs',
      moves: ['d4', 'd5', 'Bf4'],
      ideas: 'Développement solide du fou f4 créant une pyramide centrale imprenable.',
      difficulty: 1,
      winRate: { w: 42, d: 36, b: 22 }
    },
    {
      eco: 'E00', name: 'Partie Catalane', side: 'Blancs',
      moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2'],
      ideas: 'Combinaison du Gambit Dame et du fianchetto fou roi g2 créant une pression sourde.',
      difficulty: 3,
      winRate: { w: 44, d: 40, b: 16 }
    },
    {
      eco: 'E20', name: 'Défense Nimzo-Indienne', side: 'Noirs',
      moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
      ideas: 'Clouage du cavalier c3 pour contrôler la case clé e4 et doubler les pions blancs.',
      difficulty: 3,
      winRate: { w: 38, d: 42, b: 20 }
    },
    {
      eco: 'D70', name: 'Défense Grünfeld', side: 'Noirs',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
      ideas: 'Abandon temporaire du centre pour le faire exploser avec c5 et le fou g7.',
      difficulty: 3,
      winRate: { w: 40, d: 38, b: 22 }
    },
    {
      eco: 'E60', name: 'Défense Est-Indienne', side: 'Noirs',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'],
      ideas: 'Contre-attaque dynamique sur l\'aile roi avec f5. Parties spectaculaires.',
      difficulty: 3,
      winRate: { w: 41, d: 33, b: 26 }
    },
    {
      eco: 'A45', name: 'Défense Indienne (Ouest)', side: 'Noirs',
      moves: ['d4', 'Nf6'],
      ideas: 'Fianchetto et développement hypermoderne. Contestation à distance du centre.',
      difficulty: 2,
      winRate: { w: 40, d: 38, b: 22 }
    },
    {
      eco: 'A40', name: 'Défense Moderne', side: 'Noirs',
      moves: ['d4', 'g6', 'c4', 'Bg7'],
      ideas: 'Fianchetto du roi. Les Noirs laissent le centre aux Blancs puis le contrent.',
      difficulty: 3,
      winRate: { w: 43, d: 29, b: 28 }
    },
    {
      eco: 'A57', name: 'Gambit Benko', side: 'Noirs',
      moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'],
      ideas: 'Sacrifice positionnel d\'un pion pour une pression durable sur les colonnes a et b.',
      difficulty: 3,
      winRate: { w: 37, d: 35, b: 28 }
    },
    {
      eco: 'A80', name: 'Défense Hollandaise', side: 'Noirs',
      moves: ['d4', 'f5'],
      ideas: 'Les Noirs attaquent immédiatement l\'aile roi. Jeu asymétrique dès le premier coup.',
      difficulty: 2,
      winRate: { w: 44, d: 27, b: 29 }
    },

    // --- 3. FLANCS & AUTRES (1.c4, 1.f4, etc.) ---
    {
      eco: 'A10', name: 'Ouverture Anglaise', side: 'Blancs',
      moves: ['c4'],
      ideas: 'Contrôle du centre par les ailes. Flexible, transpose souvent dans le Gambit Dame.',
      difficulty: 2,
      winRate: { w: 40, d: 37, b: 23 }
    },
    {
      eco: 'A03', name: 'Ouverture Bird', side: 'Blancs',
      moves: ['f4'],
      ideas: 'Rare mais surprenante. Attaque directement le centre et prépare un contrôle de e5.',
      difficulty: 2,
      winRate: { w: 36, d: 28, b: 36 }
    }
  ];

  window.ChessOpenings = window.OPENINGS = OPENINGS;
})();

