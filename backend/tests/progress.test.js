const request = require('supertest');
const app = require('../src/server');

describe('Progress Module API Tests', () => {
  let authToken;
  const testPhone = '13800138000';
  const testCode = '123456';

  beforeAll(async () => {
    console.log('🧪 开始 Progress 模块测试');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: testPhone, code: testCode });
    authToken = loginRes.body.token;
  });

  afterAll(() => {
    console.log('✅ Progress 模块测试完成');
  });

  describe('POST /api/progress/upsert - 创建/更新进度记录', () => {
    it('应该成功创建进度记录', async () => {
      const res = await request(app)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          knowledge_id: 1,
          status: 'learning',
          mastery: 50
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('应该成功更新现有进度记录', async () => {
      // 先创建
      const createRes = await request(app)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledge_id: 1, status: 'learning', mastery: 30 });

      // 再更新
      const res = await request(app)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          knowledge_id: 1,
          status: 'mastered',
          mastery: 90
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.mastery).toBe(90);
    });

    it('应该拒绝无效的学习状态', async () => {
      const res = await request(app)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledge_id: 1, status: 'invalid', mastery: 50 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('无效的学习状态');
    });

    it('应该拒绝 mastery 超出范围', async () => {
      const res = await request(app)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledge_id: 1, status: 'learning', mastery: 150 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('掌握度必须在 0-100 之间');
    });
  });

  describe('POST /api/progress/log - 记录学习时间', () => {
    it('应该成功记录学习时间', async () => {
      const res = await request(app)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          knowledge_id: 1,
          duration_minutes: 30
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.duration_minutes).toBe(30);
    });

    it('应该拒绝负数时长', async () => {
      const res = await request(app)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledge_id: 1, duration_minutes: -10 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('学习时长必须大于 0');
    });
  });

  describe('GET /api/progress - 获取进度列表', () => {
    it('应该成功获取进度列表', async () => {
      const res = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('progressList');
      expect(Array.isArray(res.body.progressList)).toBe(true);
    });

    it('应该支持按状态筛选', async () => {
      const res = await request(app)
        .get('/api/progress?status=learning')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('progressList');
    });
  });

  describe('GET /api/progress/stats - 获取统计数据', () => {
    it('应该成功获取学习统计', async () => {
      const res = await request(app)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalLearned');
      expect(res.body).toHaveProperty('totalTimeMinutes');
      expect(res.body).toHaveProperty('bySubject');
    });

    it('应该支持日期范围筛选', async () => {
      const res = await request(app)
        .get('/api/progress/stats?start_date=2024-01-01&end_date=2024-12-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
    });
  });
});
