/**
 * AI Gateway Controller V2 - 支持多 AI 服务路由
 */

const AiGatewayServiceV2 = require('./AiGatewayServiceV2');
const AiTaskLogModel = require('./AiTaskLogModel');

class AiGatewayControllerV2 {
  /**
   * 生成题目
   * POST /api/ai/v2/generate-questions
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

      // 限流检查
      const rateLimit = await AiGatewayServiceV2.checkRateLimit(req.user.id, 20, 60);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          error: '请求过于频繁，请稍后再试',
          rateLimit: {
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt
          }
        });
      }

      // 创建任务日志
      const logId = await AiTaskLogModel.create({
        userId: req.user.id,
        taskType: 'generate_questions_v2',
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

      const startTime = Date.now();

      // 调用 AI 生成题目
      const result = await AiGatewayServiceV2.generateQuestions({
        textbookContent,
        grade,
        subject,
        unit,
        questionCount,
        difficulty,
        questionType
      });

      const duration = Date.now() - startTime;

      // 更新日志
      await AiTaskLogModel.update(logId, {
        status: result.success ? 'completed' : 'failed',
        output: result.success ? { questions: result.questions } : null,
        errorMessage: result.success ? null : result.error,
        modelUsed: result.model,
        providerUsed: result.provider,
        tokenUsage: result.usage,
        duration_ms: duration
      });

      if (result.success) {
        res.json({
          success: true,
          message: '题目生成成功',
          data: {
            questions: result.questions,
            count: result.questions.length,
            model: result.model,
            provider: result.provider,
            usage: result.usage,
            latency: result.latency
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
      
      if (req.body && req.user) {
        await AiTaskLogModel.create({
          userId: req.user.id,
          taskType: 'generate_questions_v2',
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
   * 智能对话
   * POST /api/ai/v2/chat
   */
  static async chat(req, res) {
    try {
      const {
        messages,
        taskType = 'chat',
        temperature = 0.7,
        maxTokens = 2048
      } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          error: 'messages 必须是数组'
        });
      }

      // 限流检查
      const rateLimit = await AiGatewayServiceV2.checkRateLimit(req.user.id, 30, 60);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          error: '请求过于频繁，请稍后再试',
          rateLimit: {
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt
          }
        });
      }

      const startTime = Date.now();

      // 调用 AI 对话
      const result = await AiGatewayServiceV2.chat(messages, {
        taskType,
        temperature,
        maxTokens
      });

      const duration = Date.now() - startTime;

      // 记录日志
      await AiTaskLogModel.create({
        userId: req.user.id,
        taskType: 'chat_v2',
        input: { messages, taskType },
        output: result.success ? { content: result.data } : null,
        status: result.success ? 'completed' : 'failed',
        errorMessage: result.success ? null : result.error,
        modelUsed: result.model,
        providerUsed: result.provider,
        tokenUsage: result.usage,
        duration_ms: duration
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            content: result.data,
            model: result.model,
            provider: result.provider,
            usage: result.usage,
            latency: result.latency
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('对话错误:', error);
      res.status(500).json({
        success: false,
        error: '对话失败：' + error.message
      });
    }
  }

  /**
   * 健康检查
   * GET /api/ai/v2/health
   */
  static async healthCheck(req, res) {
    try {
      const healthStatus = await AiGatewayServiceV2.healthCheck();
      const tokenUsage = await AiGatewayServiceV2.getTokenUsage();

      res.json({
        success: true,
        data: {
          providers: healthStatus,
          tokenUsage: {
            today: tokenUsage,
            date: new Date().toISOString().split('T')[0]
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('健康检查错误:', error);
      res.status(500).json({
        success: false,
        error: '健康检查失败：' + error.message
      });
    }
  }

  /**
   * 获取健康状态（不主动检测）
   * GET /api/ai/v2/status
   */
  static async getStatus(req, res) {
    try {
      const healthStatus = AiGatewayServiceV2.getHealthStatus();
      const tokenUsage = await AiGatewayServiceV2.getTokenUsage();

      res.json({
        success: true,
        data: {
          providers: healthStatus,
          tokenUsage: {
            today: tokenUsage,
            date: new Date().toISOString().split('T')[0]
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('获取状态错误:', error);
      res.status(500).json({
        success: false,
        error: '获取状态失败：' + error.message
      });
    }
  }

  /**
   * 获取 Token 使用统计
   * GET /api/ai/v2/token-usage
   */
  static async getTokenUsage(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const usage = await AiGatewayServiceV2.getTokenUsage(targetDate);

      res.json({
        success: true,
        data: {
          date: targetDate,
          usage,
          total: Object.values(usage).reduce((sum, val) => sum + val, 0)
        }
      });
    } catch (error) {
      console.error('获取 Token 使用统计错误:', error);
      res.status(500).json({
        success: false,
        error: '获取统计失败：' + error.message
      });
    }
  }

  /**
   * 获取任务日志（继承 V1）
   * GET /api/ai/v2/task-logs
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
}

module.exports = AiGatewayControllerV2;
