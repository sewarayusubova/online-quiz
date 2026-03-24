import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const columns = db.prepare("PRAGMA table_info(tests)").all() as any[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('duration_minutes')) {
    console.log('Adding duration_minutes column to tests table...');
    db.prepare("ALTER TABLE tests ADD COLUMN duration_minutes INTEGER DEFAULT 30").run();
  }
  
  console.log('Database migration for duration completed.');
} catch (err) {
  console.error('Migration failed:', err);
}
