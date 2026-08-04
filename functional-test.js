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
  Puzzles.ratings = [p];
  Puzzles.index = 0;
  Puzzles._display();
  Puzzles.puzzle = p;
  Puzzles.chess = new window.Chess(p.fen);
  Puzzles.step = 0;
  Puzzles.solved = false;
  Puzzles.chess.move('Qxf7#');
  Puzzles._onMove({ san: 'Qxf7#' });
  if (Puzzles.solved) ok('Mat en 1 resolu');
  else fail('Mat en 1', 'pas resolu');

  const p2 = window.PUZZLES[3]; // Nxe5
  Puzzles.puzzle = p2;
  Puzzles.chess = new window.Chess(p2.fen);
  Puzzles.step = 0;
  Puzzles.solved = false;
  Puzzles.wrongCount = 0;
  Puzzles._onMove({ san: 'Nf3' });
  Puzzles._onMove({ san: 'Nf3' });
  if (Puzzles.solved) ok('Mauvais coup -> lose correct');
  else fail('Mauvais coup', 'pas marque lose');
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

console.log('=== LEÇONS ===');
try {
  const Learn = window.Learn;
  const container = document.createElement('div');
  document.body.appendChild(container);
  Learn.container = container;
  Learn.lessons = window.LESSONS;
  Learn._showLesson(window.LESSONS[2]); // lecon avec moves
  if (container.querySelector('.lesson-detail')) ok('Detail lecon rendu');
  else fail('Detail lecon', 'absent');
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
    if (game.moveList.length >= 1) ok('Coup joue');
    else fail('Coup joue', 'liste vide');
    await new Promise(r => setTimeout(r, 100));
    if (game.moveList.length >= 2) ok('Reponse IA recue');
    else fail('Reponse IA', 'pas de coup IA');
    window.Engine.getBestMove = origGetBestMove;
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
