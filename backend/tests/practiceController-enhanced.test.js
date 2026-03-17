/**
 * Practice Controller API Tests - 完整覆盖
 * 测试练习控制器的所有接口和边界场景
 */

const request = require('supertest');
const { 
  generatePhone, 
  createPracticeSession, 
  createQuestion,
  createAnswerRecord,
  AuthHelper,
  DbCleaner,
  assertions 
} = require('./test-utils');

let server;
let app;
let authHelper;
let dbCleaner;
let db;

// 启动服务�?beforeAll(async () => {
  app = require('../src/server');
  server = app.server;
  authHelper = new AuthHelper(server);
  db = app.db;
  dbCleaner = new DbCleaner(db);
});

// 清理数据�?beforeEach(async () => {
  await dbCleaner.cleanupAll();
});

afterAll(async () => {
  if (server) {
    server.close();
  }
  if (db) {
    db.close();
  }
});

describe('Practice Controller API Tests', () => {
  
  describe('POST /api/practice/sessions - 创建练习会话', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
      userId = user.user.id;
    });

    it('应该成功创建练习会话', async () => {
      const sessionData = {
        textbookId: 'textbook-123',
        unitId: 'unit-1'
      };

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData);

      assertions.assertSuccessResponse(res, 201);
      expect(res.body).toHaveProperty('message', '创建成功');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('user_id', userId);
      expect(res.body.data).toHaveProperty('textbook_id', sessionData.textbookId);
      expect(res.body.data).toHaveProperty('unit_id', sessionData.unitId);
      expect(res.body.data).toHaveProperty('status', 'active');
    });

    it('应该创建不带 unitId 的会�?, async () => {
      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'textbook-456' });

      assertions.assertSuccessResponse(res, 201);
      expect(res.body.data).toHaveProperty('unit_id', null);
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .post('/api/practice/sessions')
        .send({ textbookId: 'textbook-789' });

      assertions.assertErrorResponse(res, 401);
    });

    it('应该处理空请求体', async () => {
      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // 应该创建成功，textbookId �?unitId �?null
      assertions.assertSuccessResponse(res, 201);
    });
  });

  describe('GET /api/practice/sessions - 获取会话列表', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功获取会话列表', async () => {
      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该支持按状态筛�?, async () => {
      // 先创建几个会�?      await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1', unitId: 'u1' });

      const res = await request(server)
        .get('/api/practice/sessions?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body.data.every(s => s.status === 'active')).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const res = await request(server)
        .get('/api/practice/sessions?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('应该只返回当前用户的会话', async () => {
      // 创建当前用户的会�?      await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1' });

      // 创建另一个用�?      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      // 另一个用户的会话不应该出现在当前用户的列表中
      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body.data.every(s => s.user_id === authToken /* 需要实际验�?*/)).toBe(true);
    });
  });

  describe('GET /api/practice/sessions/:id - 获取会话详情', () => {
    let authToken;
    let sessionId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;

      // 创建会话
      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1', unitId: 'u1' });
      
      sessionId = res.body.data.id;
    });

    it('应该成功获取会话详情', async () => {
      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', sessionId);
      expect(res.body.data).toHaveProperty('questions');
      expect(Array.isArray(res.body.data.questions)).toBe(true);
    });

    it('应该拒绝访问不属于自己的会话', async () => {
      // 创建另一个用�?      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      assertions.assertErrorResponse(res, 404);
      expect(res.body.error).toContain('无权访问');
    });

    it('应该返回 404 对于不存在的会话', async () => {
      const res = await request(server)
        .get('/api/practice/sessions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(res, 404);
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}`);

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('PUT /api/practice/sessions/:id - 更新会话', () => {
    let authToken;
    let sessionId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1' });
      
      sessionId = res.body.data.id;
    });

    it('应该成功更新会话状�?, async () => {
      const res = await request(server)
        .put(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('message', '更新成功');
      expect(res.body.data).toHaveProperty('status', 'completed');
    });

    it('应该成功更新会话分数', async () => {
      const res = await request(server)
        .put(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ score: 95 });

      assertions.assertSuccessResponse(res);
      expect(res.body.data).toHaveProperty('score', 95);
    });

    it('应该同时更新状态和分数', async () => {
      const res = await request(server)
        .put(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed', score: 100 });

      assertions.assertSuccessResponse(res);
      expect(res.body.data).toHaveProperty('status', 'completed');
      expect(res.body.data).toHaveProperty('score', 100);
    });

    it('应该拒绝更新不属于自己的会话', async () => {
      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      const res = await request(server)
        .put(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({ status: 'completed' });

      assertions.assertErrorResponse(res, 404);
    });

    it('应该返回 404 对于不存在的会话', async () => {
      const res = await request(server)
        .put('/api/practice/sessions/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      assertions.assertErrorResponse(res, 404);
    });
  });

  describe('DELETE /api/practice/sessions/:id - 删除会话', () => {
    let authToken;
    let sessionId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1' });
      
      sessionId = res.body.data.id;
    });

    it('应该成功删除会话', async () => {
      const res = await request(server)
        .delete(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('message', '删除成功');

      // 验证会话确实被删�?      const getRes = await request(server)
        .get(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(getRes, 404);
    });

    it('应该拒绝删除不属于自己的会话', async () => {
      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      const res = await request(server)
        .delete(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      assertions.assertErrorResponse(res, 404);
    });

    it('应该返回 404 对于不存在的会话', async () => {
      const res = await request(server)
        .delete('/api/practice/sessions/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(res, 404);
    });
  });

  describe('POST /api/practice/sessions/:id/questions - 添加问题', () => {
    let authToken;
    let sessionId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1' });
      
      sessionId = res.body.data.id;
    });

    it('应该成功添加选择�?, async () => {
      const questionData = {
        type: 'multiple_choice',
        question: '1 + 1 = ?',
        options: JSON.stringify(['A. 1', 'B. 2', 'C. 3', 'D. 4']),
        answer: 'B',
        explanation: '1 �?1 等于 2',
        order: 1
      };

      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(questionData);

      assertions.assertSuccessResponse(res, 201);
      expect(res.body).toHaveProperty('message', '添加成功');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('type', questionData.type);
      expect(res.body.data).toHaveProperty('question', questionData.question);
    });

    it('应该成功添加填空�?, async () => {
      const questionData = {
        type: 'fill_blank',
        question: '地球是____�?,
        answer: '圆形',
        explanation: '地球是近似球形的',
        order: 1
      };

      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(questionData);

      assertions.assertSuccessResponse(res, 201);
    });

    it('应该拒绝向不属于自己的会话添加问�?, async () => {
      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({ type: 'multiple_choice', question: 'test' });

      assertions.assertErrorResponse(res, 404);
    });

    it('应该返回 404 对于不存在的会话', async () => {
      const res = await request(server)
        .post('/api/practice/sessions/non-existent/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'multiple_choice', question: 'test' });

      assertions.assertErrorResponse(res, 404);
    });
  });

  describe('POST /api/practice/sessions/:id/answers - 提交答案', () => {
    let authToken;
    let sessionId;
    let questionId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;

      // 创建会话
      const sessionRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1' });
      sessionId = sessionRes.body.data.id;

      // 创建问题
      const questionRes = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'multiple_choice',
          question: 'test',
          answer: 'A'
        });
      questionId = questionRes.body.data.id;
    });

    it('应该成功提交答案', async () => {
      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId,
          answer: 'A',
          isCorrect: true
        });

      assertions.assertSuccessResponse(res, 201);
      expect(res.body).toHaveProperty('message', '提交成功');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('answer', 'A');
      expect(res.body.data).toHaveProperty('is_correct', true);
    });

    it('应该提交错误答案', async () => {
      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId,
          answer: 'B',
          isCorrect: false
        });

      assertions.assertSuccessResponse(res, 201);
      expect(res.body.data).toHaveProperty('is_correct', false);
    });

    it('应该拒绝向不属于自己的会话提交答�?, async () => {
      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({ questionId, answer: 'A' });

      assertions.assertErrorResponse(res, 404);
    });
  });

  describe('GET /api/practice/sessions/:id/answers - 获取答题记录', () => {
    let authToken;
    let sessionId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;

      const sessionRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb1' });
      sessionId = sessionRes.body.data.id;

      // 创建问题和答�?      const questionRes = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'multiple_choice', question: 'test', answer: 'A' });
      
      await request(server)
        .post(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ questionId: questionRes.body.data.id, answer: 'A', isCorrect: true });
    });

    it('应该成功获取答题记录', async () => {
      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('question');
    });

    it('应该返回空列表当没有答题记录', async () => {
      // 创建新会话但没有答题
      const sessionRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ textbookId: 'tb2' });

      const res = await request(server)
        .get(`/api/practice/sessions/${sessionRes.body.data.id}/answers`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('应该拒绝访问不属于自己的会话的答题记�?, async () => {
      const otherUser = await authHelper.createAndLogin({ phone: generatePhone() });
      
      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      assertions.assertErrorResponse(res, 404);
    });
  });

  describe('边界场景测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该处理无效�?JWT token', async () => {
      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', 'Bearer invalid-token-here');

      assertions.assertErrorResponse(res, 401);
    });

    it('应该处理过期�?JWT token', async () => {
      // 创建一个过期的 token（这里简化测试）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired';
      
      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', `Bearer ${expiredToken}`);

      // 应该被认证中间件拒绝
      expect(res.statusCode).toBeOneOf([401, 403]);
    });

    it('应该处理恶意的大请求�?, async () => {
      const largeData = {
        textbookId: 'tb1',
        unitId: 'u1',
        extraData: 'x'.repeat(10000)
      };

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData);

      // 应该能处理或拒绝，但不应该崩�?      expect([201, 400, 413]).toContain(res.statusCode);
    });

    it('应该处理 SQL 注入尝试', async () => {
      const maliciousData = {
        textbookId: "'; DROP TABLE users; --",
        unitId: 'u1'
      };

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData);

      // 应该被参数化查询阻止
      expect([201, 400]).toContain(res.statusCode);
    });
  });
});
