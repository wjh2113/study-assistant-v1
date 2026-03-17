const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 检测是否使用 PostgreSQL
// 测试模式下强制使用 SQLite
const usePostgreSQL = process.env.TEST_MODE !== 'true' && 
                      process.env.DATABASE_URL && 
                      process.env.DATABASE_URL.startsWith('postgresql://');

let db = null;
let pgClient = null;

if (usePostgreSQL) {
  // Debug: console.log('🔵 使用 PostgreSQL 数据库');
  // PostgreSQL 模式 - 使用 Prisma
  // Prisma 客户端将在需要时动态导入
  module.exports = {
    db: null,
    isPostgreSQL: true,
    getPrismaClient: () => {
      const { PrismaClient } = require('@prisma/client');
      if (!pgClient) {
        pgClient = new PrismaClient({
          log: ['query', 'info', 'warn', 'error']
        });
      }
      return pgClient;
    },
    initDatabase: async () => {
      console.log('PostgreSQL 数据库将通过 Prisma 管理');
    }
  };
} else {
  // Debug: console.log('🟢 使用 SQLite 数据库');
  // SQLite 模式
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/sqlite.db');

  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // 启用外键约束
  db.pragma('journal_mode = WAL');

  // 初始化数据库表
  function initDatabase() {
    // 如果 db 为 null（可能被关闭过），重新创建连接
    if (!db) {
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
    }
    // 启用外键约束
    db.pragma('foreign_keys = ON');
    // 用户表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        role TEXT DEFAULT 'STUDENT' CHECK(role IN ('STUDENT', 'PARENT', 'ADMIN')),
        phone TEXT UNIQUE NOT NULL,
        nickname TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 课本表（确保包含 file_size 和 units 字段）
    db.exec(`
      CREATE TABLE IF NOT EXISTS textbooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_url TEXT,
        file_size INTEGER,
        units TEXT,
        status TEXT DEFAULT 'processing',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 学生资料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id TEXT PRIMARY KEY,
        grade INTEGER,
        school_name TEXT,
        total_points INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 家长资料表
    db.exec(`
      CREATE TABLE IF NOT EXISTS parent_profiles (
        user_id TEXT PRIMARY KEY,
        real_name TEXT,
        verified_status TEXT DEFAULT 'PENDING' CHECK(verified_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 验证码表
    db.exec(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT DEFAULT 'LOGIN' CHECK(purpose IN ('LOGIN', 'REGISTER', 'RESET')),
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 知识点表
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        tags TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 练习记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS exercise_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        task_id INTEGER,
        subject TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES learning_plan_tasks(id)
      )
    `);

    // 学习进度表
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        knowledge_point_id TEXT,
        study_duration INTEGER DEFAULT 0,
        completion_rate REAL DEFAULT 0,
        last_studied_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);

    // AI 问答记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_qa_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        knowledge_point_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);

    // 知识掌握度表
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_mastery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        knowledge_point_id TEXT NOT NULL,
        mastery_level INTEGER DEFAULT 0,
        last_reviewed_at DATETIME,
        review_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);

    // 学习计划表
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        timeframe TEXT,
        goals TEXT,
        weekly_goals TEXT,
        schedule TEXT,
        milestones TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 学习计划任务表
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_plan_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        user_id TEXT NOT NULL,
        task_type TEXT NOT NULL,
        content TEXT,
        scheduled_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        completed_at DATETIME,
        actual_time INTEGER,
        score INTEGER,
        feedback TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES learning_plans(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 学习会话表
    db.exec(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        knowledge_point_id TEXT,
        duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed',
        is_correct INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);

    // Debug: console.log('数据库初始化完成');
  }

  // 关闭数据库连接
  function closeDatabase() {
    if (db) {
      db.close();
      db = null;
    }
  }

  module.exports = { 
    db, 
    isPostgreSQL: false,
    initDatabase,
    closeDatabase 
  };
}
