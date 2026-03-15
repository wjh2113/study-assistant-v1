/**
 * SQLite → PostgreSQL 数据迁移脚本
 * 
 * 使用方法：
 * node scripts/migrate.js
 * 
 * 注意事项：
 * 1. 确保 PostgreSQL 数据库已创建并可访问
 * 2. 确保 .env 中配置了正确的 DATABASE_URL
 * 3. 迁移前建议备份 SQLite 数据库
 */

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// SQLite 数据库路径
const sqlitePath = path.join(__dirname, '../database/sqlite.db');

// Prisma 客户端
const prisma = new PrismaClient();

// 迁移统计
const stats = {
  users: 0,
  studentProfiles: 0,
  parentProfiles: 0,
  knowledgePoints: 0,
  learningProgress: 0,
  aiQaRecords: 0,
  verificationCodes: 0,
};

/**
 * 检查 SQLite 数据库是否存在
 */
function checkSqliteExists() {
  if (!fs.existsSync(sqlitePath)) {
    console.error('❌ SQLite 数据库不存在:', sqlitePath);
    process.exit(1);
  }
  console.log('✅ SQLite 数据库存在:', sqlitePath);
}

/**
 * 测试 PostgreSQL 连接
 */
async function testPostgresConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL 连接成功');
  } catch (error) {
    console.error('❌ PostgreSQL 连接失败:', error.message);
    console.error('请检查 .env 中的 DATABASE_URL 配置');
    process.exit(1);
  }
}

/**
 * 迁移用户表
 */
async function migrateUsers(sqliteDb) {
  console.log('\n📋 开始迁移用户表...');
  
  try {
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    console.log(`找到 ${users.length} 个用户`);
    
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id?.toString() || user.phone },
        update: {
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          updated_at: user.updated_at ? new Date(user.updated_at) : new Date(),
        },
        create: {
          id: user.id?.toString() || `user_${user.phone}`,
          role: user.role || 'student',
          phone: user.phone,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          created_at: user.created_at ? new Date(user.created_at) : new Date(),
          updated_at: user.updated_at ? new Date(user.updated_at) : new Date(),
        },
      });
      stats.users++;
    }
    
    console.log(`✅ 用户表迁移完成：${stats.users}条记录`);
  } catch (error) {
    console.error('❌ 用户表迁移失败:', error.message);
  }
}

/**
 * 迁移学生资料表
 */
async function migrateStudentProfiles(sqliteDb) {
  console.log('\n🎓 开始迁移学生资料表...');
  
  try {
    const profiles = sqliteDb.prepare('SELECT * FROM student_profiles').all();
    console.log(`找到 ${profiles.length} 个学生资料`);
    
    for (const profile of profiles) {
      await prisma.studentProfile.upsert({
        where: { user_id: profile.user_id?.toString() },
        update: {
          grade: profile.grade,
          school_name: profile.school_name,
          total_points: profile.total_points || 0,
          streak_days: profile.streak_days || 0,
          updated_at: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        },
        create: {
          user_id: profile.user_id?.toString(),
          grade: profile.grade,
          school_name: profile.school_name,
          total_points: profile.total_points || 0,
          streak_days: profile.streak_days || 0,
          created_at: profile.created_at ? new Date(profile.created_at) : new Date(),
          updated_at: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        },
      });
      stats.studentProfiles++;
    }
    
    console.log(`✅ 学生资料表迁移完成：${stats.studentProfiles}条记录`);
  } catch (error) {
    console.error('❌ 学生资料表迁移失败:', error.message);
  }
}

/**
 * 迁移家长资料表
 */
async function migrateParentProfiles(sqliteDb) {
  console.log('\n👪 开始迁移家长资料表...');
  
  try {
    const profiles = sqliteDb.prepare('SELECT * FROM parent_profiles').all();
    console.log(`找到 ${profiles.length} 个家长资料`);
    
    for (const profile of profiles) {
      await prisma.parentProfile.upsert({
        where: { user_id: profile.user_id?.toString() },
        update: {
          real_name: profile.real_name,
          verified_status: profile.verified_status || 'pending',
          updated_at: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        },
        create: {
          user_id: profile.user_id?.toString(),
          real_name: profile.real_name,
          verified_status: profile.verified_status || 'pending',
          created_at: profile.created_at ? new Date(profile.created_at) : new Date(),
          updated_at: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        },
      });
      stats.parentProfiles++;
    }
    
    console.log(`✅ 家长资料表迁移完成：${stats.parentProfiles}条记录`);
  } catch (error) {
    console.error('❌ 家长资料表迁移失败:', error.message);
  }
}

/**
 * 迁移验证码表
 */
async function migrateVerificationCodes(sqliteDb) {
  console.log('\n📱 开始迁移验证码表...');
  
  try {
    const codes = sqliteDb.prepare('SELECT * FROM verification_codes').all();
    console.log(`找到 ${codes.length} 个验证码`);
    
    for (const code of codes) {
      await prisma.verificationCode.create({
        data: {
          phone: code.phone,
          code: code.code,
          purpose: code.purpose || 'login',
          expires_at: code.expires_at ? new Date(code.expires_at) : new Date(),
          used: Boolean(code.used),
          created_at: code.created_at ? new Date(code.created_at) : new Date(),
        },
      });
      stats.verificationCodes++;
    }
    
    console.log(`✅ 验证码表迁移完成：${stats.verificationCodes}条记录`);
  } catch (error) {
    console.error('❌ 验证码表迁移失败:', error.message);
  }
}

