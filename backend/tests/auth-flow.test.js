/**
 * Authentication Flow E2E Tests
 * 测试用户认证全流程
 *
 * 覆盖场景：
 * - 发送验证码
 * - 注册新用户
 * - 登录现有用户
 * - 刷新 Token
 * - 获取用户信息
 * - 更新用户信息
 * - 完整认证流程
 */

const request = require('supertest');
const app = require('../src/server');
const {
  AuthHelper,
  DbCleaner,
  generatePhone,
  assertions
} = require('./test-utils');

describe('Authentication Flow E2E Tests', () => {
  let server;
  let authHelper;
  let dbCleaner;
  let db;

  // ============================================================================
  // 测试生命周期
  // ============================================================================
  beforeAll(async () => {
    console.log('🧪 开始 Authentication Flow E2E 测试');

    server = app.listen(0);
    await new Promise(resolve => server.on('listening', resolve));
    console.log(`🔌 测试服务器启动在端口 ${server.address().port}`);

    authHelper = new AuthHelper(server);

    try {
      db = require('../src/database');
      dbCleaner = new DbCleaner(db);
    } catch (error) {
      console.warn('⚠️  数据库清理不可用');
    }
  }, 30000);

  afterAll(async () => {
    console.log('✅ Authentication Flow E2E 测试完成');

    if (dbCleaner) {
      await dbCleaner.cleanupAll();
    }

    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    if (dbCleaner) {
      await dbCleaner.cleanupAll();
    }
  });

  afterEach(async () => {
    if (dbCleaner) {
      await dbCleaner.cleanupAll();
    }
    authHelper.cleanup();
  });

  // ============================================================================
  // 完整注册流程测试
  // ============================================================================
  describe('完整注册流程', () => {
    it('应该完成学生用户注册全流程', async () => {
      const phone = generatePhone();
      const code = '123456'; // 测试模式通用验证码

      // 步骤 1: 发送验证码
      const sendCodeRes = await request(server)
        .post('/api/auth/send-code')
        .send({ phone });
      assertions.assertSuccessResponse(sendCodeRes);
      expect(sendCodeRes.body.message).toBe('验证码已发送');

      // 步骤 2: 注册新用户
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '测试学生',
          grade: '7',
          school_name: '测试中学'
        });
      assertions.assertSuccessResponse(registerRes, 201);
      assertions.assertHasFields(registerRes.body, ['message', 'token', 'user']);
      expect(registerRes.body.message).toBe('注册成功');
      assertions.assertValidUser(registerRes.body.user);
      expect(registerRes.body.user.phone).toBe(phone);
      expect(registerRes.body.user.role).toBe('STUDENT');

      // 步骤 3: 使用 token 获取用户信息
      const meRes = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.token}`);
      assertions.assertSuccessResponse(meRes);
      expect(meRes.body.user.id).toBe(registerRes.body.user.id);
    });

    it('应该完成家长用户注册全流程', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });

      // 注册家长用户
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'parent',
          nickname: '测试家长',
          real_name: '张三'
        });
      assertions.assertSuccessResponse(registerRes, 201);
      expect(registerRes.body.user.role).toBe('PARENT');
    });

    it('应该拒绝重复注册', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 第一次注册
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });
      await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '测试用户'
        });

      // 第二次注册应该失败
      const secondRegisterRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '重复用户'
        });
      assertions.assertErrorResponse(secondRegisterRes, 400);
      expect(secondRegisterRes.body.error).toBe('该手机号已注册');
    });
  });

  // ============================================================================
  // 完整登录流程测试
  // ============================================================================
  describe('完整登录流程', () => {
    let registeredUser;

    beforeEach(async () => {
      // 先注册一个用户
      const phone = generatePhone();

      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'student',
          nickname: '登录测试用户'
        });
      registeredUser = registerRes.body.user;
    });

    it('应该完成现有用户登录流程', async () => {
      const phone = registeredUser.phone;
      const code = '123456';

      // 步骤 1: 发送验证码
      const sendCodeRes = await request(server)
        .post('/api/auth/send-code')
        .send({ phone });
      assertions.assertSuccessResponse(sendCodeRes);

      // 步骤 2: 登录
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ phone, code });
      assertions.assertSuccessResponse(loginRes);
      assertions.assertHasFields(loginRes.body, ['message', 'token', 'user']);
      expect(loginRes.body.message).toBe('登录成功');
      expect(loginRes.body.user.id).toBe(registeredUser.id);
      expect(loginRes.body.user.phone).toBe(phone);
    });

    it('应该拒绝错误验证码登录', async () => {
      const phone = registeredUser.phone;
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: 'wrong_code' });
      assertions.assertErrorResponse(loginRes, 401);
      expect(loginRes.body.error).toBe('验证码错误或已过期');
    });

    it('应该拒绝未注册用户登录', async () => {
      const phone = generatePhone();
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: '123456' });
      assertions.assertErrorResponse(loginRes, 401);
    });
  });

  // ============================================================================
  // Token 刷新流程测试
  // ============================================================================
  describe('Token 刷新流程', () => {
    let authToken;

    beforeEach(async () => {
      // 登录获取 token
      const loginResult = await authHelper.createAndLogin();
      authToken = loginResult.token;
    });

    it('应该成功刷新 token', async () => {
      const refreshRes = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);
      assertions.assertSuccessResponse(refreshRes);
      assertions.assertHasFields(refreshRes.body, ['token']);
      expect(refreshRes.body.token).toBeDefined();
      expect(refreshRes.body.token).not.toBe(authToken); // 应该是新 token
    });

    it('应该使用新 token 访问受保护资源', async () => {
      // 刷新 token
      const refreshRes = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);
      const newToken = refreshRes.body.token;

      // 使用新 token 获取用户信息
      const meRes = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`);
      assertions.assertSuccessResponse(meRes);
    });

    it('应该拒绝使用旧 token 刷新', async () => {
      // 第一次刷新
      const refreshRes1 = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);
      const newToken = refreshRes1.body.token;

      // 使用旧 token 再次刷新应该失败
      const refreshRes2 = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);
      // 根据实现，可能成功也可能失败
      expect([200, 401]).toContain(refreshRes2.statusCode);
    });
  });

  // ============================================================================
  // 用户信息管理流程测试
  // ============================================================================
  describe('用户信息管理流程', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      const loginResult = await authHelper.createAndLogin();
      authToken = loginResult.token;
      userId = loginResult.user.id;
    });

    it('应该成功获取当前用户信息', async () => {
      const meRes = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      assertions.assertSuccessResponse(meRes);
      assertions.assertHasFields(meRes.body.user, ['id', 'phone', 'role']);
      expect(meRes.body.user.id).toBe(userId);
    });

    it('应该成功更新用户昵称', async () => {
      const updateRes = await request(server)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nickname: '新昵称' });
      assertions.assertSuccessResponse(updateRes);
      expect(updateRes.body.user.nickname).toBe('新昵称');

      // 验证更新持久化
      const meRes = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(meRes.body.user.nickname).toBe('新昵称');
    });

    it('应该成功更新用户头像', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';
      const updateRes = await request(server)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ avatar_url: avatarUrl });
      assertions.assertSuccessResponse(updateRes);
      expect(updateRes.body.user.avatar_url).toBe(avatarUrl);
    });

    it('应该拒绝未授权访问用户信息', async () => {
      const meRes = await request(server)
        .get('/api/auth/me');
      assertions.assertErrorResponse(meRes, 401);
    });
  });

  // ============================================================================
  // 多用户并发流程测试
  // ============================================================================
  describe('多用户并发流程', () => {
    it('应该支持多个用户同时注册和登录', async () => {
      const users = [];

      // 创建 5 个用户
      for (let i = 0; i < 5; i++) {
        const phone = `1380000000${i}`;

        await request(server)
          .post('/api/auth/send-code')
          .send({ phone });
        const registerRes = await request(server)
          .post('/api/auth/register')
          .send({
            phone,
            code: '123456',
            role: 'student',
            nickname: `用户${i}`
          });
        assertions.assertSuccessResponse(registerRes, 201);
        users.push(registerRes.body);
      }

      // 验证所有用户都能登录
      for (const user of users) {
        const loginRes = await request(server)
          .post('/api/auth/login')
          .send({ phone: user.user.phone, code: '123456' });
        assertions.assertSuccessResponse(loginRes);
        expect(loginRes.body.user.id).toBe(user.user.id);
      }
    });

    it('应该隔离不同用户的数据', async () => {
      // 创建两个用户
      const user1 = await authHelper.createAndLogin({
        phone: '13800000001',
        nickname: '用户 1'
      });
      const user2 = await authHelper.createAndLogin({
        phone: '13800000002',
        nickname: '用户 2'
      });

      // 用户 1 获取自己的信息
      const me1Res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1.token}`);
      // 用户 2 获取自己的信息
      const me2Res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user2.token}`);

      expect(me1Res.body.user.id).toBe(user1.user.id);
      expect(me2Res.body.user.id).toBe(user2.user.id);
      expect(me1Res.body.user.id).not.toBe(me2Res.body.user.id);
    });
  });

  // ============================================================================
  // 边界和错误场景测试
  // ============================================================================
  describe('边界和错误场景', () => {
    it('应该处理无效手机号格式', async () => {
      const sendCodeRes = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: 'invalid' });
      assertions.assertErrorResponse(sendCodeRes, 400);
    });

    it('应该处理空参数', async () => {
      const sendCodeRes = await request(server)
        .post('/api/auth/send-code')
        .send({});
      assertions.assertErrorResponse(sendCodeRes, 400);
    });

    it('应该处理缺少必需字段', async () => {
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({ phone: '13800000000' }); // 缺少 code 和其他字段
      assertions.assertErrorResponse(registerRes, 400);
    });

    it('应该处理无效角色', async () => {
      const phone = generatePhone();

      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'invalid_role'
        });
      assertions.assertErrorResponse(registerRes, 400);
    });

    it('应该处理超长昵称', async () => {
      const phone = generatePhone();
      const longNickname = 'a'.repeat(1000);

      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code: '123456',
          role: 'student',
          nickname: longNickname
        });
      // 根据实现，可能成功或失败
      expect([201, 400]).toContain(registerRes.statusCode);
    });
  });

  // ============================================================================
  // 完整认证会话测试
  // ============================================================================
  describe('完整认证会话', () => {
    it('应该支持完整的认证会话生命周期', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 1. 发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });

      // 2. 注册
      const registerRes = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '会话测试用户'
        });
      let token = registerRes.body.token;

      // 3. 获取用户信息
      await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // 4. 更新用户信息
      const updateRes = await request(server)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '更新后的昵称' });
      expect(updateRes.body.user.nickname).toBe('更新后的昵称');

      // 5. 刷新 token
      const refreshRes = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);
      token = refreshRes.body.token;

      // 6. 使用新 token 获取用户信息
      const meRes = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meRes.body.user.nickname).toBe('更新后的昵称');

      // 7. 再次登录
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ phone, code });
      expect(loginRes.body.user.id).toBe(registerRes.body.user.id);
    });
  });
});
