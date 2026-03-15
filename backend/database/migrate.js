const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'sqlite.db');

if (!fs.existsSync(dbPath)) {
  console.log('数据库不存在，无需迁移');
  process.exit(0);
}

const db = new Database(dbPath);

console.log('开始数据库迁移...');

try {
  // 临时禁用外键约束
  db.pragma('foreign_keys = OFF');
  
  // 检查是否需要迁移旧用户表
  const tableInfo = db.pragma("table_info('users')");
  const hasUsername = tableInfo.some(col => col.name === 'username');
  
  if (hasUsername) {
    console.log('检测到旧版用户表，开始迁移...');
    
    // 先删除依赖 users 表的其他表（避免外键冲突）
    db.exec('DROP TABLE IF EXISTS learning_progress;');
    db.exec('DROP TABLE IF EXISTS ai_qa_records;');
    db.exec('DROP TABLE IF EXISTS knowledge_points;');
    
    // 备份旧表
    db.exec(`
      ALTER TABLE users RENAME TO users_old;
    `);
    
    // 创建新表
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT DEFAULT 'student' CHECK(role IN ('student', 'parent')),
        phone TEXT UNIQUE NOT NULL,
        nickname TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 迁移数据（将 username 转为 phone，生成默认 nickname）
    db.exec(`
      INSERT INTO users (id, role, phone, nickname, created_at, updated_at)
      SELECT id, 'student', username, username, created_at, updated_at
      FROM users_old;
    `);
    
    // 删除旧表
    db.exec('DROP TABLE users_old;');
    
    // 重新创建被删除的表
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        tags TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        knowledge_point_id INTEGER,
        study_duration INTEGER DEFAULT 0,
        completion_rate REAL DEFAULT 0,
        last_studied_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_qa_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        knowledge_point_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);
    
    console.log('✅ 用户表迁移完成');
  }
  
  // 创建学生资料表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INTEGER PRIMARY KEY,
      grade INTEGER,
      school_name TEXT,
      total_points INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ 学生资料表已就绪');
  
  // 创建家长资料表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS parent_profiles (
      user_id INTEGER PRIMARY KEY,
      real_name TEXT,
      verified_status TEXT DEFAULT 'pending' CHECK(verified_status IN ('pending', 'verified', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ 家长资料表已就绪');
  
  // 创建验证码表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT DEFAULT 'login' CHECK(purpose IN ('login', 'register', 'reset')),
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ 验证码表已就绪');
  
  // 恢复外键约束
  db.pragma('foreign_keys = ON');
  
  console.log('\n🎉 数据库迁移完成！');
  
} catch (error) {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
} finally {
  db.close();
}
