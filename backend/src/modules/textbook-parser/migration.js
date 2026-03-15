/**
 * Textbook Parser 数据库迁移脚本
 * ISSUE-P1-002: 创建课本解析相关表
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 Textbook Parser 数据库迁移...');

  try {
    // 创建课本文本表
    db.exec(`
      CREATE TABLE IF NOT EXISTS textbooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_task_id INTEGER,
        book_info TEXT,
        structure TEXT,
        sections TEXT,
        knowledge_points TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建课本解析任务表
    db.exec(`
      CREATE TABLE IF NOT EXISTS textbook_parse_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        textbook_id INTEGER,
        file_path TEXT NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        started_at DATETIME,
        completed_at DATETIME,
        error_message TEXT,
        duration_ms INTEGER,
        page_count INTEGER,
        structure TEXT,
        sections_count INTEGER,
        knowledge_points_count INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (textbook_id) REFERENCES textbooks(id)
      )
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_textbooks_user_id ON textbooks(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_textbooks_status ON textbooks(status);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_textbook_tasks_user_id ON textbook_parse_tasks(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_textbook_tasks_status ON textbook_parse_tasks(status);
    `);

    console.log('✅ textbooks 表创建成功');
    console.log('✅ textbook_parse_tasks 表创建成功');
    console.log('✅ 索引创建成功');
    console.log('🎉 Textbook Parser 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

// 如果直接运行此文件则执行迁移
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
