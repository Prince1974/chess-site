/* ============================================================
   Masterchessis — data/openings.js
   Explorateur d'ouvertures d'échecs professionnelles (Inspiré de Chess.com)
   Codes ECO, noms, variantes, statistiques de victoires (Blancs / Nulles / Noirs)
   ============================================================ */
(function () {
  'use strict';

  const OPENINGS = [
  {
    "eco": "B20",
    "name": "Défense Sicilienne",
    "side": "Noirs",
    "moves": [
      "e4",
      "c5"
    ],
    "ideas": "Crée une structure asymétrique. Les Noirs disputent le centre et préparent une contre-attaque sur l'aile dame.",
    "difficulty": 2,
    "winRate": {
      "w": 38,
      "d": 30,
      "b": 32
    }
  },
  {
    "eco": "B90",
    "name": "Sicilienne Najdorf",
    "side": "Noirs",
    "moves": [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6"
    ],
    "ideas": "L'arme favorite de Kasparov et Fischer. Grande flexibilité et contre-attaques tranchantes.",
    "difficulty": 3,
    "winRate": {
      "w": 38,
      "d": 33,
      "b": 29
    }
  },
  {
    "eco": "B33",
    "name": "Sicilienne Sveshnikov",
    "side": "Noirs",
    "moves": [
      "e4",
      "c5",
      "Nf3",
      "Nc6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "e5"
    ],
    "ideas": "Affaiblissement volontaire de la case d5 pour un dynamisme colossal de pièces.",
    "difficulty": 3,
    "winRate": {
      "w": 36,
      "d": 37,
      "b": 27
    }
  },
  {
    "eco": "C20",
    "name": "Partie Italienne",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4"
    ],
    "ideas": "Développement rapide, combat pour le centre. Le fou en c4 vise f7, point faible des Noirs.",
    "difficulty": 1,
    "winRate": {
      "w": 41,
      "d": 34,
      "b": 25
    }
  },
  {
    "eco": "C50",
    "name": "Giuoco Piano (Partie Italienne)",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5"
    ],
    "ideas": "La partie calme. Les deux camps développent harmonieusement et roquent rapidement.",
    "difficulty": 1,
    "winRate": {
      "w": 40,
      "d": 36,
      "b": 24
    }
  },
  {
    "eco": "C51",
    "name": "Gambit Evans",
    "side": "Blancs",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "b4"
    ],
    "ideas": "Sacrifice d'un pion pour un développement foudroyant et le contrôle total du centre.",
    "difficulty": 2,
    "winRate": {
      "w": 46,
      "d": 24,
      "b": 30
    }
  },
  {
    "eco": "C60",
    "name": "Défense Espagnole (Ruy Lopez)",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5"
    ],
    "ideas": "Pression sur le cavalier c6 qui défend e5. L'Espagnole mène à des positions riches et stratégiques.",
    "difficulty": 3,
    "winRate": {
      "w": 42,
      "d": 36,
      "b": 22
    }
  },
  {
    "eco": "C50",
    "name": "Gambit Scotch",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "d4",
      "exd4",
      "Nxd4"
    ],
    "ideas": "Ouverture du centre immédiat. Bonne formation pour les débutants à la tactique.",
    "difficulty": 2,
    "winRate": {
      "w": 43,
      "d": 33,
      "b": 24
    }
  },
  {
    "eco": "B01",
    "name": "Défense Scandinave",
    "side": "Noirs",
    "moves": [
      "e4",
      "d5"
    ],
    "ideas": "Les Noirs attaquent tout de suite le pion e4. Simple et solide pour débuter.",
    "difficulty": 1,
    "winRate": {
      "w": 45,
      "d": 27,
      "b": 28
    }
  },
  {
    "eco": "B10",
    "name": "Défense Caro-Kann",
    "side": "Noirs",
    "moves": [
      "e4",
      "c6"
    ],
    "ideas": "Position solide et durable. Le fou c8 pourra se développer sans être bloqué.",
    "difficulty": 2,
    "winRate": {
      "w": 39,
      "d": 38,
      "b": 23
    }
  },
  {
    "eco": "C00",
    "name": "Défense Française",
    "side": "Noirs",
    "moves": [
      "e4",
      "e6"
    ],
    "ideas": "Chaîne de pions solide. Le fou c8 est parfois bloqué mais la structure est très résistante.",
    "difficulty": 2,
    "winRate": {
      "w": 41,
      "d": 31,
      "b": 28
    }
  },
  {
    "eco": "C02",
    "name": "Française, Variante d'Avance",
    "side": "Les deux",
    "moves": [
      "e4",
      "e6",
      "d4",
      "d5",
      "e5"
    ],
    "ideas": "Chaîne de pions et attaque sur l'aile roi. Positions fermes et manœuvrières.",
    "difficulty": 2,
    "winRate": {
      "w": 43,
      "d": 29,
      "b": 28
    }
  },
  {
    "eco": "B02",
    "name": "Défense Alekhine",
    "side": "Noirs",
    "moves": [
      "e4",
      "Nf6"
    ],
    "ideas": "Provocation. Le cavalier invite les pions blancs à avancer pour les attaquer ensuite.",
    "difficulty": 3,
    "winRate": {
      "w": 44,
      "d": 28,
      "b": 28
    }
  },
  {
    "eco": "B06",
    "name": "Défense Pirc",
    "side": "Noirs",
    "moves": [
      "e4",
      "d6",
      "d4",
      "Nf6",
      "Nc3",
      "g6"
    ],
    "ideas": "Fianchetto sombre et contre-attaque centrale. Très robuste à tous les niveaux.",
    "difficulty": 2,
    "winRate": {
      "w": 42,
      "d": 31,
      "b": 27
    }
  },
  {
    "eco": "B21",
    "name": "Gambit Morra",
    "side": "Blancs",
    "moves": [
      "e4",
      "c5",
      "d4",
      "cxd4",
      "c3"
    ],
    "ideas": "Les Blancs sacrifient le pion c pour ouvrir les lignes contre la Sicilienne.",
    "difficulty": 2,
    "winRate": {
      "w": 45,
      "d": 23,
      "b": 32
    }
  },
  {
    "eco": "C20",
    "name": "Gambit Roi",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "f4"
    ],
    "ideas": "Le gambit le plus ancien. Les Blancs sacrifient un pion pour un développement foudroyant.",
    "difficulty": 3,
    "winRate": {
      "w": 43,
      "d": 22,
      "b": 35
    }
  },
  {
    "eco": "A00",
    "name": "Gambit Dame",
    "side": "Les deux",
    "moves": [
      "d4",
      "d5",
      "c4"
    ],
    "ideas": "Les Blancs offrent un pion pour gagner le centre. Les Noirs peuvent l'accepter ou le refuser.",
    "difficulty": 2,
    "winRate": {
      "w": 44,
      "d": 35,
      "b": 21
    }
  },
  {
    "eco": "D00",
    "name": "Gambit de la Dame Refusé",
    "side": "Les deux",
    "moves": [
      "d4",
      "d5",
      "c4",
      "e6"
    ],
    "ideas": "Les Noirs maintiennent fermement leur pion central d5. Structure classique et éprouvée.",
    "difficulty": 2,
    "winRate": {
      "w": 42,
      "d": 38,
      "b": 20
    }
  },
  {
    "eco": "D10",
    "name": "Défense Slave",
    "side": "Noirs",
    "moves": [
      "d4",
      "d5",
      "c4",
      "c6"
    ],
    "ideas": "Solide et fiable : les Noirs soutiennent d5 avec c6 sans bloquer leur fou c8. Une défense de choix pour les joueurs positionnels.",
    "difficulty": 2,
    "winRate": {
      "w": 39,
      "d": 41,
      "b": 20
    },
    "plans": [
      "Développer le fou c8 avant de fermer la position.",
      "Prendre en c4 au bon moment pour libérer la position.",
      "Jouer sur l'aile dame et la colonne c."
    ]
  },
  {
    "eco": "D02",
    "name": "Système de Londres",
    "side": "Blancs",
    "moves": [
      "d4",
      "d5",
      "Bf4"
    ],
    "ideas": "Un système solide et facile à jouer : le fou sort avant e3 pour éviter d'être enfermé. Les Blancs développent harmonieusement puis attaquent sur l'aile roi.",
    "difficulty": 1,
    "winRate": {
      "w": 42,
      "d": 36,
      "b": 22
    },
    "plans": [
      "Développer Nf3, e3, Bd3, c3 et roquer rapidement.",
      "Viser la case e5 et l'attaque sur le roque adverse.",
      "Garder une structure de pions saine et sans faiblesse."
    ]
  },
  {
    "eco": "E00",
    "name": "Partie Catalane",
    "side": "Blancs",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "g3",
      "d5",
      "Bg2"
    ],
    "ideas": "Le fianchetto du fou en g2 exerce une pression durable sur le centre et l'aile dame. Une ouverture positionnelle de haut niveau.",
    "difficulty": 3,
    "winRate": {
      "w": 44,
      "d": 40,
      "b": 16
    },
    "plans": [
      "Faire pression sur d5 avec le fou g2 et le cavalier c3.",
      "Jouer sur la colonne c et l'aile dame.",
      "Maintenir un centre solide et un roi en sécurité."
    ]
  },
  {
    "eco": "E20",
    "name": "Défense Nimzo-Indienne",
    "side": "Noirs",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "Nc3",
      "Bb4"
    ],
    "ideas": "L'une des défenses les plus respectées : le fou cloue le cavalier c3 et lutte pour la case e4. Les Noirs obtiennent un jeu actif et dynamique.",
    "difficulty": 3,
    "winRate": {
      "w": 38,
      "d": 42,
      "b": 20
    },
    "plans": [
      "Échanger le fou contre le cavalier pour affaiblir les pions blancs.",
      "Contrôler e4 avec les pions et les pièces.",
      "Jouer sur les faiblesses de la structure blanche."
    ]
  },
  {
    "eco": "D70",
    "name": "Défense Grünfeld",
    "side": "Noirs",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "d5"
    ],
    "ideas": "Les Noirs laissent les Blancs bâtir un centre imposant puis le minent à distance. Une défense hypermoderne, tranchante et ambitieuse.",
    "difficulty": 3,
    "winRate": {
      "w": 40,
      "d": 38,
      "b": 22
    },
    "plans": [
      "Attaquer le centre avec c5 et les pièces.",
      "Fianchetto du fou en g7 pour la pression à distance.",
      "Exploiter les cases sombres et l'activité des pièces."
    ]
  },
  {
    "eco": "E60",
    "name": "Défense Est-Indienne",
    "side": "Noirs",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "Bg7"
    ],
    "ideas": "Contre-attaque dynamique sur l'aile roi avec f5. Parties spectaculaires.",
    "difficulty": 3,
    "winRate": {
      "w": 41,
      "d": 33,
      "b": 26
    }
  },
  {
    "eco": "A45",
    "name": "Défense Indienne (Ouest)",
    "side": "Noirs",
    "moves": [
      "d4",
      "Nf6"
    ],
    "ideas": "Fianchetto et développement hypermoderne. Les Noirs laissent les Blancs occuper le centre pour le contester.",
    "difficulty": 2,
    "winRate": {
      "w": 40,
      "d": 38,
      "b": 22
    }
  },
  {
    "eco": "A40",
    "name": "Défense Moderne",
    "side": "Noirs",
    "moves": [
      "d4",
      "g6",
      "c4",
      "Bg7"
    ],
    "ideas": "Fianchetto du roi. Les Noirs laissent le centre aux Blancs puis le contrent à distance.",
    "difficulty": 3,
    "winRate": {
      "w": 43,
      "d": 29,
      "b": 28
    }
  },
  {
    "eco": "A57",
    "name": "Gambit Benko",
    "side": "Noirs",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "c5",
      "d5",
      "b5"
    ],
    "ideas": "Sacrifice positionnel d'un pion pour une pression durable sur les colonnes a et b.",
    "difficulty": 3,
    "winRate": {
      "w": 37,
      "d": 35,
      "b": 28
    }
  },
  {
    "eco": "A80",
    "name": "Défense Hollandaise",
    "side": "Noirs",
    "moves": [
      "d4",
      "f5"
    ],
    "ideas": "Les Noirs attaquent immédiatement l'aile roi. Jeu asymétrique dès le premier coup.",
    "difficulty": 2,
    "winRate": {
      "w": 44,
      "d": 27,
      "b": 29
    }
  },
  {
    "eco": "A10",
    "name": "Ouverture Anglaise",
    "side": "Blancs",
    "moves": [
      "c4"
    ],
    "ideas": "Contrôle du centre par les ailes. Flexible, peut transposer dans de nombreux systèmes.",
    "difficulty": 2,
    "winRate": {
      "w": 40,
      "d": 37,
      "b": 23
    }
  },
  {
    "eco": "A03",
    "name": "Ouverture Bird",
    "side": "Blancs",
    "moves": [
      "f4"
    ],
    "ideas": "Rare mais surprenante. Attaque directement le centre et prépare un contrôle de e5.",
    "difficulty": 2,
    "winRate": {
      "w": 36,
      "d": 28,
      "b": 36
    }
  },
  {
    "eco": "D20",
    "name": "Gambit Dame Accepté",
    "side": "Les deux",
    "moves": [
      "d4",
      "d5",
      "c4",
      "dxc4"
    ],
    "ideas": "Les Noirs acceptent le pion offert mais cèdent le centre. Les Blancs récupèrent facilement le pion avec un développement supérieur.",
    "plans": [
      "Pour les Blancs : récupérer le pion et occuper le centre.",
      "Pour les Noirs : conserver le pion avec b5 puis développer.",
      "Ne pas s'accrocher au pion au prix du développement."
    ],
    "difficulty": 2
  },
  {
    "eco": "C25",
    "name": "Partie Viennoise",
    "side": "Blancs",
    "moves": [
      "e4",
      "e5",
      "Nc3"
    ],
    "ideas": "Un développement souple qui prépare f4 et l'attaque sur l'aile roi, tout en gardant la possibilité de jouer au centre.",
    "plans": [
      "Préparer f4 pour attaquer le centre noir.",
      "Développer le fou en c4 et roquer rapidement.",
      "Choisir entre le jeu central et l'attaque du roi."
    ],
    "difficulty": 2
  },
  {
    "eco": "C42",
    "name": "Défense Petrov",
    "side": "Noirs",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nf6"
    ],
    "ideas": "Au lieu de défendre e5, les Noirs contre-attaquent immédiatement. Une défense symétrique et solide qui peut devenir très tranchante.",
    "plans": [
      "Récupérer le pion central avec Nxe4.",
      "Éviter les pièges tactiques du début.",
      "Jouer pour l'égalisation puis l'initiative."
    ],
    "difficulty": 2
  },
  {
    "eco": "C47",
    "name": "Ouverture des Quatre Cavaliers",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Nc3",
      "Nf6"
    ],
    "ideas": "Un développement naturel et symétrique. Les deux camps sortent leurs cavaliers avant de définir un plan, menant souvent à des parties riches.",
    "plans": [
      "Développer les fous et roquer rapidement.",
      "Choisir la poussée d4 au bon moment.",
      "Éviter la symétrie stérile en créant des déséquilibres."
    ],
    "difficulty": 1
  },
  {
    "eco": "A45",
    "name": "Attaque Trompowsky",
    "side": "Blancs",
    "moves": [
      "d4",
      "Nf6",
      "Bg5"
    ],
    "ideas": "Un coup provocateur qui sort le fou avant e3 et évite les grandes théories. Les Blancs cherchent un jeu pratique et déséquilibré.",
    "plans": [
      "Échanger le fou contre le cavalier f6 si possible.",
      "Jouer e4 pour prendre le centre.",
      "Éviter les pièges et jouer sur la structure adverse."
    ],
    "difficulty": 2
  },
  {
    "eco": "A60",
    "name": "Défense Benoni",
    "side": "Les deux",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "c5",
      "d5",
      "e6"
    ],
    "ideas": "Les Noirs acceptent un centre blanc avancé pour l'attaquer ensuite. Une défense asymétrique et ambitieuse, pleine de ressources tactiques.",
    "plans": [
      "Pour les Noirs : attaquer d5 avec e6, b5 et les pièces.",
      "Pour les Blancs : exploiter l'espace et la case e4.",
      "Jouer sur l'aile roi pour les Noirs, au centre pour les Blancs."
    ],
    "difficulty": 3
  },
  {
    "eco": "D50",
    "name": "Défense Ouest-Indienne",
    "side": "Les deux",
    "moves": [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "Nf3",
      "d5"
    ],
    "ideas": "Une défense classique et flexible. Les Noirs contrôlent le centre avec d5 et e6 avant de choisir leur plan selon les Blancs.",
    "plans": [
      "Développer harmonieusement et roquer.",
      "Jouer sur la colonne c ou préparer e5.",
      "Éviter de créer des faiblesses inutiles."
    ],
    "difficulty": 2
  },
  {
    "eco": "C55",
    "name": "Défense des Deux Cavaliers",
    "side": "Les deux",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Nf6"
    ],
    "ideas": "Les Noirs développent activement et contre-attaquent e4. Une défense dynamique qui mène à des positions tactiques très riches.",
    "plans": [
      "Défendre e4 avec d6 ou jouer Nxe4.",
      "Développer le fou et roquer.",
      "Rester attentif aux sacrifices sur f7."
    ],
    "difficulty": 2
  },
  {
    "eco": "A04",
    "name": "Ouverture Réti",
    "side": "Blancs",
    "moves": [
      "Nf3",
      "d5",
      "c4"
    ],
    "ideas": "Une ouverture hypermoderne : les Blancs contrôlent le centre à distance et invitent les Noirs à l'occuper pour mieux le miner.",
    "plans": [
      "Fianchetto du fou en g2 et pression sur d5.",
      "Jouer sur les cases sombres et l'aile dame.",
      "Renverser le centre au bon moment."
    ],
    "difficulty": 2
  }
];

  window.ChessOpenings = window.OPENINGS = OPENINGS;
})();
