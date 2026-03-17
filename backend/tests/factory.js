/**
 * 测试数据工厂 (Test Data Factory)
 * 用于快速创建测试所需的模拟数据
 */

const { v4: uuidv4 } = require('uuid');

// 生成唯一手机号
function generatePhone() {
  return `1${Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
}

// 生成 UUID
function generateId() {
  return uuidv4();
}

// 生成时间戳
function generateTimestamp(offset = 0) {
  return new Date(Date.now() - offset);
}

// 用户数据工厂
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

// 学生资料工厂
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

// 家长资料工厂
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

// 知识点工厂
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

// 学习进度工厂
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

// AI 问答记录工厂
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

// 知识掌握度工厂
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

// 教材工厂
function createTextbook(overrides = {}) {
  return {
    id: generateId(),
    title: `测试教材_${Math.floor(Math.random() * 10000)}`,
    subject: '数学',
    grade: 7,
    version: '人教版',
    file_size: 1024 * 1024, // 1MB
    units: '["第一单元：有理数","第二单元：整式","第三单元：一元一次方程"]',
    parse_status: 'PENDING',
    parse_result: null,
    created_at: generateTimestamp(),
    updated_at: generateTimestamp(),
    ...overrides
  };
}

// 帖子工厂
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

// 帖子评论工厂
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

// 练习会话工厂
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

// 题目工厂
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

// 答题记录工厂
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

// 积分明细工厂
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

// 验证码工厂
function createVerificationCode(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 1000000),
    phone: generatePhone(),
    code: '123456',
    purpose: 'LOGIN',
    expires_at: new Date(Date.now() + 300000), // 5 分钟后过期
    used: false,
    created_at: generateTimestamp(),
    ...overrides
  };
}

// 排行榜快照工厂
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
  createLeaderboardSnapshot
};
