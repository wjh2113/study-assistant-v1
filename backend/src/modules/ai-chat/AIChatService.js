/**
 * AI Chat Service - AI 答疑服务（支持多轮对话和 RAG）
 * ISSUE-P2-AI-001: AI 智能答疑
 */

const { db } = require('../../config/database');
const AiGatewayService = require('../ai-gateway/AiGatewayService');
const VectorSearchService = require('./VectorSearchService');

class AIChatService {
  /**
   * 创建对话会话
   * @param {number} userId - 用户 ID
   * @param {object} options - 选项
   * @returns {Promise<number>} 会话 ID
   */
  static async createSession(userId, options = {}) {
    const { subject = null, context = {} } = options;

    const stmt = db.prepare(`
      INSERT INTO ai_chat_sessions (user_id, subject, context)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      subject,
      JSON.stringify(context)
    );

    return result.lastInsertRowid;
  }

  /**
   * 发送消息（支持 RAG 增强）
   * @param {number} sessionId - 会话 ID
   * @param {string} content - 消息内容
   * @param {object} options - 选项
   * @returns {Promise<object>} AI 响应
   */
  static async sendMessage(sessionId, content, options = {}) {
    const {
      useRAG = true,
      includeExamples = false,
      maxContextMessages = 10
    } = options;

    // 1. 获取会话信息
    const session = this.getSessionById(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    // 2. 保存用户消息
    const userMessageId = this.saveMessage(sessionId, 'user', content);

    // 3. 获取对话历史（用于上下文）
    const history = this.getMessageHistory(sessionId, maxContextMessages);

    // 4. RAG 检索（如果启用）
    let ragResults = null;
    if (useRAG) {
      ragResults = await VectorSearchService.search(
        content,
        session.subject,
        5
      );
    }

    // 5. 构建提示词
    const prompt = this.buildPrompt(content, history, ragResults, includeExamples);

    // 6. 调用 AI 模型
    const aiResponse = await AiGatewayService.callModel('qwen-plus', prompt, {
      systemPrompt: this.buildSystemPrompt(session.subject, session.context)
    });

    if (!aiResponse.success) {
      throw new Error(`AI 响应失败：${aiResponse.error}`);
    }

    // 7. 保存 AI 响应
    const aiMessageId = this.saveMessage(
      sessionId,
      'assistant',
      aiResponse.data,
      aiResponse.usage?.total_tokens
    );

    // 8. 返回结果
    return {
      messageId: aiMessageId,
      content: aiResponse.data,
      references: ragResults?.map(r => ({
        knowledgePointId: r.id,
        name: r.name,
        similarity: r.similarity
      })) || [],
      tokens: aiResponse.usage?.total_tokens,
      model: aiResponse.model
    };
  }

  /**
   * 构建系统提示词
   */
  static buildSystemPrompt(subject, context) {
    const subjectMap = {
      'math': '数学',
      'chinese': '语文',
      'english': '英语',
      'physics': '物理',
      'chemistry': '化学',
      'biology': '生物'
    };

    const subjectName = subjectMap[subject] || subject || '学习';
    
    return `你是一个专业的${subjectName}学习助手，擅长解答学生的问题。

你的特点：
1. 耐心细致，用学生能理解的语言解释
2. 善于举例说明，帮助学生理解抽象概念
3. 鼓励学生思考，不直接给答案而是引导
4. 关注学生的年级水平，调整讲解难度

${context.grade ? `学生年级：${context.grade}` : ''}
${context.textbookId ? '请结合课本内容讲解' : ''}

请友好、专业地回答学生的问题。`;
  }

  /**
   * 构建用户提示词（含 RAG 结果）
   */
  static buildPrompt(question, history, ragResults, includeExamples) {
    let prompt = '';

    // 添加对话历史
    if (history.length > 0) {
      prompt += '【对话历史】\n';
      history.forEach(msg => {
        const role = msg.role === 'user' ? '学生' : '老师';
        prompt += `${role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // 添加 RAG 检索结果
    if (ragResults && ragResults.length > 0) {
      prompt += '【相关知识】\n';
      ragResults.forEach((result, i) => {
        prompt += `${i + 1}. ${result.name}: ${result.content}\n`;
      });
      prompt += '\n';
    }

    // 添加当前问题
    prompt += '【学生问题】\n';
    prompt += question;

    // 添加示例要求
    if (includeExamples) {
      prompt += '\n\n请提供 1-2 个具体例子帮助学生理解。';
    }

    return prompt;
  }

  /**
   * 保存消息
   */
  static saveMessage(sessionId, role, content, tokens = null) {
    const stmt = db.prepare(`
      INSERT INTO ai_chat_messages (session_id, role, content, tokens)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(sessionId, role, content, tokens);
    return result.lastInsertRowid;
  }

  /**
   * 获取会话
   */
  static getSessionById(sessionId) {
    const stmt = db.prepare('SELECT * FROM ai_chat_sessions WHERE id = ?');
    const session = stmt.get(sessionId);
    
    if (session && session.context) {
      try {
        session.context = JSON.parse(session.context);
      } catch (e) {
        session.context = {};
      }
    }
    
    return session;
  }

  /**
   * 获取消息历史
   */
  static getMessageHistory(sessionId, limit = 10) {
    const stmt = db.prepare(`
      SELECT role, content, created_at
      FROM ai_chat_messages
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const messages = stmt.all(sessionId, limit);
    return messages.reverse(); // 按时间正序
  }

  /**
   * 获取对话历史（API 用）
   */
  static getHistory(sessionId, limit = 20) {
    const stmt = db.prepare(`
      SELECT id, role, content, tokens, created_at
      FROM ai_chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `);

    return stmt.all(sessionId, limit);
  }

  /**
   * 删除会话
   */
  static deleteSession(sessionId, userId) {
    const stmt = db.prepare(`
      DELETE FROM ai_chat_sessions
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(sessionId, userId);
    return result.changes > 0;
  }

  /**
   * 获取用户会话列表
   */
  static getUserSessions(userId, options = {}) {
    const { page = 1, pageSize = 20, subject } = options;

    let query = 'SELECT * FROM ai_chat_sessions WHERE user_id = ?';
    const params = [userId];

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 更新会话上下文
   */
  static updateContext(sessionId, context) {
    const stmt = db.prepare(`
      UPDATE ai_chat_sessions
      SET context = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(context), sessionId);
  }
}

module.exports = AIChatService;
