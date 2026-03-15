/**
 * Leaderboard Routes
 * ISSUE-P1-005: 排行榜功能
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const LeaderboardController = require('../modules/leaderboard/LeaderboardController');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取排行榜
router.get('/:type?', LeaderboardController.getLeaderboard);

// 获取我的排名
router.get('/me/rank', LeaderboardController.getMyRank);

// 获取排行榜历史
router.get('/history', LeaderboardController.getHistory);

// 刷新排行榜（管理员）
router.post('/refresh', LeaderboardController.refreshLeaderboard);

module.exports = router;
