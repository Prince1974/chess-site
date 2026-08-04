/* ============================================================
   ChessArena — storage.js
   Gestion des données persistantes (localStorage) :
   profil, elo, stats, historique, progression, préférences
   ============================================================ */
(function () {
  'use strict';

  const Storage = {
    prefix: 'chessarena_',
    version: '1.0.0',

    // ---------- Helpers ----------
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(this.prefix + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        console.warn('storage.get error', key, e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
      } catch (e) {
        console.warn('storage.set error', key, e);
      }
    },
    remove(key) {
      try { localStorage.removeItem(this.prefix + key); } catch (e) {}
    },

    // ---------- Profil ----------
    getProfile() {
      return this.get('profile', { name: 'Invité', avatar: 'J', createdAt: Date.now() });
    },
    setProfile(p) {
      this.set('profile', p);
    },
    updateProfile(patch) {
      const p = this.getProfile();
      this.setProfile(Object.assign({}, p, patch));
      return this.getProfile();
    },

    // ---------- Elo / Stats ----------
    getElo() {
      return this.get('elo', { rapid: 1200, blitz: 1200, bullet: 1200, puzzle: 1200 });
    },
    setElo(e) { this.set('elo', e); },

    getStats() {
      return this.get('stats', {
        games: 0, wins: 0, losses: 0, draws: 0,
        aiWins: 0, aiLosses: 0, aiDraws: 0,
        onlineWins: 0, onlineLosses: 0, onlineDraws: 0,
        puzzles: 0, puzzlesSolved: 0, puzzlesStreak: 0, puzzlesBest: 0,
        lessonsCompleted: 0,
        totalMoves: 0,
        bestWin: 0
      });
    },
    setStats(s) { this.set('stats', s); },
    updateStats(patch) {
      const s = this.getStats();
      this.setStats(Object.assign({}, s, patch));
      return this.getStats();
    },

    // ---------- Historique de parties ----------
    getHistory() {
      return this.get('history', []);
    },
    addGame(entry) {
      const h = this.getHistory();
      h.unshift(Object.assign({ id: Date.now(), date: new Date().toISOString() }, entry));
      this.set('history', h.slice(0, 100));
      return h;
    },
    clearHistory() { this.set('history', []); },

    // ---------- Progression puzzles ----------
    getPuzzleProgress() {
      return this.get('puzzleProgress', {});
    },
    setPuzzleProgress(p) { this.set('puzzleProgress', p); },
    markPuzzleSolved(id, solved) {
      const p = this.getPuzzleProgress();
      p[id] = { solved, at: Date.now() };
      this.setPuzzleProgress(p);
    },

    // ---------- Progression leçons ----------
    getLessons() {
      return this.get('lessons', {});
    },
    markLessonDone(id) {
      const l = this.getLessons();
      l[id] = { done: true, at: Date.now() };
      this.setLessons(l);
    },
    setLessons(l) { this.set('lessons', l); },

    // ---------- Préférences ----------
    getPrefs() {
      return this.get('prefs', {
        board: 'classic',
        pieceStyle: 'unicode',
        sound: true,
        autoPromote: true,
        showCoords: true,
        showLegalMoves: true
      });
    },
    setPrefs(p) { this.set('prefs', p); },
    updatePref(patch) {
      const p = this.getPrefs();
      this.setPrefs(Object.assign({}, p, patch));
      return this.getPrefs();
    },

    // ---------- Réinitialisation ----------
    resetAll() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(this.prefix) === 0) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    }
  };

  window.ChessAppStorage = window.Storage = Storage;
})();
