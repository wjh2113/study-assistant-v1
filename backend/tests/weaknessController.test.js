/**
 * Weakness Controller 完整测试
 * 覆盖所有 API 端点：analyze, mastery, update, recommend, trend
 * 目标：weaknessController 覆盖率 100%
 */

const request = require('supertest');
const { generatePhone, AuthHelper, DbCleaner } = require('./test-utils');

let server, authHelper, dbCleaner, db;

beforeAll(async () => {
  const app = require('../src/server');
  server = app.server;
  db = app.db;
  authHelper = new AuthHelper(server);
  dbCleaner = new DbCleaner(db);
});

beforeEach(async () => {
  await dbCleaner.cleanupAll();
});

afterAll(async () => {
  if (server) server.close();
  if (db) db.close();
});

describe('WeaknessController', () => {
  let authToken;

  beforeEach(async () => {
    const phone = generatePhone();
    const result = await authHelper.createAndLogin({ phone });
    authToken = result.token;
  });

  describe('GET /api/weakness/analyze - 分析薄弱点', () => {
    it('应该成功分析薄弱点', async () => {
      const res = await request(server)
        .get('/api/weakness/analyze')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('weakPoints');
    });

    it('应该支持按科目筛选', async () => {
      const res = await request(server)
        .get('/api/weakness/analyze?subject=math')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该返回空数组当没有薄弱点时', async () => {
      const res = await request(server)
        .get('/api/weakness/analyze')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.weakPoints).toEqual([]);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/weakness/analyze');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/weakness/mastery - 获取知识点掌握度列表', () => {
    it('应该成功获取掌握度列表', async () => {
      const res = await request(server)
        .get('/api/weakness/mastery')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });

    it('应该支持按科目筛选', async () => {
      const res = await request(server)
        .get('/api/weakness/mastery?subject=math')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该支持按掌握度等级筛选', async () => {
      const res = await request(server)
        .get('/api/weakness/mastery?masteryLevel=weak')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该支持排序参数', async () => {
      const res = await request(server)
        .get('/api/weakness/mastery?sortBy=mastery_score&sortOrder=DESC')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const res = await request(server)
        .get('/api/weakness/mastery?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/weakness/mastery');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/weakness/update - 更新掌握度', () => {
    it('应该成功更新掌握度', async () => {
      const res = await request(server)
        .post('/api/weakness/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questions: [
            { knowledgePointId: 1, correct: true },
            { knowledgePointId: 2, correct: false }
          ]
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('应该拒绝缺少 questions 的请求', async () => {
      const res = await request(server)
        .post('/api/weakness/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', '题目数据格式不正确');
    });

    it('应该拒绝 questions 不是数组的请求', async () => {
      const res = await request(server)
        .post('/api/weakness/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ questions: 'not-an-array' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('应该处理空 questions 数组', async () => {
      const res = await request(server)
        .post('/api/weakness/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ questions: [] });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .post('/api/weakness/update')
        .send({ questions: [{ knowledgePointId: 1, correct: true }] });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/weakness/recommend - 获取推荐题目', () => {
    it('应该成功获取推荐题目', async () => {
      const res = await request(server)
        .get('/api/weakness/recommend?subject=math')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('应该支持 limit 参数', async () => {
      const res = await request(server)
        .get('/api/weakness/recommend?subject=math&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该拒绝缺少 subject 的请求', async () => {
      const res = await request(server)
        .get('/api/weakness/recommend')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', '科目参数不能为空');
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/weakness/recommend?subject=math');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/weakness/trend/:knowledgePointId - 获取掌握度趋势', () => {
    it('应该成功获取掌握度趋势', async () => {
      const res = await request(server)
        .get('/api/weakness/trend/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('应该支持 days 参数', async () => {
      const res = await request(server)
        .get('/api/weakness/trend/1?days=60')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/weakness/trend/1');

      expect(res.statusCode).toBe(401);
    });
  });
});
