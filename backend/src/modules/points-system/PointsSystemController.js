/**
 * Points System Controller - 积分系统控制器
 * ISSUE-P1-004: 积分系统完善
 */

const PointsSystemModel = require('./PointsSystemModel');

class PointsSystemController {
  /**
   * 获取用户积分信息
   * GET /api/points/me
   */
  static async getMyPoints(req, res) {
    try {
      const totalPoints = PointsSystemModel.getTotalPoints(req.user.id);
      const streak = PointsSystemModel.getCurrentStreak(req.user.id);
      const stats = PointsSystemModel.getStats(req.user.id, 7);

      res.json({
        success: true,
        data: {
          totalPoints,
          streak,
          weeklyStats: stats
        }
      });
    } catch (error) {
      console.error('获取积分信息错误:', error);
      res.status(500).json({
        success: false,
        error: '获取积分信息失败'
      });
    }
  }

  /**
   * 获取积分记录
   * GET /api/points/records
   */
  static async getRecords(req, res) {
    try {
      const { page = 1, pageSize = 20, source } = req.query;
      
      const records = PointsSystemModel.getRecords(req.user.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        source
      });

      res.json({
        success: true,
        data: records,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    } catch (error) {
      console.error('获取积分记录错误:', error);
      res.status(500).json({
        success: false,
        error: '获取积分记录失败'
      });
    }
  }

  /**
   * 打卡
   * POST /api/points/check-in
   */
  static async checkIn(req, res) {
    try {
      const result = PointsSystemModel.updateStreak(req.user.id);

      if (result.checkedToday) {
        return res.json({
          success: true,
          message: '今天已经打卡过了',
          data: {
            streak: result.streak,
            checkedToday: true
          }
        });
      }

      res.json({
        success: true,
        message: '打卡成功',
        data: {
          streak: result.streak,
          points: result.points,
          checkedToday: false
        }
      });
    } catch (error) {
      console.error('打卡错误:', error);
      res.status(500).json({
        success: false,
        error: '打卡失败'
      });
    }
  }

  /**
   * 记录练习积分
   * POST /api/points/practice
   */
  static async recordPractice(req, res) {
    try {
      const { questions, practiceId } = req.body;

      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          error: '题目数据格式不正确'
        });
      }

      const result = PointsSystemModel.recordPractice(
        req.user.id,
        questions,
        practiceId
      );

      res.json({
        success: true,
        message: `获得${result.points}积分`,
        data: result
      });
    } catch (error) {
      console.error('记录练习积分错误:', error);
      res.status(500).json({
        success: false,
        error: '记录积分失败'
      });
    }
  }

  /**
   * 获取打卡状态
   * GET /api/points/check-in/status
   */
  static async getCheckInStatus(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = PointsSystemModel.getLastCheckDate(req.user.id);
      const streak = PointsSystemModel.getCurrentStreak(req.user.id);

      const checkedToday = lastCheck && lastCheck.split('T')[0] === today;

      res.json({
        success: true,
        data: {
          checkedToday,
          streak,
          lastCheckDate: lastCheck
        }
      });
    } catch (error) {
      console.error('获取打卡状态错误:', error);
      res.status(500).json({
        success: false,
        error: '获取打卡状态失败'
      });
    }
  }
}

module.exports = PointsSystemController;
