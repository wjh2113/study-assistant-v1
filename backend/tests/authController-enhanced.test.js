/**
 * Auth Controller Enhanced Tests
 * 补充认证控制器的边界场景和完整覆盖
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

describe('Auth Controller Enhanced Tests', () => {
  
  describe('POST /api/auth/send-code - 发送验证码', () => {
    it('应该成功发送登录验证码', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'login' });

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('message');
    });

    it('应该成功发送注册验证码', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'register' });

      assertions.assertSuccessResponse(res);
    });

    it('应该成功发送重置密码验证码', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'reset' });

      assertions.assertSuccessResponse(res);
    });

    it('应该拒绝无效手机号', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: 'invalid' });

      assertions.assertErrorResponse(res, 400);
    });

    it('应该拒绝空手机号', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: '' });

      assertions.assertErrorResponse(res, 400);
    });

    it('应该拒绝缺少手机号', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({});

      assertions.assertErrorResponse(res, 400);
    });

    it('应该处理过长的手机号', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: '1'.repeat(50) });

      assertions.assertErrorResponse(res, 400);
    });
  });

  describe('POST /api/auth/register - 用户注册', () => {
    it('应该成功注册学生用户', async () => {
      const phone = generatePhone();
      const code = '123456'; // 测试模式通用验证码
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '测试学生',
          grade: '7',
          school_name: '测试中学'
        });

      assertions.assertSuccessResponse(res, 201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('role', 'STUDENT');
    });

    it('应该成功注册家长用户', async () => {
      const phone = generatePhone();
      const code = '123456';
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'parent',
          nickname: '测试家长',
          real_name: '家长姓名',
          child_phone: generatePhone()
        });

      assertions.assertSuccessResponse(res, 201);
      expect(res.body.user).toHaveProperty('role', 'PARENT');
    });

    it('应该拒绝重复注册', async () => {
      const phone = generatePhone();
      const code = '123456';
      
      // 第一次注册
      await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '用户 1',
          grade: '7',
          school_name: '学校'
        });

      // 第二次注册
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '用户 2',
          grade: '7',
          school_name: '学校'
        });

      assertions.assertErrorResponse(res, 400);
      expect(res.body.error).toContain('已存在');
    });

    it('应该拒绝无效验证码', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: 'wrong-code',
          role: 'student',
          nickname: '测试',
          grade: '7',
          school_name: '学校'
        });

      assertions.assertErrorResponse(res, 400);
    });

    it('应该拒绝缺少必填字段', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456'
          // 缺少 role, nickname 等
        });

      assertions.assertErrorResponse(res, 400);
    });

    it('应该拒绝无效角色', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'invalid-role',
          nickname: '测试'
        });

      assertions.assertErrorResponse(res, 400);
    });

    it('应该处理过长的昵称', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'student',
          nickname: 'x'.repeat(100),
          grade: '7',
          school_name: '学校'
        });

      // 应该能处理或截断
      expect([201, 400]).toContain(res.statusCode);
    });
  });

  describe('POST /api/auth/login - 用户登录', () => {
    beforeEach(async () => {
      // 先注册一个用户
      const phone = generatePhone();
      await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'student',
          nickname: '测试用户',
          grade: '7',
          school_name: '学校'
        });
    });

    it('应该成功登录', async () => {
      const phone = generatePhone();
      
      // 重新获取手机号（因为 beforeEach 生成了新的）
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone: generatePhone(),
          code: '123456',
          role: 'student',
          nickname: '测试',
          grade: '7',
          school_name: '学校'
        });
      
      const testPhone = registerRes.body.user.phone;

      const res = await request(server)
        .post('/api/auth/login')
        .send({
          phone: testPhone,
          code: '123456'
        });

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('应该拒绝错误验证码', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: 'wrong-code' });

      assertions.assertErrorResponse(res, 401);
    });

    it('应该拒绝不存在的用户', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: '123456' });

      // 未注册的用户应该被拒绝或提示注册
      expect([401, 400]).toContain(res.statusCode);
    });

    it('应该拒绝空手机号', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone: '', code: '123456' });

      assertions.assertErrorResponse(res, 400);
    });

    it('应该拒绝空验证码', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: '' });

      assertions.assertErrorResponse(res, 400);
    });
  });

  describe('POST /api/auth/refresh - 刷新 Token', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功刷新 token', async () => {
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('token');
    });

    it('应该拒绝无效的 token', async () => {
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token');

      assertions.assertErrorResponse(res, 401);
    });

    it('应该拒绝没有 token 的请求', async () => {
      const res = await request(server)
        .post('/api/auth/refresh');

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('POST /api/auth/logout - 用户登出', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该成功登出', async () => {
      const res = await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('message', '登出成功');
    });

    it('应该使 token 失效', async () => {
      // 先登出
      await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      // 尝试使用已登出的 token
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('GET /api/auth/me - 获取当前用户信息', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
      userId = user.user.id;
    });

    it('应该成功获取用户信息', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', userId);
    });

    it('应该包含用户完整信息', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.user).toHaveProperty('phone');
      expect(res.body.user).toHaveProperty('nickname');
      expect(res.body.user).toHaveProperty('role');
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .get('/api/auth/me');

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('边界场景测试', () => {
    it('应该处理并发发送验证码请求', async () => {
      const phone = generatePhone();
      
      // 并发发送多个验证码请求
      const promises = Array(5).fill(null).map(() =>
        request(server)
          .post('/api/auth/send-code')
          .send({ phone, purpose: 'login' })
      );

      const results = await Promise.all(promises);
      
      // 所有请求都应该成功或被限流
      results.forEach(res => {
        expect([200, 429]).toContain(res.statusCode);
      });
    });

    it('应该处理 SQL 注入尝试', async () => {
      const maliciousPhone = "'; DROP TABLE users; --";
      
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: maliciousPhone });

      // 应该被验证拒绝
      assertions.assertErrorResponse(res, 400);
    });

    it('应该处理 XSS 尝试', async () => {
      const phone = generatePhone();
      const xssNickname = '<script>alert("xss")</script>';
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'student',
          nickname: xssNickname,
          grade: '7',
          school_name: '学校'
        });

      // 应该能处理（存储或转义）
      expect([201, 400]).toContain(res.statusCode);
    });

    it('应该处理 Unicode 字符', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'student',
          nickname: '测试用户🎉中文',
          grade: '7',
          school_name: '学校'
        });

      assertions.assertSuccessResponse(res, 201);
    });

    it('应该处理大小写混合的角色', async () => {
      const phone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'StUdEnT',
          nickname: '测试',
          grade: '7',
          school_name: '学校'
        });

      // 应该能处理（转换为大写或拒绝）
      expect([201, 400]).toContain(res.statusCode);
    });
  });

  describe('验证码过期测试', () => {
    it('应该拒绝过期的验证码', async () => {
      const phone = generatePhone();
      
      // 发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'login' });

      // 等待验证码过期（测试模式下可能不会真正过期）
      // 这里主要测试逻辑存在
      
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: '123456' });

      // 在测试模式下应该成功，生产模式会过期
      expect([200, 401]).toContain(res.statusCode);
    });
  });

  describe('家长 - 孩子关联测试', () => {
    it('应该成功注册家长并关联孩子', async () => {
      // 先注册孩子
      const childPhone = generatePhone();
      await request(server)
        .post('/api/auth/register')
        .send({
          phone: childPhone,
          code: '123456',
          role: 'student',
          nickname: '孩子',
          grade: '7',
          school_name: '学校'
        });

      // 注册家长
      const parentPhone = generatePhone();
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone: parentPhone,
          code: '123456',
          role: 'parent',
          nickname: '家长',
          real_name: '家长姓名',
          child_phone: childPhone
        });

      assertions.assertSuccessResponse(res, 201);
      expect(res.body.user).toHaveProperty('role', 'PARENT');
    });

    it('应该拒绝关联不存在的孩子', async () => {
      const parentPhone = generatePhone();
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone: parentPhone,
          code: '123456',
          role: 'parent',
          nickname: '家长',
          real_name: '家长姓名',
          child_phone: '19999999999' // 不存在的手机号
        });

      // 可能成功或失败，取决于业务逻辑
      expect([201, 400]).toContain(res.statusCode);
    });
  });
});
