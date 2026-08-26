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
let dbQuery, dbGet, dbRun;
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
            rating: 1620,
            wins: 28,
            losses: 14,
            draws: 5,
            created_at: new Date().toISOString()
          }
        ],
        games: []
      };
      fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2));
      return initial;
    }
    try {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch (e) {
      return { users: [], games: [] };
    }
  };

  const writeDb = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  };

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
        rating: 1200,
        wins: 0,
        losses: 0,
        draws: 0,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      writeDb(db);
      return { changes: 1, id: newUser.id };
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
          rating INTEGER NOT NULL DEFAULT 1200,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          draws INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
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
    const { username, password } = req.body || {};
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
    await dbRun('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)', [username, hash, role]);
    const user = await dbGet('SELECT id, username, role, rating, wins, losses, draws FROM users WHERE username = ?', [username]);

    const token = signToken(user);
    res.cookie('masterchess_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, sameSite: 'none', secure: true });
    res.json({ user, token });
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
    const token = signToken(row);
    res.cookie('masterchess_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, sameSite: 'none', secure: true });
    res.json({
      user: {
        id: row.id,
        username: row.username,
        role: row.role || 'user',
        rating: row.rating,
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
  const row = await dbGet('SELECT id, username, role, rating, wins, losses, draws, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: row || null });
});

app.get('/api/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await dbGet('SELECT id, username, role, rating, wins, losses, draws, created_at FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const games = await dbQuery(
      'SELECT id, white_username, black_username, result, created_at FROM games WHERE white_username = ? OR black_username = ? ORDER BY id DESC LIMIT 15',
      [username, username]
    );

    res.json({ user, games });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur chargement profil.' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT username, rating, wins, losses, draws, role FROM users ORDER BY rating DESC LIMIT 25');
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ leaderboard: [] });
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
    const users = await dbQuery('SELECT id, username, role, rating, wins, losses, draws, created_at FROM users ORDER BY id ASC');
    res.json({ users: users || [] });
  } catch (err) {
    console.error('Erreur get users admin:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
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
    const created = await dbGet('SELECT id, username, role, rating, wins, losses, draws, created_at FROM users WHERE username = ?', [username]);
    res.json({ ok: true, user: created });
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
  try {
    await dbRun(
      'INSERT INTO games (white_username, black_username, result, pgn) VALUES (?,?,?,?)',
      [room.white.username, room.black ? room.black.username : 'Adversaire', result, room.chess.pgn()]
    );
    await updateStatsAndRating(room.white.userId, room.black ? room.black.userId : null, result);
  } catch (e) {
    console.error('Erreur finishGame:', e);
  }
  rooms.delete(code);
}

io.on('connection', (socket) => {
  const user = getUserFromSocket(socket);
  socket.data.username = user ? user.username : 'Joueur-' + socket.id.slice(0, 4);
  socket.data.userId = user ? user.id : null;

  socket.on('create_room', () => {
    const code = genCode();
    const chess = new Chess();
    rooms.set(code, {
      chess,
      white: { socketId: socket.id, username: socket.data.username, userId: socket.data.userId },
      black: null
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
    room.black = { socketId: socket.id, username: socket.data.username, userId: socket.data.userId };
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room_joined', { code, color: 'b', fen: room.chess.fen(), opponent: room.white.username });
    io.to(room.white.socketId).emit('opponent_joined', { username: socket.data.username });
  });

  socket.on('move', async ({ code, from, to, promotion }) => {
    const room = rooms.get(code);
    if (!room || !room.black) return;
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
    if (!room || !room.black) return;
    const isWhite = room.white.socketId === socket.id;
    const result = isWhite ? '0-1' : '1-0';
    io.to(code).emit('opponent_resigned', { by: isWhite ? 'w' : 'b' });
    await finishGame(code, room, result);
  });

  socket.on('chat', ({ code, text }) => {
    const room = rooms.get(code);
    if (!room || !text) return;
    const color = room.white.socketId === socket.id ? 'w' : 'b';
    io.to(code).emit('chat', { from: color, username: socket.data.username, text: String(text).slice(0, 200) });
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (room.white.socketId === socket.id || (room.black && room.black.socketId === socket.id)) {
      io.to(code).emit('opponent_left');
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log('Masterchessis Serveur en écoute sur le port ' + PORT));
}

module.exports = { app, server };

