/* ============================================================
   Masterchessis — storage.js
   Gestion des données persistantes (localStorage) :
   profil, elo, stats, historique, progression, préférences
   ============================================================ */
(function () {
  'use strict';

  const Storage = {
    prefix: 'masterchessis_',
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

// ---------- Statistiques d'activité / temps ----------
    getActivity() {
      return this.get('activity', {
        visits: 0,              // nombre total de visites
        totalTimeSec: 0,        // temps total passé (secondes)
        sessionStart: null,     // timestamp début de la session courante
        lastVisit: null,        // timestamp de la dernière visite
        gamesPlayed: 0,         // parties jouées (tous modes)
        aiGames: 0, onlineGames: 0, localGames: 0,
        puzzlesTried: 0, puzzlesSolved: 0,
        lessonsCompleted: 0,
        movesPlayed: 0
      });
    },
    setActivity(a) { this.set('activity', a); },
    updateActivity(patch) {
      const a = this.getActivity();
      this.setActivity(Object.assign({}, a, patch));
      return this.getActivity();
    },

    // Enregistre une visite (appelé au chargement)
    recordVisit() {
      const a = this.getActivity();
      const now = Date.now();
      const patch = {
        visits: (a.visits || 0) + 1,
        lastVisit: now,
        sessionStart: now
      };
      // Temps écoulé depuis la dernière session (si < 30 min, on compte)
      if (a.sessionStart && (now - a.sessionStart) < 30 * 60 * 1000) {
        const elapsed = Math.round((now - a.sessionStart) / 1000);
        patch.totalTimeSec = (a.totalTimeSec || 0) + elapsed;
      }
      this.updateActivity(patch);
    },

    // Ajoute du temps passé (appelé périodiquement)
    addActiveTime(seconds) {
      const a = this.getActivity();
      this.updateActivity({ totalTimeSec: (a.totalTimeSec || 0) + seconds });
    },

    // Incrémente un compteur quelconque
    bumpActivity(key) {
      const a = this.getActivity();
      if (key in a) {
        this.updateActivity({ [key]: (a[key] || 0) + 1 });
      }
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
