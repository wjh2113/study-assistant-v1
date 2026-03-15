/**
 * 练习会话路由
 * P0-006 安全修复：所有路由都需要认证，并在控制器中进行所有权校验
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const practiceController = require('../controllers/practiceController');

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 创建练习会话
 * POST /api/practice/sessions
 */
router.post('/sessions', practiceController.create);

/**
 * 获取会话列表
 * GET /api/practice/sessions
 */
router.get('/sessions', practiceController.getList);

/**
 * 获取单个会话详情
 * GET /api/practice/sessions/:id
 */
router.get('/sessions/:id', practiceController.getOne);

/**
 * 更新会话状态
 * PUT /api/practice/sessions/:id
 */
router.put('/sessions/:id', practiceController.update);

/**
 * 删除会话
 * DELETE /api/practice/sessions/:id
 */
router.delete('/sessions/:id', practiceController.delete);

/**
 * 添加问题到会话
 * POST /api/practice/sessions/:id/questions
 */
router.post('/sessions/:id/questions', practiceController.addQuestion);

/**
 * 提交答案
 * POST /api/practice/sessions/:id/answers
 */
router.post('/sessions/:id/answers', practiceController.submitAnswer);

/**
 * 获取答题记录
 * GET /api/practice/sessions/:id/answers
 */
router.get('/sessions/:id/answers', practiceController.getAnswers);

module.exports = router;
