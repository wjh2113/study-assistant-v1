/**
 * Points System 数据库迁移脚本
 * ISSUE-P1-004: 创建积分相关表
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 Points System 数据库迁移...');

  try {
    // 创建积分记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS points_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('practice', 'check_in', 'achievement', 'bonus', 'other')),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建每日打卡表
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        check_in_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, check_in_date)
      )
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_points_records_user_id ON points_records(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_points_records_source ON points_records(source);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_points_records_created_at ON points_records(created_at);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_id ON daily_check_ins(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_daily_check_ins_date ON daily_check_ins(check_in_date);
    `);

    console.log('✅ points_records 表创建成功');
    console.log('✅ daily_check_ins 表创建成功');
    console.log('✅ 索引创建成功');
    console.log('🎉 Points System 数据库迁移完成！');
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
