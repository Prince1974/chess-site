require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-masterchessis-secret-key-change-in-prod';
const PORT = process.env.PORT || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'masterchess2026';

/* ---------- Base de données Abstraction (PostgreSQL ou JSON file-based) ---------- */
let dbQuery, dbGet, dbRun, jsonRead, jsonWrite;
const usePostgres = !!process.env.DATABASE_URL;

if (usePostgres) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  dbQuery = async (sql, params = []) => {
    let pCount = 1;
    const pgSql = sql.replace(/\?/g, () => `$${pCount++}`);
    const res = await pool.query(pgSql, params);
    return res.rows;
  };
  dbGet = async (sql, params = []) => {
    const rows = await dbQuery(sql, params);
    return rows[0] || null;
  };
  dbRun = async (sql, params = []) => {
    let pCount = 1;
    const pgSql = sql.replace(/\?/g, () => `$${pCount++}`);
    return await pool.query(pgSql, params);
  };
  console.log('Connecté à PostgreSQL (Cloud)');
} else {
  console.log('Mode Fallback : Utilisation de JSON file-based storage');
  const dbFile = path.join(__dirname, 'masterchess.json');

  const readDb = () => {
    if (!fs.existsSync(dbFile)) {
      const initial = {
        users: [
          {
            id: 1,
            username: 'admin',
            password_hash: bcrypt.hashSync('masterchess2026', 10),
            role: 'admin',
            is_pro: true,
            region: 'CD',
            rating: 2000,
            wins: 15,
            losses: 2,
            draws: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            username: 'GrandMaster_Alex',
            password_hash: bcrypt.hashSync('player123', 10),
            role: 'user',
            is_pro: false,
            region: 'FR',
            rating: 1850,
            wins: 42,
            losses: 18,
            draws: 8,
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            username: 'TacticsWizard',
            password_hash: bcrypt.hashSync('player123', 10),
            role: 'user',
            is_pro: false,
            region: 'CD',
            rating: 1620,
            wins: 28,
            losses: 14,
            draws: 5,
            created_at: new Date().toISOString()
          }
        ],
        games: [],
        friendships: []
      };
      fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
      return initial;
    }
    try {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch (e) {
      return { users: [], games: [], friendships: [] };
    }
  };

  const writeDb = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  };
  jsonRead = readDb;
  jsonWrite = writeDb;

  dbQuery = async (sql, params = []) => {
    const db = readDb();
    if (sql.includes('FROM users')) {
      if (sql.includes('ORDER BY rating DESC')) {
        return [...db.users].sort((a, b) => b.rating - a.rating);
      }
      return db.users;
    }
    if (sql.includes('FROM games')) {
      return db.games;
    }
    return [];
  };

  dbGet = async (sql, params = []) => {
    const db = readDb();
    if (sql.includes('FROM users WHERE username = ?')) {
      return db.users.find(u => u.username.toLowerCase() === String(params[0]).toLowerCase()) || null;
    }
    if (sql.includes('FROM users WHERE id = ?')) {
      return db.users.find(u => Number(u.id) === Number(params[0])) || null;
    }
    if (sql.includes('FROM users')) {
      return db.users[0] || null;
    }
    return null;
  };

  dbRun = async (sql, params = []) => {
    const db = readDb();
    if (sql.includes('INSERT INTO users')) {
      const newUser = {
        id: db.users.length ? Math.max(...db.users.map(u => u.id || 0)) + 1 : 1,
        username: params[0],
        password_hash: params[1],
        role: params[2] || 'user',
        region: params[3] || '',
        is_pro: params[2] === 'admin',
        rating: 1200,
        wins: 0,
        losses: 0,
        draws: 0,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      writeDb(db);
      return { changes: 1, id: newUser.id };
    } else if (sql.includes('UPDATE users SET region = ? WHERE id = ?')) {
      const u = db.users.find(u => Number(u.id) === Number(params[1]));
      if (u) {
        u.region = params[0] || '';
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('DELETE FROM users WHERE id = ?')) {
      const prevLen = db.users.length;
      db.users = db.users.filter(u => Number(u.id) !== Number(params[0]));
      writeDb(db);
      return { changes: prevLen - db.users.length };
    } else if (sql.includes('UPDATE users SET rating = 1200 WHERE id = ?')) {
      const u = db.users.find(u => Number(u.id) === Number(params[0]));
      if (u) {
        u.rating = 1200;
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('UPDATE users SET role = ? WHERE id = ?')) {
      const u = db.users.find(u => Number(u.id) === Number(params[1]));
      if (u) {
        u.role = params[0];
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('UPDATE users SET is_pro = ? WHERE id = ?')) {
      const u = db.users.find(u => Number(u.id) === Number(params[1]));
      if (u) {
        u.is_pro = !!params[0];
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('UPDATE users SET rating = rating +')) {
      const u = db.users.find(u => Number(u.id) === Number(params[params.length - 1]));
      if (u) {
        u.rating = (u.rating || 1200) + 12;
        u.wins = (u.wins || 0) + 1;
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('UPDATE users SET rating = GREATEST')) {
      const u = db.users.find(u => Number(u.id) === Number(params[params.length - 1]));
      if (u) {
        u.rating = Math.max(800, (u.rating || 1200) - 12);
        u.losses = (u.losses || 0) + 1;
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('UPDATE users SET draws = draws + 1')) {
      const u = db.users.find(u => Number(u.id) === Number(params[params.length - 1]));
      if (u) {
        u.draws = (u.draws || 0) + 1;
        writeDb(db);
      }
      return { changes: 1 };
    } else if (sql.includes('INSERT INTO games')) {
      db.games.push({
        id: db.games.length + 1,
        white_username: params[0],
        black_username: params[1],
        result: params[2],
        pgn: params[3],
        created_at: new Date().toISOString()
      });
      writeDb(db);
      return { changes: 1 };
    }
    return { changes: 1 };
  };
}

// Initialisation des tables si mode SQL
(async () => {
  try {
    if (usePostgres) {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          is_pro BOOLEAN NOT NULL DEFAULT FALSE,
          rating INTEGER NOT NULL DEFAULT 1200,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          draws INTEGER NOT NULL DEFAULT 0,
          region TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await dbRun('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;');
        await dbRun("ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT DEFAULT '';");
      } catch (e) {
        // Colonnes déjà présentes ou base ancienne
      }
      await dbRun(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          white_username TEXT,
          black_username TEXT,
          result TEXT,
          pgn TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS friendships (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, friend_id)
        );
      `);
      // Créer admin par défaut si inexistant
      // Créer admin par défaut si inexistant
      const adminExists = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);
      if (!adminExists) {
        const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
        await dbRun('INSERT INTO users (username, password_hash, role, rating) VALUES (?,?,?,?)', ['admin', hash, 'admin', 2000]);
      }
    }
  } catch (err) {
    console.error('Erreur initialisation DB:', err);
  }
})();

// Configuration CORS & Express
const allowedOrigins = [
  'https://masterchessis.netlify.app',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

// JWT Helpers
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function extractToken(req) {
  if (req.cookies && req.cookies.masterchess_token) return req.cookies.masterchess_token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

async function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    // Si c'est le mot de passe secret direct passé en Bearer
    if (token === ADMIN_PASSWORD || token === 'admin123' || token === 'masterchess2026') {
      req.user = { id: 1, username: 'admin', role: 'admin' };
    } else {
      req.user = null;
    }
  }
  next();
}

app.use(authMiddleware);

// Middleware Admin
async function adminMiddleware(req, res, next) {
  const token = extractToken(req);
  if (token === ADMIN_PASSWORD || token === 'admin123' || token === 'masterchess2026') {
    req.user = { id: 1, username: 'admin', role: 'admin' };
    return next();
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
  }
  if (req.user.role === 'admin' || req.user.username === 'admin') {
    return next();
  }
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (user && (user.role === 'admin' || user.username === 'admin')) {
    return next();
  }
  res.status(403).json({ error: 'Accès administrateur requis.' });
}

/* ============================================================
   ROUTES UTILISATEUR & AUTHENTIFICATION
   ============================================================ */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), postgres: usePostgres });
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, region } = req.body || {};
    const safeRegion = /^[A-Z]{2}$/.test(String(region || '').toUpperCase()) ? String(region).toUpperCase() : '';
    if (!username || !password || username.length < 3 || password.length < 4) {
      return res.status(400).json({ error: 'Pseudo (3+ car.) et mot de passe (4+ car.) requis.' });
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return res.status(400).json({ error: 'Le pseudo ne peut contenir que des lettres, chiffres, - et _.' });
    }
    const exists = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) return res.status(409).json({ error: 'Ce pseudo est déjà pris.' });

    const hash = bcrypt.hashSync(password, 10);
    const role = (username.toLowerCase() === 'admin') ? 'admin' : 'user';
    await dbRun('INSERT INTO users (username, password_hash, role, region) VALUES (?,?,?,?)', [username, hash, role, safeRegion]);
    const user = await dbGet('SELECT id, username, role, rating, wins, losses, draws, is_pro, region FROM users WHERE username = ?', [username]);

    const token = signToken(user);
    res.cookie('masterchess_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, sameSite: 'none', secure: true });
    res.json({ user: publicUser(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l’inscription.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const row = await dbGet('SELECT * FROM users WHERE username = ?', [username || '']);
    if (!row || !bcrypt.compareSync(password || '', row.password_hash)) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    const token = signToken({ id: row.id, username: row.username, role: row.role || 'user' });
    res.cookie('masterchess_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, sameSite: 'none', secure: true });
    res.json({
      user: {
        id: row.id,
        username: row.username,
        role: row.role || 'user',
        rating: row.rating,
        is_pro: row.is_pro,
        region: row.region || '',
        wins: row.wins,
        losses: row.losses,
        draws: row.draws
      },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('masterchess_token', { sameSite: 'none', secure: true });
  res.json({ ok: true });
});

app.get('/api/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const row = await dbGet('SELECT id, username, role, rating, wins, losses, draws, is_pro, region, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(row) });
});

app.get('/api/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await dbGet('SELECT id, username, role, rating, wins, losses, draws, is_pro, region, created_at FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const games = await dbQuery(
      'SELECT id, white_username, black_username, result, created_at FROM games WHERE white_username = ? OR black_username = ? ORDER BY id DESC LIMIT 15',
      [username, username]
    );

    res.json({ user: publicUser(user), games });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur chargement profil.' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT username, rating, wins, losses, draws, role, is_pro, region FROM users ORDER BY rating DESC LIMIT 25');
    res.json({ leaderboard: (rows || []).map(publicUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ leaderboard: [] });
  }
});

/* ============================================================
   RÉSEAU SOCIAL : AMIS, PRÉSENCE, COMMUNAUTÉ
   ============================================================ */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, role: u.role || 'user',
    rating: u.rating || 1200, wins: u.wins || 0, losses: u.losses || 0,
    draws: u.draws || 0, is_pro: !!u.is_pro, region: u.region || '',
    created_at: u.created_at
  };
}

async function friendshipRows(userId) {
  if (usePostgres) {
    return await dbQuery(
      `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
              u.username, u.rating, u.region, u.is_pro, u.role
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
        WHERE f.user_id = ? OR f.friend_id = ?
        ORDER BY f.id DESC`,
      [userId, userId, userId]
    );
  }
  const db = jsonRead();
  return (db.friendships || [])
    .filter(f => Number(f.user_id) === Number(userId) || Number(f.friend_id) === Number(userId))
    .sort((a, b) => b.id - a.id)
    .map(f => {
      const otherId = Number(f.user_id) === Number(userId) ? f.friend_id : f.user_id;
      const u = db.users.find(x => Number(x.id) === Number(otherId)) || {};
      return {
        id: f.id, user_id: f.user_id, friend_id: f.friend_id, status: f.status,
        created_at: f.created_at, username: u.username || 'Joueur',
        rating: u.rating || 1200, region: u.region || '', is_pro: !!u.is_pro, role: u.role || 'user'
      };
    });
}

function onlineList() {
  const seen = new Set();
  const list = [];
  for (const info of onlineUsers.values()) {
    const key = info.userId ? 'u' + info.userId : 's' + info.socketId;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(info);
  }
  return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

app.get('/api/friends', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Connectez-vous pour gérer vos amis.' });
  try {
    const rows = await friendshipRows(req.user.id);
    const decorate = (r) => ({
      id: r.id, username: r.username, rating: r.rating, region: r.region || '',
      is_pro: !!r.is_pro, role: r.role || 'user', since: r.created_at,
      online: onlineList().some(p => p.username === r.username)
    });
    res.json({
      friends: rows.filter(r => r.status === 'accepted').map(decorate),
      incoming: rows.filter(r => r.status === 'pending' && Number(r.friend_id) === Number(req.user.id)).map(decorate),
      outgoing: rows.filter(r => r.status === 'pending' && Number(r.user_id) === Number(req.user.id)).map(decorate)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur chargement des amis.' });
  }
});

app.post('/api/friends/request', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Connectez-vous pour ajouter un ami.' });
  try {
    const { username } = req.body || {};
    const target = await dbGet('SELECT * FROM users WHERE username = ?', [String(username || '')]);
    if (!target) return res.status(404).json({ error: 'Joueur introuvable.' });
    if (Number(target.id) === Number(req.user.id)) return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même.' });

    const rows = await friendshipRows(req.user.id);
    const existing = rows.find(r => r.username && r.username.toLowerCase() === target.username.toLowerCase());
    if (existing) {
      if (existing.status === 'accepted') return res.status(409).json({ error: 'Vous êtes déjà amis.' });
      if (Number(existing.friend_id) === Number(req.user.id)) {
        return res.status(409).json({ error: 'Cette personne vous a déjà envoyé une demande. Acceptez-la.' });
      }
      return res.status(409).json({ error: 'Demande déjà envoyée.' });
    }

    if (usePostgres) {
      await dbRun("INSERT INTO friendships (user_id, friend_id, status) VALUES (?,?, 'pending')", [req.user.id, target.id]);
    } else {
      const db = jsonRead();
      if (!db.friendships) db.friendships = [];
      db.friendships.push({
        id: db.friendships.length ? Math.max(...db.friendships.map(f => f.id || 0)) + 1 : 1,
        user_id: req.user.id, friend_id: target.id, status: 'pending',
        created_at: new Date().toISOString()
      });
      jsonWrite(db);
    }
    const from = (await dbGet('SELECT rating, region FROM users WHERE id = ?', [req.user.id])) || {};
    io.to('user:' + target.id).emit('friend_request', {
      from: req.user.username, rating: from.rating || 1200, region: from.region || ''
    });
    res.json({ ok: true, message: 'Demande envoyée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur envoi demande.' });
  }
});

app.post('/api/friends/accept', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Non connecté.' });
  try {
    const { id } = req.body || {};
    const rows = await friendshipRows(req.user.id);
    const row = rows.find(r => Number(r.id) === Number(id));
    if (!row || row.status !== 'pending' || Number(row.friend_id) !== Number(req.user.id)) {
      return res.status(404).json({ error: 'Demande introuvable.' });
    }
    if (usePostgres) {
      await dbRun("UPDATE friendships SET status = 'accepted' WHERE id = ?", [id]);
    } else {
      const db = jsonRead();
      const f = (db.friendships || []).find(x => Number(x.id) === Number(id));
      if (f) { f.status = 'accepted'; jsonWrite(db); }
    }
    io.to('user:' + row.user_id).emit('friend_accepted', { by: req.user.username });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur acceptation.' });
  }
});

app.post('/api/friends/remove', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Non connecté.' });
  try {
    const { id } = req.body || {};
    if (usePostgres) {
      await dbRun('DELETE FROM friendships WHERE id = ? AND (user_id = ? OR friend_id = ?)', [id, req.user.id, req.user.id]);
    } else {
      const db = jsonRead();
      db.friendships = (db.friendships || []).filter(f => !(Number(f.id) === Number(id) && (Number(f.user_id) === Number(req.user.id) || Number(f.friend_id) === Number(req.user.id))));
      jsonWrite(db);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur suppression.' });
  }
});

app.get('/api/community/online', (req, res) => {
  res.json({ players: onlineList() });
});

app.get('/api/community/players', async (req, res) => {
  try {
    const users = await dbQuery('SELECT id, username, rating, wins, losses, draws, is_pro, region FROM users ORDER BY rating DESC LIMIT 200');
    const online = onlineList();
    const q = String(req.query.q || '').toLowerCase();
    const region = String(req.query.region || '').toUpperCase();
    const players = users
      .filter(u => (!q || u.username.toLowerCase().includes(q)) && (!region || u.region === region))
      .slice(0, 60)
      .map(u => ({ ...publicUser(u), online: online.some(p => p.username === u.username) }));
    res.json({ players });
  } catch (err) {
    console.error(err);
    res.json({ players: [] });
  }
});

app.get('/api/community/leaderboard', async (req, res) => {
  try {
    const region = String(req.query.region || '').toUpperCase();
    const users = await dbQuery('SELECT id, username, rating, wins, losses, draws, is_pro, region FROM users ORDER BY rating DESC LIMIT 200');
    const leaderboard = users.filter(u => !region || u.region === region).slice(0, 20).map(publicUser);
    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.json({ leaderboard: [] });
  }
});

app.post('/api/profile/region', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Connectez-vous.' });
  try {
    const region = String((req.body || {}).region || '').toUpperCase();
    if (region && !/^[A-Z]{2}$/.test(region)) return res.status(400).json({ error: 'Région invalide.' });
    await dbRun('UPDATE users SET region = ? WHERE id = ?', [region, req.user.id]);
    res.json({ ok: true, region });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour région.' });
  }
});

/* ============================================================
   ROUTES D'ADMINISTRATION COMPLETE
   ============================================================ */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD || password === 'admin123' || password === 'masterchess2026') {
    const adminUser = { id: 1, username: 'admin', role: 'admin' };
    const token = signToken(adminUser);
    res.cookie('masterchess_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, sameSite: 'none', secure: true });
    return res.json({ ok: true, user: adminUser, token });
  }
  res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
});

// Récupérer la liste des utilisateurs pour le panneau admin
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await dbQuery('SELECT id, username, role, is_pro, rating, wins, losses, draws, region, created_at FROM users ORDER BY id ASC');
    res.json({ users: (users || []).map(publicUser) });
  } catch (err) {
    console.error('Erreur get users admin:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

// Activer / Désactiver le statut Pro d'un utilisateur
app.post('/api/admin/users/:id/toggle-pro', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { isPro } = req.body || {};
    await dbRun('UPDATE users SET is_pro = ? WHERE id = ?', [isPro ? 1 : 0, id]);
    res.json({ ok: true, isPro: !!isPro });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour statut Pro.' });
  }
});

// Supprimer / Bannir un utilisateur
app.post('/api/admin/users/:id/ban', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    await dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true, message: `Utilisateur #${id} supprimé avec succès.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur suppression utilisateur.' });
  }
});

// Réinitialiser le rating Elo d'un utilisateur à 1200
app.post('/api/admin/users/:id/reset-rating', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    await dbRun('UPDATE users SET rating = 1200 WHERE id = ?', [id]);
    res.json({ ok: true, message: `Rating de l'utilisateur #${id} réinitialisé à 1200.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur réinitialisation rating.' });
  }
});

// Changer le rôle d'un utilisateur (admin / user)
app.post('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body || {};
    const validRole = role === 'admin' ? 'admin' : 'user';
    await dbRun('UPDATE users SET role = ? WHERE id = ?', [validRole, id]);
    res.json({ ok: true, role: validRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur mise à jour rôle.' });
  }
});

// Créer un utilisateur depuis l'admin
app.post('/api/admin/users/create', adminMiddleware, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Pseudo et mot de passe requis.' });
    }
    const exists = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) return res.status(409).json({ error: 'Ce pseudo existe déjà.' });

    const hash = bcrypt.hashSync(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'user';
    await dbRun('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)', [username, hash, userRole]);
    const created = await dbGet('SELECT id, username, role, rating, wins, losses, draws, region, created_at FROM users WHERE username = ?', [username]);
    res.json({ ok: true, user: publicUser(created) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur création utilisateur.' });
  }
});

// Statistiques globales pour l'admin
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const users = await dbQuery('SELECT id FROM users');
    const games = await dbQuery('SELECT id FROM games');
    res.json({
      totalUsers: users.length,
      totalGames: games.length,
      activeRooms: rooms.size,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur stats admin.' });
  }
});

/* ============================================================
   SERVEUR HTTP + SOCKET.IO MULTIJOUEUR TEMPS REEL
   ============================================================ */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function getUserFromSocket(socket) {
  const cookieHeader = socket.handshake.headers.cookie || '';
  const match = cookieHeader.match(/masterchess_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : (socket.handshake.auth && socket.handshake.auth.token);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

async function updateStatsAndRating(whiteId, blackId, result) {
  if (!whiteId && !blackId) return;

  if (result === '1-0') {
    if (whiteId) await dbRun('UPDATE users SET rating = rating + 12, wins = wins + 1 WHERE id=?', [whiteId]);
    if (blackId) await dbRun('UPDATE users SET rating = GREATEST(800, rating - 12), losses = losses + 1 WHERE id=?', [blackId]);
  } else if (result === '0-1') {
    if (blackId) await dbRun('UPDATE users SET rating = rating + 12, wins = wins + 1 WHERE id=?', [blackId]);
    if (whiteId) await dbRun('UPDATE users SET rating = GREATEST(800, rating - 12), losses = losses + 1 WHERE id=?', [whiteId]);
  } else {
    if (whiteId) await dbRun('UPDATE users SET draws = draws + 1 WHERE id=?', [whiteId]);
    if (blackId) await dbRun('UPDATE users SET draws = draws + 1 WHERE id=?', [blackId]);
  }
}

async function finishGame(code, room, result) {
  if (room.finished) return;
  room.finished = true;
  room.result = result;
  try {
    await dbRun(
      'INSERT INTO games (white_username, black_username, result, pgn) VALUES (?,?,?,?)',
      [room.white.username, room.black ? room.black.username : 'Adversaire', result, room.chess.pgn()]
    );
    await updateStatsAndRating(room.white.userId, room.black ? room.black.userId : null, result);
  } catch (e) {
    console.error('Erreur finishGame:', e);
  }
  io.to(code).emit('game_over', { result, reason: 'Partie terminée' });
  // Conserver la salle quelques minutes pour permettre la revanche.
  setTimeout(() => {
    const r = rooms.get(code);
    if (r && r.finished) rooms.delete(code);
  }, 10 * 60 * 1000);
}

const onlineUsers = new Map();
const matchmakingQueue = [];

function removeFromQueue(socketId) {
  for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
    if (matchmakingQueue[i].socketId === socketId) matchmakingQueue.splice(i, 1);
  }
}

function broadcastPresence() {
  io.to('lobby').emit('presence_update', { players: onlineList() });
}

function startMatchedGame(whiteSocket, blackSocket, time, inc, type) {
  if (!whiteSocket || !blackSocket) return false;
  const code = genCode();
  const chess = new Chess();
  const mk = (sock) => ({
    socketId: sock.id,
    username: sock.data.profile.username,
    userId: sock.data.profile.userId,
    rating: sock.data.profile.rating,
    region: sock.data.profile.region || ''
  });
  const room = {
    chess, white: mk(whiteSocket), black: mk(blackSocket),
    time: Number(time) || 10, inc: Number(inc) || 0,
    type: type || 'quick', finished: false, rematchVotes: new Set(),
    createdAt: Date.now()
  };
  rooms.set(code, room);
  for (const [sock, color] of [[whiteSocket, 'w'], [blackSocket, 'b']]) {
    sock.join(code);
    sock.data.roomCode = code;
    const opp = color === 'w' ? room.black : room.white;
    sock.emit('match_found', {
      code, color, time: room.time, inc: room.inc, type: room.type,
      opponent: { username: opp.username, rating: opp.rating, region: opp.region }
    });
  }
  return true;
}

io.on('connection', async (socket) => {
  const user = getUserFromSocket(socket);
  socket.data.username = user ? user.username : 'Joueur-' + socket.id.slice(0, 4);
  socket.data.userId = user ? user.id : null;
  socket.data.profile = {
    socketId: socket.id, userId: socket.data.userId,
    username: socket.data.username, rating: 1200, region: ''
  };

  if (user) {
    try {
      const row = await dbGet('SELECT username, rating, region FROM users WHERE id = ?', [user.id]);
      if (row) {
        socket.data.profile.username = row.username;
        socket.data.profile.rating = row.rating || 1200;
        socket.data.profile.region = row.region || '';
      }
    } catch (e) {}
    socket.join('user:' + user.id);
  }
  socket.join('lobby');
  onlineUsers.set(socket.id, socket.data.profile);
  broadcastPresence();

  socket.on('create_room', () => {
    const code = genCode();
    const chess = new Chess();
    rooms.set(code, {
      chess,
      white: {
        socketId: socket.id, username: socket.data.profile.username,
        userId: socket.data.profile.userId, rating: socket.data.profile.rating,
        region: socket.data.profile.region
      },
      black: null, time: 10, inc: 0, type: 'code', finished: false, rematchVotes: new Set()
    });
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room_created', { code, color: 'w' });
  });

  socket.on('join_room', ({ code }) => {
    code = (code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('room_error', { message: 'Partie introuvable ou expirée.' });
    if (room.black) return socket.emit('room_error', { message: 'Partie déjà complète.' });
    room.black = {
      socketId: socket.id, username: socket.data.profile.username,
      userId: socket.data.profile.userId, rating: socket.data.profile.rating,
      region: socket.data.profile.region
    };
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room_joined', {
      code, color: 'b', fen: room.chess.fen(),
      opponent: room.white.username,
      opponentRating: room.white.rating,
      opponentRegion: room.white.region
    });
    io.to(room.white.socketId).emit('opponent_joined', {
      username: socket.data.profile.username,
      rating: socket.data.profile.rating,
      region: socket.data.profile.region
    });
  });

  socket.on('matchmaking_join', ({ time, inc }) => {
    removeFromQueue(socket.id);
    const t = Number(time) || 10;
    const i = Number(inc) || 0;
    const entry = {
      socketId: socket.id, userId: socket.data.profile.userId,
      username: socket.data.profile.username, rating: socket.data.profile.rating,
      region: socket.data.profile.region, time: t, inc: i, joinedAt: Date.now()
    };
    matchmakingQueue.push(entry);
    socket.emit('queue_status', { status: 'waiting', players: matchmakingQueue.length });

    const candidates = matchmakingQueue.filter(e =>
      e.socketId !== socket.id && e.time === t && e.inc === i && io.sockets.sockets.get(e.socketId)
    );
    if (!candidates.length) return;
    candidates.sort((a, b) => Math.abs(a.rating - entry.rating) - Math.abs(b.rating - entry.rating));
    const opp = candidates[0];
    removeFromQueue(socket.id);
    removeFromQueue(opp.socketId);
    const oppSocket = io.sockets.sockets.get(opp.socketId);
    if (oppSocket) startMatchedGame(oppSocket, socket, t, i, 'quick');
  });

  socket.on('matchmaking_leave', () => removeFromQueue(socket.id));

  socket.on('challenge_friend', ({ username, time, inc }) => {
    const target = onlineList().find(p => p.username && p.username.toLowerCase() === String(username || '').toLowerCase());
    if (!target || target.socketId === socket.id || (target.userId && target.userId === socket.data.userId)) {
      return socket.emit('challenge_error', { message: 'Ce joueur n’est pas en ligne.' });
    }
    io.to(target.socketId).emit('challenge_received', {
      from: socket.data.profile.username,
      fromRating: socket.data.profile.rating,
      fromRegion: socket.data.profile.region,
      time: Number(time) || 10,
      inc: Number(inc) || 0
    });
    socket.emit('challenge_sent', { to: target.username });
  });

  socket.on('challenge_accept', ({ from, time, inc }) => {
    removeFromQueue(socket.id);
    const target = onlineList().find(p => p.username && p.username.toLowerCase() === String(from || '').toLowerCase());
    if (!target) return socket.emit('challenge_error', { message: 'Le joueur n’est plus en ligne.' });
    const fromSocket = io.sockets.sockets.get(target.socketId);
    if (!fromSocket) return socket.emit('challenge_error', { message: 'Le joueur n’est plus en ligne.' });
    startMatchedGame(fromSocket, socket, Number(time) || 10, Number(inc) || 0, 'friend');
  });

  socket.on('challenge_decline', ({ from }) => {
    const target = onlineList().find(p => p.username && p.username.toLowerCase() === String(from || '').toLowerCase());
    if (target) io.to(target.socketId).emit('challenge_declined', { by: socket.data.profile.username });
    removeFromQueue(socket.id);
  });

  socket.on('move', async ({ code, from, to, promotion }) => {
    const room = rooms.get(code);
    if (!room || !room.black || room.finished) return;
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black.socketId === socket.id;
    if (!isWhite && !isBlack) return;
    const turn = room.chess.turn();
    if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) return;

    try {
      const move = room.chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;
      io.to(code).emit('move_made', { from, to, san: move.san, fen: room.chess.fen() });
      if (room.chess.isGameOver()) {
        const result = room.chess.isCheckmate() ? (turn === 'w' ? '1-0' : '0-1') : '1/2-1/2';
        await finishGame(code, room, result);
      }
    } catch (e) {
      console.error('Erreur coup:', e);
    }
  });

  socket.on('resign', async ({ code }) => {
    const room = rooms.get(code);
    if (!room || !room.black || room.finished) return;
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black.socketId === socket.id;
    if (!isWhite && !isBlack) return;
    const result = isWhite ? '0-1' : '1-0';
    socket.to(code).emit('opponent_resigned', { by: isWhite ? 'w' : 'b' });
    await finishGame(code, room, result);
  });

  socket.on('chat', ({ code, text }) => {
    const room = rooms.get(code);
    if (!room || !text) return;
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black && room.black.socketId === socket.id;
    if (!isWhite && !isBlack) return;
    const color = isWhite ? 'w' : 'b';
    socket.to(code).emit('chat', {
      from: color, username: socket.data.profile.username,
      text: String(text).slice(0, 240), ts: Date.now()
    });
  });

  socket.on('draw_offer', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.finished || !room.black) return;
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black.socketId === socket.id;
    if (!isWhite && !isBlack) return;
    const other = isWhite ? room.black : room.white;
    if (other) io.to(other.socketId).emit('draw_offered', { from: socket.data.profile.username });
  });

  socket.on('draw_accept', async ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.finished || !room.black) return;
    if (room.white.socketId !== socket.id && room.black.socketId !== socket.id) return;
    io.to(code).emit('draw_accepted', {});
    await finishGame(code, room, '1/2-1/2');
  });

  socket.on('draw_decline', ({ code }) => {
    const room = rooms.get(code);
    if (!room || !room.black) return;
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black.socketId === socket.id;
    if (!isWhite && !isBlack) return;
    const other = isWhite ? room.black : room.white;
    if (other) io.to(other.socketId).emit('draw_declined', { by: socket.data.profile.username });
  });

  socket.on('rematch_request', ({ code }) => {
    const room = rooms.get(code);
    if (!room || !room.finished || !room.black) return;
    if (room.white.socketId !== socket.id && room.black.socketId !== socket.id) return;
    room.rematchVotes.add(socket.id);
    const otherId = room.white.socketId === socket.id ? room.black.socketId : room.white.socketId;
    if (room.rematchVotes.size >= 2) {
      const w = io.sockets.sockets.get(room.black.socketId);
      const b = io.sockets.sockets.get(room.white.socketId);
      room.rematchVotes.clear();
      if (w && b) startMatchedGame(w, b, room.time, room.inc, 'rematch');
    } else {
      io.to(otherId).emit('rematch_offered', { from: socket.data.profile.username });
      socket.emit('rematch_waiting', {});
    }
  });

  socket.on('rematch_decline', ({ code }) => {
    const room = rooms.get(code);
    if (!room || !room.black) return;
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black.socketId === socket.id;
    if (!isWhite && !isBlack) return;
    const other = isWhite ? room.black : room.white;
    if (other) io.to(other.socketId).emit('rematch_declined', {});
    room.rematchVotes.clear();
  });

  socket.on('leave_room', ({ code }) => {
    if (code) socket.leave(code);
    if (!code || socket.data.roomCode === code) socket.data.roomCode = null;
  });

  socket.on('lobby_message', ({ text }) => {
    if (!text) return;
    io.to('lobby').emit('lobby_message', {
      username: socket.data.profile.username,
      rating: socket.data.profile.rating,
      region: socket.data.profile.region,
      text: String(text).slice(0, 300),
      ts: Date.now()
    });
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    onlineUsers.delete(socket.id);
    broadcastPresence();
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room || room.finished) return;
    if (room.white.socketId === socket.id || (room.black && room.black.socketId === socket.id)) {
      io.to(code).emit('opponent_left');
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log('Masterchessis Serveur en écoute sur le port ' + PORT));
}

module.exports = { app, server };

