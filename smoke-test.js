/* ============================================================
   ChessArena — smoke-test.js
   Test DOM headless avec jsdom : charge le site et vérifie
   que chaque vue se rend sans erreur JS.
   Usage : node smoke-test.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Liste des scripts dans l'ordre du HTML
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

const errors = [];
const virtualConsole = new (require('jsdom').VirtualConsole)();
virtualConsole.on('jsdomError', (err) => {
  errors.push('jsdomError: ' + err.message);
});
virtualConsole.on('error', (msg) => {
  // Stockfish worker ne peut pas s'initialiser dans jsdom (pas de Web Worker).
  // C'est prévu : le moteur utilise un repli (coup aléatoire). On l'ignore.
  if (String(msg).includes('Stockfish init error')) return;
  errors.push('console.error: ' + msg);
});

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/',
  pretendToBeVisual: true,
  virtualConsole
});

const { window } = dom;
const { document } = window;

// Exécuter tous les scripts dans le contexte du DOM
for (const s of scripts) {
  try {
    const code = fs.readFileSync(path.join(root, s), 'utf8');
    window.eval(code);
  } catch (e) {
    errors.push('Script error in ' + s + ': ' + e.message);
  }
}

// Vérifier que les globaux sont exposés
const globals = ['Chess', 'Storage', 'Engine', 'ChessBoard', 'Game', 'Online', 'Puzzles', 'Learn', 'Analyze', 'Openings', 'app', 'ChessUI', 'PUZZLES', 'OPENINGS', 'LESSONS'];
const missing = globals.filter(g => !window[g]);
if (missing.length) errors.push('Missing globals: ' + missing.join(', '));

// Vérifier les données
if (window.PUZZLES && !window.PUZZLES.length) errors.push('PUZZLES empty');
if (window.OPENINGS && !window.OPENINGS.length) errors.push('OPENINGS empty');
if (window.LESSONS && !window.LESSONS.length) errors.push('LESSONS empty');

// Initialiser l'app
try {
  window.document.addEventListener('DOMContentLoaded', () => {});
  window.App.init();
} catch (e) {
  errors.push('App.init error: ' + e.message);
}

// Vérifier qu'il y a des sections
const sections = document.querySelectorAll('section[data-view]');
if (sections.length !== 7) errors.push('Expected 7 sections, got ' + sections.length);

// Tester chaque vue via les renderers
const routes = ['home', 'play', 'puzzles', 'learn', 'openings', 'analyze', 'profile'];
for (const route of routes) {
  try {
    window.App.navigate(route);
    const active = document.querySelector('section[data-view].active');
    if (!active) errors.push('No active section for ' + route);
    else if (active.dataset.view !== route) errors.push('Wrong active view for ' + route + ': ' + active.dataset.view);
  } catch (e) {
    errors.push('Navigate error for ' + route + ': ' + e.message);
  }
}

// Vérifier le rendu du home
try {
  window.App.navigate('home');
  const hero = document.querySelector('.hero');
  if (!hero) errors.push('Home hero not rendered');
} catch (e) {
  errors.push('Home render error: ' + e.message);
}

if (errors.length) {
  console.log('❌ TEST FAILED');
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
} else {
  console.log('✅ SMOKE TEST PASSED — site se charge et toutes les vues se rendent');
  console.log('   - ' + window.PUZZLES.length + ' puzzles, ' + window.OPENINGS.length + ' ouvertures, ' + window.LESSONS.length + ' leçons');
  console.log('   - Sections : ' + document.querySelectorAll('section[data-view]').length);
  process.exit(0);
}
