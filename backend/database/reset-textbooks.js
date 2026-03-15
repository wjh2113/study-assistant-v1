const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

// 删除旧表并重建
db.exec('DROP TABLE IF EXISTS textbooks');
db.exec('DROP TABLE IF EXISTS textbook_units');

db.exec(`
  CREATE TABLE textbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    units TEXT,
    status TEXT DEFAULT 'processing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE textbook_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    textbook_id INTEGER NOT NULL,
    unit_number INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    page_start INTEGER,
    page_end INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (textbook_id) REFERENCES textbooks(id)
  )
`);

// 插入测试数据
db.prepare(`
  INSERT INTO textbooks (user_id, title, file_path, file_url, file_size, status, units)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  26,
  '勾股定理测试课本',
  'uploads/test-textbook.pdf',
  '/uploads/test-textbook.pdf',
  1024,
  'completed',
  JSON.stringify([
    { id: 1, unit_number: 1, title: '第一章 勾股定理', description: '勾股定理的基本概念' },
    { id: 2, unit_number: 2, title: '第二章 勾股定理的应用', description: '实际应用场景' }
  ])
);

console.log('✅ 课本数据已创建');
db.close();
