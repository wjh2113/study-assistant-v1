/**
 * Textbook Routes 测试
 * 覆盖主要 API 端点：parse, tasks, get, delete
 * 目标：textbook routes 覆盖率提升
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

describe('Textbook Routes', () => {
  let authToken;

  beforeEach(async () => {
    const phone = generatePhone();
    const result = await authHelper.createAndLogin({ phone });
    authToken = result.token;
  });

  describe('POST /api/textbooks/parse - 创建解析任务', () => {
    it('应该成功创建解析任务', async () => {
      const res = await request(server)
        .post('/api/textbooks/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filePath: '/path/to/test.pdf',
          grade: 'grade-10',
          subject: 'math'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', '解析任务已创建');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('taskId');
    });

    it('应该拒绝缺少 filePath 的请求', async () => {
      const res = await request(server)
        .post('/api/textbooks/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ grade: 'grade-10', subject: 'math' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', '文件路径不能为空');
    });

    it('应该处理可选的 grade 和 subject 参数', async () => {
      const res = await request(server)
        .post('/api/textbooks/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ filePath: '/path/to/test.pdf' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .post('/api/textbooks/parse')
        .send({ filePath: '/path/to/test.pdf' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/textbooks/tasks/:taskId - 获取任务状态', () => {
    it('应该返回 404 当任务不存在时', async () => {
      const res = await request(server)
        .get('/api/textbooks/tasks/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', '任务不存在');
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/textbooks/tasks/1');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/textbooks/tasks - 获取任务列表', () => {
    it('应该成功获取任务列表', async () => {
      const res = await request(server)
        .get('/api/textbooks/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const res = await request(server)
        .get('/api/textbooks/tasks?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该支持按状态筛选', async () => {
      const res = await request(server)
        .get('/api/textbooks/tasks?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/textbooks/tasks');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/textbooks - 获取课本文本列表', () => {
    it('应该成功获取课本列表', async () => {
      const res = await request(server)
        .get('/api/textbooks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该返回空数组当没有课本时', async () => {
      const res = await request(server)
        .get('/api/textbooks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/textbooks');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/textbooks/:id - 获取课本详情', () => {
    it('应该返回 404 当课本不存在时', async () => {
      const res = await request(server)
        .get('/api/textbooks/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', '课本文本不存在');
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .get('/api/textbooks/1');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/textbooks/:id - 删除课本', () => {
    it('应该返回 404 当课本不存在时', async () => {
      const res = await request(server)
        .delete('/api/textbooks/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', '课本不存在');
    });

    it('应该在没有认证时拒绝请求', async () => {
      const res = await request(server)
        .delete('/api/textbooks/1');

      expect(res.statusCode).toBe(401);
    });
  });
});
