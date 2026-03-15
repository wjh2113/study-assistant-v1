const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * PracticeSession 模型 - 练习会话
 * P0-006 安全修复：所有查询都必须使用 userId 进行数据隔离
 */

/**
 * 创建练习会话
 * @param {string} userId - 用户 ID
 * @param {object} data - 会话数据
 * @returns {object} 创建的会话
 */
function create(userId, data = {}) {
  return prisma.practiceSession.create({
    data: {
      user_id: userId,
      textbook_id: data.textbookId || null,
      unit_id: data.unitId || null,
      status: data.status || 'active',
      score: data.score || null
    }
  });
}

/**
 * 根据 ID 获取会话（必须校验所有权）
 * @param {string} id - 会话 ID
 * @param {string} userId - 用户 ID（用于所有权校验）
 * @returns {object|null} 会话对象
 */
async function getById(id, userId) {
  const session = await prisma.practiceSession.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' }
      }
    }
  });
  
  // P0-006 安全修复：校验所有权
  if (session && session.user_id !== userId) {
    return null;
  }
  
  return session;
}

/**
 * 根据用户 ID 获取会话列表
 * @param {string} userId - 用户 ID
 * @param {object} options - 查询选项
 * @returns {Array} 会话列表
 */
function getByUserId(userId, options = {}) {
  const { status, limit = 100, offset = 0 } = options;
  
  const where = { user_id: userId };
  if (status) {
    where.status = status;
  }
  
  return prisma.practiceSession.findMany({
    where,
    include: {
      questions: {
        orderBy: { order: 'asc' }
      }
    },
    skip: offset,
    take: limit,
    orderBy: { created_at: 'desc' }
  });
}

/**
 * 更新会话
 * @param {string} id - 会话 ID
 * @param {string} userId - 用户 ID（用于所有权校验）
 * @param {object} data - 更新数据
 * @returns {object} 更新后的会话
 */
async function update(id, userId, data) {
  // P0-006 安全修复：先校验所有权
  const existing = await getById(id, userId);
  if (!existing) {
    throw new Error('会话不存在或无权访问');
  }
  
  return prisma.practiceSession.update({
    where: { id },
    data: {
      status: data.status,
      score: data.score
    }
  });
}

/**
 * 删除会话
 * @param {string} id - 会话 ID
 * @param {string} userId - 用户 ID（用于所有权校验）
 */
async function remove(id, userId) {
  // P0-006 安全修复：先校验所有权
  const existing = await getById(id, userId);
  if (!existing) {
    throw new Error('会话不存在或无权访问');
  }
  
  return prisma.practiceSession.delete({
    where: { id }
  });
}

/**
 * 创建问题
 * @param {string} sessionId - 会话 ID
 * @param {object} data - 问题数据
 * @returns {object} 创建的问题
 */
function createQuestion(sessionId, data) {
  return prisma.question.create({
    data: {
      session_id: sessionId,
      type: data.type,
      question: data.question,
      options: data.options,
      answer: data.answer,
      explanation: data.explanation,
      order: data.order
    }
  });
}

/**
 * 创建答题记录
 * @param {string} userId - 用户 ID
 * @param {string} questionId - 问题 ID
 * @param {string} sessionId - 会话 ID
 * @param {object} data - 答题数据
 * @returns {object} 创建的答题记录
 */
function createAnswerRecord(userId, questionId, sessionId, data) {
  return prisma.answerRecord.create({
    data: {
      user_id: userId,
      question_id: questionId,
      session_id: sessionId,
      answer: data.answer,
      is_correct: data.isCorrect
    }
  });
}

/**
 * 获取用户的答题记录
 * @param {string} userId - 用户 ID
 * @param {string} sessionId - 会话 ID（可选）
 * @returns {Array} 答题记录列表
 */
function getAnswerRecordsByUserId(userId, sessionId = null) {
  const where = { user_id: userId };
  if (sessionId) {
    where.session_id = sessionId;
  }
  
  return prisma.answerRecord.findMany({
    where,
    include: {
      question: true
    },
    orderBy: { created_at: 'desc' }
  });
}

module.exports = {
  create,
  getById,
  getByUserId,
  update,
  remove,
  createQuestion,
  createAnswerRecord,
  getAnswerRecordsByUserId
};
