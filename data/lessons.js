/* ============================================================
   Masterchessis — data/lessons.js
   Cours d'échecs interactifs progressifs (Style Chess.com)
   Chaque leçon comporte un parcours interactif étape par étape avec
   des défis sur l'échiquier, dialogue de coach, indices et récompenses XP.
   ============================================================ */
(function () {
  'use strict';

  const LESSONS = [
    {
      id: 1, icon: '♟', level: 'Débutant', title: 'Le déplacement des pièces',
      estTime: 5, category: 'Bases', xp: 50, badge: '♟ Pionnier',
      summary: 'Apprenez comment chaque pièce se déplace et capture sur l\'échiquier.',
      steps: [
        {
          title: '1. Avancer le pion central',
          coach: 'Le pion avance de 2 cases depuis sa position initiale. Jouez votre pion roi en e4 !',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          turn: 'w',
          solution: ['e4'],
          hint: 'Cliquez sur le pion e2 et jouez-le en e4.',
          successMsg: 'Parfait ! En e4, votre pion contrôle le centre et libère la dame et le fou.'
        },
        {
          title: '2. Développer le cavalier en sautant',
          coach: 'Le cavalier est la seule pièce qui peut sauter par-dessus les autres en forme de L. Amenez le cavalier en f3 !',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          turn: 'w',
          solution: ['Nf3'],
          hint: 'Jouez le cavalier de g1 vers f3.',
          successMsg: 'Superbe ! En f3, le cavalier attaque le centre et prépare la mise en sécurité du roi.'
        },
        {
          title: '3. Activer le fou sur la grande diagonale',
          coach: 'Le fou se déplace en diagonale. Placez votre fou en c4 pour viser le point faible f7 !',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          turn: 'w',
          solution: ['Bc4'],
          hint: 'Déplacez le fou de f1 vers c4.',
          successMsg: 'Excellent ! Le fou contrôle une diagonale majeure et met la pression sur l\'adversaire.'
        }
      ],
      sections: [
        { h: 'Le plateau', p: 'L\'échiquier est composé de 64 cases alternant clair et foncé. Les Blancs commencent toujours.' },
        { h: 'Les pièces', list: ['Pion : avance de 1 ou 2 cases', 'Cavalier : saut en L', 'Fou : diagonales', 'Tour : lignes et colonnes', 'Dame : toute direction', 'Roi : 1 case'] }
      ]
    },
    {
      id: 2, icon: '🏰', level: 'Débutant', title: 'Le roque et la sécurité du roi',
      estTime: 6, category: 'Bases', xp: 60, badge: '🏰 Roi Protégé',
      summary: 'Mettez votre roi à l\'abri et connectez vos tours grâce au roque.',
      steps: [
        {
          title: '1. Exécuter le petit roque (O-O)',
          coach: 'Toutes les pièces entre le roi et la tour ont bougé. Effectuez le petit roque pour abriter votre roi !',
          fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
          turn: 'w',
          solution: ['O-O'],
          hint: 'Déplacez le roi de e1 vers g1 (le roque se fera automatiquement).',
          successMsg: 'Brillant ! Votre roi est en sécurité derrière un rempart de trois pions et la tour s\'active.'
        },
        {
          title: '2. Bloquer un échec au roi',
          coach: 'Les Noirs vous mettent en échec avec le fou en b4. Interposez votre pion en c3 pour le bloquer !',
          fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
          turn: 'w',
          solution: ['c3'],
          hint: 'Avancez le pion c2 en c3.',
          successMsg: 'Impeccable ! L\'échec est paré et le fou adverse est maintenant forcé de battre en retraite.'
        }
      ],
      sections: [
        { h: 'Conditions du roque', p: 'Ni le roi ni la tour ne doivent avoir bougé. Aucune case traversée ne doit être attaquée.' }
      ]
    },
    {
      id: 3, icon: '👑', level: 'Débutant', title: 'Le mat du berger et défense',
      estTime: 7, category: 'Tactique', xp: 75, badge: '⚡ Maître du Mat',
      summary: 'Comprenez l\'attaque rapide sur f7 et apprenez à la contrer sans paniquer.',
      steps: [
        {
          title: '1. Porter l\'estocade du mat du berger',
          coach: 'La dame et le fou ciblent tous deux la case f7 non défendue. Capturez f7 pour mater !',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
          turn: 'w',
          solution: ['Qxf7#'],
          hint: 'Prenez le pion f7 avec votre dame.',
          successMsg: 'Échec et mat ! C\'est le mat du berger en 4 coups. Mémorable mais facile à parer !'
        },
        {
          title: '2. Parer l\'attaque sur f7',
          coach: 'Les Blancs menacent Qxf7#. Jouez votre dame en e7 pour protéger le pion et défendre solidement !',
          fen: 'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
          turn: 'b',
          solution: ['Qe7'],
          hint: 'Déplacez la dame noire de d8 vers e7.',
          successMsg: 'Très bien défendu ! Le pion f7 est surprotégé et l\'offensive blanche est neutralisée.'
        }
      ],
      sections: [
        { h: 'Mat du berger', p: 'Une menace courante chez les débutants à connaître impérativement.', moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'] }
      ]
    },
    {
      id: 4, icon: '🍴', level: 'Intermédiaire', title: 'La fourchette royale',
      estTime: 8, category: 'Tactique', xp: 85, badge: '🍴 Tacticien Fourchette',
      summary: 'Attaquez deux pièces majeures simultanément avec le cavalier.',
      steps: [
        {
          title: '1. Fourchette Roi & Dame',
          coach: 'Trouvez la case où votre cavalier attaque à la fois le roi noir et la dame en c7 !',
          fen: 'r3kb1r/ppq2ppp/2n1pn2/3p4/3P4/2N2N2/PPP2PPP/R1BQR1K1 w kq - 0 9',
          turn: 'w',
          solution: ['Nb5'],
          hint: 'Sautez avec le cavalier de c3 vers b5.',
          successMsg: 'Magnifique ! Le cavalier attaque la dame en c7 et menace de sauter en c7 avec échec royal.'
        },
        {
          title: '2. Gagner la dame par fourchette',
          coach: 'Le roi et la dame noirs sont alignés sur les sauts de cavalier. Capturez la tour en a8 !',
          fen: 'r1b1k2r/ppN2ppp/4pn2/3p4/1b1P4/5N2/PPP2PPP/R1BQR1K1 w kq - 0 10',
          turn: 'w',
          solution: ['Nxa8'],
          hint: 'Capturez la tour en a8 avec le cavalier.',
          successMsg: 'Victoire matérielle décisive ! Vous avez gagné une tour nette.'
        }
      ],
      sections: [
        { h: 'Principe de la fourchette', p: 'Une pièce attaque deux cibles non protégées ou de valeur supérieure.' }
      ]
    },
    {
      id: 5, icon: '📌', level: 'Intermédiaire', title: 'Le clouage et l\'enfilade',
      estTime: 8, category: 'Tactique', xp: 90, badge: '📌 Maître du Clouage',
      summary: 'Paralyser les pièces adverses en les clouant contre le roi ou la dame.',
      steps: [
        {
          title: '1. Clouage absolu avec le fou',
          coach: 'Clouez le cavalier adverse contre son roi avec votre fou en b5 !',
          fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
          turn: 'w',
          solution: ['O-O'],
          hint: 'Mettez votre roi à l\'abri.',
          successMsg: 'Excellent timing de roque pour préparer l\'offensive sur la colonne centrale.'
        },
        {
          title: '2. Enfilade mortelle sur la rangée',
          coach: 'La dame noire est alignée derrière son roi. Jouez Ra8+ pour remporter la dame !',
          fen: '3qk3/8/8/8/8/8/8/R5K1 w - - 0 1',
          turn: 'w',
          solution: ['Ra8+'],
          hint: 'Avancez votre tour tout au bout de la colonne en a8.',
          successMsg: 'Coup de génie ! Le roi doit fuir et la dame noire en d8 sera cueillie au coup suivant.'
        }
      ],
      sections: [
        { h: 'Clouage vs Enfilade', p: 'Le clouage immobilise une pièce devant une plus forte, l\'enfilade attaque la plus forte en premier.' }
      ]
    },
    {
      id: 6, icon: '🚪', level: 'Intermédiaire', title: 'Le mat du couloir',
      estTime: 7, category: 'Finales', xp: 80, badge: '🚪 Gardien du Couloir',
      summary: 'Exploitez les pions qui emprisonnent leur propre roi sur la 8e rangée.',
      steps: [
        {
          title: '1. Mat du couloir immédiat',
          coach: 'Le roi noir est bloqué derrière ses trois pions. Portez le mat avec Rc8# !',
          fen: '6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
          turn: 'w',
          solution: ['Rc8#'],
          hint: 'Montez votre tour en c8.',
          successMsg: 'Échec et mat ! C\'est le mat du couloir : le roi n\'a aucune case de fuite (luft).'
        },
        {
          title: '2. Créer une fenêtre d\'aération (Luft)',
          coach: 'Évitez le mat du couloir dans votre propre camp en créant une case de fuite avec h3 !',
          fen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
          turn: 'w',
          solution: ['Rxe8#'],
          hint: 'Capturez la tour noire en e8.',
          successMsg: 'Mat du couloir inversé ! Vous avez éliminé la menace avant l\'adversaire.'
        }
      ],
      sections: [
        { h: 'Éviter le couloir', p: 'Pousser h3 ou g3 crée une case de respiration vitale pour le roi.' }
      ]
    },
    {
      id: 7, icon: '🔥', level: 'Avancé', title: 'Le sacrifice de fou en h7',
      estTime: 10, category: 'Attaque', xp: 120, badge: '🔥 Attaquant d\'Élite',
      summary: 'L\'attaque grecque classique : démolir le roque adverse par un sacrifice spectaculaire.',
      steps: [
        {
          title: '1. Le sacrifice initial Bxh7+',
          coach: 'Sacrifiez votre fou en h7 pour arracher le roi noir de son abri !',
          fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1P3/8/3B1N2/PPPP1PPP/R1BQ1RK1 w - - 0 1',
          turn: 'w',
          solution: ['Bxh7+'],
          hint: 'Capturez le pion h7 avec votre fou.',
          successMsg: 'Coup de tonnerre ! Le roi noir est forcé de capturer en h7 et se retrouve à découvert.'
        },
        {
          title: '2. Lancer l\'assaut avec Dame et Cavalier',
          coach: 'Après Bxh7+ Kxh7, sautez en g5 avec échec pour faire entrer la dame !',
          fen: 'r1bq1r2/pppp1ppk/2n2n2/2b1P3/8/5N2/PPPP1PPP/R1BQ1RK1 w - - 0 2',
          turn: 'w',
          solution: ['Ng5+'],
          hint: 'Déplacez le cavalier en g5 avec échec.',
          successMsg: 'L\'attaque est irrésistible ! La dame blanche va rejoindre h5 pour sceller le mat.'
        }
      ],
      sections: [
        { h: 'Attaque grecque', p: 'Une des plus belles combinaisons de l\'histoire des échecs.', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'Nxe4', 'O-O', 'Bxc3'] }
      ]
    },
    {
      id: 8, icon: '♟️', level: 'Avancé', title: 'Finale de pions & Promotion',
      estTime: 9, category: 'Finales', xp: 110, badge: '👑 Roi de la Finale',
      summary: 'Maîtrisez la poussée des pions passés et l\'opposition du roi en fin de partie.',
      steps: [
        {
          title: '1. Prendre l\'opposition avec le roi',
          coach: 'Placez votre roi en f4 face au roi noir pour dominer les cases clés !',
          fen: '8/5pk1/6p1/7p/7P/5PK1/6P1/8 w - - 0 1',
          turn: 'w',
          solution: ['Kf4'],
          hint: 'Avancez votre roi blanc en f4.',
          successMsg: 'Opposition prise ! Le roi noir doit céder du terrain et vous permettra d\'infiltrer.'
        },
        {
          title: '2. Promouvoir en Dame',
          coach: 'Votre pion a atteint la 7e rangée. Poussez-le en a8 et transformez-le en Dame !',
          fen: '8/P7/8/8/8/8/5k1K/8 w - - 0 1',
          turn: 'w',
          solution: ['a8=Q'],
          hint: 'Avancez le pion a7 en a8 pour obtenir la Dame.',
          successMsg: 'Victoire ! Avec une Dame fraîchement promue, le mat est une question de quelques coups.'
        }
      ],
      sections: [
        { h: 'La règle du carré', p: 'Si le roi adverse ne peut pas entrer dans le carré du pion, le pion va à dame tout seul.' }
      ]
    },
    {
      id: 9, icon: '🛡️', level: 'Intermédiaire', title: 'La Défense Sicilienne',
      estTime: 10, category: 'Ouvertures', xp: 100, badge: '🛡️ Sicilien',
      summary: 'Apprenez l\'ouverture la plus populaire pour les Noirs contre 1.e4.',
      steps: [
        {
          title: '1. Répondre à e4 par c5',
          coach: 'Les Blancs jouent e4. Répondez par c5 pour créer une lutte asymétrique !',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          turn: 'b',
          solution: ['c5'],
          hint: 'Avancez votre pion c7 de deux cases.',
          successMsg: 'Parfait ! C\'est le début de la Sicilienne. Vous contrôlez la case d4 depuis le flanc.'
        },
        {
          title: '2. Développer le cavalier d6',
          coach: 'Préparez la variante Najdorf en jouant d6 pour libérer vos pièces et contrôler le centre.',
          fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          turn: 'b',
          solution: ['d6'],
          hint: 'Jouez votre pion d7 en d6.',
          successMsg: 'Excellent. Vous préparez le développement de votre fou et maintenez la tension.'
        }
      ],
      sections: [
        { h: 'Pourquoi la Sicilienne ?', p: 'Elle permet de lutter pour la victoire avec les Noirs en évitant les symétries précoces.' }
      ]
    },
    {
      id: 10, icon: '🎯', level: 'Avancé', title: 'Avant-postes & Cavaliers',
      estTime: 12, category: 'Stratégie', xp: 130, badge: '🎯 Stratège d\'Élite',
      summary: 'Apprenez à installer vos cavaliers sur des cases inexpugnables au cœur du camp adverse.',
      steps: [
        {
          title: '1. Installer un cavalier en d5',
          coach: 'La case d5 est un trou dans la structure adverse. Amenez votre cavalier sur cet avant-poste !',
          fen: 'r1bqk2r/pp2bppp/2nppn2/8/3NP3/2N5/PPP1BPPP/R1BQ1RK1 w kq - 0 8',
          turn: 'w',
          solution: ['Nd5'],
          hint: 'Utilisez le cavalier d4 pour viser d5.',
          successMsg: 'Bien joué ! En d5, le cavalier devient une pièce monstrueuse que l\'adversaire aura du mal à chasser.'
        }
      ],
      sections: [
        { h: 'Qu\'est-ce qu\'un avant-poste ?', p: 'Une case (généralement sur la 5e ou 6e rangée) protégée par un pion et qui ne peut plus être attaquée par un pion adverse.' }
      ]
    },
    {
      id: 11, icon: '🗼', level: 'Débutant', title: 'Mat avec la Tour',
      estTime: 8, category: 'Finales', xp: 90, badge: '🗼 Finisseur au Sommet',
      summary: 'Maîtrisez la technique fondamentale pour mater avec une seule tour contre un roi dépouillé.',
      steps: [
        {
          title: '1. Repousser le roi sur la bande',
          coach: 'Utilisez votre tour pour couper le roi adverse. Amenez-le vers le bord de l\'échiquier !',
          fen: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1',
          turn: 'w',
          solution: ['Re5+'],
          hint: 'Donnez un échec pour forcer le roi à reculer vers la 6e rangée.',
          successMsg: 'Parfait. La tour agit comme une barrière infranchissable.'
        }
      ],
      sections: [
        { h: 'La méthode de la boîte', p: 'Réduisez progressivement l\'espace du roi adverse avec votre tour et votre roi.' }
      ]
    },
    {
      id: 12, icon: '🧲', level: 'Avancé', title: 'Le Sacrifice d\'Attraction',
      estTime: 10, category: 'Tactique', xp: 140, badge: '🧲 Magnétiseur',
      summary: 'Forcez une pièce adverse (souvent le roi) à se déplacer sur une case fatale par un sacrifice.',
      steps: [
        {
          title: '1. Attirer le roi en h7',
          coach: 'Sacrifiez votre dame pour forcer le roi à se placer sur une trajectoire de mat !',
          fen: 'r1b2rk1/pp1p1ppp/2n1p3/q7/2P5/2PB4/P2Q1PPP/R3K2R w KQ - 0 1',
          turn: 'w',
          solution: ['Bxh7+'],
          hint: 'Utilisez votre fou en d3 pour attaquer h7.',
          successMsg: 'Magnifique ! Le roi est attiré hors de son abri. L\'attaque peut maintenant se conclure.'
        }
      ],
      sections: [
        { h: 'Principe de l\'attraction', p: 'On sacrifie du matériel pour forcer une pièce ennemie sur une case où elle sera vulnérable à une fourchette, un clouage ou un mat.' }
      ]
    }
  ];

  window.ChessLessons = window.LESSONS = LESSONS;
})();
