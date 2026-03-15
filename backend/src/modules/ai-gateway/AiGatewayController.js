/**
 * AI Gateway Controller
 * ISSUE-P0-003: AI 出题功能
 */

const AiGatewayService = require('./AiGatewayService');
const AiTaskLogModel = require('./AiTaskLogModel');

class AiGatewayController {
  /**
   * 生成题目
   * POST /api/ai/generate-questions
   */
  static async generateQuestions(req, res) {
    try {
      const {
        textbookId,
        textbookContent,
        grade,
        subject,
        unit,
        questionCount = 5,
        difficulty = 'medium',
        questionType = 'choice'
      } = req.body;

      // 参数校验
      if (!textbookContent && !textbookId) {
        return res.status(400).json({
          success: false,
          error: '课本内容或课本 ID 不能为空'
        });
      }

      if (!grade || !subject || !unit) {
        return res.status(400).json({
          success: false,
          error: '年级、科目、单元信息不能为空'
        });
      }

      // 创建任务日志
      const logId = await AiTaskLogModel.create({
        userId: req.user.id,
        taskType: 'generate_questions',
        input: {
          textbookId,
          grade,
          subject,
          unit,
          questionCount,
          difficulty,
          questionType
        },
        status: 'processing'
      });

      // 调用 AI 生成题目
      const result = await AiGatewayService.generateQuestions({
        textbookContent,
        grade,
        subject,
        unit,
        questionCount,
        difficulty,
        questionType
      });

      // 更新日志
      await AiTaskLogModel.update(logId, {
        status: result.success ? 'completed' : 'failed',
        output: result.success ? { questions: result.questions } : null,
        errorMessage: result.success ? null : result.error,
        modelUsed: result.model,
        tokenUsage: result.usage
      });

      if (result.success) {
        res.json({
          success: true,
          message: '题目生成成功',
          data: {
            questions: result.questions,
            count: result.questions.length,
            model: result.model,
            usage: result.usage
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('生成题目错误:', error);
      
      // 记录错误日志
      if (req.body && req.user) {
        await AiTaskLogModel.create({
          userId: req.user.id,
          taskType: 'generate_questions',
          input: req.body,
          status: 'failed',
          errorMessage: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: '题目生成失败：' + error.message
      });
    }
  }

  /**
   * 获取任务日志
   * GET /api/ai/task-logs
   */
  static async getTaskLogs(req, res) {
    try {
      const { page = 1, pageSize = 20, taskType, status } = req.query;
      
      const logs = await AiTaskLogModel.getByUserId(req.user.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        taskType,
        status
      });

      const total = await AiTaskLogModel.countByUserId(req.user.id, {
        taskType,
        status
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      });
    } catch (error) {
      console.error('获取任务日志错误:', error);
      res.status(500).json({
        success: false,
        error: '获取日志失败'
      });
    }
  }

  /**
   * 获取单条任务日志详情
   * GET /api/ai/task-logs/:id
   */
  static async getTaskLog(req, res) {
    try {
      const { id } = req.params;
      const log = await AiTaskLogModel.getById(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: '日志不存在'
        });
      }

      if (log.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: '无权访问'
        });
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      console.error('获取任务日志详情错误:', error);
      res.status(500).json({
        success: false,
        error: '获取日志失败'
      });
    }
  }
}

module.exports = AiGatewayController;
