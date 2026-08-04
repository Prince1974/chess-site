/* Build script — génère vendor/chess.min.js (UMD) et copie les fichiers Stockfish */
const fs = require('fs');
const path = require('path');

const root = __dirname;

// 1. chess.js -> vendor/chess.min.js (expose window.Chess)
const chessSrc = fs.readFileSync(path.join(root, 'node_modules/chess.js/dist/cjs/chess.js'), 'utf8');
const wrapper = `/* ChessArena — Bundle UMD chess.js v1.0.0-beta.8 */
(function () {
  var exports = {};
  var module = { exports: exports };
  ${chessSrc}
  if (typeof window !== 'undefined') {
    window.Chess = exports.Chess;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports.Chess;
  }
})();
`;
fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
fs.writeFileSync(path.join(root, 'vendor/chess.min.js'), wrapper);
console.log('✔ vendor/chess.min.js généré');

// 2. stockfish.js -> vendor/stockfish/
const sfDir = path.join(root, 'node_modules/stockfish.js');
const destDir = path.join(root, 'vendor/stockfish');
fs.mkdirSync(destDir, { recursive: true });
for (const f of ['stockfish.wasm.js', 'stockfish.wasm']) {
  fs.copyFileSync(path.join(sfDir, f), path.join(destDir, f));
  console.log('✔ vendor/stockfish/' + f);
}
console.log('Build terminé.');
