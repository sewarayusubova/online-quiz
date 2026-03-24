import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Database Setup
const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    name TEXT,
    surname TEXT,
    group_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of strings
    correct_option_index INTEGER NOT NULL,
    FOREIGN KEY(test_id) REFERENCES tests(id)
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(test_id) REFERENCES tests(id)
  );
`);

// Create default admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  try {
    const token = req.cookies.session_token;
    if (!token) {
      req.user = null;
      return next();
    }

    const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as any;
    if (!session || new Date(session.expires_at) < new Date()) {
      req.user = null;
      return next();
    }

    const user = db.prepare('SELECT id, username, role, name, surname, group_number FROM users WHERE id = ?').get(session.user_id) as any;
    req.user = user || null;
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    req.user = null;
  }
  next();
};

app.use(authenticate);

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    console.warn('Access denied to admin route. User:', req.user);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// API Routes
app.post('/api/auth/signup', (req, res) => {
  const { username, password, name, surname, group_number } = req.body;
  if (!username || !password || !name || !surname || !group_number) {
    return res.status(400).json({ error: 'All fields (name, surname, group number, username, password) are required' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, role, name, surname, group_number) VALUES (?, ?, ?, ?, ?, ?)').run(username, hash, 'student', name, surname, group_number);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

  res.cookie('session_token', token, {
    httpOnly: true,
    secure: true, // Required for SameSite=None
    sameSite: 'none', // Required for cross-origin iframe
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: { id: user.id, username: user.username, role: user.role, name: user.name, surname: user.surname, group_number: user.group_number } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.session_token;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('session_token');
  res.json({ success: true });
});

app.get('/api/auth/me', (req: any, res) => {
  res.json({ user: req.user });
});

// Tests API
app.get('/api/tests', requireAuth, (req: any, res) => {
  const tests = db.prepare('SELECT id, title, description, created_at FROM tests ORDER BY created_at DESC').all();
  
  if (req.user.role === 'student') {
    // For students, also fetch if they have taken it
    const results = db.prepare('SELECT test_id, score, total, created_at FROM results WHERE user_id = ?').all(req.user.id) as any[];
    const testsWithResults = tests.map((t: any) => {
      const result = results.find(r => r.test_id === t.id);
      return { ...t, result: result ? { score: result.score, total: result.total, created_at: result.created_at } : null };
    });
    return res.json(testsWithResults);
  }
  
  res.json(tests);
});

app.get('/api/tests/:id', requireAuth, (req: any, res) => {
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id) as any;
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const questions = db.prepare('SELECT id, text, options, correct_option_index FROM questions WHERE test_id = ?').all(test.id) as any[];
  
  // Hide correct answers for students
  const formattedQuestions = questions.map(q => ({
    id: q.id,
    text: q.text,
    options: JSON.parse(q.options),
    ...(req.user.role === 'admin' ? { correct_option_index: q.correct_option_index } : {})
  }));

  res.json({ ...test, questions: formattedQuestions });
});

app.post('/api/tests', requireAdmin, (req, res) => {
  const { title, description, questions, duration_minutes } = req.body;
  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Invalid test data' });
  }

  const insertTest = db.prepare('INSERT INTO tests (title, description, duration_minutes) VALUES (?, ?, ?)');
  const insertQuestion = db.prepare('INSERT INTO questions (test_id, text, options, correct_option_index) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    const testResult = insertTest.run(title, description || '', duration_minutes || 30);
    const testId = testResult.lastInsertRowid;

    for (const q of questions) {
      insertQuestion.run(testId, q.text, JSON.stringify(q.options), q.correct_option_index);
    }
    return testId;
  });

  try {
    const testId = transaction();
    res.json({ success: true, testId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create test' });
  }
});

app.post('/api/tests/:id/submit', requireAuth, (req: any, res) => {
  const testId = req.params.id;
  const { answers } = req.body; // { questionId: selectedOptionIndex }

  const test = db.prepare('SELECT id FROM tests WHERE id = ?').get(testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  // Check if already taken
  const existingResult = db.prepare('SELECT id FROM results WHERE user_id = ? AND test_id = ?').get(req.user.id, testId);
  if (existingResult) return res.status(400).json({ error: 'Test already taken' });

  const questions = db.prepare('SELECT id, correct_option_index FROM questions WHERE test_id = ?').all(testId) as any[];
  
  let score = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correct_option_index) {
      score++;
    }
  }

  db.prepare('INSERT INTO results (user_id, test_id, score, total) VALUES (?, ?, ?, ?)').run(req.user.id, testId, score, questions.length);

  res.json({ success: true, score, total: questions.length });
});

// Admin Students API
app.get('/api/admin/students', requireAdmin, (req, res) => {
  try {
    const students = db.prepare("SELECT id, username, name, surname, group_number, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC").all();
    res.json(students);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Admin Submissions API
app.get('/api/admin/submissions', requireAdmin, (req, res) => {
  try {
    const submissions = db.prepare(`
      SELECT r.id, r.score, r.total, r.created_at, u.username, u.name, u.surname, u.group_number, t.title as test_title
      FROM results r
      JOIN users u ON r.user_id = u.id
      JOIN tests t ON r.test_id = t.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(submissions);
  } catch (err) {
    console.error('Fetch submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Get Single Student API
app.get('/api/admin/students/:id', requireAdmin, (req, res) => {
  try {
    const student = db.prepare("SELECT id, username, name, surname, group_number FROM users WHERE id = ? AND role = 'student'").get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    console.error('Fetch student error:', err);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Update Student API
app.put('/api/admin/students/:id', requireAdmin, (req, res) => {
  const { name, surname, group_number } = req.body;
  try {
    db.prepare('UPDATE users SET name = ?, surname = ?, group_number = ? WHERE id = ?').run(name, surname, group_number, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete Student API
app.delete('/api/admin/students/:id', requireAdmin, (req, res) => {
  try {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM results WHERE user_id = ?').run(req.params.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Delete Test API
app.delete('/api/tests/:id', requireAdmin, (req, res) => {
  const testId = req.params.id;
  try {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM results WHERE test_id = ?').run(testId);
      db.prepare('DELETE FROM questions WHERE test_id = ?').run(testId);
      db.prepare('DELETE FROM tests WHERE id = ?').run(testId);
    });
    transaction();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete test error:', err);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

// Update Test API
app.put('/api/tests/:id', requireAdmin, (req, res) => {
  const testId = req.params.id;
  const { title, description, questions, duration_minutes } = req.body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Invalid test data' });
  }

  try {
    const transaction = db.transaction(() => {
      // Update test details
      db.prepare('UPDATE tests SET title = ?, description = ?, duration_minutes = ? WHERE id = ?').run(title, description || '', duration_minutes || 30, testId);
      
      // Delete existing questions (simplest way to handle updates for now)
      db.prepare('DELETE FROM questions WHERE test_id = ?').run(testId);

      // Insert new questions
      const insertQuestion = db.prepare('INSERT INTO questions (test_id, text, options, correct_option_index) VALUES (?, ?, ?, ?)');
      for (const q of questions) {
        insertQuestion.run(testId, q.text, JSON.stringify(q.options), q.correct_option_index);
      }
    });
    transaction();
    res.json({ success: true });
  } catch (err) {
    console.error('Update test error:', err);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Admin Stats API
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get() as any;
    const totalTests = db.prepare("SELECT COUNT(*) as count FROM tests").get() as any;
    const totalSubmissions = db.prepare("SELECT COUNT(*) as count FROM results").get() as any;
    
    const recentResults = db.prepare(`
      SELECT r.id, r.score, r.total, r.created_at, u.username, t.title as test_title
      FROM results r
      JOIN users u ON r.user_id = u.id
      JOIN tests t ON r.test_id = t.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      totalStudents: totalStudents.count,
      totalTests: totalTests.count,
      totalSubmissions: totalSubmissions.count,
      recentResults
    });
  } catch (err) {
    console.error('Stats API Error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// API 404 Handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
