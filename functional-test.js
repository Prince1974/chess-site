/* ============================================================
   Masterchessis — functional-test.js
   Test fonctionnel headless : jeux, puzzles, openings, learn.
   Vérifie que la logique métier fonctionne de bout en bout.
   Usage : node functional-test.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const scripts = [
  'vendor/chess.min.js',
  'js/audio.js',
  'js/storage.js',
  'js/engine.js',
  'data/puzzles.js',
  'data/openings.js',
  'data/lessons.js',
  'js/board.js',
  'js/game.js',
  'js/online.js',
  'js/puzzles.js',
  'js/learn.js',
  'js/analyze.js',
  'js/openings.js',
  'js/admin.js',
  'js/app.js'
];

const failures = [];
const ok = (name) => console.log('  ✔ ' + name);
const fail = (name, msg) => { failures.push(name + ': ' + msg); console.log('  ✘ ' + name + ' — ' + msg); };

const virtualConsole = new (require('jsdom').VirtualConsole)();
virtualConsole.on('error', (msg) => {
  if (String(msg).includes('Stockfish init error')) return;
  failures.push('console.error: ' + msg);
});

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/',
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;
const { document } = window;

for (const s of scripts) {
  try { window.eval(fs.readFileSync(path.join(root, s), 'utf8')); }
  catch (e) { fail('script ' + s, e.message); }
}

console.log('=== PUZZLES (logique de resolution) ===');
try {
  const Puzzles = window.Puzzles;
  const container = document.createElement('div');
  document.body.appendChild(container);
  Puzzles.container = container;
  Puzzles.puzzles = window.PUZZLES;
  const p = window.PUZZLES[0]; // Qxf7#
  Puzzles.selectedPuzzles = [p];
  Puzzles.index = 0;
  Puzzles.puzzle = p;
  Puzzles.chess = new window.Chess(p.fen);
  Puzzles.step = 0;
  Puzzles.solved = false;
  Puzzles._onPlayerMove({ san: 'Qxf7#' });
  if (Puzzles.solved) ok('Mat en 1 resolu');
  else fail('Mat en 1', 'pas resolu');

  const p2 = window.PUZZLES[3];
  Puzzles.puzzle = p2;
  Puzzles.chess = new window.Chess(p2.fen);
  Puzzles.step = 0;
  Puzzles.solved = false;
  Puzzles.wrongCount = 0;
  Puzzles._onPlayerMove({ san: 'Nf3' });
  Puzzles._onPlayerMove({ san: 'Nf3' });
  if (Puzzles.solved) ok('Mauvais coup -> gestion erreur');
  else fail('Mauvais coup', 'pas resolu/clos');
} catch (e) {
  fail('puzzle test', e.message);
}

console.log('=== OUVERTURES ===');
try {
  const Openings = window.Openings;
  const container = document.createElement('div');
  document.body.appendChild(container);
  Openings.container = container;
  Openings.openings = window.OPENINGS;
  Openings._build();
  if (container.querySelector('.opening-item')) ok('Liste d ouvertures rendue');
  else fail('Liste d ouvertures', 'aucun item');
} catch (e) {
  fail('openings test', e.message);
}

console.log('=== LEÇONS (interactif coach) ===');
try {
  const Learn = window.Learn;
  const container = document.createElement('div');
  document.body.appendChild(container);
  Learn.container = container;
  Learn.lessons = window.LESSONS;
  Learn._renderCatalogue();
  if (container.querySelector('.lesson-card-interactive')) ok('Catalogue leçons rendu');
  else fail('Catalogue leçons', 'absent');

  // Tester démarrage leçon interactive
  Learn._startInteractiveLesson(window.LESSONS[0]);
  if (container.querySelector('.coach-bubble')) ok('Bulle coach interactive rendue');
  else fail('Bulle coach', 'absente');
} catch (e) {
  fail('learn test', e.message);
}

console.log('=== JEU (vs IA) ===');
async function testGame() {
  try {
    const Game = window.Game;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const origGetBestMove = window.Engine.getBestMove;
    window.Engine.getBestMove = () => Promise.resolve('e5');
    const game = Game.create({ container, mode: 'ai', settings: { level: 1, time: 10, increment: 0, color: 'w' } });
    if (container.querySelector('.board')) ok('Plateau de jeu rendu');
    else fail('Plateau de jeu', 'absent');
    const m = game.chess.move('e4'); // le board applique le coup avant onMove
    game._onPlayerMove(m);
    game.stopClock();
    await new Promise(r => setTimeout(r, 100));
    if (game.moveList.length >= 2) ok('Reponse IA recue');
    else fail('Reponse IA', 'pas de coup IA');

    // Restaurer le vrai moteur
    window.Engine.getBestMove = origGetBestMove;

    // Test moteur réel (getBestMove et analyze)
    const moveW = await window.Engine.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { level: 5 });
    if (moveW) ok('Moteur getBestMove (Blancs) -> ' + (moveW.san || moveW));
    else fail('Moteur getBestMove Blancs', 'aucun coup');

    const moveB = await window.Engine.getBestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', { level: 5 });
    if (moveB) ok('Moteur getBestMove (Noirs) -> ' + (moveB.san || moveB));
    else fail('Moteur getBestMove Noirs', 'aucun coup');

    const analysis = await window.Engine.analyze('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    if (analysis && analysis.bestMove) ok('Moteur analyze -> ' + analysis.bestMove + ' (score: ' + analysis.info.score + ')');
    else fail('Moteur analyze', 'pas de resultat');
  } catch (e) {
    fail('game test', e.message);
  }
}

testGame().then(() => {
  const final = failures.length ? 'FAILED' : 'PASSED';
  console.log('\n=== ' + final + ' ===');
  if (failures.length) { failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
  process.exit(0);
});
