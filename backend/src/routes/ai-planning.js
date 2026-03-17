/**
 * AI Planning Routes - AI 学习规划 API 路由
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const AIPlanningController = require('../modules/ai-planning/AIPlanningController');

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * @route POST /api/ai/planning/generate
 * @desc 生成个性化学习计划
 * @access Private
 * @body {Object} subject - 科目
 * @body {Object} timeframe - 时间框架 {totalDays, startDate, endDate}
 * @body {Array} goals - 学习目标 [{knowledgePointId, knowledgePointName, currentMastery, targetMastery, priority}]
 * @body {Object} preferences - 偏好设置 {dailyTimeLimit, includeWeekend, learningStyle}
 */
router.post('/generate', AIPlanningController.generatePlan);

/**
 * @route GET /api/ai/planning/user-profile
 * @desc 获取用户学习画像
 * @access Private
 * @query {String} subject - 科目（可选）
 */
router.get('/user-profile', AIPlanningController.getUserProfile);

/**
 * @route GET /api/ai/planning/daily-tasks/:date
 * @desc 获取指定日期的学习任务
 * @access Private
 * @param {String} date - 日期 YYYY-MM-DD
 * @query {String} planId - 计划 ID（可选）
 * @query {String} subject - 科目（可选）
 */
router.get('/daily-tasks/:date', AIPlanningController.getDailyTasks);

/**
 * @route PUT /api/ai/planning/tasks/:taskId/status
 * @desc 更新任务状态
 * @access Private
 * @param {String} taskId - 任务 ID
 * @body {String} status - 新状态 pending|in_progress|completed|skipped
 * @body {Number} score - 得分（可选）
 * @body {Number} actualTime - 实际用时（分钟，可选）
 * @body {Object} feedback - 反馈（可选）
 */
router.put('/tasks/:taskId/status', AIPlanningController.updateTaskStatus);

/**
 * @route GET /api/ai/planning/tasks/statistics
 * @desc 获取任务统计
 * @access Private
 * @query {String} startDate - 开始日期
 * @query {String} endDate - 结束日期
 * @query {String} planId - 计划 ID（可选）
 */
router.get('/tasks/statistics', AIPlanningController.getTaskStatistics);

/**
 * @route GET /api/ai/planning/:planId/progress
 * @desc 获取计划进度
 * @access Private
 * @param {Number} planId - 计划 ID
 */
router.get('/:planId/progress', AIPlanningController.getPlanProgress);

/**
 * @route GET /api/ai/planning/:planId/track
 * @desc 跟踪计划执行情况
 * @access Private
 * @param {Number} planId - 计划 ID
 */
router.get('/:planId/track', AIPlanningController.trackPlanExecution);

/**
 * @route GET /api/ai/planning/:planId/report
 * @desc 获取计划执行报告
 * @access Private
 * @param {Number} planId - 计划 ID
 */
router.get('/:planId/report', AIPlanningController.getExecutionReport);

/**
 * @route GET /api/ai/planning/:planId/recommendations
 * @desc 获取推荐行动
 * @access Private
 * @param {Number} planId - 计划 ID
 */
router.get('/:planId/recommendations', AIPlanningController.getRecommendations);

/**
 * @route POST /api/ai/planning/:planId/adjust
 * @desc 调整学习计划
 * @access Private
 * @param {Number} planId - 计划 ID
 * @body {String} adjustmentType - 调整类型 reduce_load|extend_time|reprioritize
 * @body {String} reason - 调整原因
 * @body {Object} changes - 具体变更
 */
router.post('/:planId/adjust', AIPlanningController.adjustPlan);

module.exports = router;