/**
 * 迁移知识点表
 */
async function migrateKnowledgePoints(sqliteDb) {
  console.log('\n📚 开始迁移知识点表...');
  
  try {
    const points = sqliteDb.prepare('SELECT * FROM knowledge_points').all();
    console.log(`找到 ${points.length} 个知识点`);
    
    for (const point of points) {
      await prisma.knowledgePoint.create({
        data: {
          id: point.id?.toString() || `kp_${Date.now()}_${Math.random()}`,
          user_id: point.user_id?.toString(),
          title: point.title,
          content: point.content,
          category: point.category,
          tags: point.tags,
          status: point.status || 'active',
          created_at: point.created_at ? new Date(point.created_at) : new Date(),
          updated_at: point.updated_at ? new Date(point.updated_at) : new Date(),
        },
      });
      stats.knowledgePoints++;
    }
    
    console.log(`✅ 知识点表迁移完成：${stats.knowledgePoints}条记录`);
  } catch (error) {
    console.error('❌ 知识点表迁移失败:', error.message);
  }
}

/**
 * 迁移学习进度表
 */
async function migrateLearningProgress(sqliteDb) {
  console.log('\n📈 开始迁移学习进度表...');
  
  try {
    const records = sqliteDb.prepare('SELECT * FROM learning_progress').all();
    console.log(`找到 ${records.length} 条学习进度`);
    
    for (const record of records) {
      await prisma.learningProgress.create({
        data: {
          id: record.id?.toString() || `lp_${Date.now()}_${Math.random()}`,
          user_id: record.user_id?.toString(),
          knowledge_point_id: record.knowledge_point_id?.toString(),
          study_duration: record.study_duration || 0,
          completion_rate: record.completion_rate || 0,
          last_studied_at: record.last_studied_at ? new Date(record.last_studied_at) : null,
          created_at: record.created_at ? new Date(record.created_at) : new Date(),
          updated_at: record.updated_at ? new Date(record.updated_at) : new Date(),
        },
      });
      stats.learningProgress++;
    }
    
    console.log(`✅ 学习进度表迁移完成：${stats.learningProgress}条记录`);
  } catch (error) {
    console.error('❌ 学习进度表迁移失败:', error.message);
  }
}

/**
 * 迁移 AI 问答记录表
 */
async function migrateAIQARecords(sqliteDb) {
  console.log('\n🤖 开始迁移 AI 问答记录表...');
  
  try {
    const records = sqliteDb.prepare('SELECT * FROM ai_qa_records').all();
    console.log(`找到 ${records.length} 条 AI 问答记录`);
    
    for (const record of records) {
      await prisma.aiQaRecord.create({
        data: {
          id: record.id?.toString() || `ai_${Date.now()}_${Math.random()}`,
          user_id: record.user_id?.toString(),
          question: record.question,
          answer: record.answer,
          knowledge_point_id: record.knowledge_point_id?.toString(),
          created_at: record.created_at ? new Date(record.created_at) : new Date(),
        },
      });
      stats.aiQaRecords++;
    }
    
    console.log(`✅ AI 问答记录表迁移完成：${stats.aiQaRecords}条记录`);
  } catch (error) {
    console.error('❌ AI 问答记录表迁移失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始 SQLite → PostgreSQL 数据迁移\n');
  console.log('=' .repeat(50));
  
  // 1. 检查 SQLite 数据库
  checkSqliteExists();
  
  // 2. 测试 PostgreSQL 连接
  await testPostgresConnection();
  
  // 3. 打开 SQLite 数据库
  const sqliteDb = new Database(sqlitePath);
  console.log('\n✅ SQLite 数据库已打开\n');
  
  try {
    // 4. 执行迁移
    await migrateUsers(sqliteDb);
    await migrateStudentProfiles(sqliteDb);
    await migrateParentProfiles(sqliteDb);
    await migrateVerificationCodes(sqliteDb);
    await migrateKnowledgePoints(sqliteDb);
    await migrateLearningProgress(sqliteDb);
    await migrateAIQARecords(sqliteDb);
    
    // 5. 输出统计
    console.log('\n' + '='.repeat(50));
    console.log('🎉 数据迁移完成！\n');
    console.log('迁移统计:');
    console.log(`  - 用户：${stats.users}`);
    console.log(`  - 学生资料：${stats.studentProfiles}`);
    console.log(`  - 家长资料：${stats.parentProfiles}`);
    console.log(`  - 验证码：${stats.verificationCodes}`);
    console.log(`  - 知识点：${stats.knowledgePoints}`);
    console.log(`  - 学习进度：${stats.learningProgress}`);
    console.log(`  - AI 问答记录：${stats.aiQaRecords}`);
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ 迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    // 6. 关闭连接
    sqliteDb.close();
    await prisma.$disconnect();
    console.log('\n✅ 所有连接已关闭');
  }
}

// 运行迁移
main().catch(console.error);
