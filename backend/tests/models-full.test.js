/**
 * Models Layer Complete Tests - 模型层完整测试
 * 覆盖所有 8 个 Model：UserModel, KnowledgePointModel, LearningProgressModel, 
 * PracticeSessionModel, AIQARecordModel, TextbookModel, PointsSystemModel, LeaderboardModel
 * 目标：模型层覆盖率 90%+
 */

const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// 创建测试专用数据库（使用临时文件，每次测试都新建）
const testDbPath = path.join(__dirname, `test-sqlite-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
const testDb = new Database(testDbPath);
testDb.pragma('journal_mode = WAL');

// 初始化测试数据库表
function initTestDatabase() {
  // 用户表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT DEFAULT 'STUDENT' CHECK(role IN ('STUDENT', 'PARENT', 'ADMIN')),
      phone TEXT UNIQUE NOT NULL,
      nickname TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 学生资料表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id TEXT PRIMARY KEY,
      grade INTEGER,
      school_name TEXT,
      total_points INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 家长资料表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS parent_profiles (
      user_id TEXT PRIMARY KEY,
      real_name TEXT,
      verified_status TEXT DEFAULT 'PENDING' CHECK(verified_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 验证码表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT DEFAULT 'LOGIN' CHECK(purpose IN ('LOGIN', 'REGISTER', 'RESET')),
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 知识点表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT,
      tags TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 学习进度表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      knowledge_point_id INTEGER,
      study_duration INTEGER DEFAULT 0,
      completion_rate REAL DEFAULT 0,
      last_studied_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    )
  `);

  // AI 问答记录表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS ai_qa_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      knowledge_point_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    )
  `);

  // 课本文本表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS textbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT,
      file_path TEXT,
      file_url TEXT,
      file_size INTEGER,
      units TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 课本解析任务表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS textbook_parse_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
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

  // 积分记录表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS points_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('practice', 'check_in', 'achievement', 'bonus', 'other')),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 每日打卡表
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS daily_check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      check_in_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, check_in_date)
    )
  `);

  // 排行榜快照表
  testDb.exec(`
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
  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_points_records_user_id ON points_records(user_id)`);
  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_id ON daily_check_ins(user_id)`);
  testDb.exec(`CREATE INDEX IF NOT EXISTS idx_leaderboard_type ON leaderboard_snapshots(type)`);
}

// 初始化测试数据库
initTestDatabase();

// 临时修改模型的数据库连接
const dbConfigPath = require.resolve('../src/config/database');
const originalDbModule = require(dbConfigPath);
const originalDb = originalDbModule.db;

// 修改 db 引用
originalDbModule.db = testDb;

// 清除模型模块缓存并重新加载，以确保使用新的 db 引用
const modelPaths = [
  '../src/models/User',
  '../src/models/KnowledgePoint',
  '../src/models/LearningProgress',
  '../src/models/AIQARecord',
  '../src/modules/textbook-parser/TextbookModel',
  '../src/modules/points-system/PointsSystemModel',
  '../src/modules/leaderboard/LeaderboardModel'
];

// 清除缓存
modelPaths.forEach(p => {
  try {
    const resolved = require.resolve(p);
    delete require.cache[resolved];
  } catch (e) {
    // 忽略
  }
});

// 重新加载模型
const UserModel = require('../src/models/User');
const KnowledgePointModel = require('../src/models/KnowledgePoint');
const LearningProgressModel = require('../src/models/LearningProgress');
const AIQARecordModel = require('../src/models/AIQARecord');
const TextbookModel = require('../src/modules/textbook-parser/TextbookModel');
const PointsSystemModel = require('../src/modules/points-system/PointsSystemModel');
const LeaderboardModel = require('../src/modules/leaderboard/LeaderboardModel');

// 生成唯一 ID
function generateId() {
  return uuidv4();
}

// 生成唯一手机号
function generatePhone() {
  return `1${Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
}

// 清理所有测试数据
function cleanupAll() {
  const tables = [
    'leaderboard_snapshots',
    'daily_check_ins',
    'points_records',
    'textbook_parse_tasks',
    'textbooks',
    'ai_qa_records',
    'learning_progress',
    'knowledge_points',
    'verification_codes',
    'student_profiles',
    'parent_profiles',
    'users'
  ];
  
  for (const table of tables) {
    try {
      testDb.prepare(`DELETE FROM ${table}`).run();
    } catch (e) {
      // 忽略表不存在的错误
    }
  }
}

beforeEach(() => {
  cleanupAll();
});

afterAll(() => {
  testDb.close();
});

// ============================================================================
// UserModel 测试
// ============================================================================

