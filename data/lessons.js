/* ============================================================
   Masterchessis — data/lessons.js
   Contenu pédagogique : leçons progressives interactives
   ============================================================ */
(function () {
  'use strict';

  const LESSONS = [
    {
      id: 1, icon: '♟', level: 'Débutant', title: 'Le plateau et les pièces',
      estTime: 5, category: 'Bases',
      sections: [
        {
          h: 'Le plateau',
          p: 'L\'échiquier est composé de 64 cases alternant clair et foncé. Les colonnes (fichiers) vont de a à h, les rangées (rangées) de 1 à 8. Les Blancs jouent toujours en premier, et la dame blanche commence sur une case blanche (d1), la dame noire sur une case noire (d8).'
        },
        {
          h: 'Les pièces',
          p: 'Chaque camp a 8 pions, 2 tours, 2 cavaliers, 2 fous, 1 dame et 1 roi. Le but est de mater le roi adverse : le mettre en échec de façon inévitable.',
          list: [
            '♙ Pion : avance d\'une case (2 depuis sa case de départ), capture en diagonale.',
            '♘ Cavalier : se déplace en « L », saute par-dessus les pièces.',
            '♗ Fou : se déplace en diagonale, reste sur sa couleur.',
            '♖ Tour : se déplace horizontalement et verticalement.',
            '♕ Dame : combine tour et fou, la pièce la plus puissante.',
            '♔ Roi : une case dans toutes les directions, indispensable à protéger.'
          ]
        }
      ]
    },
    {
      id: 2, icon: '♘', level: 'Débutant', title: 'Les règles essentielles',
      estTime: 8, category: 'Bases',
      sections: [
        {
          h: 'Le roque',
          p: 'Le roque est le seul coup où le roi et une tour bougent en même temps. Le roi fait deux pas vers la tour, la tour passe par-dessus le roi. Il n\'est possible que si : ni le roi ni la tour n\'ont bougé, aucune pièce entre eux, le roi n\'est pas en échec, et il ne traverse aucune case attaquée.'
        },
        {
          h: 'Prise en passant',
          p: 'Si un pion avance de deux cases et atterrit à côté d\'un pion adverse, celui-ci peut le capturer « en passant » comme s\'il n\'avait avancé que d\'une case. C\'est un coup spécial à connaître.'
        },
        {
          h: 'Promotion',
          p: 'Quand un pion atteint la dernière rangée, il se transforme en dame, tour, fou ou cavalier (souvent en dame). Un pion promu change immédiatement tout le rapport de force.'
        }
      ]
    },
    {
      id: 3, icon: '♛', level: 'Débutant', title: 'Mater le roi',
      estTime: 7, category: 'Finales',
      sections: [
        {
          h: 'Échec et mat',
          p: 'On dit qu\'un roi est en échec quand il est attaqué. Le joueur en échec DOIT répondre : déplacer le roi, capturer la pièce attaquante, ou interposer une pièce. S\'il n\'y a aucune parade, c\'est ÉCHEC ET MAT, et la partie est gagnée.'
        },
        {
          h: 'Mat du berger',
          p: 'La dame et le fou attaquent f7 au quatrième coup : 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#. C\'est le mat le plus rapide, à ne jamais laisser passer !',
          moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']
        },
        {
          h: 'Mat de l\'escalier',
          p: 'Avec une dame et une tour, on réduit progressivement le roi adverse case après case, comme des barreaux d\'échelle, jusqu\'au mat sur le bord.'
        }
      ]
    },
    {
      id: 4, icon: '⚔', level: 'Intermédiaire', title: 'Ouverture : principes',
      estTime: 8, category: 'Ouverture',
      sections: [
        {
          h: 'Les 3 règles d\'or',
          p: 'En ouverture, suivez ces trois principes : contrôlez le centre (e4, d4, e5, d5), développez vos pièces légères (cavaliers puis fous), et mettez votre roi en sécurité par le roque. Ne jouez pas la dame trop tôt, et n\'avancez pas trop de pions sans nécessité.'
        },
        {
          h: 'Le développement',
          p: 'Un développement idéal : deux pions centraux, deux cavaliers, deux fous, roque court. Chaque pièce doit avoir un rôle. Évitez de sortir deux fois la même pièce dans les 10 premiers coups.'
        },
        {
          h: 'Les erreurs fréquentes',
          list: [
            'Sacrifier du matériel sans compensation.',
            'Laisser son roi au centre pendant que les lignes s\'ouvrent.',
            'Bloquer ses propres pièces avec ses pions.',
            'Négliger la sécurité du roi pour attaquer trop tôt.'
          ]
        }
      ]
    },
    {
      id: 5, icon: '💡', level: 'Intermédiaire', title: 'Les motifs tactiques 1',
      estTime: 9, category: 'Tactique',
      sections: [
        {
          h: 'La fourchette',
          p: 'Une pièce attaque deux pièces adverses à la fois. Le cavalier est le roi de la fourchette : il atteint des cases que les autres pièces ne couvrent pas. Exemple : un cavalier en c5 attaque à la fois la dame en b3 et la tour en a4.'
        },
        {
          h: 'Le clouage',
          p: 'Une pièce clouée ne peut pas bouger sans exposer une pièce de plus grande valeur derrière elle, souvent le roi. On dit que le clouage est « absolu » quand c\'est le roi qui est derrière.'
        },
        {
          h: 'L\'enfilade',
          p: 'L\'inverse du clouage : on attaque une pièce de grande valeur qui, en s\'éloignant, expose une autre pièce derrière. La tour et la dame sont parfaites pour enfiler le long d\'une ligne.'
        }
      ]
    },
    {
      id: 6, icon: '🛡️', level: 'Intermédiaire', title: 'Stratégie : le centre',
      estTime: 8, category: 'Stratégie',
      sections: [
        {
          h: 'Pourquoi le centre ?',
          p: 'Les pièces sont plus actives au centre : un cavalier central contrôle 8 cases, un cavalier au bord en contrôle seulement 4. Occuper le centre donne généralement plus de mobilité et limite les options adverses.'
        },
        {
          h: 'Centre de pions vs centre de pièces',
          p: 'Un centre de pions (e4/d4) est durable mais peut devenir une cible. Un centre de pièces (pièces appuyées sur e4/d4) est plus flexible mais demande un développement harmonieux pour être tenu.'
        },
        {
          h: 'Les faiblesses',
          p: 'Un pion isolé (sans pions voisins sur les colonnes adjacentes) peut être une faiblesse permanente : les cases devant lui sont difficiles à contrôler. Un pion double perd en mobilité et en flexibilité.'
        }
      ]
    },
    {
      id: 7, icon: '🏰', level: 'Avancé', title: 'Finales : le roi actif',
      estTime: 8, category: 'Finales',
      sections: [
        {
          h: 'Le roi est une pièce',
          p: 'En finale, le roi devient une pièce offensive. Il doit s\'approcher du centre pour soutenir ses pions, défendre les cases clés et empêcher le roi adverse de passer.'
        },
        {
          h: 'La règle du carré',
          p: 'Pour savoir si un pion va promouvoir seul face au roi adverse : imaginez le carré dont le pion est un coin (vers la case de promotion). Si le roi adverse peut entrer dans ce carré, il rejoint le pion; sinon, le pion promeut. Un pion en 5e rangée avec le trait gagne souvent.'
        },
        {
          h: 'L\'opposition',
          p: 'Dans les finales de rois, la règle de l\'opposition est cruciale : les rois à distance d\'une case sur la même colonne, celui qui N\'a PAS le trait « possède » l\'opposition et contrôle la progression adverse.'
        }
      ]
    },
    {
      id: 8, icon: '♜', level: 'Avancé', title: 'Attaque et combinaisons',
      estTime: 10, category: 'Attaque',
      sections: [
        {
          h: 'Le sacrifice',
          p: 'Un sacrifice est un don de matériel pour un avantage plus grand : ouvrir les lignes vers le roi adverse, créer un mat forcé, ou obtenir une attaque décisive. Le sacrifice de fou en h7 (le classique : Bxh7+ !) est un exemple célèbre.'
        },
        {
          h: 'L\'attaque Grecque',
          p: 'Illustration : 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Nc3 Nxe4 8.O-O Bxc3. Traduire ce sacrifice permet d\'ouvrir la colonne f et de lancer les pièces lourdes vers le roi.',
          moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'Nxe4', 'O-O', 'Bxc3']
        },
        {
          h: 'La combinaison',
          p: 'Une combinaison est une séquence forcée de coups, souvent avec sacrifices, qui aboutit à un avantage décidé. La calculer mentalement est l\'essence de la tactique : « si … alors … pour que … »'
        }
      ]
    }
  ];

  window.ChessLessons = window.LESSONS = LESSONS;
})();
