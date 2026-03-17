/**
 * 模型层综合测试
 * 覆盖所有 Model 文件：User, KnowledgePoint, LearningProgress, PracticeSession, AIQARecord
 * 目标：模型层覆盖率 100%
 */

const { db } = require('../src/config/database');
const UserModel = require('../src/models/User');
const KnowledgePointModel = require('../src/models/KnowledgePoint');
const LearningProgressModel = require('../src/models/LearningProgress');
const PracticeSessionModel = require('../src/models/PracticeSession');
const AIQARecordModel = require('../src/models/AIQARecord');
const verificationService = require('../src/services/verificationService');

const { v4: uuidv4 } = require('uuid');

// 生成唯一手机号
function generatePhone() {
  return `1${Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
}

// 清理数据库
function cleanupAll() {
  const tables = [
    'answer_records',
    'questions',
    'practice_sessions',
    'ai_qa_records',
    'knowledge_mastery',
    'learning_progress',
    'knowledge_points',
    'student_profiles',
    'parent_profiles',
    'verification_codes',
    'users'
  ];
  
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch (e) {
      // 忽略表不存在的错误
    }
  }
}

beforeEach(() => {
  cleanupAll();
});

// ============================================================================
// UserModel 测试
// ============================================================================

describe('UserModel', () => {
  describe('create', () => {
    it('应该创建新用户', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT', '测试用户');

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.phone).toBe(phone);
      expect(user.role).toBe('STUDENT');
      expect(user.nickname).toBe('测试用户');
    });

    it('应该创建不带昵称的用户', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'PARENT');

      expect(user).toBeDefined();
      expect(user.phone).toBe(phone);
      expect(user.role).toBe('PARENT');
    });
  });

  describe('getById', () => {
    it('应该通过 ID 获取用户', () => {
      const phone = generatePhone();
      const created = UserModel.create(phone, 'STUDENT');
      
      const user = UserModel.getById(created.id);

      expect(user).toBeDefined();
      expect(user.id).toBe(created.id);
      expect(user.phone).toBe(phone);
    });

    it('应该返回 null 当用户不存在', () => {
      const user = UserModel.getById('non-existent-id');
      expect(user).toBeUndefined();
    });
  });

  describe('getByPhone', () => {
    it('应该通过手机号获取用户', () => {
      const phone = generatePhone();
      const created = UserModel.create(phone, 'STUDENT');
      
      const user = UserModel.getByPhone(phone);

      expect(user).toBeDefined();
      expect(user.id).toBe(created.id);
    });

    it('应该返回 undefined 当用户不存在', () => {
      const user = UserModel.getByPhone('19999999999');
      expect(user).toBeUndefined();
    });
  });

  describe('update', () => {
    it('应该更新用户信息', () => {
      const phone = generatePhone();
      const created = UserModel.create(phone, 'STUDENT', '旧昵称');
      
      const updated = UserModel.update(created.id, {
        nickname: '新昵称',
        avatar_url: 'http://example.com/avatar.jpg'
      });

      expect(updated).toBeDefined();
      expect(updated.nickname).toBe('新昵称');
      expect(updated.avatar_url).toBe('http://example.com/avatar.jpg');
    });

    it('应该更新部分字段', () => {
      const phone = generatePhone();
      const created = UserModel.create(phone, 'STUDENT', '昵称');
      
      const updated = UserModel.update(created.id, {
        nickname: '新昵称'
      });

      expect(updated.nickname).toBe('新昵称');
    });
  });

  describe('createStudentProfile', () => {
    it('应该创建学生资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT');
      
      const profile = UserModel.createStudentProfile(user.id, 7, '测试中学');

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(user.id);
      expect(profile.grade).toBe(7);
      expect(profile.school_name).toBe('测试中学');
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

  describe('getStudentProfile', () => {
    it('应该获取学生资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'STUDENT');
      const created = UserModel.createStudentProfile(user.id, 7, '测试中学');
      
      const profile = UserModel.getStudentProfile(user.id);

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(user.id);
    });

    it('应该返回 undefined 当资料不存在', () => {
      const profile = UserModel.getStudentProfile('non-existent');
      expect(profile).toBeUndefined();
    });
  });

  describe('createParentProfile', () => {
    it('应该创建家长资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'PARENT');
      
      const profile = UserModel.createParentProfile(user.id, '张三');

      expect(profile).toBeDefined();
      expect(profile.user_id).toBe(user.id);
      expect(profile.real_name).toBe('张三');
    });
  });

  describe('getParentProfile', () => {
    it('应该获取家长资料', () => {
      const phone = generatePhone();
      const user = UserModel.create(phone, 'PARENT');
      UserModel.createParentProfile(user.id, '张三');
      
      const profile = UserModel.getParentProfile(user.id);

      expect(profile).toBeDefined();
      expect(profile.real_name).toBe('张三');
    });
  });

  describe('getUserWithProfile', () => {
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

  describe('saveVerificationCode', () => {
    it('应该保存验证码', () => {
      const phone = generatePhone();
      UserModel.saveVerificationCode(phone, '123456', 'login', 5);

      const code = db.prepare('SELECT * FROM verification_codes WHERE phone = ?').get(phone);
      expect(code).toBeDefined();
      expect(code.code).toBe('123456');
      expect(code.purpose).toBe('login');
    });
  });

  describe('verifyCode', () => {
    it('应该验证正确的验证码', () => {
      const phone = generatePhone();
      const expiresAt = new Date(Date.now() + 300000).toISOString();
      
      db.prepare(`
        INSERT INTO verification_codes (phone, code, purpose, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(phone, '123456', 'login', expiresAt);

      const result = UserModel.verifyCode(phone, '123456', 'login');
      expect(result).toBeDefined();
      expect(result.code).toBe('123456');
    });

    it('应该拒绝错误的验证码', () => {
      const phone = generatePhone();
      const result = UserModel.verifyCode(phone, 'wrong', 'login');
      expect(result).toBeUndefined();
    });

    it('应该拒绝过期的验证码', () => {
      const phone = generatePhone();
      const expiresAt = new Date(Date.now() - 300000).toISOString();
      
      db.prepare(`
        INSERT INTO verification_codes (phone, code, purpose, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(phone, '123456', 'login', expiresAt);

      const result = UserModel.verifyCode(phone, '123456', 'login');
      expect(result).toBeUndefined();
    });
  });

  describe('markCodeAsUsed', () => {
    it('应该标记验证码为已使用', () => {
      const phone = generatePhone();
      const expiresAt = new Date(Date.now() + 300000).toISOString();
      
      db.prepare(`
        INSERT INTO verification_codes (phone, code, purpose, expires_at, used)
        VALUES (?, ?, ?, ?, 0)
      `).run(phone, '123456', 'login', expiresAt);

      const code = db.prepare('SELECT * FROM verification_codes WHERE phone = ?').get(phone);
      UserModel.markCodeAsUsed(code.id);

      const updated = db.prepare('SELECT * FROM verification_codes WHERE id = ?').get(code.id);
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

  describe('create', () => {
    it('应该创建知识点', () => {
      const point = KnowledgePointModel.create(
        userId,
        '勾股定理',
        '直角三角形两直角边的平方和等于斜边的平方',
        '数学',
        ['几何', '三角形']
      );

      expect(point).toBeDefined();
      expect(point.id).toBeDefined();
      expect(point.user_id).toBe(userId);
      expect(point.title).toBe('勾股定理');
      expect(point.category).toBe('数学');
      expect(point.status).toBe('ACTIVE');
    });

    it('应该创建不带分类的知识点', () => {
      const point = KnowledgePointModel.create(
        userId,
        '测试知识点',
        '内容'
      );

      expect(point).toBeDefined();
      expect(point.title).toBe('测试知识点');
    });
  });

  describe('getById', () => {
    it('应该通过 ID 获取知识点', () => {
      const created = KnowledgePointModel.create(userId, '测试', '内容');
      
      const point = KnowledgePointModel.getById(created.id);

      expect(point).toBeDefined();
      expect(point.id).toBe(created.id);
    });

    it('应该返回 undefined 当知识点不存在', () => {
      const point = KnowledgePointModel.getById('non-existent');
      expect(point).toBeUndefined();
    });
  });

  describe('getByUserId', () => {
    it('应该获取用户的知识点列表', () => {
      KnowledgePointModel.create(userId, '知识点 1', '内容 1');
      KnowledgePointModel.create(userId, '知识点 2', '内容 2');
      
      const points = KnowledgePointModel.getByUserId(userId);

      expect(points).toBeDefined();
      expect(points.length).toBe(2);
    });

    it('应该支持分类过滤', () => {
      KnowledgePointModel.create(userId, '数学知识点', '内容', '数学');
      KnowledgePointModel.create(userId, '物理知识点', '内容', '物理');
      
      const mathPoints = KnowledgePointModel.getByUserId(userId, { category: '数学' });

      expect(mathPoints.length).toBe(1);
      expect(mathPoints[0].category).toBe('数学');
    });

    it('应该支持状态过滤', () => {
      KnowledgePointModel.create(userId, '活跃知识点', '内容', '数学', null, 'ACTIVE');
      KnowledgePointModel.create(userId, '归档知识点', '内容', '数学', null, 'ARCHIVED');
      
      const activePoints = KnowledgePointModel.getByUserId(userId, { status: 'ACTIVE' });

      expect(activePoints.length).toBe(1);
      expect(activePoints[0].status).toBe('ACTIVE');
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 5; i++) {
        KnowledgePointModel.create(userId, `知识点${i}`, `内容${i}`);
      }
      
      const points = KnowledgePointModel.getByUserId(userId, { limit: 2, offset: 0 });

      expect(points.length).toBe(2);
    });
  });

  describe('update', () => {
    it('应该更新知识点', () => {
      const created = KnowledgePointModel.create(userId, '原标题', '原内容');
      
      const updated = KnowledgePointModel.update(created.id, userId, {
        title: '新标题',
        content: '新内容'
      });

      expect(updated.title).toBe('新标题');
      expect(updated.content).toBe('新内容');
    });

    it('应该拒绝更新不存在的知识点', () => {
      expect(() => {
        KnowledgePointModel.update('non-existent', userId, { title: '新标题' });
      }).toThrow('知识点不存在或无权访问');
    });

    it('应该拒绝更新他人的知识点', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const created = KnowledgePointModel.create(otherUser.id, '测试', '内容');
      
      expect(() => {
        KnowledgePointModel.update(created.id, userId, { title: '新标题' });
      }).toThrow('知识点不存在或无权访问');
    });
  });

  describe('delete', () => {
    it('应该删除知识点', () => {
      const created = KnowledgePointModel.create(userId, '测试', '内容');
      
      KnowledgePointModel.delete(created.id, userId);
      
      const point = KnowledgePointModel.getById(created.id);
      expect(point).toBeUndefined();
    });

    it('应该拒绝删除他人的知识点', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const created = KnowledgePointModel.create(otherUser.id, '测试', '内容');
      
      expect(() => {
        KnowledgePointModel.delete(created.id, userId);
      }).toThrow('知识点不存在或无权访问');
    });
  });

  describe('search', () => {
    it('应该搜索知识点', () => {
      KnowledgePointModel.create(userId, '勾股定理', '直角三角形相关内容', '数学', ['几何']);
      KnowledgePointModel.create(userId, '三角函数', '三角函数相关内容', '数学', ['几何']);
      
      const results = KnowledgePointModel.search(userId, '三角形');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('勾股定理');
    });

    it('应该搜索标签', () => {
      KnowledgePointModel.create(userId, '知识点 1', '内容', '数学', ['几何', '三角形']);
      KnowledgePointModel.create(userId, '知识点 2', '内容', '物理', ['力学']);
      
      const results = KnowledgePointModel.search(userId, '几何');

      expect(results.length).toBe(1);
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

  describe('createOrUpdate', () => {
    it('应该创建学习进度', () => {
      const progress = LearningProgressModel.createOrUpdate(
        userId,
        knowledgePointId,
        30,
        0.5
      );

      expect(progress).toBeDefined();
      expect(progress.user_id).toBe(userId);
      expect(progress.knowledge_point_id).toBe(knowledgePointId);
      expect(progress.study_duration).toBe(30);
      expect(progress.completion_rate).toBe(0.5);
    });

    it('应该更新已存在的学习进度', () => {
      LearningProgressModel.createOrUpdate(userId, knowledgePointId, 30, 0.5);
      const updated = LearningProgressModel.createOrUpdate(userId, knowledgePointId, 60, 0.8);

      expect(updated.study_duration).toBe(60);
      expect(updated.completion_rate).toBe(0.8);
    });
  });

  describe('getByUserId', () => {
    it('应该获取用户的学习进度列表', () => {
      const kp2 = KnowledgePointModel.create(userId, '知识点 2', '内容 2');
      
      LearningProgressModel.createOrUpdate(userId, knowledgePointId, 30, 0.5);
      LearningProgressModel.createOrUpdate(userId, kp2.id, 60, 0.8);
      
      const progresses = LearningProgressModel.getByUserId(userId);

      expect(progresses.length).toBe(2);
    });
  });

  describe('getByKnowledgePointId', () => {
    it('应该获取知识点的学习进度', () => {
      LearningProgressModel.createOrUpdate(userId, knowledgePointId, 30, 0.5);
      
      const progress = LearningProgressModel.getByKnowledgePointId(knowledgePointId);

      expect(progress).toBeDefined();
      expect(progress.knowledge_point_id).toBe(knowledgePointId);
    });
  });

  describe('updateCompletionRate', () => {
    it('应该更新完成率', () => {
      LearningProgressModel.createOrUpdate(userId, knowledgePointId, 30, 0.5);
      
      const updated = LearningProgressModel.updateCompletionRate(
        userId,
        knowledgePointId,
        1.0
      );

      expect(updated.completion_rate).toBe(1.0);
    });
  });

  describe('incrementStudyDuration', () => {
    it('应该增加学习时长', () => {
      LearningProgressModel.createOrUpdate(userId, knowledgePointId, 30, 0.5);
      
      const updated = LearningProgressModel.incrementStudyDuration(
        userId,
        knowledgePointId,
        15
      );

      expect(updated.study_duration).toBe(45);
    });
  });
});

// ============================================================================
// PracticeSessionModel 测试
// ============================================================================

describe('PracticeSessionModel', () => {
  let userId;

  beforeEach(() => {
    const phone = generatePhone();
    const user = UserModel.create(phone, 'STUDENT');
    userId = user.id;
  });

  describe('create', () => {
    it('应该创建练习会话', async () => {
      const session = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1',
        status: 'active'
      });

      expect(session).toBeDefined();
      expect(session.user_id).toBe(userId);
      expect(session.textbook_id).toBe('book-1');
      expect(session.unit_id).toBe('unit-1');
      expect(session.status).toBe('active');
    });
  });

  describe('getById', () => {
    it('应该通过 ID 获取会话', async () => {
      const created = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      const session = await PracticeSessionModel.getById(created.id, userId);

      expect(session).toBeDefined();
      expect(session.id).toBe(created.id);
    });

    it('应该返回 null 当会话不存在', async () => {
      const session = await PracticeSessionModel.getById('non-existent', userId);
      expect(session).toBeNull();
    });

    it('应该返回 null 当无权访问', async () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const created = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      const session = await PracticeSessionModel.getById(created.id, otherUser.id);
      expect(session).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('应该获取用户的会话列表', async () => {
      await PracticeSessionModel.create(userId, { textbookId: 'book-1', unitId: 'unit-1' });
      await PracticeSessionModel.create(userId, { textbookId: 'book-2', unitId: 'unit-2' });
      
      const sessions = await PracticeSessionModel.getByUserId(userId);

      expect(sessions.length).toBe(2);
    });

    it('应该支持状态过滤', async () => {
      await PracticeSessionModel.create(userId, { textbookId: 'book-1', status: 'active' });
      await PracticeSessionModel.create(userId, { textbookId: 'book-2', status: 'completed' });
      
      const activeSessions = await PracticeSessionModel.getByUserId(userId, { status: 'active' });

      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0].status).toBe('active');
    });
  });

  describe('update', () => {
    it('应该更新会话', async () => {
      const created = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      const updated = await PracticeSessionModel.update(created.id, userId, {
        status: 'completed',
        score: 90
      });

      expect(updated.status).toBe('completed');
      expect(updated.score).toBe(90);
    });

    it('应该拒绝更新不存在的会话', async () => {
      await expect(
        PracticeSessionModel.update('non-existent', userId, { status: 'completed' })
      ).rejects.toThrow('会话不存在或无权访问');
    });
  });

  describe('remove', () => {
    it('应该删除会话', async () => {
      const created = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      await PracticeSessionModel.remove(created.id, userId);
      
      const session = await PracticeSessionModel.getById(created.id, userId);
      expect(session).toBeNull();
    });
  });

  describe('createQuestion', () => {
    it('应该添加问题到会话', async () => {
      const session = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      const question = await PracticeSessionModel.createQuestion(session.id, {
        type: 'multiple_choice',
        question: '1+1=?',
        options: ['A.1', 'B.2', 'C.3', 'D.4'],
        answer: 'B',
        explanation: '简单加法',
        order: 1
      });

      expect(question).toBeDefined();
      expect(question.session_id).toBe(session.id);
      expect(question.type).toBe('multiple_choice');
    });
  });

  describe('createAnswerRecord', () => {
    it('应该创建答题记录', async () => {
      const session = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      const question = await PracticeSessionModel.createQuestion(session.id, {
        type: 'multiple_choice',
        question: '1+1=?',
        answer: 'B'
      });
      
      const record = await PracticeSessionModel.createAnswerRecord(
        userId,
        question.id,
        session.id,
        { answer: 'B', isCorrect: true }
      );

      expect(record).toBeDefined();
      expect(record.user_id).toBe(userId);
      expect(record.question_id).toBe(question.id);
      expect(record.is_correct).toBe(1);
    });
  });

  describe('getAnswerRecordsByUserId', () => {
    it('应该获取用户的答题记录', async () => {
      const session = await PracticeSessionModel.create(userId, {
        textbookId: 'book-1',
        unitId: 'unit-1'
      });
      
      const question = await PracticeSessionModel.createQuestion(session.id, {
        type: 'multiple_choice',
        question: '1+1=?',
        answer: 'B'
      });
      
      await PracticeSessionModel.createAnswerRecord(
        userId,
        question.id,
        session.id,
        { answer: 'B', isCorrect: true }
      );
      
      const records = await PracticeSessionModel.getAnswerRecordsByUserId(userId, session.id);

      expect(records.length).toBe(1);
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

  describe('create', () => {
    it('应该创建问答记录', () => {
      const record = AIQARecordModel.create(
        userId,
        '什么是勾股定理？',
        '勾股定理是一个基本的几何定理...',
        null
      );

      expect(record).toBeDefined();
      expect(record.user_id).toBe(userId);
      expect(record.question).toBe('什么是勾股定理？');
      expect(record.answer).toBe('勾股定理是一个基本的几何定理...');
    });

    it('应该创建带知识点的问答记录', () => {
      const kp = KnowledgePointModel.create(userId, '勾股定理', '内容');
      
      const record = AIQARecordModel.create(
        userId,
        '问题',
        '答案',
        kp.id
      );

      expect(record.knowledge_point_id).toBe(kp.id);
    });
  });

  describe('getById', () => {
    it('应该通过 ID 获取记录', () => {
      const created = AIQARecordModel.create(userId, '问题', '答案');
      
      const record = AIQARecordModel.getById(created.id);

      expect(record).toBeDefined();
      expect(record.id).toBe(created.id);
    });
  });

  describe('getByUserId', () => {
    it('应该获取用户的问答记录列表', () => {
      AIQARecordModel.create(userId, '问题 1', '答案 1');
      AIQARecordModel.create(userId, '问题 2', '答案 2');
      
      const records = AIQARecordModel.getByUserId(userId, 50, 0);

      expect(records.length).toBe(2);
    });

    it('应该支持分页', () => {
      for (let i = 0; i < 5; i++) {
        AIQARecordModel.create(userId, `问题${i}`, `答案${i}`);
      }
      
      const records = AIQARecordModel.getByUserId(userId, 2, 0);

      expect(records.length).toBe(2);
    });
  });

  describe('search', () => {
    it('应该搜索问答记录', () => {
      AIQARecordModel.create(userId, '什么是勾股定理？', '勾股定理...');
      AIQARecordModel.create(userId, '什么是三角函数？', '三角函数...');
      
      const results = AIQARecordModel.search(userId, '勾股');

      expect(results.length).toBe(1);
      expect(results[0].question).toContain('勾股');
    });
  });

  describe('delete', () => {
    it('应该删除问答记录', () => {
      const created = AIQARecordModel.create(userId, '问题', '答案');
      
      AIQARecordModel.delete(created.id, userId);
      
      const record = AIQARecordModel.getById(created.id);
      expect(record).toBeUndefined();
    });

    it('应该拒绝删除他人的记录', () => {
      const otherUser = UserModel.create(generatePhone(), 'STUDENT');
      const created = AIQARecordModel.create(otherUser.id, '问题', '答案');
      
      expect(() => {
        AIQARecordModel.delete(created.id, userId);
      }).toThrow('无权访问');
    });
  });
});
