/**
 * Logger 数据库迁移脚本
 * ISSUE-P1-008: 创建审计日志表（可选，用于数据库存储重要审计日志）
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 Logger 数据库迁移...');

  try {
    // 创建审计日志表（可选，主要用于关键操作的数据库记录）
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id INTEGER,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    console.log('✅ audit_logs 表创建成功');
    console.log('✅ 索引创建成功');
    console.log('🎉 Logger 数据库迁移完成！');
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
