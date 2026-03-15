/**
 * Weakness Analysis 数据库迁移脚本
 * ISSUE-P1-003: 创建 knowledge_mastery 表
 */

const { db } = require('../../config/database');

function migrate() {
  console.log('开始 Weakness Analysis 数据库迁移...');

  try {
    // 创建知识点掌握度表
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_mastery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        knowledge_point_id INTEGER,
        knowledge_point_name TEXT NOT NULL,
        mastery_score INTEGER DEFAULT 0 CHECK(mastery_score >= 0 AND mastery_score <= 100),
        mastery_level TEXT DEFAULT 'weak' CHECK(mastery_level IN ('weak', 'learning', 'proficient', 'mastered')),
        correct_count INTEGER DEFAULT 0,
        wrong_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        last_practiced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, knowledge_point_id)
      )
    `);

    // 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_user_id ON knowledge_mastery(user_id);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_subject ON knowledge_mastery(subject);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_level ON knowledge_mastery(mastery_level);
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_score ON knowledge_mastery(mastery_score);
    `);

    console.log('✅ knowledge_mastery 表创建成功');
    console.log('✅ 索引创建成功');
    console.log('🎉 Weakness Analysis 数据库迁移完成！');
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
