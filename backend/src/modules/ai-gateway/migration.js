/**
 * AI Gateway 数据库迁移脚本
 * ISSUE-P0-003: 创建 ai_task_logs 表
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 AI Gateway 数据库迁移...');

  try {
    // 创建 AI 任务日志表
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_task_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_type TEXT NOT NULL,
        input TEXT,
        output TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        error_message TEXT,
        model_used TEXT,
        token_usage TEXT,
        duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_task_logs_user_id ON ai_task_logs(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_task_logs_task_type ON ai_task_logs(task_type);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_task_logs_status ON ai_task_logs(status);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_task_logs_created_at ON ai_task_logs(created_at);
    `);

    console.log('✅ ai_task_logs 表创建成功');
    console.log('✅ 索引创建成功');
    console.log('🎉 AI Gateway 数据库迁移完成！');
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
