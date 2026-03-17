/**
 * 测试工具库 (Test Utilities)
 * 提供测试所需的通用工具函数和助手
 * 
 * 包含：
 * - 测试数据工厂 (factories)
 * - 认证助手 (authHelper)
 * - 数据库清理 (dbCleaner)
 * - 断言助手 (assertions)
 */

const { v4: uuidv4 } = require('uuid');
const request = require('supertest');

// ============================================================================
// 测试数据工厂 (Factories)
// ============================================================================

/**
 * 生成唯一手机号
 */
function generatePhone() {
  return `1${Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
}

/**
 * 生成 UUID
 */
function generateId() {
  return uuidv4();
}

/**
 * 生成时间戳
 */
function generateTimestamp(offset = 0) {
  return new Date(Date.now() - offset);
}

/**
 * 用户数据工厂
 */
function createUser(overrides = {}) {
  return {
    id: generateId(),
    role: 'STUDENT',
    phone: generatePhone(),
    nickname: `测试用户_${Math.floor(Math.random() * 10000)}`,
    avatar_url: null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 学生资料工厂
 */
function createStudentProfile(overrides = {}) {
  return {
    user_id: generateId(),
    grade: 7,
    school_name: '测试中学',
    total_points: 0,
    streak_days: 0,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 家长资料工厂
 */
function createParentProfile(overrides = {}) {
  return {
    user_id: generateId(),
    real_name: '测试家长',
    verified_status: 'PENDING',
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 知识点工厂
 */
function createKnowledgePoint(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    title: `测试知识点_${Math.floor(Math.random() * 10000)}`,
    content: '这是测试知识点内容',
    category: '数学',
    tags: '代数，方程',
    status: 'ACTIVE',
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 学习进度工厂
 */
function createLearningProgress(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    knowledge_point_id: generateId(),
    study_duration: 0,
    completion_rate: 0,
    last_studied_at: null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * AI 问答记录工厂
 */
function createAIQARecord(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    question: '测试问题：什么是勾股定理？',
    answer: '勾股定理是一个基本的几何定理...',
    knowledge_point_id: null,
    created_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 知识掌握度工厂
 */
function createKnowledgeMastery(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    knowledge_point_id: generateId(),
    mastery_level: 0,
    last_reviewed_at: null,
    review_count: 0,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 教材工厂
 */
function createTextbook(overrides = {}) {
  return {
    id: generateId(),
    title: `测试教材_${Math.floor(Math.random() * 10000)}`,
    subject: '数学',
    grade: 7,
    version: '人教版',
    file_size: 1024 * 1024,
    units: '["第一单元：有理数","第二单元：整式","第三单元：一元一次方程"]',
    parse_status: 'PENDING',
    parse_result: null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 帖子工厂
 */
function createPost(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    title: `测试帖子_${Math.floor(Math.random() * 10000)}`,
    content: '这是测试帖子的内容',
    tags: '测试，交流',
    view_count: 0,
    like_count: 0,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 帖子评论工厂
 */
function createPostComment(overrides = {}) {
  return {
    id: generateId(),
    post_id: generateId(),
    user_id: generateId(),
    content: '这是测试评论',
    parent_comment_id: null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 练习会话工厂
 */
function createPracticeSession(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    textbook_id: generateId(),
    unit_id: 'unit_1',
    status: 'active',
    score: null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 题目工厂
 */
function createQuestion(overrides = {}) {
  return {
    id: generateId(),
    session_id: generateId(),
    type: 'multiple_choice',
    question: '测试题目：1 + 1 = ?',
    options: JSON.stringify(['A. 1', 'B. 2', 'C. 3', 'D. 4']),
    answer: 'B',
    explanation: '1 加 1 等于 2',
    order: 1,
    created_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 答题记录工厂
 */
function createAnswerRecord(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    question_id: generateId(),
    session_id: generateId(),
    answer: 'B',
    is_correct: true,
    created_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 积分明细工厂
 */
function createPointsLedger(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    amount: 10,
    reason: '答题奖励',
    balance: 100,
    created_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 验证码工厂
 */
function createVerificationCode(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 1000000),
    phone: generatePhone(),
    code: '123456',
    purpose: 'LOGIN',
    expires_at: new Date(Date.now() + 300000),
    used: false,
    created_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * 排行榜快照工厂
 */
function createLeaderboardSnapshot(overrides = {}) {
  return {
    id: generateId(),
    user_id: generateId(),
    rank: Math.floor(Math.random() * 100) + 1,
    total_points: Math.floor(Math.random() * 10000),
    snapshot_date: generateTimestamp(),
    created_at: generateTimestamp(),
    ...overrides
  };
}

/**
 * AI 任务日志工厂
 */
function createAiTaskLog(overrides = {}) {
  return {
    id: generateId(),
    task_type: 'question_generation',
    model: 'qwen-plus',
    input: '测试输入',
    output: '测试输出',
    status: 'success',
    tokens_used: 100,
    duration_ms: 1500,
    created_at: generateTimestamp(),
    ...overrides
  };
}

// ============================================================================
// 认证助手 (Auth Helper)
// ============================================================================

/**
 * 认证助手类
 * 用于在测试中管理用户认证和 token
 */
class AuthHelper {
  constructor(server) {
    this.server = server;
    this.tokens = new Map();
    this.users = new Map();
  }

  /**
   * 创建测试用户并登录
   */
  async createAndLogin(userData = {}) {
    const phone = userData.phone || generatePhone();
    const code = '123456'; // 测试模式通用验证码

    // 发送验证码
    await request(this.server)
      .post('/api/auth/send-code')
      .send({ phone });

    // 尝试登录（如果用户已存在）
    let loginRes = await request(this.server)
      .post('/api/auth/login')
      .send({ phone, code });

    // 如果用户不存在，则注册
    if (loginRes.statusCode === 401) {
      const registerData = {
        phone,
        code,
        role: userData.role || 'student',
        nickname: userData.nickname || `测试用户_${phone.slice(-4)}`,
        grade: userData.grade || '7',
        school_name: userData.school_name || '测试中学',
        ...userData
      };

      const registerRes = await request(this.server)
        .post('/api/auth/register')
        .send(registerData);

      if (registerRes.statusCode === 201) {
        this.tokens.set(phone, registerRes.body.token);
        this.users.set(phone, registerRes.body.user);
        return {
          token: registerRes.body.token,
          user: registerRes.body.user,
          phone
        };
      }
      throw new Error(`注册失败：${registerRes.body.error}`);
    }

    // 登录成功
    this.tokens.set(phone, loginRes.body.token);
    this.users.set(phone, loginRes.body.user);
    return {
      token: loginRes.body.token,
      user: loginRes.body.user,
      phone
    };
  }

  /**
   * 获取用户的认证头
   */
  getAuthHeader(phone) {
    const token = this.tokens.get(phone);
    if (!token) {
      throw new Error(`用户 ${phone} 未登录`);
    }
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * 获取已认证请求构建器
   */
  authenticatedRequest(phone) {
    const headers = this.getAuthHeader(phone);
    return request(this.server).set(headers);
  }

  /**
   * 登出用户
   */
  logout(phone) {
    this.tokens.delete(phone);
    this.users.delete(phone);
  }

  /**
   * 清理所有用户
   */
  cleanup() {
    this.tokens.clear();
    this.users.clear();
  }
}

// ============================================================================
// 数据库清理 (DB Cleaner)
// ============================================================================

/**
 * 数据库清理助手
 * 用于在测试前后清理数据库状态
 */
class DbCleaner {
  constructor(db) {
    this.db = db;
    this.cleanupOrder = [
      'answer_records',
      'questions',
      'practice_sessions',
      'points_ledger',
      'ai_qa_records',
      'knowledge_mastery',
      'learning_progress',
      'knowledge_points',
      'textbooks',
      'posts_comments',
      'posts',
      'student_profiles',
      'parent_profiles',
      'users'
    ];
  }

  /**
   * 清理所有测试数据
   */
  async cleanupAll() {
    if (!this.db) return;

    for (const table of this.cleanupOrder) {
      try {
        this.db.prepare(`DELETE FROM ${table}`).run();
      } catch (error) {
        // 忽略表不存在的错误
        if (!error.message.includes('no such table')) {
          console.warn(`清理表 ${table} 失败:`, error.message);
        }
      }
    }
  }

  /**
   * 清理特定表
   */
  async cleanupTable(tableName) {
    if (!this.db) return;
    try {
      this.db.prepare(`DELETE FROM ${tableName}`).run();
    } catch (error) {
      if (!error.message.includes('no such table')) {
        console.warn(`清理表 ${tableName} 失败:`, error.message);
      }
    }
  }

  /**
   * 清理特定用户的数据
   */
  async cleanupUser(userId) {
    if (!this.db) return;

    const userTables = [
      'answer_records',
      'points_ledger',
      'ai_qa_records',
      'knowledge_mastery',
      'learning_progress',
      'knowledge_points',
      'student_profiles',
      'parent_profiles'
    ];

    for (const table of userTables) {
      try {
        this.db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
      } catch (error) {
        // 忽略错误
      }
    }
  }
}

// ============================================================================
// 断言助手 (Assertions)
// ============================================================================

/**
 * 断言助手
 * 提供常用的测试断言函数
 */
const assertions = {
  /**
   * 断言响应是成功的 API 响应
   */
  assertSuccessResponse(res, expectedStatus = 200) {
    expect(res.statusCode).toBe(expectedStatus);
    expect(res.body).toBeDefined();
  },

  /**
   * 断言响应是错误响应
   */
  assertErrorResponse(res, expectedStatus = 400) {
    expect(res.statusCode).toBe(expectedStatus);
    expect(res.body).toHaveProperty('error');
  },

  /**
   * 断言响应包含所需字段
   */
  assertHasFields(obj, fields) {
    for (const field of fields) {
      expect(obj).toHaveProperty(field);
    }
  },

  /**
   * 断言用户对象包含标准字段
   */
  assertValidUser(user) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('phone');
    expect(['STUDENT', 'PARENT', 'TEACHER', 'ADMIN']).toContain(user.role);
  },

  /**
   * 断言知识点对象包含标准字段
   */
  assertValidKnowledgePoint(kp) {
    expect(kp).toHaveProperty('id');
    expect(kp).toHaveProperty('title');
    expect(kp).toHaveProperty('content');
    expect(kp).toHaveProperty('status');
  },

  /**
   * 断言练习会话对象包含标准字段
   */
  assertValidPracticeSession(session) {
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('user_id');
    expect(session).toHaveProperty('textbook_id');
    expect(session).toHaveProperty('status');
    expect(['active', 'completed', 'cancelled']).toContain(session.status);
  },

  /**
   * 断言题目对象包含标准字段
   */
  assertValidQuestion(question) {
    expect(question).toHaveProperty('id');
    expect(question).toHaveProperty('session_id');
    expect(question).toHaveProperty('type');
    expect(question).toHaveProperty('question');
    expect(question).toHaveProperty('answer');
  },

  /**
   * 断言积分记录包含标准字段
   */
  assertValidPointsLedger(record) {
    expect(record).toHaveProperty('id');
    expect(record).toHaveProperty('user_id');
    expect(record).toHaveProperty('amount');
    expect(record).toHaveProperty('reason');
    expect(record).toHaveProperty('balance');
  },

  /**
   * 断言 AI 响应格式正确
   */
  assertValidAIResponse(response, expectedFields = ['success']) {
    expect(response).toBeDefined();
    for (const field of expectedFields) {
      expect(response).toHaveProperty(field);
    }
  },

  /**
   * 断言数组非空
   */
  assertNonEmptyArray(arr) {
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBeGreaterThan(0);
  },

  /**
   * 断言时间戳有效
   */
  assertValidTimestamp(timestamp) {
    expect(timestamp).toBeDefined();
    const date = new Date(timestamp);
    expect(date.getTime()).not.toBeNaN();
  }
};

// ============================================================================
// 测试模板助手
// ============================================================================

/**
 * 创建标准 API 测试模板
 */
function createApiTestTemplate(options) {
  const {
    name,
    endpoint,
    method = 'get',
    authRequired = false,
    testCases = []
  } = options;

  return {
    name,
    endpoint,
    method,
    authRequired,
    testCases
  };
}

// ============================================================================
// 导出
// ============================================================================

module.exports = {
  // 基础生成器
  generateId,
  generatePhone,
  generateTimestamp,

  // 数据工厂
  createUser,
  createStudentProfile,
  createParentProfile,
  createKnowledgePoint,
  createLearningProgress,
  createAIQARecord,
  createKnowledgeMastery,
  createTextbook,
  createPost,
  createPostComment,
  createPracticeSession,
  createQuestion,
  createAnswerRecord,
  createPointsLedger,
  createVerificationCode,
  createLeaderboardSnapshot,
  createAiTaskLog,

  // 助手类
  AuthHelper,
  DbCleaner,

  // 断言助手
  assertions,

  // 模板助手
  createApiTestTemplate
};
