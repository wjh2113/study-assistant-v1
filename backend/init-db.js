/**
 * 快速数据库初始化脚本
 * 创建所有需要的 SQLite 表
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database/sqlite.db');
const db = new Database(dbPath);

console.log('🔧 开始初始化数据库表...');

try {
  // 积分明细表
  db.exec(`
    CREATE TABLE IF NOT EXISTS points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ points_ledger 表已创建');

  // 练习会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      textbook_id TEXT,
      unit_id TEXT,
      status TEXT DEFAULT 'active',
      score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ practice_sessions 表已创建');

  // 练习会话问题表
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      answer TEXT,
      explanation TEXT,
      "order" INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES practice_sessions(id)
    )
  `);
  console.log('✅ practice_questions 表已创建');

  // 答题记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS answer_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      answer TEXT,
      is_correct INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES practice_questions(id),
      FOREIGN KEY (session_id) REFERENCES practice_sessions(id)
    )
  `);
  console.log('✅ answer_records 表已创建');

  // 创建索引
  db.exec('CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_points_ledger_created ON points_ledger(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_points_ledger_user_created ON points_ledger(user_id, created_at)');
  console.log('✅ 索引已创建');

  console.log('🎉 数据库初始化完成！');
} catch (error) {
  console.error('❌ 初始化失败:', error.message);
} finally {
  db.close();
}
