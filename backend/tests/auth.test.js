const request = require('supertest');
const app = require('../src/server');
const UserModel = require('../src/models/User');

describe('Auth Module API Tests', () => {
  let authToken;
  const testPhone = '13800138000';
  const testCode = '123456';
  let server;

  // BUG-API-003 修复：启动服务器并监听随机端口
  beforeAll((done) => {
    console.log('🧪 开始 Auth 模块测试');
    server = app.listen(0, () => {
      console.log(`🔌 测试服务器启动在端口 ${server.address().port}`);
      done();
    });
  });

  // BUG-API-003 修复：测试完成后关闭服务器
  afterAll((done) => {
    console.log('✅ Auth 模块测试完成');
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('POST /api/auth/send-code - 发送验证码', () => {
    it('应该成功发送验证码到有效手机号', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('验证码已发送');
      expect(res.body).toHaveProperty('hint');
    });

    it('应该拒绝无效手机号格式', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: '12345' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('手机号格式无效');
    });

    it('应该拒绝空手机号', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login - 登录', () => {
    it('应该成功登录并返回 token', async () => {
      // 先发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone: testPhone, code: testCode });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '登录成功');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user.phone).toBe(testPhone);

      authToken = res.body.token;
    });

    it('应该拒绝错误验证码', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone: testPhone, code: '999999' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('验证码错误或已过期');
    });

    it('应该拒绝空参数', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('手机号和验证码不能为空');
    });

    it('应该拒绝无效手机号格式', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone: 'invalid', code: testCode });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('手机号格式无效');
    });
  });

  describe('POST /api/auth/register - 注册', () => {
    const newPhone = '13900139000';

    it('应该成功注册新用户 (student)', async () => {
      // 先发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone: newPhone });

      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone: newPhone,
          code: testCode,
          role: 'student',
          nickname: '测试学生',
          grade: '高一',
          school_name: '测试中学'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', '注册成功');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.nickname).toBe('测试学生');
    });

    it('应该成功注册新用户 (parent)', async () => {
      const parentPhone = '13900139001';
      
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone: parentPhone });

      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone: parentPhone,
          code: testCode,
          role: 'parent',
          nickname: '测试家长',
          real_name: '张三'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('parent');
    });

    it('应该拒绝已注册的手机号', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone: testPhone,
          code: testCode,
          role: 'student',
          nickname: '重复测试'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('该手机号已注册');
    });

    it('应该拒绝无效角色', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone: '13900139002',
          code: testCode,
          role: 'admin'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('角色必须是 student 或 parent');
    });
  });

  describe('POST /api/auth/refresh - 刷新 Token', () => {
    it('应该成功刷新 token', async () => {
      if (!authToken) {
        // 先登录获取 token
        const loginRes = await request(server)
          .post('/api/auth/login')
          .send({ phone: testPhone, code: testCode });
        authToken = loginRes.body.token;
      }

      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('应该拒绝无 token 请求', async () => {
      const res = await request(server)
        .post('/api/auth/refresh');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('未授权');
    });

    it('应该拒绝无效 token', async () => {
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me - 获取当前用户信息', () => {
    it('应该成功获取用户信息', async () => {
      if (!authToken) {
        const loginRes = await request(server)
          .post('/api/auth/login')
          .send({ phone: testPhone, code: testCode });
        authToken = loginRes.body.token;
      }

      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('phone');
      expect(res.body.user).toHaveProperty('role');
    });

    it('应该拒绝未授权请求', async () => {
      const res = await request(server)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/auth/me - 更新用户信息', () => {
    it('应该成功更新用户昵称', async () => {
      if (!authToken) {
        const loginRes = await request(server)
          .post('/api/auth/login')
          .send({ phone: testPhone, code: testCode });
        authToken = loginRes.body.token;
      }

      const res = await request(server)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nickname: '新昵称' });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.nickname).toBe('新昵称');
    });
  });
});
