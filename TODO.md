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
- [x] Tester le site (test-data.js, smoke-test.js, functional-test.js)
- [x] Préparer déploiement Netlify (netlify.toml + README)
