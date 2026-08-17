# Plan de construction — Site d'échecs professionnel

## Étape 1 : Fondations
- [x] Installer dépendances (chess.js, stockfish.js)
- [x] Créer index.html (structure SPA)
- [x] Créer css/style.css (thème professionnel sombre)
- [x] Créer css/board.css (plateau responsive)
- [x] Créer vendor/chess.min.js (bundle UMD chess.js)
- [x] Créer vendor/stockfish/ (worker + wasm)

## Étape 2 : Moteur de jeu
- [x] Créer js/engine.js (Integration chess.js + Stockfish Worker)
- [x] Créer js/board.js (rendu plateau, pièces SVG, déplacements)
- [x] Créer js/storage.js (profils, stats, historique localStorage)

## Étape 3 : Modes de jeu
- [x] Créer js/game.js (vs IA, hot-seat, en ligne simulé, horloges)
- [x] Créer js/online.js (multijoueur réel via PeerJS/WebRTC)
- [x] Créer js/app.js (routing SPA + navigation)

## Étape 4 : Modules d'apprentissage
- [x] Créer js/puzzles.js (entraîneur de puzzles)
- [x] Créer js/learn.js (cours interactifs)
- [x] Créer js/analyze.js (analyse Stockfish)
- [x] Créer js/openings.js (explorateur d'ouvertures)

## Étape 5 : Données
- [x] Créer data/puzzles.js (authentiques puzzles classés)
- [x] Créer data/openings.js (ouvertures principales)
- [x] Créer data/lessons.js (contenu pédagogique)

## Étape 6 : Finalisation
- [x] Tester le site
- [x] Préparer déploiement Netlify

## Étape 7 : Renommage
- [x] Renommer ChessArena → Masterchessis (branding, bundle, storage prefix)

## Étape 8 : Statistiques & SEO
- [x] Ajouter Google Analytics 4 (Measurement ID G-L104LCSLGC)
- [x] Enrichir la page Profil (temps de jeu, parties par mode, séries, % réussite)
- [x] Créer robots.txt + sitemap.xml
- [x] Ajouter balises Open Graph + Twitter Card + JSON-LD + noscript dans index.html
- [x] Tracker GA4 : page_view, game_end, puzzle_solved, lesson_completed
- [x] Statistiques locales : visites, temps passé, parties par mode (storage.js activity)
- [ ] Guide Google Search Console (vérification + soumission sitemap)

## Étape 9 : Améliorations UX & Profil
- [x] Implémenter le Drag & Drop fluide sur le plateau (board.js)
- [x] Rendre la partie Ouvertures interactive comme le module Apprentissage (openings.js)
- [x] Ajouter la possibilité d'ajouter des photos de profil (storage.js, app.js, game.js)

</content>

