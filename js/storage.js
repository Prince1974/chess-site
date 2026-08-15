/* ============================================================
   Masterchessis — storage.js
   Gestion des données persistantes (localStorage) :
   - Profil, Elo, Historique, Préférences
   - Gamification : XP, Niveaux (1-25), Titres, Streaks journaliers 🔥
   - Quêtes quotidiennes & Trophées
   - Mode Admin & Statistiques globales
   - Progression des Leçons interactives & Records Puzzle Rush
   ============================================================ */
(function () {
  'use strict';

  const RANKS = [
    { level: 1, title: 'Débutant', minXp: 0, icon: '♟️' },
    { level: 2, title: 'Novice', minXp: 100, icon: '♟️' },
    { level: 3, title: 'Apprenti', minXp: 250, icon: '♘' },
    { level: 4, title: 'Tacticien', minXp: 450, icon: '♗' },
    { level: 5, title: 'Stratège', minXp: 700, icon: '♖' },
    { level: 6, title: 'Gladiateur', minXp: 1000, icon: '⚔️' },
    { level: 7, title: 'Expert', minXp: 1400, icon: '⭐' },
    { level: 8, title: 'Maître FIDE', minXp: 1900, icon: '🌟' },
    { level: 9, title: 'Maître International', minXp: 2500, icon: '👑' },
    { level: 10, title: 'Grand Maître', minXp: 3200, icon: '🏆' },
    { level: 15, title: 'Super Grand Maître', minXp: 5000, icon: '💎' },
    { level: 20, title: 'Légende des Échecs', minXp: 8000, icon: '⚡' },
    { level: 25, title: 'Maître Suprême', minXp: 12000, icon: '🌌' }
  ];

  const Storage = {
    prefix: 'masterchessis_',
    version: '2.0.0',

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

    // ---------- Profil & Rôles ----------
    getProfile() {
      return this.get('profile', {
        name: 'Invité',
        avatar: 'J',
        role: 'user', // 'user' | 'admin'
        createdAt: Date.now()
      });
    },
    setProfile(p) {
      this.set('profile', p);
    },
    updateProfile(patch) {
      const p = this.getProfile();
      const updated = Object.assign({}, p, patch);
      this.setProfile(updated);
      return updated;
    },

    // Rôle Administrateur
    isAdmin() {
      const p = this.getProfile();
      return p.role === 'admin' || this.isGodMode();
    },
    setRole(role) {
      this.updateProfile({ role: role === 'admin' ? 'admin' : 'user' });
    },
    verifyAdminPassword(pwd) {
      // Code administrateur maître (personnalisable)
      const valid = (pwd === 'admin123' || pwd === 'masterchess2026' || pwd === 'admin');
      if (valid) {
        this.setRole('admin');
        this.setGodMode(true);
      }
      return valid;
    },
    isGodMode() {
      return this.get('godmode', false);
    },
    setGodMode(val) {
      this.set('godmode', !!val);
    },

    // ---------- Gamification : XP & Niveaux ----------
    getXp() {
      return this.get('xp', 0);
    },
    addXp(amount) {
      amount = Math.max(0, parseInt(amount, 10) || 0);
      const current = this.getXp();
      const updated = current + amount;
      this.set('xp', updated);

      // Vérifier montée de niveau
      const oldLvl = this.getLevel(current).level;
      const newLvl = this.getLevel(updated).level;
      if (newLvl > oldLvl) {
        if (window.Sound) Sound.playWin();
        if (window.ChessUI) ChessUI.toast(`🎉 Niveau Supérieur ! Vous êtes maintenant Niveau ${newLvl} (${this.getLevel(updated).title})`, 'success', 4000);
      }
      return { totalXp: updated, added: amount, levelUp: newLvl > oldLvl };
    },
    getLevel(xpVal) {
      const xp = xpVal != null ? xpVal : this.getXp();
      let currentRank = RANKS[0];
      let nextRank = RANKS[1];

      for (let i = 0; i < RANKS.length; i++) {
        if (xp >= RANKS[i].minXp) {
          currentRank = RANKS[i];
          nextRank = RANKS[i + 1] || { level: currentRank.level + 1, minXp: currentRank.minXp + 2000, title: currentRank.title };
        } else {
          break;
        }
      }

      const xpInLevel = xp - currentRank.minXp;
      const xpNeeded = nextRank.minXp - currentRank.minXp;
      const pct = Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeeded) * 100)));

      return {
        level: currentRank.level,
        title: currentRank.title,
        icon: currentRank.icon,
        currentXp: xp,
        xpInLevel,
        xpNeeded,
        progressPct: pct,
        nextRank
      };
    },

    // Streaks quotidiens 🔥
    getStreak() {
      return this.get('streak', { count: 1, lastDate: new Date().toDateString() });
    },
    checkDailyStreak() {
      const s = this.getStreak();
      const today = new Date().toDateString();
      if (s.lastDate === today) return s;

      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let newCount = (s.lastDate === yesterday) ? s.count + 1 : 1;

      const updated = { count: newCount, lastDate: today };
      this.set('streak', updated);

      if (newCount > 1 && window.ChessUI) {
        ChessUI.toast(`🔥 Série de ${newCount} jours consécutifs ! (+${newCount * 10} XP)`, 'success');
        this.addXp(newCount * 10);
      }
      return updated;
    },

    // Quêtes Quotidiennes
    getDailyQuests() {
      const today = new Date().toDateString();
      const saved = this.get('dailyQuests', null);
      if (saved && saved.date === today) return saved.quests;

      // Générer les 3 quêtes du jour
      const quests = [
        { id: 'puzzles_3', desc: 'Résoudre 3 puzzles tactiques', target: 3, current: 0, xp: 60, done: false, icon: '🧩' },
        { id: 'lessons_1', desc: 'Compléter 1 leçon interactive', target: 1, current: 0, xp: 75, done: false, icon: '📚' },
        { id: 'ai_game_1', desc: 'Jouer 1 partie contre l\'IA', target: 1, current: 0, xp: 50, done: false, icon: '🤖' }
      ];
      this.set('dailyQuests', { date: today, quests });
      return quests;
    },
    bumpQuest(id, count) {
      count = count || 1;
      const today = new Date().toDateString();
      const saved = this.get('dailyQuests', { date: today, quests: [] });
      let updated = false;

      saved.quests.forEach(q => {
        if (q.id === id && !q.done) {
          q.current = Math.min(q.target, q.current + count);
          if (q.current >= q.target) {
            q.done = true;
            this.addXp(q.xp);
            if (window.ChessUI) ChessUI.toast(`🎯 Quête accomplie : ${q.desc} (+${q.xp} XP)`, 'success');
          }
          updated = true;
        }
      });

      if (updated) {
        this.set('dailyQuests', { date: today, quests: saved.quests });
      }
    },

    // ---------- Elo & Stats de Jeu ----------
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
        rushHighScore: 0,
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

    // Puzzle Rush Record
    getRushBest() {
      const s = this.getStats();
      return s.rushHighScore || 0;
    },
    saveRushScore(score) {
      const s = this.getStats();
      if (score > (s.rushHighScore || 0)) {
        this.updateStats({ rushHighScore: score });
        this.addXp(score * 20);
        return true; // nouveau record
      }
      return false;
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

    // ---------- Progression Puzzles ----------
    getPuzzleProgress() {
      return this.get('puzzleProgress', {});
    },
    setPuzzleProgress(p) { this.set('puzzleProgress', p); },
    markPuzzleSolved(id, solved) {
      const p = this.getPuzzleProgress();
      p[id] = { solved, at: Date.now() };
      this.setPuzzleProgress(p);
      if (solved) {
        this.bumpQuest('puzzles_3', 1);
        this.addXp(25);
      }
    },

    // ---------- Progression Leçons Interactives ----------
    getLessons() {
      return this.get('lessons', {});
    },
    markLessonDone(id, stars) {
      const l = this.getLessons();
      l[id] = { done: true, stars: stars || 3, at: Date.now() };
      this.setLessons(l);
      this.bumpQuest('lessons_1', 1);
      this.addXp(75);
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

    // ---------- Statistiques d'activité globales ----------
    getActivity() {
      return this.get('activity', {
        visits: 0,
        totalTimeSec: 0,
        sessionStart: null,
        lastVisit: null,
        gamesPlayed: 0,
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

    recordVisit() {
      const a = this.getActivity();
      const now = Date.now();
      const patch = {
        visits: (a.visits || 0) + 1,
        lastVisit: now,
        sessionStart: now
      };
      if (a.sessionStart && (now - a.sessionStart) < 30 * 60 * 1000) {
        const elapsed = Math.round((now - a.sessionStart) / 1000);
        patch.totalTimeSec = (a.totalTimeSec || 0) + elapsed;
      }
      this.updateActivity(patch);
      this.checkDailyStreak();
    },

    addActiveTime(seconds) {
      const a = this.getActivity();
      this.updateActivity({ totalTimeSec: (a.totalTimeSec || 0) + seconds });
    },

    bumpActivity(key) {
      const a = this.getActivity();
      if (key in a) {
        this.updateActivity({ [key]: (a[key] || 0) + 1 });
      }
    },

    // Exportation complète des données pour l'administrateur
    exportData() {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(this.prefix) === 0) {
          const subKey = k.replace(this.prefix, '');
          data[subKey] = this.get(subKey, null);
        }
      }
      return JSON.stringify(data, null, 2);
    },

    // Réinitialisation
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
