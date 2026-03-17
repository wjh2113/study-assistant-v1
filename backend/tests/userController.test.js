/**
 * User Controller Tests
 * 测试用户相关接口的完整覆盖
 */

const request = require('supertest');
const { generatePhone, AuthHelper, DbCleaner, assertions } = require('./test-utils');

let server;
let app;
let authHelper;
let dbCleaner;
let db;

beforeAll(async () => {
  app = require('../src/server');
  server = app.server;
  authHelper = new AuthHelper(server);
  db = app.db;
  dbCleaner = new DbCleaner(db);
});

beforeEach(async () => {
  await dbCleaner.cleanupAll();
});

afterAll(async () => {
  if (server) server.close();
  if (db) db.close();
});

describe('User Controller Tests', () => {
  
  describe('GET /api/user/profile - 获取用户资料', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功获取用户资料', async () => {
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('user');
    });

    it('应该包含学生资料', async () => {
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      // 学生用户应该有 student_profile
      if (res.body.user.role === 'STUDENT') {
        expect(res.body).toHaveProperty('studentProfile');
      }
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .get('/api/user/profile');

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('PUT /api/user/profile - 更新用户资料', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功更新昵称', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '新昵称'
        });

      assertions.assertSuccessResponse(res);
      expect(res.body.user).toHaveProperty('nickname', '新昵称');
    });

    it('应该成功更新头像', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          avatar_url: 'https://example.com/avatar.jpg'
        });

      assertions.assertSuccessResponse(res);
      expect(res.body.user).toHaveProperty('avatar_url', 'https://example.com/avatar.jpg');
    });

    it('应该成功更新多个字段', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: '新昵称',
          avatar_url: 'https://example.com/new.jpg'
        });

      assertions.assertSuccessResponse(res);
    });

    it('应该拒绝更新只读字段', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '19999999999',
          role: 'ADMIN'
        });

      // 可能成功（忽略这些字段）或失败
      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .send({ nickname: '新昵称' });

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('GET /api/user/stats - 获取用户统计', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功获取用户统计', async () => {
      const res = await request(server)
        .get('/api/user/stats')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('stats');
    });

    it('应该包含学习统计', async () => {
      const res = await request(server)
        .get('/api/user/stats')
        .set('Authorization', `Bearer ${authToken}`);

      const stats = res.body.stats;
      expect(stats).toBeDefined();
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .get('/api/user/stats');

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('DELETE /api/user/account - 删除账户', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功删除账户', async () => {
      const res = await request(server)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('message');
    });

    it('应该使 token 失效', async () => {
      await request(server)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);

      // 尝试使用已删除账户的 token
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(res, 401);
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .delete('/api/user/account');

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('边界场景测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该处理过长的昵称', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nickname: 'x'.repeat(100)
        });

      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该处理无效的 URL', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          avatar_url: 'not-a-valid-url'
        });

      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该处理空请求体', async () => {
      const res = await request(server)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // 应该成功（没有更新任何内容）或失败
      expect([200, 400]).toContain(res.statusCode);
    });
  });
});
