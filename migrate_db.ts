import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('name')) {
    console.log('Adding name column...');
    db.prepare("ALTER TABLE users ADD COLUMN name TEXT").run();
  }
  if (!columnNames.includes('surname')) {
    console.log('Adding surname column...');
    db.prepare("ALTER TABLE users ADD COLUMN surname TEXT").run();
  }
  if (!columnNames.includes('group_number')) {
    console.log('Adding group_number column...');
    db.prepare("ALTER TABLE users ADD COLUMN group_number TEXT").run();
  }
  
  console.log('Database migration completed.');
} catch (err) {
  console.error('Migration failed:', err);
}
