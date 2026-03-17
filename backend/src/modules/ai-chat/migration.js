/**
 * AI Chat 模块数据库迁移
 * ISSUE-P2-AI-001: AI 智能答疑
 * 
 * 使用方法:
 * node src/modules/ai-chat/migration.js
 */

const { db } = require('../../config/database');

const migrations = [
  {
    name: 'create_ai_chat_sessions',
    up: `
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject VARCHAR(50),
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_subject ON ai_chat_sessions(subject);
    `,
    down: `
      DROP TABLE IF EXISTS ai_chat_sessions;
    `
  },
  {
    name: 'create_ai_chat_messages',
    up: `
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        tokens INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created ON ai_chat_messages(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS ai_chat_messages;
    `
  },
  {
    name: 'create_knowledge_embeddings',
    up: `
      CREATE TABLE IF NOT EXISTS knowledge_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_point_id INTEGER,
        content TEXT,
        embedding TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_point ON knowledge_embeddings(knowledge_point_id);
      
      -- 注意：SQLite 不支持向量索引，需要在应用层做相似度计算
      -- 生产环境建议使用 PostgreSQL + pgvector
    `,
    down: `
      DROP TABLE IF EXISTS knowledge_embeddings;
    `
  },
  {
    name: 'add_ai_chat_sessions_updated_at_trigger',
    up: `
      CREATE TRIGGER IF NOT EXISTS update_ai_chat_sessions_updated_at
      AFTER UPDATE ON ai_chat_sessions
      BEGIN
        UPDATE ai_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `,
    down: `
      DROP TRIGGER IF EXISTS update_ai_chat_sessions_updated_at;
    `
  },
  {
    name: 'create_ai_token_usage',
    up: `
      CREATE TABLE IF NOT EXISTS ai_token_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        service VARCHAR(50) NOT NULL,
        model VARCHAR(50),
        tokens INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created ON ai_token_usage(created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user ON ai_token_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_token_usage_service ON ai_token_usage(service);
    `,
    down: `
      DROP TABLE IF EXISTS ai_token_usage;
    `
  }
];

async function runMigration() {
  console.log('🚀 开始 AI Chat 模块数据库迁移...\n');

  // 创建迁移记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  let executed = 0;
  let skipped = 0;
  let errors = 0;

  for (const migration of migrations) {
    try {
      // 检查是否已执行
      const exists = db.prepare('SELECT 1 FROM ai_migrations WHERE name = ?').get(migration.name);
      
      if (exists) {
        console.log(`⏭️  跳过：${migration.name}`);
        skipped++;
        continue;
      }

      console.log(`📝 执行：${migration.name}`);
      
      // 执行迁移
      db.exec(migration.up);
      
      // 记录迁移
      db.prepare('INSERT INTO ai_migrations (name) VALUES (?)').run(migration.name);
      
      executed++;
      console.log(`✅ 完成：${migration.name}\n`);
    } catch (error) {
      console.error(`❌ 失败：${migration.name}`);
      console.error(`   错误：${error.message}\n`);
      errors++;
    }
  }

  console.log('\n=================================');
  console.log('迁移完成！');
  console.log(`  执行：${executed}`);
  console.log(`  跳过：${skipped}`);
  console.log(`  失败：${errors}`);
  console.log('=================================\n');

  if (errors > 0) {
    process.exit(1);
  }
}

async function rollbackMigration(migrationName) {
  console.log(`🔄 回滚迁移：${migrationName}\n`);

  const migration = migrations.find(m => m.name === migrationName);
  if (!migration) {
    console.error(`❌ 未找到迁移：${migrationName}`);
    return;
  }

  try {
    db.exec(migration.down);
    db.prepare('DELETE FROM ai_migrations WHERE name = ?').run(migrationName);
    console.log(`✅ 回滚成功：${migrationName}`);
  } catch (error) {
    console.error(`❌ 回滚失败：${error.message}`);
  }
}

async function rollbackAll() {
  console.log('🔄 回滚所有迁移...\n');

  // 倒序执行
  for (const migration of migrations.slice().reverse()) {
    await rollbackMigration(migration.name);
  }

  db.exec('DROP TABLE IF EXISTS ai_migrations');
  console.log('\n✅ 所有迁移已回滚');
}

// CLI 入口
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'rollback') {
    const migrationName = process.argv[3];
    if (migrationName) {
      rollbackMigration(migrationName);
    } else {
      rollbackAll();
    }
  } else if (command === 'status') {
    console.log('迁移状态:\n');
    const executed = db.prepare('SELECT * FROM ai_migrations ORDER BY executed_at').all();
    
    if (executed.length === 0) {
      console.log('暂无已执行的迁移');
    } else {
      executed.forEach(m => {
        console.log(`✅ ${m.name} - ${m.executed_at}`);
      });
    }
  } else {
    runMigration();
  }
}

module.exports = { runMigration, rollbackMigration, rollbackAll, migrations };
