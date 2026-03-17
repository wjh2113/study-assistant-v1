/**
 * Progress Controller 完整测试
 * 覆盖所有 API 端点：upsert, log, getList, getStats
 * 目标：progressController 覆盖率 100%
 */

const request = require('supertest');
const { generatePhone, AuthHelper, DbCleaner } = require('./test-utils');

let server, authHelper, dbCleaner, db;

// 启动服务器
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

// ============================================================================
// Progress Controller 测试
// ============================================================================

describe('ProgressController', () => {
  let authToken;

  beforeEach(async () => {
    const phone = generatePhone();
    const result = await authHelper.createAndLogin({ phone });
    authToken = result.token;
  });

  describe('POST /api/progress/upsert - 创建或更新学习进度', () => {
    it('应该成功创建学习进度记录', async () => {
      const res = await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          knowledgePointId: 1,
          studyDuration: 30,
          completionRate: 50
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '更新成功');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
    });

    it('应该成功更新现有学习进度记录', async () => {
      await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, studyDuration: 10, completionRate: 20 });

      const res = await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, studyDuration: 20, completionRate: 80 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id');
    });

    it('应该拒绝缺少 knowledgePointId 的请求', async () => {
      const res = await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ studyDuration: 30, completionRate: 50 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '知识点 ID 不能为空');
    });

    it('应该处理 studyDuration 为 0 的情况', async () => {
      const res = await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, studyDuration: 0, completionRate: 0 });

      expect(res.statusCode).toBe(200);
    });

    it('应该处理缺少 studyDuration 和 completionRate 的情况', async () => {
      const res = await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1 });

      expect(res.statusCode).toBe(200);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .post('/api/progress/upsert')
        .send({ knowledgePointId: 1, studyDuration: 30 });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/progress/log - 记录学习时长', () => {
    it('应该成功记录学习时长', async () => {
      const res = await request(server)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, duration: 45 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '学习时长记录成功');
      expect(res.body).toHaveProperty('data');
    });

    it('应该累加多次记录的学习时长', async () => {
      await request(server)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, duration: 30 });

      const res = await request(server)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, duration: 20 });

      expect(res.statusCode).toBe(200);
    });

    it('应该拒绝缺少 knowledgePointId 的请求', async () => {
      const res = await request(server)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ duration: 30 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '知识点 ID 和学习时长不能为空');
    });

    it('应该拒绝缺少 duration 的请求', async () => {
      const res = await request(server)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '知识点 ID 和学习时长不能为空');
    });

    it('应该处理 duration 为 0 的情况', async () => {
      const res = await request(server)
        .post('/api/progress/log')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, duration: 0 });

      expect(res.statusCode).toBe(200);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .post('/api/progress/log')
        .send({ knowledgePointId: 1, duration: 30 });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/progress - 获取学习进度列表', () => {
    it('应该成功获取学习进度列表', async () => {
      await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, studyDuration: 30, completionRate: 50 });

      const res = await request(server)
        .get('/api/progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该返回空数组当没有数据时', async () => {
      const res = await request(server)
        .get('/api/progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/progress');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/progress/stats - 获取学习统计', () => {
    it('应该成功获取学习统计', async () => {
      await request(server)
        .post('/api/progress/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ knowledgePointId: 1, studyDuration: 30, completionRate: 50 });

      const res = await request(server)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('totalPoints');
      expect(res.body.data).toHaveProperty('totalDuration');
    });

    it('应该返回默认值当没有数据时', async () => {
      const res = await request(server)
        .get('/api/progress/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({
        totalPoints: 0,
        totalDuration: 0,
        avgCompletionRate: 0,
        completedPoints: 0
      });
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/progress/stats');

      expect(res.statusCode).toBe(401);
    });
  });
});
