const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

// Disable foreign keys for testing
db.exec('PRAGMA foreign_keys = OFF');

// Drop and recreate knowledge_points table
db.exec('DROP TABLE IF EXISTS knowledge_points');
db.exec(`
  CREATE TABLE knowledge_points (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    tags TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert test knowledge point
const kpId = 'kp_' + Date.now();
db.prepare(`
  INSERT INTO knowledge_points (id, user_id, title, content, category, tags, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  kpId,
  26,
  '勾股定理',
  '勾股定理是一个基本的几何定理，指直角三角形的两条直角边的平方和等于斜边的平方。',
  '数学',
  JSON.stringify(['几何', '重点']),
  'ACTIVE'
);

console.log('✅ Knowledge point created:', kpId);
db.close();
