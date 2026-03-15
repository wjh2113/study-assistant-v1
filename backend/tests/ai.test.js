const request = require('supertest');
const app = require('../src/server');

describe('AI Module API Tests', () => {
  let authToken;
  let aiRecordId;
  const testPhone = '13800138000';
  const testCode = '123456';

  beforeAll(async () => {
    console.log('🧪 开始 AI 模块测试');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: testPhone, code: testCode });
    authToken = loginRes.body.token;
  });

  afterAll(() => {
    console.log('✅ AI 模块测试完成');
  });

  describe('POST /api/ai/ask - AI 问答', () => {
    it('应该成功提交 AI 问题', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: '什么是勾股定理？',
          subject: '数学'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('answer');
      aiRecordId = res.body.id;
    });

    it('应该拒绝空问题', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: '数学' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('问题不能为空');
    });

    it('应该拒绝未授权请求', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .send({ question: '测试问题' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/ai/history - 获取问答历史', () => {
    it('应该成功获取问答历史', async () => {
      const res = await request(app)
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('records');
      expect(Array.isArray(res.body.records)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const res = await request(app)
        .get('/api/ai/history?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('records');
    });

    it('应该支持按科目筛选', async () => {
      const res = await request(app)
        .get('/api/ai/history?subject=数学')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/ai/search - 搜索问答记录', () => {
    it('应该成功搜索问答记录', async () => {
      const res = await request(app)
        .get('/api/ai/search?q=勾股')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('records');
    });

    it('空查询应该返回所有记录', async () => {
      const res = await request(app)
        .get('/api/ai/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/ai/:id - 删除问答记录', () => {
    it('应该成功删除问答记录', async () => {
      // 先创建一条记录
      const createRes = await request(app)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ question: '待删除问题', subject: '测试' });
      
      const deleteId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/ai/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('删除成功');
    });

    it('应该拒绝删除不存在的记录', async () => {
      const res = await request(app)
        .delete('/api/ai/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('记录不存在');
    });
  });
});
