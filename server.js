require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-masterchessis-secret-key-change-in-prod';
const PORT = process.env.PORT || 8080;

/* ---------- Base de données Abstraction (PostgreSQL ou SQLite) ---------- */
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
    await pool.query(pgSql, params);
  };
  console.log('Connecté à PostgreSQL (Cloud)');
} else {
  // Fallback simple : JSON file-based database pour éviter les dépendances natives (GLIBC)
  console.log('Mode Fallback : Utilisation de JSON file-based storage');
  const fs = require('fs');
  const dbFile = path.join(__dirname, 'masterchess.json');

  const readDb = () => {
    if (!fs.existsSync(dbFile)) return { users: [], games: [] };
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  };

  const writeDb = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  };

  dbQuery = async (sql, params = []) => {
    const db = readDb();
    if (sql.includes('FROM users')) return db.users;
    return [];
  };
  dbGet = async (sql, params = []) => {
    const db = readDb();
    if (sql.includes('FROM users WHERE username = ?')) return db.users.find(u => u.username === params[0]) || null;
    if (sql.includes('FROM users WHERE id = ?')) return db.users.find(u => u.id === params[0]) || null;
    if (sql.includes('FROM users')) return db.users.find(u => u.username === params[0]) || null;
    return null;
  };
  dbRun = async (sql, params = []) => {
    const db = readDb();
    if (sql.includes('INSERT INTO users')) {
      db.users.push({ id: db.users.length + 1, username: params[0], password_hash: params[1], rating: 1200, wins: 0, losses: 0, draws: 0 });
      writeDb(db);
    } else if (sql.includes('UPDATE users')) {
      // Simplified update for rating/stats
      const user = db.users.find(u => u.id === params[params.length - 1]);
      if (user) {
        // This is a very simplified update, not parsing the SQL for full logic
        writeDb(db);
      }
    }
    return { changes: 1 };
  };
}

// Initialisation des tables
(async () => {
  try {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id ${usePostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1200,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await dbRun(`
      CREATE TABLE IF NOT EXISTS games (
        id ${usePostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        white_username TEXT,
        black_username TEXT,
        result TEXT,
        pgn TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch (err) {
    console.error('Erreur initialisation DB:', err);
  }
})();

// Middleware admin
async function adminMiddleware(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  // Assuming a simple role check, if not exists, default to 'user'. 
  // Need to make sure 'role' exists or add it. Let's add it via a column if missing.
  if (user && user.username === 'admin') { // Simple admin check
    next();
  } else {
    res.status(403).json({ error: 'Accès administrateur requis.' });
  }
}

app.post('/api/admin/users/:id/ban', adminMiddleware, async (req, res) => {
  await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/reset-rating', adminMiddleware, async (req, res) => {
  await dbRun('UPDATE users SET rating = 1200 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

const allowedOrigins = [
  'https://masterchessis.netlify.app',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.netlify.app')) {
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

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
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
  if (!token) { req.user = null; return next(); }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    req.user = null;
  }
  next();
}

app.use(authMiddleware);

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: "Pseudo (3+ caractères) et mot de passe (6+ caractères) requis." });
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return res.status(400).json({ error: 'Le pseudo ne peut contenir que des lettres, chiffres, - et _.' });
    }
    const exists = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) return res.status(409).json({ error: 'Ce pseudo est déjà pris.' });

    const hash = bcrypt.hashSync(password, 10);
    await dbRun('INSERT INTO users (username, password_hash) VALUES (?,?)', [username, hash]);
    const user = await dbGet('SELECT id, username, rating, wins, losses, draws FROM users WHERE username = ?', [username]);

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
    res.json({ user: { id: row.id, username: row.username, rating: row.rating, wins: row.wins, losses: row.losses, draws: row.draws }, token });
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
  const row = await dbGet('SELECT id, username, rating, wins, losses, draws, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: row || null });
});

app.get('/api/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await dbGet('SELECT id, username, rating, wins, losses, draws, created_at FROM users WHERE username = ?', [username]);
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
    const rows = await dbQuery('SELECT username, rating, wins, losses, draws FROM users ORDER BY rating DESC LIMIT 20');
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ leaderboard: [] });
  }
});

/* ---------- Serveur HTTP + Socket.io (multijoueur temps réel) ---------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

const rooms = new Map(); // code -> { chess, white:{socketId,username,userId}, black:{...} }

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
  try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; }
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
  } catch (e) { console.error('Erreur finishGame:', e); }
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
    if (!room) return socket.emit('room_error', { message: 'Partie introuvable.' });
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
      if (room.chess.in_checkmate() || room.chess.in_draw() || room.chess.in_stalemate()) {
        const result = room.chess.in_checkmate() ? (turn === 'w' ? '1-0' : '0-1') : '1/2-1/2';
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

server.listen(PORT, () => console.log('Masterchessis Serveur en écoute sur le port ' + PORT));
