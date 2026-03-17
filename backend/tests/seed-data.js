/**
 * 测试数据种子 (Seed Data)
 * 
 * 用于在测试环境中预置标准测试数据
 * 支持快速搭建测试场景
 * 
 * 使用方法：
 * const seedData = require('./seed-data');
 * await seedData.seedAll(db);
 */

const { v4: uuidv4 } = require('uuid');

// ============================================================================
// 数据生成工具
// ============================================================================

function generateId() {
  return uuidv4();
}

function generatePhone() {
  return `1${Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
}

function now() {
  return new Date();
}

// ============================================================================
// 标准测试用户
// ============================================================================

/**
 * 标准测试用户集合
 */
const TEST_USERS = {
  // 学生用户
  student1: {
    id: generateId(),
    phone: '13800000001',
    nickname: '测试学生 1 号',
    role: 'STUDENT',
    avatar_url: null,
    created_at: now(),
    updated_at: now()
  },
  
  student2: {
    id: generateId(),
    phone: '13800000002',
    nickname: '测试学生 2 号',
    role: 'STUDENT',
    avatar_url: null,
    created_at: now(),
    updated_at: now()
  },
  
  student3: {
    id: generateId(),
    phone: '13800000003',
    nickname: '测试学生 3 号',
    role: 'STUDENT',
    avatar_url: null,
    created_at: now(),
    updated_at: now()
  },
  
  // 家长用户
  parent1: {
    id: generateId(),
    phone: '13900000001',
    nickname: '测试家长 1 号',
    role: 'PARENT',
    avatar_url: null,
    created_at: now(),
    updated_at: now()
  },
  
  // 教师用户
  teacher1: {
    id: generateId(),
    phone: '13700000001',
    nickname: '测试教师 1 号',
    role: 'TEACHER',
    avatar_url: null,
    created_at: now(),
    updated_at: now()
  },
  
  // 管理员用户
  admin1: {
    id: generateId(),
    phone: '13600000001',
    nickname: '测试管理员',
    role: 'ADMIN',
    avatar_url: null,
    created_at: now(),
    updated_at: now()
  }
};

/**
 * 学生资料
 */
const STUDENT_PROFILES = {
  student1_profile: {
    user_id: TEST_USERS.student1.id,
    grade: 7,
    school_name: '北京市测试中学',
    total_points: 1000,
    streak_days: 7,
    created_at: now(),
    updated_at: now()
  },
  
  student2_profile: {
    user_id: TEST_USERS.student2.id,
    grade: 8,
    school_name: '上海市测试中学',
    total_points: 2500,
    streak_days: 15,
    created_at: now(),
    updated_at: now()
  },
  
  student3_profile: {
    user_id: TEST_USERS.student3.id,
    grade: 9,
    school_name: '广州市测试中学',
    total_points: 500,
    streak_days: 3,
    created_at: now(),
    updated_at: now()
  }
};

/**
 * 家长资料
 */
const PARENT_PROFILES = {
  parent1_profile: {
    user_id: TEST_USERS.parent1.id,
    real_name: '张三',
    verified_status: 'VERIFIED',
    child_user_id: TEST_USERS.student1.id,
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 教材数据
// ============================================================================

/**
 * 标准教材
 */
const TEXTBOOKS = {
  math_grade7: {
    id: generateId(),
    title: '人教版七年级数学上册',
    subject: '数学',
    grade: 7,
    version: '人教版',
    file_size: 2048576,
    units: JSON.stringify([
      '第一单元：有理数',
      '第二单元：整式的加减',
      '第三单元：一元一次方程',
      '第四单元：几何图形初步'
    ]),
    parse_status: 'COMPLETED',
    parse_result: JSON.stringify({
      totalUnits: 4,
      totalChapters: 16,
      parsedAt: now().toISOString()
    }),
    created_at: now(),
    updated_at: now()
  },
  
  math_grade8: {
    id: generateId(),
    title: '人教版八年级数学上册',
    subject: '数学',
    grade: 8,
    version: '人教版',
    file_size: 2359296,
    units: JSON.stringify([
      '第一单元：三角形',
      '第二单元：全等三角形',
      '第三单元：轴对称',
      '第四单元：整式的乘法与因式分解'
    ]),
    parse_status: 'COMPLETED',
    parse_result: JSON.stringify({
      totalUnits: 4,
      totalChapters: 15,
      parsedAt: now().toISOString()
    }),
    created_at: now(),
    updated_at: now()
  },
  
  english_grade7: {
    id: generateId(),
    title: '人教版七年级英语上册',
    subject: '英语',
    grade: 7,
    version: '人教版',
    file_size: 1835008,
    units: JSON.stringify([
      'Unit 1: My name\\'s Gina',
      'Unit 2: This is my sister',
      'Unit 3: Is this your pencil?',
      'Unit 4: Where\\'s my schoolbag?'
    ]),
    parse_status: 'COMPLETED',
    parse_result: JSON.stringify({
      totalUnits: 4,
      totalChapters: 12,
      parsedAt: now().toISOString()
    }),
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 知识点数据
// ============================================================================

/**
 * 标准知识点
 */
const KNOWLEDGE_POINTS = {
  // 七年级数学知识点
  kp_math_7_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    title: '正数和负数的概念',
    content: '正数是大于 0 的数，负数是小于 0 的数。0 既不是正数也不是负数。',
    category: '数学',
    tags: '有理数，正数，负数',
    textbook_id: TEXTBOOKS.math_grade7.id,
    unit: '第一单元：有理数',
    status: 'ACTIVE',
    created_at: now(),
    updated_at: now()
  },
  
  kp_math_7_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    title: '数轴的三要素',
    content: '数轴的三要素：原点、正方向、单位长度。',
    category: '数学',
    tags: '有理数，数轴',
    textbook_id: TEXTBOOKS.math_grade7.id,
    unit: '第一单元：有理数',
    status: 'ACTIVE',
    created_at: now(),
    updated_at: now()
  },
  
  kp_math_7_3: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    title: '相反数的定义',
    content: '只有符号不同的两个数叫做互为相反数。a 的相反数是 -a。',
    category: '数学',
    tags: '有理数，相反数',
    textbook_id: TEXTBOOKS.math_grade7.id,
    unit: '第一单元：有理数',
    status: 'ACTIVE',
    created_at: now(),
    updated_at: now()
  },
  
  kp_math_7_4: {
    id: generateId(),
    user_id: TEST_USERS.student2.id,
    title: '一元一次方程的解法',
    content: '解一元一次方程的基本步骤：去分母、去括号、移项、合并同类项、系数化为 1。',
    category: '数学',
    tags: '方程，一元一次方程',
    textbook_id: TEXTBOOKS.math_grade7.id,
    unit: '第三单元：一元一次方程',
    status: 'ACTIVE',
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 学习进度数据
// ============================================================================

/**
 * 学习进度
 */
const LEARNING_PROGRESS = {
  progress_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_1.id,
    study_duration: 1800, // 30 分钟
    completion_rate: 100,
    last_studied_at: now(),
    created_at: now(),
    updated_at: now()
  },
  
  progress_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_2.id,
    study_duration: 900, // 15 分钟
    completion_rate: 50,
    last_studied_at: now(),
    created_at: now(),
    updated_at: now()
  },
  
  progress_3: {
    id: generateId(),
    user_id: TEST_USERS.student2.id,
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_4.id,
    study_duration: 2700, // 45 分钟
    completion_rate: 75,
    last_studied_at: now(),
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 知识掌握度数据
// ============================================================================

/**
 * 知识掌握度
 */
const KNOWLEDGE_MASTERY = {
  mastery_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_1.id,
    mastery_level: 5, // 1-5 级
    last_reviewed_at: now(),
    review_count: 10,
    created_at: now(),
    updated_at: now()
  },
  
  mastery_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_2.id,
    mastery_level: 3,
    last_reviewed_at: now(),
    review_count: 5,
    created_at: now(),
    updated_at: now()
  },
  
  mastery_3: {
    id: generateId(),
    user_id: TEST_USERS.student2.id,
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_4.id,
    mastery_level: 4,
    last_reviewed_at: now(),
    review_count: 8,
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 练习会话数据
// ============================================================================

/**
 * 练习会话
 */
const PRACTICE_SESSIONS = {
  session_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    textbook_id: TEXTBOOKS.math_grade7.id,
    unit_id: 'unit_1',
    status: 'completed',
    score: 85,
    total_questions: 10,
    correct_answers: 8,
    started_at: now(),
    completed_at: now(),
    created_at: now(),
    updated_at: now()
  },
  
  session_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    textbook_id: TEXTBOOKS.math_grade7.id,
    unit_id: 'unit_2',
    status: 'active',
    score: null,
    total_questions: 10,
    correct_answers: 0,
    started_at: now(),
    completed_at: null,
    created_at: now(),
    updated_at: now()
  },
  
  session_3: {
    id: generateId(),
    user_id: TEST_USERS.student2.id,
    textbook_id: TEXTBOOKS.math_grade8.id,
    unit_id: 'unit_1',
    status: 'completed',
    score: 92,
    total_questions: 10,
    correct_answers: 9,
    started_at: now(),
    completed_at: now(),
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 题目数据
// ============================================================================

/**
 * 练习题目
 */
const QUESTIONS = {
  question_1: {
    id: generateId(),
    session_id: PRACTICE_SESSIONS.session_1.id,
    type: 'multiple_choice',
    question: '下列哪个数是正数？',
    options: JSON.stringify(['A. -5', 'B. 0', 'C. 3', 'D. -1']),
    answer: 'C',
    explanation: '正数是大于 0 的数，3 是正数。',
    order: 1,
    created_at: now()
  },
  
  question_2: {
    id: generateId(),
    session_id: PRACTICE_SESSIONS.session_1.id,
    type: 'multiple_choice',
    question: '-3 的相反数是？',
    options: JSON.stringify(['A. -3', 'B. 3', 'C. 0', 'D. 1/3']),
    answer: 'B',
    explanation: '只有符号不同的两个数互为相反数，-3 的相反数是 3。',
    order: 2,
    created_at: now()
  },
  
  question_3: {
    id: generateId(),
    session_id: PRACTICE_SESSIONS.session_2.id,
    type: 'multiple_choice',
    question: '数轴的三要素不包括？',
    options: JSON.stringify(['A. 原点', 'B. 正方向', 'C. 单位长度', 'D. 刻度']),
    answer: 'D',
    explanation: '数轴的三要素是：原点、正方向、单位长度。',
    order: 1,
    created_at: now()
  }
};

// ============================================================================
// 答题记录数据
// ============================================================================

/**
 * 答题记录
 */
const ANSWER_RECORDS = {
  answer_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    question_id: QUESTIONS.question_1.id,
    session_id: PRACTICE_SESSIONS.session_1.id,
    answer: 'C',
    is_correct: true,
    time_spent: 30,
    created_at: now()
  },
  
  answer_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    question_id: QUESTIONS.question_2.id,
    session_id: PRACTICE_SESSIONS.session_1.id,
    answer: 'B',
    is_correct: true,
    time_spent: 25,
    created_at: now()
  },
  
  answer_3: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    question_id: QUESTIONS.question_3.id,
    session_id: PRACTICE_SESSIONS.session_2.id,
    answer: 'D',
    is_correct: false,
    time_spent: 45,
    created_at: now()
  }
};

// ============================================================================
// 积分数据
// ============================================================================

/**
 * 积分明细
 */
const POINTS_LEDGER = {
  points_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    amount: 10,
    reason: '答题奖励',
    balance: 100,
    created_at: now()
  },
  
  points_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    amount: 5,
    reason: '连续学习奖励',
    balance: 105,
    created_at: now()
  },
  
  points_3: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    amount: 20,
    reason: '完成练习',
    balance: 125,
    created_at: now()
  },
  
  points_4: {
    id: generateId(),
    user_id: TEST_USERS.student2.id,
    amount: 15,
    reason: '答题奖励',
    balance: 200,
    created_at: now()
  }
};

// ============================================================================
// AI 问答记录
// ============================================================================

/**
 * AI 问答记录
 */
const AI_QA_RECORDS = {
  ai_qa_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    question: '什么是相反数？',
    answer: '只有符号不同的两个数叫做互为相反数。例如，3 的相反数是 -3，-5 的相反数是 5。0 的相反数是 0。',
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_3.id,
    model: 'qwen-plus',
    tokens_used: 150,
    created_at: now()
  },
  
  ai_qa_2: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    question: '数轴怎么画？',
    answer: '画数轴的步骤：1. 画一条水平直线；2. 在直线上取一点作为原点；3. 规定向右为正方向；4. 选取适当的长度作为单位长度。',
    knowledge_point_id: KNOWLEDGE_POINTS.kp_math_7_2.id,
    model: 'qwen-plus',
    tokens_used: 200,
    created_at: now()
  }
};

// ============================================================================
// 帖子数据
// ============================================================================

/**
 * 帖子
 */
const POSTS = {
  post_1: {
    id: generateId(),
    user_id: TEST_USERS.student1.id,
    title: '有理数学习心得',
    content: '最近学习了有理数，感觉正负数的运算还是有点难，大家有什么好的学习方法吗？',
    tags: '数学，有理数，学习心得',
    view_count: 120,
    like_count: 15,
    created_at: now(),
    updated_at: now()
  },
  
  post_2: {
    id: generateId(),
    user_id: TEST_USERS.student2.id,
    title: '一元一次方程解题技巧',
    content: '分享几个解一元一次方程的小技巧：1. 先去分母；2. 再去括号；3. 移项要变号...',
    tags: '数学，方程，解题技巧',
    view_count: 250,
    like_count: 32,
    created_at: now(),
    updated_at: now()
  }
};

/**
 * 帖子评论
 */
const POSTS_COMMENTS = {
  comment_1: {
    id: generateId(),
    post_id: POSTS.post_1.id,
    user_id: TEST_USERS.student2.id,
    content: '我推荐用数轴来理解正负数运算，很直观！',
    parent_comment_id: null,
    like_count: 5,
    created_at: now(),
    updated_at: now()
  },
  
  comment_2: {
    id: generateId(),
    post_id: POSTS.post_1.id,
    user_id: TEST_USERS.student1.id,
    content: '谢谢分享，我试试看！',
    parent_comment_id: COMMENT_1?.id || null,
    like_count: 2,
    created_at: now(),
    updated_at: now()
  }
};

// ============================================================================
// 导出函数
// ============================================================================

/**
 * 插入数据到数据库
 */
async function insertData(db, tableName, data) {
  const entries = Object.entries(data);
  const results = [];
  
  for (const [key, record] of entries) {
    try {
      const columns = Object.keys(record).join(', ');
      const placeholders = Object.keys(record).map(() => '?').join(', ');
      const values = Object.values(record);
      
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`
      );
      
      stmt.run(...values);
      results.push({ key, id: record.id });
    } catch (error) {
      console.warn(`插入 ${tableName} 数据失败 [${key}]:`, error.message);
    }
  }
  
  return results;
}

