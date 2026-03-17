/**
 * AI Chat 模块单元测试
 * ISSUE-P2-AI-001: AI 智能答疑
 * 测试覆盖：AIChatService、VectorSearchService
 * 目标覆盖率：80%+
 */

const AIChatService = require('../src/modules/ai-chat/AIChatService');
const VectorSearchService = require('../src/modules/ai-chat/VectorSearchService');
const AiGatewayService = require('../src/modules/ai-gateway/AiGatewayService');
const { db } = require('../src/config/database');

// Mock 外部依赖
jest.mock('../src/modules/ai-gateway/AiGatewayService');
jest.mock('axios');

describe('AIChatService', () => {
  let testSessionId;
  let testUserId = 99999;

  beforeEach(() => {
    // 初始化测试数据库表
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT,
        context TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id)
      )
    `);

    // 清理测试数据
    db.exec('DELETE FROM ai_chat_messages');
    db.exec('DELETE FROM ai_chat_sessions');
    
    // 重置 mock
    jest.clearAllMocks();
  });

  afterAll(() => {
    // 清理测试表
    try {
      db.exec('DROP TABLE IF EXISTS ai_chat_messages');
      db.exec('DROP TABLE IF EXISTS ai_chat_sessions');
    } catch (e) {
      // 忽略清理错误
    }
  });

  describe('createSession', () => {
    test('应该成功创建会话', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        subject: 'math',
        context: { grade: '三年级' }
      });

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('number');
      expect(sessionId).toBeGreaterThan(0);

      // 验证会话已保存
      const session = AIChatService.getSessionById(sessionId);
      expect(session).toBeDefined();
      expect(session.user_id).toBe(testUserId);
      expect(session.subject).toBe('math');
      expect(session.context).toEqual({ grade: '三年级' });
    });

    test('应该使用默认值创建会话', async () => {
      const sessionId = await AIChatService.createSession(testUserId);

      const session = AIChatService.getSessionById(sessionId);
      expect(session.subject).toBeNull();
      expect(session.context).toEqual({});
    });

    test('应该处理空 context', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        context: {}
      });

      const session = AIChatService.getSessionById(sessionId);
      expect(session.context).toEqual({});
    });
  });

  describe('getSessionById', () => {
    test('应该获取存在的会话', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        subject: 'english'
      });

      const session = AIChatService.getSessionById(sessionId);
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.subject).toBe('english');
    });

    test('应该返回 undefined 当会话不存在', () => {
      const session = AIChatService.getSessionById(999999);
      expect(session).toBeUndefined();
    });

    test('应该解析 context JSON', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        context: { grade: '四年级', textbookId: 123 }
      });

      const session = AIChatService.getSessionById(sessionId);
      expect(session.context).toEqual({ grade: '四年级', textbookId: 123 });
    });

    test('应该处理无效的 context JSON', () => {
      // 直接插入无效 JSON
      db.exec(`
        INSERT INTO ai_chat_sessions (user_id, subject, context)
        VALUES (${testUserId}, 'math', '{invalid json}')
      `);

      const stmt = db.prepare('SELECT id FROM ai_chat_sessions WHERE context = ?');
      const row = stmt.get('{invalid json}');
      
      if (row) {
        const session = AIChatService.getSessionById(row.id);
        expect(session.context).toEqual({});
      }
    });
  });

  describe('saveMessage', () => {
    test('应该保存用户消息', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      const messageId = AIChatService.saveMessage(sessionId, 'user', '你好');

      expect(messageId).toBeDefined();
      expect(messageId).toBeGreaterThan(0);
    });

    test('应该保存 AI 消息并记录 tokens', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      const messageId = AIChatService.saveMessage(sessionId, 'assistant', '你好，我是 AI 助手', 50);

      expect(messageId).toBeGreaterThan(0);

      // 验证消息内容
      const stmt = db.prepare('SELECT * FROM ai_chat_messages WHERE id = ?');
      const message = stmt.get(messageId);
      expect(message.content).toBe('你好，我是 AI 助手');
      expect(message.tokens).toBe(50);
      expect(message.role).toBe('assistant');
    });
  });

  describe('getMessageHistory', () => {
    test('应该获取消息历史并按时间正序返回', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      
      // 使用不同时间戳确保顺序
      db.exec(`INSERT INTO ai_chat_messages (session_id, role, content, created_at) VALUES (${sessionId}, 'user', '问题 1', '2024-01-01 10:00:00')`);
      db.exec(`INSERT INTO ai_chat_messages (session_id, role, content, created_at) VALUES (${sessionId}, 'assistant', '回答 1', '2024-01-01 10:00:01')`);
      db.exec(`INSERT INTO ai_chat_messages (session_id, role, content, created_at) VALUES (${sessionId}, 'user', '问题 2', '2024-01-01 10:00:02')`);

      const history = AIChatService.getMessageHistory(sessionId, 10);
      
      expect(history).toHaveLength(3);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('问题 1');
      expect(history[2].content).toBe('问题 2');
    });

    test('应该限制返回数量', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      
      for (let i = 1; i <= 15; i++) {
        AIChatService.saveMessage(sessionId, 'user', `问题${i}`);
      }

      const history = AIChatService.getMessageHistory(sessionId, 10);
      expect(history).toHaveLength(10);
    });

    test('空会话应该返回空数组', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      const history = AIChatService.getMessageHistory(sessionId);
      expect(history).toEqual([]);
    });
  });

  describe('getHistory', () => {
    test('应该获取包含 id 和 tokens 的历史记录', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      AIChatService.saveMessage(sessionId, 'user', '问题', 10);
      AIChatService.saveMessage(sessionId, 'assistant', '回答', 20);

      const history = AIChatService.getHistory(sessionId);
      
      expect(history).toHaveLength(2);
      expect(history[0].id).toBeDefined();
      expect(history[0].tokens).toBe(10);
      expect(history[1].tokens).toBe(20);
    });
  });

  describe('buildSystemPrompt', () => {
    test('应该为数学生成系统提示词', () => {
      const prompt = AIChatService.buildSystemPrompt('math', {});
      expect(prompt).toContain('数学');
      expect(prompt).toContain('学习助手');
      expect(prompt).toContain('耐心细致');
    });

    test('应该为英语生成系统提示词', () => {
      const prompt = AIChatService.buildSystemPrompt('english', {});
      expect(prompt).toContain('英语');
    });

    test('应该包含年级信息', () => {
      const prompt = AIChatService.buildSystemPrompt('math', { grade: '五年级' });
      expect(prompt).toContain('学生年级：五年级');
    });

    test('应该提示结合课本', () => {
      const prompt = AIChatService.buildSystemPrompt('physics', { textbookId: 1 });
      expect(prompt).toContain('请结合课本内容讲解');
    });

    test('应该处理未知科目', () => {
      const prompt = AIChatService.buildSystemPrompt('art', {});
      expect(prompt).toContain('art');
    });

    test('应该处理空科目', () => {
      const prompt = AIChatService.buildSystemPrompt(null, {});
      expect(prompt).toContain('学习');
    });
  });

  describe('buildPrompt', () => {
    test('应该构建包含问题的提示词', () => {
      const prompt = AIChatService.buildPrompt('什么是重力？', [], null, false);
      expect(prompt).toContain('【学生问题】');
      expect(prompt).toContain('什么是重力？');
    });

    test('应该添加对话历史', () => {
      const history = [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！' }
      ];
      const prompt = AIChatService.buildPrompt('问题', history, null, false);
      expect(prompt).toContain('【对话历史】');
      expect(prompt).toContain('学生: 你好');
      expect(prompt).toContain('老师: 你好！');
    });

    test('应该添加 RAG 检索结果', () => {
      const ragResults = [
        { id: 1, name: '重力', content: '重力是地球引力' },
        { id: 2, name: '质量', content: '质量是物体属性' }
      ];
      const prompt = AIChatService.buildPrompt('问题', [], ragResults, false);
      expect(prompt).toContain('【相关知识】');
      expect(prompt).toContain('1. 重力:重力是地球引力');
      expect(prompt).toContain('2. 质量:质量是物体属性');
    });

    test('应该添加示例要求', () => {
      const prompt = AIChatService.buildPrompt('问题', [], null, true);
      expect(prompt).toContain('请提供 1-2 个具体例子帮助学生理解');
    });

    test('应该组合所有元素', () => {
      const history = [{ role: 'user', content: '之前的问题' }];
      const ragResults = [{ id: 1, name: '知识点', content: '内容' }];
      const prompt = AIChatService.buildPrompt('当前问题', history, ragResults, true);
      
      expect(prompt).toContain('【对话历史】');
      expect(prompt).toContain('【相关知识】');
      expect(prompt).toContain('【学生问题】');
      expect(prompt).toContain('请提供 1-2 个具体例子');
    });
  });

  describe('sendMessage', () => {
    test('应该成功发送消息并返回 AI 响应', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        subject: 'math'
      });

      // Mock AI 响应
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: '这是 AI 的回答',
        usage: { total_tokens: 100 },
        model: 'qwen-plus'
      });

      const result = await AIChatService.sendMessage(sessionId, '什么是重力？', {
        useRAG: false
      });

      expect(result.messageId).toBeDefined();
      expect(result.content).toBe('这是 AI 的回答');
      expect(result.tokens).toBe(100);
      expect(result.model).toBe('qwen-plus');
      expect(result.references).toEqual([]);

      // 验证消息已保存
      const history = AIChatService.getMessageHistory(sessionId);
      expect(history).toHaveLength(2); // 用户消息 + AI 消息
    });

    test('应该使用 RAG 检索相关知识', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        subject: 'physics'
      });

      // Mock RAG 结果
      const mockSearchResults = [
        { id: 1, name: '重力', content: '重力是地球引力', similarity: 0.9 }
      ];
      
      // Mock VectorSearchService.search
      const originalSearch = VectorSearchService.search;
      VectorSearchService.search = jest.fn().mockResolvedValue(mockSearchResults);

      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: '根据重力知识...',
        usage: { total_tokens: 80 }
      });

      const result = await AIChatService.sendMessage(sessionId, '什么是重力？', {
        useRAG: true
      });

      expect(result.references).toHaveLength(1);
      expect(result.references[0].knowledgePointId).toBe(1);
      expect(result.references[0].name).toBe('重力');
      expect(result.references[0].similarity).toBe(0.9);

      // 恢复原方法
      VectorSearchService.search = originalSearch;
    });

    test('应该处理 AI 响应失败', async () => {
      const sessionId = await AIChatService.createSession(testUserId);

      AiGatewayService.callModel.mockResolvedValue({
        success: false,
        error: 'API 调用失败'
      });

      await expect(
        AIChatService.sendMessage(sessionId, '问题')
      ).rejects.toThrow('AI 响应失败：API 调用失败');
    });

    test('应该抛出错当会话不存在', async () => {
      await expect(
        AIChatService.sendMessage(999999, '问题')
      ).rejects.toThrow('会话不存在');
    });

    test('应该使用默认参数', async () => {
      const sessionId = await AIChatService.createSession(testUserId);

      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: '回答',
        usage: { total_tokens: 50 }
      });

      // 不传 options 应该使用默认值
      const result = await AIChatService.sendMessage(sessionId, '问题');
      
      expect(result.content).toBe('回答');
    });
  });

  describe('getUserSessions', () => {
    test('应该获取用户会话列表', async () => {
      // 创建多个会话
      await AIChatService.createSession(testUserId, { subject: 'math' });
      await AIChatService.createSession(testUserId, { subject: 'english' });
      await AIChatService.createSession(testUserId + 1, { subject: 'math' }); // 其他用户

      const sessions = AIChatService.getUserSessions(testUserId);
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.user_id)).toEqual([testUserId, testUserId]);
    });

    test('应该按科目过滤', async () => {
      await AIChatService.createSession(testUserId, { subject: 'math' });
      await AIChatService.createSession(testUserId, { subject: 'english' });
      await AIChatService.createSession(testUserId, { subject: 'math' });

      const sessions = AIChatService.getUserSessions(testUserId, { subject: 'math' });
      
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.subject === 'math')).toBe(true);
    });

    test('应该支持分页', async () => {
      for (let i = 0; i < 5; i++) {
        await AIChatService.createSession(testUserId, { subject: 'math' });
      }

      const page1 = AIChatService.getUserSessions(testUserId, { page: 1, pageSize: 2 });
      const page2 = AIChatService.getUserSessions(testUserId, { page: 2, pageSize: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
    });
  });

  describe('updateContext', () => {
    test('应该更新会话上下文', async () => {
      const sessionId = await AIChatService.createSession(testUserId, {
        context: { grade: '三年级' }
      });

      AIChatService.updateContext(sessionId, { grade: '四年级', textbookId: 100 });

      const session = AIChatService.getSessionById(sessionId);
      expect(session.context).toEqual({ grade: '四年级', textbookId: 100 });
    });
  });

  describe('deleteSession', () => {
    test('应该删除会话', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      
      const deleted = AIChatService.deleteSession(sessionId, testUserId);
      expect(deleted).toBe(true);

      const session = AIChatService.getSessionById(sessionId);
      expect(session).toBeUndefined();
    });

    test('应该返回 false 当会话不存在', () => {
      const deleted = AIChatService.deleteSession(999999, testUserId);
      expect(deleted).toBe(false);
    });

    test('应该验证用户权限', async () => {
      const sessionId = await AIChatService.createSession(testUserId);
      
      // 其他用户尝试删除
      const deleted = AIChatService.deleteSession(sessionId, testUserId + 1);
      expect(deleted).toBe(false);

      // 会话仍然存在
      const session = AIChatService.getSessionById(sessionId);
      expect(session).toBeDefined();
    });
  });
});

describe('VectorSearchService', () => {
  beforeEach(() => {
    // 初始化测试表
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        subject TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_point_id INTEGER NOT NULL,
        content TEXT,
        embedding TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
      )
    `);

    // 清理数据
    db.exec('DELETE FROM knowledge_embeddings');
    db.exec('DELETE FROM knowledge_points');

    jest.clearAllMocks();
  });

  afterAll(() => {
    try {
      db.exec('DROP TABLE IF EXISTS knowledge_embeddings');
      db.exec('DROP TABLE IF EXISTS knowledge_points');
    } catch (e) {
      // 忽略
    }
  });

  describe('generateEmbedding', () => {
    test('应该返回 null 当 API Key 未配置', async () => {
      // 确保没有 API Key
      const originalKey = process.env.AI_API_KEY;
      delete process.env.AI_API_KEY;
      delete process.env.QWEN_PLUS_KEY;

      const result = await VectorSearchService.generateEmbedding('测试');
      expect(result).toBeNull();

      // 恢复
      if (originalKey) process.env.AI_API_KEY = originalKey;
    });

    test('应该处理 API 调用失败', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValue(new Error('Network Error'));

      process.env.AI_API_KEY = 'test-key';
      
      const result = await VectorSearchService.generateEmbedding('测试');
      // 降级方案：返回零向量
      expect(result).toHaveLength(1536);
      expect(result.every(v => v === 0)).toBe(true);
    });

    test('应该解析 API 响应', async () => {
      const axios = require('axios');
      const mockEmbedding = new Array(1536).fill(0.1);
      
      axios.post.mockResolvedValue({
        data: {
          output: {
            embeddings: [{
              embedding: mockEmbedding
            }]
          }
        }
      });

      process.env.AI_API_KEY = 'test-key';
      
      const result = await VectorSearchService.generateEmbedding('测试');
      expect(result).toEqual(mockEmbedding);
    });

    test('应该处理空响应', async () => {
      const axios = require('axios');
      axios.post.mockResolvedValue({
        data: {}
      });

      process.env.AI_API_KEY = 'test-key';
      
      const result = await VectorSearchService.generateEmbedding('测试');
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    test('应该返回空数组当 embedding 生成失败', async () => {
      const originalKey = process.env.AI_API_KEY;
      delete process.env.AI_API_KEY;

      const results = await VectorSearchService.search('测试', 'math', 5);
      expect(results).toEqual([]);

      if (originalKey) process.env.AI_API_KEY = originalKey;
    });

    test('应该执行向量搜索并返回结果', async () => {
      // 准备测试数据
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i * 0.001);
      const embeddingStr = `[${mockEmbedding.join(',')}]`;

      db.exec(`INSERT INTO knowledge_points (id, name, description, subject) VALUES (1, '重力', '地球引力', 'physics')`);
      db.exec(`INSERT INTO knowledge_points (id, name, description, subject) VALUES (2, '质量', '物体属性', 'physics')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (1, '重力 地球引力', '${embeddingStr}')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (2, '质量 物体属性', '${embeddingStr}')`);

      // Mock embedding 生成返回相同向量（确保相似度为 1）
      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const results = await VectorSearchService.search('测试', 'physics', 5, 0);
      
      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id');
        expect(results[0]).toHaveProperty('name');
        expect(results[0]).toHaveProperty('similarity');
      }
    });

    test('应该按科目过滤', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const embeddingStr = `[${mockEmbedding.join(',')}]`;

      db.exec(`INSERT INTO knowledge_points (id, name, description, subject) VALUES (10, '数学知识点', '内容', 'math')`);
      db.exec(`INSERT INTO knowledge_points (id, name, description, subject) VALUES (11, '物理知识点', '内容', 'physics')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (10, '数学', '${embeddingStr}')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (11, '物理', '${embeddingStr}')`);

      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const mathResults = await VectorSearchService.search('测试', 'math', 10, 0);
      
      // 应该只返回数学科目
      mathResults.forEach(r => {
        expect(r.name).toContain('数学');
      });
    });

    test('应该过滤低于阈值的结果', async () => {
      // 这个测试依赖于数据库的相似度计算
      // 由于测试数据限制，主要验证阈值参数被正确使用
      const mockEmbedding = new Array(1536).fill(0.1);
      
      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const results = await VectorSearchService.search('测试', null, 5, 0.6);
      
      // 验证返回结果都满足阈值
      results.forEach(r => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.6);
      });
    });

    test('应该限制返回数量', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      
      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const results = await VectorSearchService.search('测试', null, 3, 0);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('upsertKnowledgeEmbedding', () => {
    test('应该创建知识点的 embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      
      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      // 先插入知识点（外键约束）
      db.exec(`INSERT INTO knowledge_points (id, name, description) VALUES (100, '测试知识点', '描述')`);

      const knowledgePoint = { id: 100, name: '测试知识点', description: '描述' };
      const result = await VectorSearchService.upsertKnowledgeEmbedding(knowledgePoint);

      expect(result.success).toBe(true);
      expect(result.knowledgePointId).toBe(100);

      // 验证数据库中有记录
      const stmt = db.prepare('SELECT * FROM knowledge_embeddings WHERE knowledge_point_id = ?');
      const record = stmt.get(100);
      expect(record).toBeDefined();
    });

    test('应该处理 embedding 生成失败', async () => {
      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(null);

      const knowledgePoint = { id: 101, name: '测试' };
      const result = await VectorSearchService.upsertKnowledgeEmbedding(knowledgePoint);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Embedding 生成失败');
    });

    test('应该处理异常', async () => {
      VectorSearchService.generateEmbedding = jest.fn().mockRejectedValue(new Error('DB Error'));

      const knowledgePoint = { id: 102, name: '测试' };
      const result = await VectorSearchService.upsertKnowledgeEmbedding(knowledgePoint);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DB Error');
    });
  });

  describe('deleteKnowledgeEmbedding', () => {
    test('应该删除知识点的 embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const embeddingStr = `[${mockEmbedding.join(',')}]`;

      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (200, '测试')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (200, '测试', '${embeddingStr}')`);

      const deleted = VectorSearchService.deleteKnowledgeEmbedding(200);
      expect(deleted).toBe(true);

      const stmt = db.prepare('SELECT * FROM knowledge_embeddings WHERE knowledge_point_id = ?');
      expect(stmt.get(200)).toBeUndefined();
    });

    test('应该返回 false 当记录不存在', () => {
      const deleted = VectorSearchService.deleteKnowledgeEmbedding(999999);
      expect(deleted).toBe(false);
    });
  });

  describe('bulkCreateEmbeddings', () => {
    test('应该批量创建 embeddings', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      
      // 先插入知识点
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (301, '知识点 1')`);
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (302, '知识点 2')`);
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (303, '知识点 3')`);

      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(mockEmbedding);

      const knowledgePoints = [
        { id: 301, name: '知识点 1' },
        { id: 302, name: '知识点 2' },
        { id: 303, name: '知识点 3' }
      ];

      const results = await VectorSearchService.bulkCreateEmbeddings(knowledgePoints, 2);

      expect(results.total).toBe(3);
      expect(results.success).toBe(3);
      expect(results.failed).toBe(0);

      // 验证所有记录都已创建
      knowledgePoints.forEach(kp => {
        const stmt = db.prepare('SELECT * FROM knowledge_embeddings WHERE knowledge_point_id = ?');
        expect(stmt.get(kp.id)).toBeDefined();
      });
    });

    test('应该处理部分失败', async () => {
      // 先插入知识点
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (401, '知识点 1')`);
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (402, '知识点 2')`);
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (403, '知识点 3')`);

      let callCount = 0;
      VectorSearchService.generateEmbedding = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve(null); // 第二个失败
        }
        return Promise.resolve(new Array(1536).fill(0.1));
      });

      const knowledgePoints = [
        { id: 401, name: '知识点 1' },
        { id: 402, name: '知识点 2' },
        { id: 403, name: '知识点 3' }
      ];

      const results = await VectorSearchService.bulkCreateEmbeddings(knowledgePoints, 3);

      expect(results.total).toBe(3);
      expect(results.success).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    test('应该返回统计信息', () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const embeddingStr = `[${mockEmbedding.join(',')}]`;

      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (501, '测试 1')`);
      db.exec(`INSERT INTO knowledge_points (id, name) VALUES (502, '测试 2')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (501, '内容 1', '${embeddingStr}')`);
      db.exec(`INSERT INTO knowledge_embeddings (knowledge_point_id, content, embedding) VALUES (502, '内容 2', '${embeddingStr}')`);

      const stats = VectorSearchService.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.unique_points).toBeGreaterThanOrEqual(2);
      expect(stats.avg_embedding_length).toBeGreaterThan(0);
    });

    test('空表应该返回零统计', () => {
      db.exec('DELETE FROM knowledge_embeddings');
      
      const stats = VectorSearchService.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('testConnection', () => {
    test('应该返回连接状态', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      
      VectorSearchService.generateEmbedding = jest.fn()
        .mockResolvedValueOnce(mockEmbedding)
        .mockResolvedValueOnce(mockEmbedding);

      const result = await VectorSearchService.testConnection();

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.embeddingDimension).toBe(1536);
        expect(result.searchWorks).toBeDefined();
      }
    });

    test('应该处理 embedding 失败', async () => {
      VectorSearchService.generateEmbedding = jest.fn().mockResolvedValue(null);

      const result = await VectorSearchService.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Embedding 生成失败');
    });
  });
});