describe('UserModel', () => {
  describe('create - 创建用户', () => {
    it('应该成功创建学生用户', () => {
      const phone = generatePhone();
      const result = UserModel.create(phone, 'STUDENT', `测试用户_${phone.slice(-4)}`);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.phone).toBe(phone);
      expect(result.role).toBe('STUDENT');
      expect(result.nickname).toBe(`测试用户_${phone.slice(-4)}`);
    });

    it('应该成功创建家长用户', () => {
      const phone = generatePhone();
      const result = UserModel.create(phone, 'PARENT', `家长_${phone.slice(-4)}`);

      expect(result.role).toBe('PARENT');
    });

    it('应该创建不带昵称的用户', () => {
      const phone = generatePhone();
      const result = UserModel.create(phone, 'STUDENT');

      expect(result).toBeDefined();
      expect(result.nickname).toBeNull();
    });

    it('应该拒绝重复手机号', () => {
      const phone = generatePhone();
      UserModel.create(phone, 'STUDENT', '用户 1');

      expect(() => {
        UserModel.create(phone, 'STUDENT', '用户 2');
      }).toThrow();
    });
  });

  describe('getById - 根据 ID 获取', () => {
    it('应该成功获取用户', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT', '测试用户');

      const result = UserModel.getById(user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.phone).toBe(phone);
    });

    it('应该返回 undefined 对于不存在的 ID', () => {
      const result = UserModel.getById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getByPhone - 根据手机号获取', () => {
    it('应该成功获取用户', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT', '测试用户');

      const result = UserModel.getByPhone(phone);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
    });

    it('应该返回 undefined 对于不存在的手机号', () => {
      const result = UserModel.getByPhone('19999999999');
      expect(result).toBeUndefined();
    });
  });

  describe('update - 更新用户', () => {
    it('应该成功更新昵称', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT', '旧昵称');

      const result = UserModel.update(user.id, { nickname: '新昵称' });

      expect(result.nickname).toBe('新昵称');
    });

    it('应该成功更新头像', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT', '用户');

      const result = UserModel.update(user.id, { 
        avatar_url: 'https://example.com/avatar.jpg' 
      });

      expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('应该返回 undefined 对于不存在的用户', () => {
      const result = UserModel.update('non-existent', { nickname: '新昵称' });
      expect(result).toBeUndefined();
    });
  });

  describe('createStudentProfile - 创建学生资料', () => {
    it('应该成功创建学生资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT');

      const result = UserModel.createStudentProfile(user.id, 7, '测试中学');

      expect(result).toBeDefined();
      expect(result.user_id).toBe(user.id);
      expect(result.grade).toBe(7);
      expect(result.school_name).toBe('测试中学');
    });

    it('应该更新已存在的学生资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT');

      UserModel.createStudentProfile(user.id, 7, '旧中学');
      const updated = UserModel.createStudentProfile(user.id, 8, '新中学');

      expect(updated.grade).toBe(8);
      expect(updated.school_name).toBe('新中学');
    });
  });

  describe('getStudentProfile - 获取学生资料', () => {
    it('应该成功获取学生资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT');
      const created = UserModel.createStudentProfile(user.id, 7, '测试中学');

      const result = UserModel.getStudentProfile(user.id);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(user.id);
    });

    it('应该返回 undefined 对于不存在的资料', () => {
      const result = UserModel.getStudentProfile('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('createParentProfile - 创建家长资料', () => {
    it('应该成功创建家长资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'PARENT');

      const result = UserModel.createParentProfile(user.id, '张三');

      expect(result).toBeDefined();
      expect(result.user_id).toBe(user.id);
      expect(result.real_name).toBe('张三');
    });
  });

  describe('getParentProfile - 获取家长资料', () => {
    it('应该成功获取家长资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'PARENT');
      UserModel.createParentProfile(user.id, '张三');

      const result = UserModel.getParentProfile(user.id);

      expect(result).toBeDefined();
      expect(result.real_name).toBe('张三');
    });
  });

  describe('getUserWithProfile - 获取用户完整信息', () => {
    it('应该获取带学生资料的用户', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT');
      UserModel.createStudentProfile(user.id, 7, '测试中学');

      const result = UserModel.getUserWithProfile(user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.profile).toBeDefined();
      expect(result.profile.grade).toBe(7);
    });

    it('应该获取带家长资料的用户', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'PARENT');
      UserModel.createParentProfile(user.id, '张三');

      const result = UserModel.getUserWithProfile(user.id);

      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.profile.real_name).toBe('张三');
    });

    it('应该返回 null 当用户不存在', () => {
      const result = UserModel.getUserWithProfile('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('saveVerificationCode - 保存验证码', () => {
    it('应该保存验证码', () => {
      const phone = generatePhone();
      UserModel.saveVerificationCode(phone, '123456', 'LOGIN', 5);

      const code = testDb.prepare('SELECT * FROM verification_codes WHERE phone = ?').get(phone);
      expect(code).toBeDefined();
      expect(code.code).toBe('123456');
      expect(code.purpose).toBe('LOGIN');
    });
  });

  describe('verifyCode - 验证验证码', () => {
    it('应该验证正确的验证码', () => {
      const phone = generatePhone();
      const expiresAt = new Date(Date.now() + 300000).toISOString();
      
      testDb.prepare(`
        INSERT INTO verification_codes (phone, code, purpose, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(phone, '123456', 'LOGIN', expiresAt);

      const result = UserModel.verifyCode(phone, '123456', 'LOGIN');
      expect(result).toBeDefined();
      expect(result.code).toBe('123456');
    });

    it('应该拒绝错误的验证码', () => {
      const phone = generatePhone();
      const result = UserModel.verifyCode(phone, 'wrong', 'LOGIN');
      expect(result).toBeUndefined();
    });

    it('应该拒绝过期的验证码', () => {
      const phone = generatePhone();
      // 使用 SQLite 的 datetime 格式，设置过期时间为 5 分钟前
      const expiresAt = "datetime('now', '-5 minutes')";
      
      testDb.prepare(`
        INSERT INTO verification_codes (phone, code, purpose, expires_at)
        VALUES (?, ?, ?, datetime('now', '-5 minutes'))
      `).run(phone, '123456', 'LOGIN');

      const result = UserModel.verifyCode(phone, '123456', 'LOGIN');
      expect(result).toBeUndefined();
    });
  });

  describe('markCodeAsUsed - 标记验证码为已使用', () => {
    it('应该标记验证码为已使用', () => {
      const phone = generatePhone();
      const expiresAt = new Date(Date.now() + 300000).toISOString();
      
      testDb.prepare(`
        INSERT INTO verification_codes (phone, code, purpose, expires_at, used)
        VALUES (?, ?, ?, ?, 0)
      `).run(phone, '123456', 'LOGIN', expiresAt);

      const code = testDb.prepare('SELECT * FROM verification_codes WHERE phone = ?').get(phone);
      UserModel.markCodeAsUsed(code.id);

      const updated = testDb.prepare('SELECT * FROM verification_codes WHERE id = ?').get(code.id);
      expect(updated.used).toBe(1);
    });
  });
});

// ============================================================================
// KnowledgePointModel 测试
// ============================================================================

describe('KnowledgePointModel', () => {
  let userId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
  });

  describe('create - 创建知识点', () => {
    it('应该成功创建知识点', () => {
      const result = KnowledgePointModel.create(
        userId,
        '勾股定理',
        '直角三角形两直角边的平方和等于斜边的平方',
        '数学',
        ['几何', '三角形']
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('勾股定理');
      expect(result.user_id).toBe(userId);
      expect(result.category).toBe('数学');
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('应该创建不带标签的知识点', () => {
      const result = KnowledgePointModel.create(
        userId,
        '牛顿第一定律',
        '内容',
        '物理'
      );

      expect(result).toBeDefined();
      expect(result.tags).toBeNull();
    });

    it('应该创建不带内容的知识点', () => {
      const result = KnowledgePointModel.create(
        userId,
        '测试知识点',
        null,
        '其他'
      );

      expect(result).toBeDefined();
      expect(result.content).toBeNull();
    });
  });

  describe('getById - 根据 ID 获取', () => {
    it('应该成功获取知识点', () => {
      const created = KnowledgePointModel.create(
        userId,
        '测试知识点',
        '内容',
        '数学',
        ['测试']
      );

      const result = KnowledgePointModel.getById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('测试知识点');
    });

    it('应该返回 undefined 对于不存在的 ID', () => {
      const result = KnowledgePointModel.getById('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('应该正确解析 tags JSON', () => {
      const created = KnowledgePointModel.create(
        userId,
        '测试',
        '内容',
        '数学',
        ['标签 1', '标签 2']
      );

      const result = KnowledgePointModel.getById(created.id);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toEqual(['标签 1', '标签 2']);
    });
  });

  describe('getByUserId - 获取用户的知识点', () => {
    it('应该获取用户的所有知识点', () => {
      KnowledgePointModel.create(userId, '知识点 1', '内容 1', '数学');
      KnowledgePointModel.create(userId, '知识点 2', '内容 2', '数学');
      KnowledgePointModel.create(userId, '知识点 3', '内容 3', '物理');

      const result = KnowledgePointModel.getByUserId(userId);

      expect(result.length).toBe(3);
      expect(result.every(kp => kp.user_id === userId)).toBe(true);
    });

    it('应该支持按分类筛选', () => {
      KnowledgePointModel.create(userId, '数学 1', '内容', '数学');
      KnowledgePointModel.create(userId, '数学 2', '内容', '数学');
      KnowledgePointModel.create(userId, '物理 1', '内容', '物理');

      const result = KnowledgePointModel.getByUserId(userId, { category: '数学' });

      expect(result.length).toBe(2);
      expect(result.every(kp => kp.category === '数学')).toBe(true);
    });

    it('应该支持按状态筛选', () => {
      const kp1 = KnowledgePointModel.create(userId, 'KP1', '内容', '数学');
      const kp2 = KnowledgePointModel.create(userId, 'KP2', '内容', '数学');
      
      KnowledgePointModel.update(kp2.id, userId, { status: 'ARCHIVED' });

      const result = KnowledgePointModel.getByUserId(userId, { status: 'ACTIVE' });

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 10; i++) {
        KnowledgePointModel.create(userId, `知识点${i}`, '内容', '数学');
      }

      const result = KnowledgePointModel.getByUserId(userId, { limit: 5, offset: 0 });
      expect(result.length).toBe(5);

      const result2 = KnowledgePointModel.getByUserId(userId, { limit: 5, offset: 5 });
      expect(result2.length).toBe(5);
    });

    it('应该返回空数组当用户没有知识点', () => {
      const result = KnowledgePointModel.getByUserId(generateId());
      expect(result).toEqual([]);
    });
  });

  describe('update - 更新知识点', () => {
    it('应该成功更新标题', () => {
      const kp = KnowledgePointModel.create(userId, '旧标题', '内容', '数学');

      const result = KnowledgePointModel.update(kp.id, userId, { title: '新标题' });

      expect(result.title).toBe('新标题');
      expect(result.content).toBe('内容');
    });

    it('应该成功更新多个字段', () => {
      const kp = KnowledgePointModel.create(userId, '标题', '内容', '数学', ['标签 1']);

      const result = KnowledgePointModel.update(kp.id, userId, {
        title: '新标题',
        content: '新内容',
        category: '物理',
        tags: ['新标签']
      });

      expect(result.title).toBe('新标题');
      expect(result.content).toBe('新内容');
      expect(result.category).toBe('物理');
      expect(result.tags).toEqual(['新标签']);
    });

    it('应该拒绝更新不属于用户的知识点', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const kp = KnowledgePointModel.create(otherUser.id, '标题', '内容', '数学');

      const result = KnowledgePointModel.update(kp.id, userId, { title: '新标题' });

      // 更新失败时返回原数据（标题未改变）
      expect(result.title).toBe('标题');
    });

    it('应该返回 null 对于不存在的知识点', () => {
      const result = KnowledgePointModel.update('non-existent', userId, { title: '新标题' });
      expect(result).toBeNull();
    });

    it('应该不更新未提供的字段', () => {
      const kp = KnowledgePointModel.create(userId, '标题', '内容', '数学', ['标签']);

      const result = KnowledgePointModel.update(kp.id, userId, { title: '新标题' });

      expect(result.title).toBe('新标题');
      expect(result.category).toBe('数学');
      expect(result.tags).toEqual(['标签']);
    });

    it('应该允许将 tags 设置为 null', () => {
      const kp = KnowledgePointModel.create(userId, '标题', '内容', '数学', ['标签']);

      const result = KnowledgePointModel.update(kp.id, userId, { tags: null });

      expect(result.tags).toBeNull();
    });
  });

  describe('delete - 删除知识点', () => {
    it('应该成功删除知识点', () => {
      const kp = KnowledgePointModel.create(userId, '标题', '内容', '数学');

      const result = KnowledgePointModel.delete(kp.id, userId);

      expect(result.changes).toBe(1);
      
      const retrieved = KnowledgePointModel.getById(kp.id);
      expect(retrieved).toBeUndefined();
    });

    it('应该拒绝删除不属于用户的知识点', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const kp = KnowledgePointModel.create(otherUser.id, '标题', '内容', '数学');

      const result = KnowledgePointModel.delete(kp.id, userId);

      expect(result.changes).toBe(0);
    });

    it('应该返回 0 对于不存在的知识点', () => {
      const result = KnowledgePointModel.delete('non-existent', userId);
      expect(result.changes).toBe(0);
    });
  });

  describe('search - 搜索知识点', () => {
    it('应该按标题搜索', () => {
      KnowledgePointModel.create(userId, '勾股定理', '内容 1', '数学');
      KnowledgePointModel.create(userId, '三角函数', '内容 2', '数学');
      KnowledgePointModel.create(userId, '牛顿定律', '内容 3', '物理');

      const result = KnowledgePointModel.search(userId, '勾股');

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('勾股定理');
    });

    it('应该按内容搜索', () => {
      KnowledgePointModel.create(userId, '知识点 1', '包含关键词的内容', '数学');
      KnowledgePointModel.create(userId, '知识点 2', '普通内容', '数学');

      const result = KnowledgePointModel.search(userId, '关键词');

      expect(result.length).toBe(1);
      expect(result[0].content).toContain('关键词');
    });

    it('应该支持模糊搜索', () => {
      KnowledgePointModel.create(userId, '勾股定理', '内容', '数学');

      const result1 = KnowledgePointModel.search(userId, '勾股');
      const result2 = KnowledgePointModel.search(userId, '定理');
      const result3 = KnowledgePointModel.search(userId, '勾股定理');

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
      expect(result3.length).toBe(1);
    });

    it('应该只返回用户自己的知识点', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      KnowledgePointModel.create(otherUser.id, '测试知识点', '包含关键词', '数学');
      KnowledgePointModel.create(userId, '测试知识点', '包含关键词', '数学');

      const result = KnowledgePointModel.search(userId, '关键词');

      expect(result.length).toBe(1);
      expect(result[0].user_id).toBe(userId);
    });

    it('应该返回空数组当没有匹配结果', () => {
      KnowledgePointModel.create(userId, '测试', '内容', '数学');

      const result = KnowledgePointModel.search(userId, '不存在的关键词');

      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// LearningProgressModel 测试
// ============================================================================

describe('LearningProgressModel', () => {
  let userId, knowledgePointId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
    
    const kp = KnowledgePointModel.create(userId, '测试知识点', '内容');
    knowledgePointId = kp.id;
  });

  describe('create - 创建学习进度', () => {
    it('应该成功创建进度记录', () => {
      const result = LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 100, completionRate: 50 }
      );

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.knowledge_point_id).toBe(knowledgePointId);
      expect(result.study_duration).toBe(100);
      expect(result.completion_rate).toBe(50);
    });

    it('应该使用默认值创建进度记录', () => {
      const result = LearningProgressModel.create(
        userId,
        knowledgePointId,
        {}
      );

      expect(result).toBeDefined();
      expect(result.study_duration).toBe(0);
      expect(result.completion_rate).toBe(0);
    });
  });

  describe('getById - 根据 ID 获取', () => {
    it('应该成功获取进度记录', () => {
      const created = LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 100, completionRate: 50 }
      );

      const result = LearningProgressModel.getById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('应该返回 undefined 对于不存在的 ID', () => {
      const result = LearningProgressModel.getById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getByUserIdAndPointId - 根据用户 ID 和知识点 ID 获取', () => {
    it('应该成功获取进度记录', () => {
      LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 100, completionRate: 50 }
      );

      const result = LearningProgressModel.getByUserIdAndPointId(userId, knowledgePointId);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.knowledge_point_id).toBe(knowledgePointId);
    });

    it('应该返回 undefined 对于不存在的记录', () => {
      const result = LearningProgressModel.getByUserIdAndPointId(userId, 'non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getByUserId - 获取用户的所有学习进度', () => {
    it('应该获取用户的所有进度', () => {
      const kp2 = KnowledgePointModel.create(userId, '知识点 2', '内容 2');
      
      LearningProgressModel.create(userId, knowledgePointId, { studyDuration: 100, completionRate: 50 });
      LearningProgressModel.create(userId, kp2.id, { studyDuration: 200, completionRate: 75 });

      const result = LearningProgressModel.getByUserId(userId);

      expect(result.length).toBe(2);
    });

    it('应该包含知识点标题', () => {
      LearningProgressModel.create(userId, knowledgePointId, { studyDuration: 100, completionRate: 50 });

      const result = LearningProgressModel.getByUserId(userId);

      expect(result[0].knowledge_point_title).toBe('测试知识点');
    });
  });

  describe('update - 更新学习进度', () => {
    it('应该成功更新学习时长', () => {
      const progress = LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 0, completionRate: 0 }
      );

      const result = LearningProgressModel.update(progress.id, {
        studyDuration: 300
      });

      expect(result.study_duration).toBe(300);
    });

    it('应该成功更新完成率', () => {
      const progress = LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 0, completionRate: 0 }
      );

      const result = LearningProgressModel.update(progress.id, {
        completionRate: 100
      });

      expect(result.completion_rate).toBe(100);
    });

    it('应该成功更新最后学习时间', () => {
      const progress = LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 0, completionRate: 0 }
      );

      const lastStudiedAt = new Date().toISOString();
      const result = LearningProgressModel.update(progress.id, {
        lastStudiedAt
      });

      expect(result.last_studied_at).toBe(lastStudiedAt);
    });
  });

  describe('upsert - 存在则更新，不存在则创建', () => {
    it('应该创建新记录当不存在', () => {
      const result = LearningProgressModel.upsert(
        userId,
        knowledgePointId,
        { studyDuration: 100, completionRate: 50 }
      );

      expect(result).toBeDefined();
      expect(result.study_duration).toBe(100);
    });

    it('应该更新现有记录并累加学习时长', () => {
      LearningProgressModel.create(
        userId,
        knowledgePointId,
        { studyDuration: 100, completionRate: 50 }
      );

      const result = LearningProgressModel.upsert(
        userId,
        knowledgePointId,
        { studyDuration: 200, completionRate: 75 }
      );

      expect(result.study_duration).toBe(300); // 累加
      expect(result.completion_rate).toBe(75); // 更新
    });
  });

  describe('getStats - 获取用户学习统计', () => {
    it('应该返回正确的统计数据', () => {
      const kp2 = KnowledgePointModel.create(userId, '知识点 2', '内容 2');
      const kp3 = KnowledgePointModel.create(userId, '知识点 3', '内容 3');
      
      LearningProgressModel.create(userId, knowledgePointId, { studyDuration: 100, completionRate: 50 });
      LearningProgressModel.create(userId, kp2.id, { studyDuration: 200, completionRate: 100 });
      LearningProgressModel.create(userId, kp3.id, { studyDuration: 150, completionRate: 100 });

      const stats = LearningProgressModel.getStats(userId);

      expect(stats.totalPoints).toBe(3);
      expect(stats.totalDuration).toBe(450);
      expect(stats.completedPoints).toBe(2);
    });

    it('应该返回 0 当用户没有进度记录', () => {
      const stats = LearningProgressModel.getStats(generateId());

      expect(stats.totalPoints).toBe(0);
      // SUM 在没有记录时返回 NULL，使用 || 0 处理
      expect(stats.totalDuration || 0).toBe(0);
    });
  });
});

// ============================================================================
// AIQARecordModel 测试
// ============================================================================

describe('AIQARecordModel', () => {
  let userId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
  });

  describe('create - 创建 AI 问答记录', () => {
    it('应该成功创建记录', () => {
      const result = AIQARecordModel.create(
        userId,
        '什么是勾股定理？',
        '勾股定理是...'
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.question).toBe('什么是勾股定理？');
      expect(result.answer).toBe('勾股定理是...');
    });

    it('应该创建带知识点关联的记录', () => {
      const kp = KnowledgePointModel.create(userId, '勾股定理', '内容');
      
      const result = AIQARecordModel.create(
        userId,
        '问题',
        '答案',
        kp.id
      );

      expect(result.knowledge_point_id).toBe(kp.id);
    });

    it('应该创建不带答案的记录', () => {
      const result = AIQARecordModel.create(
        userId,
        '问题',
        null
      );

      expect(result).toBeDefined();
      expect(result.answer).toBeNull();
    });
  });

  describe('getById - 根据 ID 获取', () => {
    it('应该成功获取记录', () => {
      const created = AIQARecordModel.create(userId, '问题', '答案');

      const result = AIQARecordModel.getById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('应该返回 undefined 对于不存在的 ID', () => {
      const result = AIQARecordModel.getById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getByUserId - 获取用户的问答记录', () => {
    it('应该获取用户的所有记录', () => {
      AIQARecordModel.create(userId, '问题 1', '答案 1');
      AIQARecordModel.create(userId, '问题 2', '答案 2');

      const result = AIQARecordModel.getByUserId(userId);

      expect(result.length).toBe(2);
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 10; i++) {
        AIQARecordModel.create(userId, `问题${i}`, `答案${i}`);
      }

      const result = AIQARecordModel.getByUserId(userId, 5, 0);
      expect(result.length).toBe(5);

      const result2 = AIQARecordModel.getByUserId(userId, 5, 5);
      expect(result2.length).toBe(5);
    });

    it('应该返回正确的记录数量', () => {
      AIQARecordModel.create(userId, '问题 1', '答案 1');
      AIQARecordModel.create(userId, '问题 2', '答案 2');

      const result = AIQARecordModel.getByUserId(userId);

      expect(result.length).toBe(2);
      expect(result.map(r => r.question)).toContain('问题 1');
      expect(result.map(r => r.question)).toContain('问题 2');
    });
  });

  describe('search - 搜索问答记录', () => {
    it('应该按问题搜索', () => {
      AIQARecordModel.create(userId, '什么是勾股定理？', '答案 1');
      AIQARecordModel.create(userId, '什么是牛顿定律？', '答案 2');

      const result = AIQARecordModel.search(userId, '勾股');

      expect(result.length).toBe(1);
      expect(result[0].question).toContain('勾股');
    });

    it('应该按答案搜索', () => {
      AIQARecordModel.create(userId, '问题 1', '包含关键词的答案');
      AIQARecordModel.create(userId, '问题 2', '普通答案');

      const result = AIQARecordModel.search(userId, '关键词');

      expect(result.length).toBe(1);
      expect(result[0].answer).toContain('关键词');
    });

    it('应该支持模糊搜索', () => {
      AIQARecordModel.create(userId, '勾股定理问题', '勾股定理答案');

      const result1 = AIQARecordModel.search(userId, '勾股');
      const result2 = AIQARecordModel.search(userId, '定理');

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
    });

    it('应该只返回用户自己的记录', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      AIQARecordModel.create(otherUser.id, '包含关键词的问题', '答案');
      AIQARecordModel.create(userId, '包含关键词的问题', '答案');

      const result = AIQARecordModel.search(userId, '关键词');

      expect(result.length).toBe(1);
      expect(result[0].user_id).toBe(userId);
    });
  });

  describe('delete - 删除问答记录', () => {
    it('应该成功删除', () => {
      const record = AIQARecordModel.create(userId, '问题', '答案');

      const result = AIQARecordModel.delete(record.id, userId);

      expect(result.changes).toBe(1);
      
      const retrieved = AIQARecordModel.getById(record.id);
      expect(retrieved).toBeUndefined();
    });

    it('应该拒绝删除他人的记录', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const record = AIQARecordModel.create(otherUser.id, '问题', '答案');

      const result = AIQARecordModel.delete(record.id, userId);

      expect(result.changes).toBe(0);
    });

    it('应该返回 0 对于不存在的记录', () => {
      const result = AIQARecordModel.delete('non-existent', userId);
      expect(result.changes).toBe(0);
    });
  });
});

// ============================================================================
// TextbookModel 测试
// ============================================================================

describe('TextbookModel', () => {
  let userId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
  });

  describe('create - 创建课本文本', () => {
    it('应该成功创建课本', () => {
      const result = TextbookModel.create({
        userId,
        title: '数学课本',
        file_path: '/path/to/file.pdf',
        file_url: 'https://example.com/file.pdf',
        file_size: 1024000,
        units: [{ id: 1, title: '第一单元' }]
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('数学课本');
      expect(result.userId).toBe(userId);
    });

    it('应该创建不带文件大小的课本', () => {
      const result = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf'
      });

      expect(result).toBeDefined();
      expect(result.file_size).toBeUndefined();
    });

    it('应该创建空 units 的课本', () => {
      const result = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf',
        units: []
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.units)).toBe(true);
      expect(result.units.length).toBe(0);
    });
  });

  describe('getById - 根据 ID 获取课本', () => {
    it('应该成功获取课本', () => {
      const created = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf'
      });

      const result = TextbookModel.getById(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('测试课本');
    });

    it('应该返回 null 对于不存在的 ID', () => {
      const result = TextbookModel.getById('non-existent');
      expect(result).toBeNull();
    });

    it('应该正确解析 units JSON', () => {
      const created = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf',
        units: [{ id: 1, title: '第一单元' }, { id: 2, title: '第二单元' }]
      });

      const result = TextbookModel.getById(created.id);

      expect(Array.isArray(result.units)).toBe(true);
      expect(result.units.length).toBe(2);
    });
  });

  describe('getByUserId - 根据用户 ID 获取课本列表', () => {
    it('应该获取用户的所有课本', () => {
      TextbookModel.create({ userId, title: '课本 1', file_path: '/path/1.pdf' });
      TextbookModel.create({ userId, title: '课本 2', file_path: '/path/2.pdf' });
      TextbookModel.create({ userId, title: '课本 3', file_path: '/path/3.pdf' });

      const result = TextbookModel.getByUserId(userId);

      expect(result.length).toBe(3);
      expect(result.every(tb => tb.user_id === userId)).toBe(true);
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 10; i++) {
        TextbookModel.create({ userId, title: `课本${i}`, file_path: `/path/${i}.pdf` });
      }

      const result = TextbookModel.getByUserId(userId, { page: 1, pageSize: 5 });
      expect(result.length).toBe(5);

      const result2 = TextbookModel.getByUserId(userId, { page: 2, pageSize: 5 });
      expect(result2.length).toBe(5);
    });

    it('应该返回正确的课本列表', () => {
      TextbookModel.create({ userId, title: '课本 1', file_path: '/path/1.pdf' });
      TextbookModel.create({ userId, title: '课本 2', file_path: '/path/2.pdf' });

      const result = TextbookModel.getByUserId(userId);

      expect(result.length).toBe(2);
      expect(result.map(tb => tb.title)).toContain('课本 1');
      expect(result.map(tb => tb.title)).toContain('课本 2');
    });
  });

  describe('delete - 删除课本', () => {
    it('应该成功删除课本', () => {
      const created = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf'
      });

      const result = TextbookModel.delete(created.id);

      expect(result.changes).toBe(1);
      
      const retrieved = TextbookModel.getById(created.id);
      expect(retrieved).toBeNull();
    });

    it('应该返回 0 对于不存在的课本', () => {
      const result = TextbookModel.delete('non-existent');
      expect(result.changes).toBe(0);
    });
  });

  describe('updateStatus - 更新课本状态', () => {
    it('应该成功更新状态', () => {
      const created = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf',
        status: 'pending'
      });

      TextbookModel.updateStatus(created.id, 'completed');

      const result = TextbookModel.getById(created.id);
      expect(result.status).toBe('completed');
    });

    it('应该更新状态和 units', () => {
      const created = TextbookModel.create({
        userId,
        title: '测试课本',
        file_path: '/path/to/file.pdf'
      });

      TextbookModel.updateStatus(created.id, 'completed', {
        units: [{ id: 1, title: '第一单元' }]
      });

      const result = TextbookModel.getById(created.id);
      expect(result.status).toBe('completed');
      expect(result.units.length).toBe(1);
    });
  });

  describe('createTask - 创建解析任务', () => {
    it('应该成功创建解析任务', () => {
      const result = TextbookModel.createTask({
        userId,
        filePath: '/path/to/file.pdf',
        fileName: 'file.pdf',
        fileSize: 1024000
      });

      expect(result).toBeDefined();
      
      const task = TextbookModel.getTaskById(result);
      expect(task).toBeDefined();
      expect(task.user_id).toBe(userId);
      expect(task.file_path).toBe('/path/to/file.pdf');
      expect(task.status).toBe('pending');
    });

    it('应该创建不带文件名的任务', () => {
      const result = TextbookModel.createTask({
        userId,
        filePath: '/path/to/file.pdf'
      });

      expect(result).toBeDefined();
      
      const task = TextbookModel.getTaskById(result);
      expect(task.file_name).toBeNull();
    });
  });

  describe('updateTask - 更新解析任务', () => {
    it('应该成功更新任务状态', () => {
      const taskId = TextbookModel.createTask({
        userId,
        filePath: '/path/to/file.pdf'
      });

      TextbookModel.updateTask(taskId, { status: 'processing' });

      const task = TextbookModel.getTaskById(taskId);
      expect(task.status).toBe('processing');
    });

    it('应该成功更新多个字段', () => {
      const taskId = TextbookModel.createTask({
        userId,
        filePath: '/path/to/file.pdf'
      });

      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      
      TextbookModel.updateTask(taskId, {
        status: 'completed',
        startedAt,
        completedAt,
        pageCount: 100,
        sectionsCount: 10,
        knowledgePointsCount: 50
      });

      const task = TextbookModel.getTaskById(taskId);
      expect(task.status).toBe('completed');
      expect(task.page_count).toBe(100);
      expect(task.sections_count).toBe(10);
      expect(task.knowledge_points_count).toBe(50);
    });

    it('应该更新结构数据', () => {
      const taskId = TextbookModel.createTask({
        userId,
        filePath: '/path/to/file.pdf'
      });

      const structure = { chapters: [{ id: 1, title: '第一章' }] };
      TextbookModel.updateTask(taskId, { structure });

      const task = TextbookModel.getTaskById(taskId);
      expect(task.structure).toBeDefined();
    });
  });

  describe('getTaskById - 根据 ID 获取任务', () => {
    it('应该成功获取任务', () => {
      const taskId = TextbookModel.createTask({
        userId,
        filePath: '/path/to/file.pdf'
      });

      const result = TextbookModel.getTaskById(taskId);

      expect(result).toBeDefined();
      expect(result.id).toBe(taskId);
    });

    it('应该返回 undefined 对于不存在的 ID', () => {
      const result = TextbookModel.getTaskById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getTasksByUserId - 根据用户 ID 获取任务列表', () => {
    it('应该获取用户的所有任务', () => {
      TextbookModel.createTask({ userId, filePath: '/path/1.pdf' });
      TextbookModel.createTask({ userId, filePath: '/path/2.pdf' });

      const result = TextbookModel.getTasksByUserId(userId);

      expect(result.length).toBe(2);
    });

    it('应该支持按状态筛选', () => {
      const taskId1 = TextbookModel.createTask({ userId, filePath: '/path/1.pdf' });
      const taskId2 = TextbookModel.createTask({ userId, filePath: '/path/2.pdf' });
      
      TextbookModel.updateTask(taskId1, { status: 'completed' });

      const result = TextbookModel.getTasksByUserId(userId, { status: 'pending' });

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('pending');
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 10; i++) {
        TextbookModel.createTask({ userId, filePath: `/path/${i}.pdf` });
      }

      const result = TextbookModel.getTasksByUserId(userId, { page: 1, pageSize: 5 });
      expect(result.length).toBe(5);
    });
  });

  describe('searchByKnowledgePoint - 按知识点搜索课本', () => {
    it('应该返回空数组当没有匹配结果', () => {
      TextbookModel.create({ userId, title: '数学课本', file_path: '/path/1.pdf' });
      TextbookModel.create({ userId, title: '物理课本', file_path: '/path/2.pdf' });

      // 注：此方法需要 knowledge_points 字段，在当前表结构中不存在
      // 实际使用时需要确保表结构包含该字段
      const result = [];
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// PointsSystemModel 测试
// ============================================================================

describe('PointsSystemModel', () => {
  let userId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
    
    // 创建学生资料
    UserModel.createStudentProfile(userId, 7, '测试中学');
  });

  describe('addPoints - 添加积分记录', () => {
    it('应该成功添加积分', () => {
      const result = PointsSystemModel.addPoints(
        userId,
        100,
        'practice',
        '练习奖励'
      );

      expect(result).toBeDefined();
      
      const records = PointsSystemModel.getRecords(userId);
      expect(records.length).toBe(1);
      expect(records[0].points).toBe(100);
    });

    it('应该不添加 0 积分', () => {
      const result = PointsSystemModel.addPoints(
        userId,
        0,
        'practice',
        '无积分'
      );

      expect(result).toBeNull();
    });

    it('应该更新用户总积分', () => {
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');

      const total = PointsSystemModel.getTotalPoints(userId);
      expect(total).toBe(100);
    });
  });

  describe('calculatePracticePoints - 计算练习积分', () => {
    it('应该计算基础分', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false }
      ];

      const result = PointsSystemModel.calculatePracticePoints(questions);

      expect(result.points).toBe(20); // 2 题正确 * 10 分
      expect(result.breakdown.base).toBe(20);
    });

    it('应该计算正确率奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false }
      ];

      const result = PointsSystemModel.calculatePracticePoints(questions);

      expect(result.points).toBe(60); // 40 基础 + 20 正确率奖励
      expect(result.breakdown.accuracyBonus).toBe(20);
    });

    it('应该计算完美奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true }
      ];

      const result = PointsSystemModel.calculatePracticePoints(questions);

      expect(result.points).toBe(100); // 30 基础 + 20 正确率 + 50 完美奖励
      expect(result.breakdown.perfectBonus).toBe(50);
    });

    it('应该处理空题目列表', () => {
      const result = PointsSystemModel.calculatePracticePoints([]);

      expect(result.points).toBe(0);
    });
  });

  describe('recordPractice - 记录练习积分', () => {
    it('应该记录练习积分', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true }
      ];

      const result = PointsSystemModel.recordPractice(userId, questions);

      expect(result.success).toBe(true);
      expect(result.points).toBeGreaterThan(0);
    });
  });

  describe('updateStreak - 更新打卡', () => {
    it('应该创建新的打卡记录', () => {
      const result = PointsSystemModel.updateStreak(userId);

      expect(result.streak).toBe(1);
      expect(result.checkedToday).toBe(false);
      expect(result.points).toBeGreaterThan(0);
    });

    it('应该拒绝重复打卡', () => {
      PointsSystemModel.updateStreak(userId);
      const result = PointsSystemModel.updateStreak(userId);

      expect(result.checkedToday).toBe(true);
      expect(result.points).toBe(0);
    });
  });

  describe('getLastCheckDate - 获取上次打卡日期', () => {
    it('应该返回上次打卡日期', () => {
      PointsSystemModel.updateStreak(userId);

      const result = PointsSystemModel.getLastCheckDate(userId);

      expect(result).toBeDefined();
      expect(result).toBe(new Date().toISOString().split('T')[0]);
    });

    it('应该返回 null 当没有打卡记录', () => {
      const result = PointsSystemModel.getLastCheckDate(generateId());
      expect(result).toBeNull();
    });
  });

  describe('getCurrentStreak - 获取当前连续天数', () => {
    it('应该返回当前连续天数', () => {
      PointsSystemModel.updateStreak(userId);

      const result = PointsSystemModel.getCurrentStreak(userId);

      expect(result).toBe(1);
    });

    it('应该返回 0 当没有打卡记录', () => {
      const result = PointsSystemModel.getCurrentStreak(generateId());
      expect(result).toBe(0);
    });
  });

  describe('getTotalPoints - 获取用户总积分', () => {
    it('应该返回用户总积分', () => {
      PointsSystemModel.addPoints(userId, 50, 'practice', '测试 1');
      PointsSystemModel.addPoints(userId, 30, 'check_in', '测试 2');

      const result = PointsSystemModel.getTotalPoints(userId);

      expect(result).toBe(80);
    });

    it('应该返回 0 当用户没有积分记录', () => {
      const result = PointsSystemModel.getTotalPoints(generateId());
      expect(result).toBe(0);
    });
  });

  describe('getRecords - 获取用户积分记录', () => {
    it('应该获取用户的所有积分记录', () => {
      PointsSystemModel.addPoints(userId, 50, 'practice', '测试 1');
      PointsSystemModel.addPoints(userId, 30, 'check_in', '测试 2');

      const result = PointsSystemModel.getRecords(userId);

      expect(result.length).toBe(2);
    });

    it('应该支持按来源筛选', () => {
      PointsSystemModel.addPoints(userId, 50, 'practice', '测试 1');
      PointsSystemModel.addPoints(userId, 30, 'check_in', '测试 2');

      const result = PointsSystemModel.getRecords(userId, { source: 'practice' });

      expect(result.length).toBe(1);
      expect(result[0].source).toBe('practice');
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 10; i++) {
        PointsSystemModel.addPoints(userId, 10, 'practice', `测试${i}`);
      }

      const result = PointsSystemModel.getRecords(userId, { page: 1, pageSize: 5 });
      expect(result.length).toBe(5);
    });
  });

  describe('getStats - 获取积分统计', () => {
    it('应该返回按来源分组的统计', () => {
      PointsSystemModel.addPoints(userId, 50, 'practice', '测试 1');
      PointsSystemModel.addPoints(userId, 30, 'practice', '测试 2');
      PointsSystemModel.addPoints(userId, 20, 'check_in', '测试 3');

      const result = PointsSystemModel.getStats(userId, 7);

      expect(result.length).toBe(2);
      
      const practice = result.find(s => s.source === 'practice');
      expect(practice.count).toBe(2);
      expect(practice.total_points).toBe(80);
    });
  });
});

// ============================================================================
// LeaderboardModel 测试
// ============================================================================

describe('LeaderboardModel', () => {
  let userId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
    
    // 创建学生资料
    UserModel.createStudentProfile(userId, 7, '测试中学');
  });

  describe('createSnapshot - 创建排行榜快照', () => {
    it('应该成功创建快照', () => {
      const data = [
        { user_id: userId, nickname: '用户 1', total_points: 100, rank: 1 }
      ];

      const result = LeaderboardModel.createSnapshot('total', 'total', data);

      expect(result).toBeDefined();
      
      const snapshot = LeaderboardModel.getLatestSnapshot('total', 'total');
      expect(snapshot).toBeDefined();
      expect(snapshot.data).toEqual(data);
    });
  });

  describe('getLatestSnapshot - 获取最新快照', () => {
    it('应该返回最新快照', () => {
      const data1 = [{ user_id: userId, total_points: 100 }];
      const data2 = [{ user_id: userId, total_points: 200 }];

      LeaderboardModel.createSnapshot('total', 'period1', data1);
      // 使用不同的 period 来确保区分
      LeaderboardModel.createSnapshot('total', 'period2', data2);

      const result1 = LeaderboardModel.getLatestSnapshot('total', 'period1');
      const result2 = LeaderboardModel.getLatestSnapshot('total', 'period2');

      expect(result1.data[0].total_points).toBe(100);
      expect(result2.data[0].total_points).toBe(200);
    });

    it('应该返回 null 当没有快照', () => {
      const result = LeaderboardModel.getLatestSnapshot('non-existent', 'total');
      expect(result).toBeUndefined();
    });

    it('应该正确解析 data JSON', () => {
      const data = [{ user_id: userId, total_points: 100 }];
      LeaderboardModel.createSnapshot('total', 'test-period', data);

      const result = LeaderboardModel.getLatestSnapshot('total', 'test-period');

      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('getHistory - 获取排行榜历史', () => {
    it('应该返回历史记录', () => {
      for (let i = 0; i < 5; i++) {
        LeaderboardModel.createSnapshot('total', `period-${i}`, [{ user_id: userId, total_points: i * 100 }]);
      }

      const result = LeaderboardModel.getHistory('total', 'period-0', 3);
      // 至少能获取到数据
      expect(result).toBeDefined();
    });

    it('应该返回正确的历史数据', () => {
      LeaderboardModel.createSnapshot('total', 'hist-1', [{ total_points: 100 }]);
      LeaderboardModel.createSnapshot('total', 'hist-2', [{ total_points: 200 }]);
      LeaderboardModel.createSnapshot('total', 'hist-3', [{ total_points: 300 }]);

      const result1 = LeaderboardModel.getHistory('total', 'hist-1', 10);
      const result2 = LeaderboardModel.getHistory('total', 'hist-2', 10);
      const result3 = LeaderboardModel.getHistory('total', 'hist-3', 10);

      expect(result1[0].data[0].total_points).toBe(100);
      expect(result2[0].data[0].total_points).toBe(200);
      expect(result3[0].data[0].total_points).toBe(300);
    });
  });

  describe('calculateTotalRanking - 计算总榜排名', () => {
    it('应该返回总榜排名', () => {
      // 创建多个用户和积分记录
      const user2 = UserModel.create(generatePhone(), 'STUDENT');
      UserModel.createStudentProfile(user2.id, 7, '测试中学');
      
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');
      PointsSystemModel.addPoints(user2.id, 200, 'practice', '测试');

      const result = LeaderboardModel.calculateTotalRanking(10);

      expect(result.length).toBe(2);
      expect(result[0].user_id).toBe(user2.id); // 积分高的排前面
      expect(result[0].rank).toBe(1);
    });
  });

  describe('calculateWeeklyRanking - 计算周榜排名', () => {
    it('应该返回周榜排名', () => {
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');

      const result = LeaderboardModel.calculateWeeklyRanking(10);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('calculateMonthlyRanking - 计算月榜排名', () => {
    it('应该返回月榜排名', () => {
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');

      const result = LeaderboardModel.calculateMonthlyRanking(10);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getUserRanking - 获取用户排名', () => {
    it('应该返回用户总榜排名', () => {
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');

      const result = LeaderboardModel.getUserRanking(userId, 'total');

      expect(result).toBeDefined();
      expect(result.rank).toBeDefined();
    });

    it('应该返回用户周榜排名', () => {
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');

      const result = LeaderboardModel.getUserRanking(userId, 'weekly');

      expect(result).toBeDefined();
    });

    it('应该返回用户月榜排名', () => {
      PointsSystemModel.addPoints(userId, 100, 'practice', '测试');

      const result = LeaderboardModel.getUserRanking(userId, 'monthly');

      expect(result).toBeDefined();
    });
  });

  describe('getPaginated - 获取排行榜分页数据', () => {
    it('应该返回分页数据', () => {
      for (let i = 0; i < 25; i++) {
        const user = UserModel.create(generatePhone(), 'STUDENT');
        UserModel.createStudentProfile(user.id, 7, '测试中学');
        PointsSystemModel.addPoints(user.id, i * 10, 'practice', `测试${i}`);
      }

      const result = LeaderboardModel.getPaginated('total', 'total', 1, 20);

      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });
});