/**
 * 种子化所有测试数据
 */
async function seedAll(db) {
  console.log('🌱 开始播种测试数据...');
  
  const results = {
    users: await insertData(db, 'users', TEST_USERS),
    studentProfiles: await insertData(db, 'student_profiles', STUDENT_PROFILES),
    parentProfiles: await insertData(db, 'parent_profiles', PARENT_PROFILES),
    textbooks: await insertData(db, 'textbooks', TEXTBOOKS),
    knowledgePoints: await insertData(db, 'knowledge_points', KNOWLEDGE_POINTS),
    learningProgress: await insertData(db, 'learning_progress', LEARNING_PROGRESS),
    knowledgeMastery: await insertData(db, 'knowledge_mastery', KNOWLEDGE_MASTERY),
    practiceSessions: await insertData(db, 'practice_sessions', PRACTICE_SESSIONS),
    questions: await insertData(db, 'questions', QUESTIONS),
    answerRecords: await insertData(db, 'answer_records', ANSWER_RECORDS),
    pointsLedger: await insertData(db, 'points_ledger', POINTS_LEDGER),
    aiQaRecords: await insertData(db, 'ai_qa_records', AI_QA_RECORDS),
    posts: await insertData(db, 'posts', POSTS)
  };
  
  console.log('✅ 测试数据播种完成');
  return results;
}

