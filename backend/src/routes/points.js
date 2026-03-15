/**
 * Points System Routes
 * ISSUE-P1-004: 积分系统
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const PointsSystemController = require('../modules/points-system/PointsSystemController');

// 所有路由都需要认证
router.use(authMiddleware);

// 获取我的积分
router.get('/me', PointsSystemController.getMyPoints);

// 获取积分记录
router.get('/records', PointsSystemController.getRecords);

// 打卡
router.post('/check-in', PointsSystemController.checkIn);

// 记录练习积分
router.post('/practice', PointsSystemController.recordPractice);

// 获取打卡状态
router.get('/check-in/status', PointsSystemController.getCheckInStatus);

module.exports = router;
