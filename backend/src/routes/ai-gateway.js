/**
 * AI Gateway Routes
 * ISSUE-P0-003: AI 出题功能
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  AiGatewayController,
  aiGenerateLimiter
} = require('../modules');

// 所有路由都需要认证
router.use(authMiddleware);

// 生成题目（带速率限制）
router.post('/generate-questions', aiGenerateLimiter, AiGatewayController.generateQuestions);

// 获取任务日志
router.get('/task-logs', AiGatewayController.getTaskLogs);

// 获取单条任务日志
router.get('/task-logs/:id', AiGatewayController.getTaskLog);

module.exports = router;
