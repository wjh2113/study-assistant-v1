/**
 * AI Planning Controller - AI 学习规划 API 控制器
 */

const AIPlanningService = require('./AIPlanningService');
const PersonalizedPlanningAlgorithm = require('./PersonalizedPlanningAlgorithm');
const DynamicTaskGenerator = require('./DynamicTaskGenerator');
const PlanExecutionTracker = require('./PlanExecutionTracker');

class AIPlanningController {
  /**
   * 生成个性化学习计划
   * POST /api/ai/planning/generate
   */
  static async generatePlan(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;
      const { subject, timeframe, goals, preferences } = req.body;

      // 参数验证
      if (!timeframe || !timeframe.totalDays) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：timeframe.totalDays'
        });
      }

      if (!goals || !Array.isArray(goals) || goals.length === 0) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：goals'
        });
      }

      // 生成个性化计划
      const result = await PersonalizedPlanningAlgorithm.generatePersonalizedPlan(userId, {
        subject,
        timeframe,
        goals,
        preferences
      });

      if (!result.success) {
        return res.status(200).json({
          success: false,
          reason: result.reason,
          suggestion: result.suggestion,
          adjustedPlan: result.adjustedPlan
        });
      }

      // 保存计划
      const planId = await AIPlanningService.savePlan(userId, {
        subject,
        timeframe,
        goals,
        weeklyGoals: result.plan.learningPath,
        schedule: result.plan.dailySchedule,
        milestones: [],
        options: preferences
      });

      res.status(201).json({
        success: true,
        planId,
        plan: {
          ...result.plan,
          planId
        },
        message: '学习计划生成成功'
      });
    } catch (error) {
      console.error('Failed to generate plan:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取每日任务
   * GET /api/ai/planning/daily-tasks/:date
   */
  static async getDailyTasks(req, res) {
    try {
      const userId = req.user?.id;
      const { date } = req.params;
      const { planId, subject } = req.query;

      const tasks = await DynamicTaskGenerator.generateDailyTasks(userId, date, {
        planId: planId ? parseInt(planId) : null,
        subject,
        currentStage: null
      });

      res.json({
        success: true,
        date,
        tasks,
        total: tasks.length
      });
    } catch (error) {
      console.error('Failed to get daily tasks:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 更新任务状态
   * PUT /api/ai/planning/tasks/:taskId/status
   */
  static async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status, score, actualTime, feedback } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：status'
        });
      }

      await DynamicTaskGenerator.updateTaskStatus(taskId, status, {
        score,
        actualTime,
        feedback
      });

      res.json({
        success: true,
        message: '任务状态更新成功'
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取计划执行跟踪报告
   * GET /api/ai/planning/:planId/track
   */
  static async trackPlanExecution(req, res) {
    try {
      const { planId } = req.params;

      const report = await PlanExecutionTracker.trackExecution(planId);

      res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Failed to track plan execution:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取计划执行报告
   * GET /api/ai/planning/:planId/report
   */
  static async getExecutionReport(req, res) {
    try {
      const { planId } = req.params;

      const report = await PlanExecutionTracker.generateExecutionReport(planId);

      res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Failed to get execution report:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取用户学习画像
   * GET /api/ai/planning/user-profile
   */
  static async getUserProfile(req, res) {
    try {
      const userId = req.user?.id;
      const { subject } = req.query;

      const userProfile = await PersonalizedPlanningAlgorithm.buildUserProfile(userId, subject);
      const learningStyle = PersonalizedPlanningAlgorithm.analyzeLearningStyle(userProfile);

      res.json({
        success: true,
        userProfile,
        learningStyle
      });
    } catch (error) {
      console.error('Failed to get user profile:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取任务统计
   * GET /api/ai/planning/tasks/statistics
   */
  static async getTaskStatistics(req, res) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, planId } = req.query;

      const dateRange = {
        startDate: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0]
      };

      let stats;
      if (planId) {
        stats = await PlanExecutionTracker.getTaskStatistics(parseInt(planId));
      } else {
        stats = await DynamicTaskGenerator.getTaskStatistics(userId, dateRange);
      }

      res.json({
        success: true,
        stats,
        dateRange
      });
    } catch (error) {
      console.error('Failed to get task statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取计划进度
   * GET /api/ai/planning/:planId/progress
   */
  static async getPlanProgress(req, res) {
    try {
      const { planId } = req.params;

      const progress = AIPlanningService.getPlanProgress(planId);
      const dailyProgress = await PlanExecutionTracker.getDailyProgress(planId);
      const kpProgress = await PlanExecutionTracker.getKnowledgePointProgress(planId);

      res.json({
        success: true,
        progress: {
          overall: progress,
          daily: dailyProgress,
          byKnowledgePoint: kpProgress
        }
      });
    } catch (error) {
      console.error('Failed to get plan progress:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 调整学习计划
   * POST /api/ai/planning/:planId/adjust
   */
  static async adjustPlan(req, res) {
    try {
      const { planId } = req.params;
      const { adjustmentType, reason, changes } = req.body;

      // 获取当前执行跟踪
      const tracking = await PlanExecutionTracker.trackExecution(planId);

      // 根据调整类型应用变更
      let adjustedPlan = {};
      
      switch (adjustmentType) {
        case 'reduce_load':
          adjustedPlan = {
            dailyTaskReduction: 0.2,
            message: '每日任务量减少 20%'
          };
          break;
        case 'extend_time':
          adjustedPlan = {
            timeExtension: 7,
            message: '计划时间延长 7 天'
          };
          break;
        case 'reprioritize':
          adjustedPlan = {
            reprioritized: true,
            message: '任务优先级已重新调整'
          };
          break;
        default:
          return res.status(400).json({
            success: false,
            error: '不支持的调整类型'
          });
      }

      res.json({
        success: true,
        adjustedPlan,
        currentStatus: {
          progress: tracking.progress,
          risks: tracking.risks
        }
      });
    } catch (error) {
      console.error('Failed to adjust plan:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取推荐行动
   * GET /api/ai/planning/:planId/recommendations
   */
  static async getRecommendations(req, res) {
    try {
      const { planId } = req.params;

      const tracking = await PlanExecutionTracker.trackExecution(planId);

      res.json({
        success: true,
        recommendations: tracking.recommendations,
        riskLevel: tracking.risks.overallRiskLevel
      });
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = AIPlanningController;
