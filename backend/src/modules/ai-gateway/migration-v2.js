/**
 * AI Gateway V2 数据库迁移脚本
 * 添加 provider_used 字段支持多 AI 服务商
 * 
 * 使用方法:
 * node src/modules/ai-gateway/migration-v2.js
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 AI Gateway V2 数据库迁移...\n');

  try {
    // 检查表是否存在
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='ai_task_logs'
    `).get();

    if (!tableExists) {
      console.log('❌ ai_task_logs 表不存在，请先运行 V1 迁移');
      return false;
    }

    // 检查 provider_used 字段是否存在
    const columnExists = db.prepare(`
      PRAGMA table_info(ai_task_logs)
    `).all().some(col => col.name === 'provider_used');

    if (columnExists) {
      console.log('⏭️  provider_used 字段已存在，跳过');
    } else {
      // 添加 provider_used 字段
      db.exec(`
        ALTER TABLE ai_task_logs
        ADD COLUMN provider_used TEXT
      `);
      console.log('✅ 添加 provider_used 字段成功');
    }

    // 创建迁移记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_gateway_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 记录 V2 迁移
    const v2Exists = db.prepare('SELECT 1 FROM ai_gateway_migrations WHERE name = ?').get('v2_add_provider_field');
    if (!v2Exists) {
      db.prepare('INSERT INTO ai_gateway_migrations (name) VALUES (?)').run('v2_add_provider_field');
      console.log('✅ 记录 V2 迁移完成');
    }

    console.log('\n🎉 AI Gateway V2 数据库迁移完成！');
    return true;
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
