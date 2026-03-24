import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const users = db.prepare('SELECT * FROM users').all();
  console.log('Users:', users);

  const tests = db.prepare('SELECT * FROM tests').all();
  console.log('Tests:', tests);

  const results = db.prepare('SELECT * FROM results').all();
  console.log('Results:', results);

  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
  console.log('Admin:', admin);

  const sessions = db.prepare('SELECT * FROM sessions').all();
  console.log('Sessions:', sessions);
} catch (err) {
  console.error('Database error:', err);
}
