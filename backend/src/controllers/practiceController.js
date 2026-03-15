const PracticeSessionModel = require('../models/PracticeSession');

/**
 * 练习会话控制器
 * P0-006 安全修复：所有接口都使用 req.user.id 进行所有权校验
 */

/**
 * 创建练习会话
 * POST /api/practice/sessions
 */
exports.create = async (req, res) => {
  try {
    const { textbookId, unitId } = req.body;

    const session = await PracticeSessionModel.create(req.user.id, {
      textbookId,
      unitId,
      status: 'active'
    });

    res.status(201).json({
      message: '创建成功',
      data: session
    });
  } catch (error) {
    console.error('创建练习会话错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 获取会话列表
 * GET /api/practice/sessions
 */
exports.getList = async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    
    const sessions = await PracticeSessionModel.getByUserId(req.user.id, {
      status,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });

    res.json({
      data: sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('获取会话列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 获取单个会话详情
 * GET /api/practice/sessions/:id
 * P0-006 安全修复：校验所有权
 */
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    
    // P0-006 安全修复：getById 内部会校验所有权
    const session = await PracticeSessionModel.getById(id, req.user.id);

    if (!session) {
      return res.status(404).json({ error: '会话不存在或无权访问' });
    }

    res.json({ data: session });
  } catch (error) {
    console.error('获取会话详情错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 更新会话状态
 * PUT /api/practice/sessions/:id
 * P0-006 安全修复：校验所有权
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, score } = req.body;

    const session = await PracticeSessionModel.update(id, req.user.id, {
      status,
      score
    });

    res.json({
      message: '更新成功',
      data: session
    });
  } catch (error) {
    console.error('更新会话错误:', error);
    if (error.message === '会话不存在或无权访问') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 删除会话
 * DELETE /api/practice/sessions/:id
 * P0-006 安全修复：校验所有权
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    await PracticeSessionModel.remove(id, req.user.id);
    
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除会话错误:', error);
    if (error.message === '会话不存在或无权访问') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 添加问题到会话
 * POST /api/practice/sessions/:id/questions
 * P0-006 安全修复：校验所有权
 */
exports.addQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, question, options, answer, explanation, order } = req.body;

    // 先校验会话所有权
    const session = await PracticeSessionModel.getById(id, req.user.id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在或无权访问' });
    }

    const createdQuestion = await PracticeSessionModel.createQuestion(id, {
      type,
      question,
      options,
      answer,
      explanation,
      order
    });

    res.status(201).json({
      message: '添加成功',
      data: createdQuestion
    });
  } catch (error) {
    console.error('添加问题错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 提交答案
 * POST /api/practice/sessions/:id/answers
 * P0-006 安全修复：校验所有权
 */
exports.submitAnswer = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { questionId, answer, isCorrect } = req.body;

    // 先校验会话所有权
    const session = await PracticeSessionModel.getById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在或无权访问' });
    }

    const record = await PracticeSessionModel.createAnswerRecord(
      req.user.id,
      questionId,
      sessionId,
      { answer, isCorrect }
    );

    res.status(201).json({
      message: '提交成功',
      data: record
    });
  } catch (error) {
    console.error('提交答案错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 获取答题记录
 * GET /api/practice/sessions/:id/answers
 * P0-006 安全修复：校验所有权
 */
exports.getAnswers = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    
    // 先校验会话所有权
    const session = await PracticeSessionModel.getById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在或无权访问' });
    }

    const records = await PracticeSessionModel.getAnswerRecordsByUserId(
      req.user.id,
      sessionId
    );

    res.json({
      data: records,
      total: records.length
    });
  } catch (error) {
    console.error('获取答题记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
