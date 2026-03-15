/**
 * Weakness Analysis Routes
 * ISSUE-P1-003: 薄弱点分析功能
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const WeaknessAnalysisController = require('../modules/weakness-analysis/WeaknessAnalysisController');

// 所有路由都需要认证
router.use(authMiddleware);

// 分析薄弱点
router.get('/analyze', WeaknessAnalysisController.analyze);

// 获取知识点掌握度列表
router.get('/mastery', WeaknessAnalysisController.getMastery);

// 更新掌握度（练习后）
router.post('/update', WeaknessAnalysisController.updateMastery);

// 获取推荐题目
router.get('/recommend', WeaknessAnalysisController.recommend);

// 获取掌握度趋势
router.get('/trend/:knowledgePointId', WeaknessAnalysisController.getTrend);

module.exports = router;
