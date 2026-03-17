/**
 * AI Chat Controller - AI 答疑接口控制器
 * ISSUE-P2-AI-001: AI 智能答疑
 */

const AIChatService = require('./AIChatService');
const VectorSearchService = require('./VectorSearchService');

class AIChatController {
  /**
   * 创建对话会话
   * POST /api/ai/chat/sessions
   */
  static async createSession(req, res) {
    try {
      const { subject, context } = req.body;
      const userId = req.user.id;

      const sessionId = await AIChatService.createSession(userId, {
        subject,
        context: context || {}
      });

      res.json({
        success: true,
        message: '对话会话创建成功',
        data: {
          sessionId,
          subject,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('创建会话失败:', error);
      res.status(500).json({
        success: false,
        error: '创建会话失败：' + error.message
      });
    }
  }

  /**
   * 发送消息
   * POST /api/ai/chat/sessions/:sessionId/messages
   */
  static async sendMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { content, options = {} } = req.body;
      const userId = req.user.id;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: '消息内容不能为空'
        });
      }

      // 验证会话归属
      const session = AIChatService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '会话不存在'
        });
      }

      if (session.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权访问该会话'
        });
      }

      // 发送消息
      const result = await AIChatService.sendMessage(sessionId, content, options);

      res.json({
        success: true,
        message: '消息发送成功',
        data: result
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      res.status(500).json({
        success: false,
        error: '发送消息失败：' + error.message
      });
    }
  }

  /**
   * 获取对话历史
   * GET /api/ai/chat/sessions/:sessionId/history
   */
  static async getHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const { limit = 20 } = req.query;
      const userId = req.user.id;

      // 验证会话归属
      const session = AIChatService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '会话不存在'
        });
      }

      if (session.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权访问该会话'
        });
      }

      const messages = AIChatService.getHistory(sessionId, parseInt(limit));

      res.json({
        success: true,
        data: {
          sessionId,
          subject: session.subject,
          messages,
          total: messages.length
        }
      });
    } catch (error) {
      console.error('获取历史失败:', error);
      res.status(500).json({
        success: false,
        error: '获取历史失败：' + error.message
      });
    }
  }

  /**
   * 获取用户会话列表
   * GET /api/ai/chat/sessions
   */
  static async getUserSessions(req, res) {
    try {
      const { page = 1, pageSize = 20, subject } = req.query;
      const userId = req.user.id;

      const sessions = AIChatService.getUserSessions(userId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        subject
      });

      res.json({
        success: true,
        data: sessions,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    } catch (error) {
      console.error('获取会话列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取会话列表失败：' + error.message
      });
    }
  }

  /**
   * 删除会话
   * DELETE /api/ai/chat/sessions/:sessionId
   */
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const deleted = AIChatService.deleteSession(sessionId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: '会话不存在或无权删除'
        });
      }

      res.json({
        success: true,
        message: '会话已删除'
      });
    } catch (error) {
      console.error('删除会话失败:', error);
      res.status(500).json({
        success: false,
        error: '删除会话失败：' + error.message
      });
    }
  }

  /**
   * 更新会话上下文
   * PUT /api/ai/chat/sessions/:sessionId/context
   */
  static async updateContext(req, res) {
    try {
      const { sessionId } = req.params;
      const { context } = req.body;
      const userId = req.user.id;

      // 验证会话归属
      const session = AIChatService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '会话不存在'
        });
      }

      if (session.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '无权访问该会话'
        });
      }

      AIChatService.updateContext(sessionId, context);

      res.json({
        success: true,
        message: '上下文已更新'
      });
    } catch (error) {
      console.error('更新上下文失败:', error);
      res.status(500).json({
        success: false,
        error: '更新上下文失败：' + error.message
      });
    }
  }

  /**
   * 测试向量搜索
   * POST /api/ai/chat/test-search
   */
  static async testSearch(req, res) {
    try {
      const { query, subject, limit = 5 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: '查询内容不能为空'
        });
      }

      const results = await VectorSearchService.search(query, subject, limit, 0);

      res.json({
        success: true,
        data: {
          query,
          results,
          count: results.length
        }
      });
    } catch (error) {
      console.error('测试搜索失败:', error);
      res.status(500).json({
        success: false,
        error: '测试搜索失败：' + error.message
      });
    }
  }

  /**
   * 测试 Embedding 服务
   * GET /api/ai/chat/test-embedding
   */
  static async testEmbedding(req, res) {
    try {
      const result = await VectorSearchService.testConnection();

      if (result.success) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('测试 Embedding 失败:', error);
      res.status(500).json({
        success: false,
        error: '测试失败：' + error.message
      });
    }
  }
}

module.exports = AIChatController;
