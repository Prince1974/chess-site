/* Test de validation des données (puzzles, ouvertures, leçons) */
const fs = require('fs');
const vm = require('vm');

// Load chess.js bundle
const sandbox = { window: {}, module: { exports: {} }, exports: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('vendor/chess.min.js', 'utf8'), sandbox);
const Chess = sandbox.window.Chess;

// Load data files
function loadData(file) {
  const s = { window: {}, module: { exports: {} }, exports: {} };
  vm.createContext(s);
  vm.runInContext(fs.readFileSync(file, 'utf8'), s);
  return s.window;
}

const dataWin = loadData('data/puzzles.js');
const PUZZLES = dataWin.PUZZLES || dataWin.ChessPuzzles;
dataWin.PUZZLES = PUZZLES;

let failures = 0;

// ---- Valider les puzzles ----
console.log('\n=== PUZZLES ===');
(Array.isArray(PUZZLES) ? PUZZLES : []).forEach((p, i) => {
  try {
    const c = new Chess(p.fen);
    const results = [];
    let ok = true;
    for (const m of p.solution) {
      try { results.push(c.move(m).san); }
      catch (e) { ok = false; results.push('INVALID:' + m); break; }
    }
    if (!ok) { failures++; console.log('BROKEN #' + p.id, '->', results.join(' ')); }
    else console.log('OK #' + p.id, '->', results.join(' '));
  } catch (e) {
    failures++;
    console.log('BAD FEN #' + p.id, e.message);
  }
});

// ---- Valider les ouvertures ----
console.log('\n=== OUVERTURES ===');
const opWin = loadData('data/openings.js');
const OPENINGS = opWin.OPENINGS || opWin.ChessOpenings;
(Array.isArray(OPENINGS) ? OPENINGS : []).forEach((o, i) => {
  try {
    const c = new Chess();
    let ok = true;
    for (const m of o.moves) {
      try { c.move(m); }
      catch (e) { ok = false; console.log('BROKEN', o.eco, o.name, '-> invalid move:', m, e.message); break; }
    }
    if (ok) console.log('OK', o.eco, o.name);
  } catch (e) {
    failures++;
    console.log('INIT ERROR', o.eco, o.name);
  }
});

// ---- Valider les leçons (étapes interactives et moves d'exemple) ----
console.log('\n=== LEÇONS ===');
const lsWin = loadData('data/lessons.js');
const LESSONS = lsWin.LESSONS || lsWin.ChessLessons;
(Array.isArray(LESSONS) ? LESSONS : []).forEach((l) => {
  // 1. Étapes interactives
  if (Array.isArray(l.steps)) {
    l.steps.forEach((step, si) => {
      try {
        const c = new Chess(step.fen);
        let ok = true;
        for (const m of step.solution) {
          try { c.move(m); }
          catch (e) { ok = false; console.log('BROKEN lesson step', l.title, 'step', si, '-> invalid move:', m, e.message); break; }
        }
        if (ok) console.log('OK lesson step', l.title, 'step', si + 1);
        else failures++;
      } catch (e) {
        failures++;
        console.log('INIT ERROR lesson step', l.title, step.title, e.message);
      }
    });
  }

  // 2. Sections d'exemple
  if (Array.isArray(l.sections)) {
    l.sections.forEach((sec, si) => {
      if (!sec.moves) return;
      try {
        const c = new Chess();
        let ok = true;
        for (const m of sec.moves) {
          try { c.move(m); }
          catch (e) { ok = false; console.log('BROKEN lesson sec', l.title, 'sec', si, '-> invalid move:', m, e.message); break; }
        }
        if (ok) console.log('OK lesson example', l.title, 'sec', si);
        else failures++;
      } catch (e) {
        failures++;
        console.log('INIT ERROR lesson example', l.title);
      }
    });
  }
});

console.log('\n=== RÉSULTAT ===');
if (failures === 0) console.log('✅ Toutes les données sont valides');
else { console.log('❌ ' + failures + ' erreur(s) détectée(s)'); process.exit(1); }
