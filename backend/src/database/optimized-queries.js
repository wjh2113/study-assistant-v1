/**
 * 优化的数据库查询工具
 * 提供预编译语句、连接池管理和查询优化
 * 
 * 注意：使用 database.js 的同一个 db 单例，确保表和索引在同一个数据库中
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 预编译语句缓存
const preparedStatements = new Map();

// 获取主数据库单例的函数
// 延迟加载，确保在需要时才获取 database.js 的 db 引用
function getMainDb() {
  try {
    const dbModule = require('../config/database.js');
    if (dbModule && dbModule.db && !dbModule.isPostgreSQL) {
      return dbModule.db;
    }
  } catch (err) {
    // 忽略错误，使用备用连接
  }
  return null;
}

let mainDb = null;

/**
 * 获取优化的数据库连接
 * 优先使用主数据库单例，确保表和索引在同一个数据库中
 */
function getOptimizedDb() {
  // 每次尝试获取主数据库单例（确保获取最新引用）
  const currentMainDb = getMainDb();
  if (currentMainDb) {
    mainDb = currentMainDb;  // 缓存引用
    return currentMainDb;
  }
  
  // 备用：创建新连接（仅当主数据库不可用时）
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/sqlite.db');
  
  const db = new Database(dbPath, {
    // 使用只读模式提高并发读取性能
    readonly: false,
    // 启用文件锁
    fileMustExist: false
  });

  // 优化配置
  db.pragma('journal_mode = WAL'); // WAL 模式提高并发
  db.pragma('synchronous = NORMAL'); // 平衡性能和安全性
  db.pragma('cache_size = -64000'); // 64MB 缓存
  db.pragma('temp_store = MEMORY'); // 临时表存内存
  db.pragma('mmap_size = 268435456'); // 256MB 内存映射
  db.pragma('foreign_keys = ON'); // 启用外键

  return db;
}

/**
 * 获取或创建预编译语句
 * @param {Database} db - 数据库连接
 * @param {string} sql - SQL 语句
 * @returns {Statement} 预编译语句
 */
function prepare(db, sql) {
  if (!preparedStatements.has(sql)) {
    preparedStatements.set(sql, db.prepare(sql));
  }
  return preparedStatements.get(sql);
}

/**
 * 批量插入优化
 * 使用事务批量插入数据
 * @param {Database} db - 数据库连接
 * @param {string} table - 表名
 * @param {Array<Object>} rows - 数据行
 */
function batchInsert(db, table, rows) {
  if (!rows || rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  const stmt = db.prepare(sql);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(Object.values(row));
    }
  });

  insertMany(rows);
  return rows.length;
}

/**
 * 带缓存的查询
 * @param {Database} db - 数据库连接
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数
 * @param {Map} cache - 查询结果缓存
 * @param {number} ttl - 缓存时间 (毫秒)
 */
function queryWithCache(db, sql, params = [], cache = new Map(), ttl = 60000) {
  const cacheKey = `${sql}:${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const stmt = prepare(db, sql);
  const result = stmt.all(...params);
  
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  // 清理过期缓存
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > ttl) {
      cache.delete(key);
    }
  }

  return result;
}

/**
 * 创建数据库索引优化
 */
function createOptimizedIndexes(db) {
  const indexes = [
    // 用户相关索引
    'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    
    // 学习进度索引
    'CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_learning_progress_knowledge ON learning_progress(knowledge_point_id)',
    'CREATE INDEX IF NOT EXISTS idx_learning_progress_last_studied ON learning_progress(last_studied_at)',
    
    // 知识点索引
    'CREATE INDEX IF NOT EXISTS idx_knowledge_points_user ON knowledge_points(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_knowledge_points_status ON knowledge_points(status)',
    'CREATE INDEX IF NOT EXISTS idx_knowledge_points_category ON knowledge_points(category)',
    
    // AI 问答记录索引
    'CREATE INDEX IF NOT EXISTS idx_ai_qa_records_user ON ai_qa_records(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_qa_records_created ON ai_qa_records(created_at)',
    
    // 复合索引优化常用查询
    'CREATE INDEX IF NOT EXISTS idx_learning_progress_user_knowledge ON learning_progress(user_id, knowledge_point_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_qa_records_user_created ON ai_qa_records(user_id, created_at)',
  ];

  for (const sql of indexes) {
    try {
      db.exec(sql);
    } catch (err) {
      console.error('[DB] 创建索引失败:', sql, err.message);
    }
  }

  console.log('[DB] 数据库索引优化完成');
}

/**
 * 分析慢查询
 * @param {Database} db - 数据库连接
 */
function analyzeSlowQueries(db) {
  // 启用查询日志
  db.pragma('journal_mode = WAL');
  
  // 获取表统计信息
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  
  console.log('[DB] 数据库表统计:');
  for (const table of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`  - ${table.name}: ${count.count} 行`);
    } catch (err) {
      // 忽略错误
    }
  }
}

/**
 * 数据库连接池 (简化版)
 * 对于 SQLite，我们使用单连接 + WAL 模式
 * 注意：现在使用主数据库单例，确保表和索引在同一个数据库中
 */
class DatabasePool {
  constructor() {
    this.db = null;
  }

  getConnection() {
    // 优先使用主数据库单例
    const currentMainDb = getMainDb();
    if (currentMainDb) {
      mainDb = currentMainDb;
      return currentMainDb;
    }
    if (!this.db) {
      this.db = getOptimizedDb();
    }
    return this.db;
  }

  close() {
    // 不关闭主数据库单例，只关闭备用连接
    const currentMainDb = getMainDb();
    if (this.db && this.db !== currentMainDb) {
      this.db.close();
      this.db = null;
    }
  }
}

// 单例数据库池 - 使用主数据库单例
const dbPool = new DatabasePool();

// 导出时同时暴露主数据库引用，供外部使用
module.exports = {
  getOptimizedDb,
  prepare,
  batchInsert,
  queryWithCache,
  createOptimizedIndexes,
  analyzeSlowQueries,
  DatabasePool,
  dbPool,
  getMainDb  // 允许外部获取主数据库引用
};