/**
 * 清除所有测试数据
 */
async function clearAll(db) {
  console.log('🧹 开始清除测试数据...');
  
  const tables = [
    'posts_comments',
    'posts',
    'ai_qa_records',
    'points_ledger',
    'answer_records',
    'questions',
    'practice_sessions',
    'knowledge_mastery',
    'learning_progress',
    'knowledge_points',
    'textbooks',
    'parent_profiles',
    'student_profiles',
    'users'
  ];
  
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch (error) {
      if (!error.message.includes('no such table')) {
        console.warn(`清除表 ${table} 失败:`, error.message);
      }
    }
  }
  
  console.log('✅ 测试数据清除完成');
}

// ============================================================================
// 导出
// ============================================================================

module.exports = {
  // 测试用户
  TEST_USERS,
  STUDENT_PROFILES,
  PARENT_PROFILES,
  
  // 教材
  TEXTBOOKS,
  
  // 知识点相关
  KNOWLEDGE_POINTS,
  LEARNING_PROGRESS,
  KNOWLEDGE_MASTERY,
  
  // 练习相关
  PRACTICE_SESSIONS,
  QUESTIONS,
  ANSWER_RECORDS,
  
  // 积分
  POINTS_LEDGER,
  
  // AI
  AI_QA_RECORDS,
  
  // 社区
  POSTS,
  POSTS_COMMENTS,
  
  // 操作函数
  seedAll,
  clearAll,
  insertData
};
