/**
 * AI Gateway Routes V2 - 支持多 AI 服务路由
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
// const AiGatewayControllerV2 = require('./AiGatewayControllerV2');
const AiGatewayControllerV2 = {
  generateQuestions: (req, res) => res.status(501).json({ error: 'Not implemented' }),
  chat: (req, res) => res.status(501).json({ error: 'Not implemented' }),
  healthCheck: (req, res) => res.json({ status: 'ok' }),
  getStatus: (req, res) => res.json({ status: 'ok', version: 'v2' }),
  getTokenUsage: (req, res) => res.json({ usage: [] }),
  getTaskLogs: (req, res) => res.json({ logs: [] })
};

// 所有路由都需要认证
router.use(authMiddleware);

// 生成题目
router.post('/generate-questions', AiGatewayControllerV2.generateQuestions);

// 智能对话
router.post('/chat', AiGatewayControllerV2.chat);

// 健康检查
router.get('/health', AiGatewayControllerV2.healthCheck);

// 获取状态
router.get('/status', AiGatewayControllerV2.getStatus);

// 获取 Token 使用统计
router.get('/token-usage', AiGatewayControllerV2.getTokenUsage);

// 获取任务日志
router.get('/task-logs', AiGatewayControllerV2.getTaskLogs);

module.exports = router;
