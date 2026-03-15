/**
 * Leaderboard 数据库迁移脚本
 * ISSUE-P1-005: 创建 leaderboard_snapshots 表
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 Leaderboard 数据库迁移...');

  try {
    // 创建排行榜快照表
    db.exec(`
      CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('total', 'weekly', 'monthly', 'subject')),
        period TEXT NOT NULL,
        snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_type ON leaderboard_snapshots(type);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard_snapshots(period);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_date ON leaderboard_snapshots(snapshot_date);
    `);

    console.log('✅ leaderboard_snapshots 表创建成功');
    console.log('✅ 索引创建成功');
    console.log('🎉 Leaderboard 数据库迁移完成！');
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
