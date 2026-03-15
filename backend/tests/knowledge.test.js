const request = require('supertest');
const app = require('../src/server');

describe('Knowledge Module API Tests', () => {
  let authToken;
  let knowledgeId;
  const testPhone = '13800138000';
  const testCode = '123456';

  beforeAll(async () => {
    console.log('🧪 开始 Knowledge 模块测试');
    // 先登录获取 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: testPhone, code: testCode });
    authToken = loginRes.body.token;
  });

  afterAll(() => {
    console.log('✅ Knowledge 模块测试完成');
  });

  describe('POST /api/knowledge - 创建知识点', () => {
    it('应该成功创建知识点', async () => {
      const res = await request(app)
        .post('/api/knowledge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: '数学',
          title: '勾股定理',
          content: '直角三角形两直角边的平方和等于斜边的平方',
          tags: ['几何', '三角形']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('勾股定理');
      knowledgeId = res.body.id;
    });

    it('应该拒绝空标题', async () => {
      const res = await request(app)
        .post('/api/knowledge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: '数学', content: '测试内容' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('标题不能为空');
    });

    it('应该拒绝未授权请求', async () => {
      const res = await request(app)
        .post('/api/knowledge')
        .send({ title: '测试' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/knowledge - 获取知识点列表', () => {
    it('应该成功获取知识点列表', async () => {
      const res = await request(app)
        .get('/api/knowledge')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('knowledgePoints');
      expect(Array.isArray(res.body.knowledgePoints)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const res = await request(app)
        .get('/api/knowledge?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('knowledgePoints');
    });
  });

  describe('GET /api/knowledge/search - 搜索知识点', () => {
    it('应该成功搜索知识点', async () => {
      const res = await request(app)
        .get('/api/knowledge/search?q=勾股')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('knowledgePoints');
    });

    it('应该支持按科目筛选', async () => {
      const res = await request(app)
        .get('/api/knowledge/search?subject=数学')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('空查询应该返回所有结果', async () => {
      const res = await request(app)
        .get('/api/knowledge/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/knowledge/:id - 获取单个知识点', () => {
    it('应该成功获取知识点详情', async () => {
      if (!knowledgeId) {
        // 先创建一个
        const createRes = await request(app)
          .post('/api/knowledge')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ subject: '物理', title: '牛顿第一定律', content: '测试' });
        knowledgeId = createRes.body.id;
      }

      const res = await request(app)
        .get(`/api/knowledge/${knowledgeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', knowledgeId);
      expect(res.body).toHaveProperty('title');
    });

    it('应该返回 404 对于不存在的 ID', async () => {
      const res = await request(app)
        .get('/api/knowledge/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('知识点不存在');
    });
  });

  describe('PUT /api/knowledge/:id - 更新知识点', () => {
    it('应该成功更新知识点', async () => {
      if (!knowledgeId) {
        const createRes = await request(app)
          .post('/api/knowledge')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ subject: '化学', title: '元素周期表', content: '测试' });
        knowledgeId = createRes.body.id;
      }

      const res = await request(app)
        .put(`/api/knowledge/${knowledgeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '更新后的标题' });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('更新后的标题');
    });

    it('应该拒绝更新不存在的知识点', async () => {
      const res = await request(app)
        .put('/api/knowledge/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '测试' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/knowledge/:id - 删除知识点', () => {
    it('应该成功删除知识点', async () => {
      // 先创建一个用于删除
      const createRes = await request(app)
        .post('/api/knowledge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: '生物', title: '待删除知识点', content: '测试' });
      
      const deleteId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/knowledge/${deleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('删除成功');
    });

    it('应该拒绝删除不存在的知识点', async () => {
      const res = await request(app)
        .delete('/api/knowledge/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
