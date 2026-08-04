# ♞ ChessArena — Échecs en ligne & Apprentissage

Site d'échecs professionnel 100 % statique : jouez contre Stockfish, en local (2 joueurs) ou en
multijoueur réel (PeerJS/WebRTC), entraînez-vous avec des puzzles, apprenez avec des cours
interactifs et analysez vos parties.

## ✨ Fonctionnalités

- 🤖 **Contre l'IA** : Stockfish à 10 niveaux de difficulté, horloges (bullet, blitz, rapide, classique)
- 🌐 **Multijoueur réel** : jeu en ligne via un code de partie (PeerJS/WebRTC)
- 👥 **Local** : mode 2 joueurs sur le même écran
- 🧩 **Puzzles** : entraîneur tactique avec session de 10 puzzles adaptés à votre Elo
- 📚 **Leçons** : cours progressifs du débutant à l'avancé, exemples interactifs
- ♟ **Ouvertures** : explorateur de 20 grandes ouvertures avec idées stratégiques
- 📊 **Analyse** : barre d'évaluation et meilleur coup par Stockfish, import PGN

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Générer les fichiers vendor (chess.js + Stockfish)
npm run build

# 3. Lancer un serveur local
npm run serve        # http://localhost:8080
# ou
python3 -m http.server 8080
```

> ⚠️ L'ouverture de `index.html` directement en `file://` peut bloquer le Worker
> Stockfish (CORS). Utilisez de préférence un serveur HTTP.

## 🧪 Tests

```bash
npm test                     # lance toute la suite
npm run test:data            # valide les FEN/solutions des puzzles, ouvertures, leçons
npm run test:smoke           # charge le site (jsdom) et vérifie chaque vue
npm run test:functional      # tests métier : puzzles, ouvertures, leçons, jeu vs IA
```

## 📦 Déploiement Netlify

Le site est entièrement statique (aucune étape de build requise pour le déploiement).
Un fichier `netlify.toml` est inclus : point de publication = racine, redirection SPA
`/* → /index.html`, et en-têtes pour le Worker/WASM Stockfish.

### Option A — Glisser-déposer (Netlify Drop)

1. Allez sur [app.netlify.com/drop](https://app.netlify.com/drop)
2. Glissez le dossier `chess-site/`
3. Le site est en ligne !

### Option B — CLI Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

> Le déploiement doit inclure `vendor/chess.min.js` et `vendor/stockfish/`.
> Si vous clonez depuis git, exécutez `npm install && npm run build` avant de déployer
> (ou dans une commande `postinstall`).

## 🗂 Structure

```
chess-site/
├── index.html         # SPA
├── css/               # style.css + board.css
├── js/                # app.js (routing), board.js, game.js, engine.js,
│                      # online.js, puzzles.js, learn.js, analyze.js, openings.js, storage.js
├── data/              # puzzles.js, openings.js, lessons.js
├── vendor/            # chess.min.js + stockfish/ (générés par npm run build)
├── build-vendor.js    # script de génération vendor
├── netlify.toml       # config déploiement Netlify
└── *.test.js          # suite de tests (jsdom)
```

