/**
 * Weakness Analysis Controller - 薄弱点分析控制器
 * ISSUE-P1-003: 薄弱点分析功能
 */

const WeaknessAnalysisService = require('./WeaknessAnalysisService');

class WeaknessAnalysisController {
  /**
   * 分析薄弱点
   * GET /api/weakness/analyze
   */
  static async analyze(req, res) {
    try {
      const { subject } = req.query;
      
      const result = await WeaknessAnalysisService.analyzeWeakPoints(
        req.user.id,
        subject || null
      );

      // 记录审计日志
      const { AuditLogger } = require('../logger/WinstonLoggerService');
      AuditLogger.weaknessAnalyzed(req.user.id, result.weakPoints.length);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('分析薄弱点错误:', error);
      res.status(500).json({
        success: false,
        error: '分析失败'
      });
    }
  }

  /**
   * 获取知识点掌握度列表
   * GET /api/weakness/mastery
   */
  static async getMastery(req, res) {
    try {
      const { subject, masteryLevel, sortBy, sortOrder, limit, offset } = req.query;
      
      const KnowledgeMasteryModel = require('./KnowledgeMasteryModel');
      
      const data = KnowledgeMasteryModel.getByUserId(req.user.id, {
        subject: subject || null,
        masteryLevel: masteryLevel || null,
        sortBy: sortBy || 'mastery_score',
        sortOrder: sortOrder || 'ASC',
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('获取掌握度列表错误:', error);
      res.status(500).json({
        success: false,
        error: '获取失败'
      });
    }
  }

  /**
   * 更新掌握度
   * POST /api/weakness/update
   */
  static async updateMastery(req, res) {
    try {
      const { questions } = req.body;

      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          error: '题目数据格式不正确'
        });
      }

      const result = WeaknessAnalysisService.updateMasteryAfterPractice(
        req.user.id,
        questions
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('更新掌握度错误:', error);
      res.status(500).json({
        success: false,
        error: '更新失败'
      });
    }
  }

  /**
   * 获取推荐题目
   * GET /api/weakness/recommend
   */
  static async recommend(req, res) {
    try {
      const { subject, limit } = req.query;
      
      if (!subject) {
        return res.status(400).json({
          success: false,
          error: '科目参数不能为空'
        });
      }

      const result = await WeaknessAnalysisService.recommendQuestions(
        req.user.id,
        subject,
        parseInt(limit) || 5
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('获取推荐题目错误:', error);
      res.status(500).json({
        success: false,
        error: '获取推荐失败'
      });
    }
  }

  /**
   * 获取掌握度趋势
   * GET /api/weakness/trend/:knowledgePointId
   */
  static async getTrend(req, res) {
    try {
      const { knowledgePointId } = req.params;
      const { days } = req.query;
      
      const result = WeaknessAnalysisService.getMasteryTrend(
        req.user.id,
        parseInt(knowledgePointId),
        parseInt(days) || 30
      );

      res.json(result);
    } catch (error) {
      console.error('获取掌握度趋势错误:', error);
      res.status(500).json({
        success: false,
        error: '获取趋势失败'
      });
    }
  }
}

module.exports = WeaknessAnalysisController;
