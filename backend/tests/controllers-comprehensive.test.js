/**
 * 控制器层综合测试
 * 覆盖所有控制器：auth, ai, practice, user(knowledge), health
 * 目标：控制器层覆盖率 100%
 */

const request = require('supertest');
const dbModule = require('../src/config/database');
const { db, initDatabase } = dbModule;
const verificationService = require('../src/services/verificationService');
const { generatePhone, AuthHelper, DbCleaner, assertions } = require('./test-utils');

let app, server, authHelper, dbCleaner;

// 启动服务器
beforeAll(async () => {
  // 初始化数据库表
  if (initDatabase && typeof initDatabase === 'function') {
    initDatabase();
  }
  
  const express = require('express');
  const cors = require('cors');
  
  app = express();
  app.use(cors());
  app.use(express.json());

  // 注册所有路由
  app.use('/api/auth', require('../src/routes/auth'));
  app.use('/api/ai', require('../src/routes/ai'));
  app.use('/api/practice', require('../src/routes/practice'));
  app.use('/api/knowledge', require('../src/routes/knowledge'));
  app.use('/api/health', require('../src/routes/health'));
  app.use('/api/progress', require('../src/routes/progress'));
  app.use('/api/leaderboard', require('../src/routes/leaderboard'));
  app.use('/api/points', require('../src/routes/points'));
  app.use('/api/weakness', require('../src/routes/weakness'));
  app.use('/api/textbooks', require('../src/routes/textbooks'));
  app.use('/api/upload', require('../src/routes/upload'));
  app.use('/api/ai-gateway', require('../src/routes/ai-gateway'));
  app.use('/api/ai-gateway-v2', require('../src/routes/ai-gateway-v2'));
  app.use('/api/ai-planning', require('../src/routes/ai-planning'));

  // 启动服务器
  const http = require('http');
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  
  authHelper = new AuthHelper(server);
  dbCleaner = new DbCleaner(db);
});

// 清理数据库
beforeEach(async () => {
  await dbCleaner.cleanupAll();
});

// 关闭服务器
afterAll(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

// ============================================================================
// Auth Controller 测试
// ============================================================================

describe('AuthController', () => {
  describe('POST /api/auth/send-code', () => {
    it('应该成功发送验证码', async () => {
      const phone = generatePhone();
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'login' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '验证码已发送');
      expect(res.body).toHaveProperty('hint');
    });

    it('应该拒绝无效的手机号格式', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone: '12345' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '手机号格式无效');
    });

    it('应该拒绝无效的用途', async () => {
      const phone = generatePhone();
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'invalid' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '验证码用途无效');
    });

    it('应该处理发送错误', async () => {
      // 模拟速率限制
      const phone = generatePhone();
      for (let i = 0; i < 6; i++) {
        await request(server)
          .post('/api/auth/send-code')
          .send({ phone, purpose: 'login' });
      }
      
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'login' });

      expect([200, 429]).toContain(res.statusCode);
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录并返回 token', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 先发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone });

      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '登录成功');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user).toHaveProperty('phone', phone);
    });

    it('应该拒绝缺失手机号或验证码', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone: generatePhone() });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '手机号和验证码不能为空');
    });

    it('应该拒绝无效的验证码', async () => {
      const phone = generatePhone();
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: 'wrong' });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('应该拒绝无效的手机号格式', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone: 'invalid', code: '123456' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '手机号格式无效');
    });
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 先发送验证码
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'register' });

      const res = await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          nickname: '测试用户',
          grade: '7',
          school_name: '测试中学'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', '注册成功');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('role', 'STUDENT');
    });

    it('应该拒绝已注册的手机号', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 第一次注册
      await request(server)
        .post('/api/auth/send-code')
        .send({ phone, purpose: 'register' });

      await request(server)
        .post('/api/auth/register')
        .send({ phone, code, nickname: '用户 1' });

      // 第二次注册
      const res = await request(server)
        .post('/api/auth/register')
        .send({ phone, code, nickname: '用户 2' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '该手机号已注册');
    });

    it('应该拒绝缺失必要字段', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ phone: generatePhone() });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '手机号和验证码不能为空');
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该返回当前用户信息', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user).toHaveProperty('phone');
    });

    it('应该拒绝未授权的请求', async () => {
      const res = await request(server)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
    });

    it('应该拒绝无效的 token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/auth/user', () => {
    it('应该更新用户信息', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .put('/api/auth/user')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '新昵称', avatar_url: 'http://example.com/avatar.jpg' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '更新成功');
      expect(res.body.user).toHaveProperty('nickname', '新昵称');
    });

    it('应该拒绝未授权的请求', async () => {
      const res = await request(server)
        .put('/api/auth/user')
        .send({ nickname: '测试' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('应该刷新 token', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Token 刷新成功');
      expect(res.body).toHaveProperty('token');
    });

    it('应该拒绝无效的 token', async () => {
      const res = await request(server)
        .post('/api/auth/refresh-token')
        .set('Authorization', 'Bearer invalid');

      expect(res.statusCode).toBe(401);
    });
  });
});

// ============================================================================
// AI Controller 测试
// ============================================================================

describe('AIController', () => {
  describe('POST /api/ai/ask', () => {
    it('应该成功提问并返回答案', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '什么是勾股定理？' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '答疑成功');
      expect(res.body.data).toHaveProperty('question');
      expect(res.body.data).toHaveProperty('answer');
    });

    it('应该拒绝空问题', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '问题不能为空');
    });

    it('应该拒绝未授权的请求', async () => {
      const res = await request(server)
        .post('/api/ai/ask')
        .send({ question: '测试' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/ai/history', () => {
    it('应该返回问答历史', async () => {
      const { token } = await authHelper.createAndLogin();

      // 先创建一个问答记录
      await request(server)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '测试问题' });

      const res = await request(server)
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/ai/history?limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /api/ai/search', () => {
    it('应该搜索问答记录', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/ai/search?keyword=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('应该拒绝空关键词', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/ai/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '搜索关键词不能为空');
    });
  });

  describe('DELETE /api/ai/history/:id', () => {
    it('应该删除问答记录', async () => {
      const { token } = await authHelper.createAndLogin();

      // 先创建一个问答记录
      const createRes = await request(server)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '测试问题' });

      const recordId = createRes.body.data.createdAt;

      const res = await request(server)
        .delete(`/api/ai/history/${recordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '删除成功');
    });

    it('应该拒绝删除不存在的记录', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .delete('/api/ai/history/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', '记录不存在');
    });
  });
});

// ============================================================================
// Practice Controller 测试
// ============================================================================

describe('PracticeController', () => {
  describe('POST /api/practice/sessions', () => {
    it('应该创建练习会话', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', '创建成功');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('status', 'active');
    });

    it('应该拒绝未授权的请求', async () => {
      const res = await request(server)
        .post('/api/practice/sessions')
        .send({ textbookId: 'test' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/practice/sessions', () => {
    it('应该获取会话列表', async () => {
      const { token } = await authHelper.createAndLogin();

      // 先创建一个会话
      await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该支持状态过滤', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/practice/sessions?status=active')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /api/practice/sessions/:id', () => {
    it('应该获取会话详情', async () => {
      const { token } = await authHelper.createAndLogin();

      // 先创建一个会话
      const createRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const sessionId = createRes.body.data.id;

      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id', sessionId);
    });

    it('应该拒绝访问不存在的会话', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/practice/sessions/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/practice/sessions/:id', () => {
    it('应该更新会话状态', async () => {
      const { token } = await authHelper.createAndLogin();

      // 先创建一个会话
      const createRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const sessionId = createRes.body.data.id;

      const res = await request(server)
        .put(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed', score: 90 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '更新成功');
    });
  });

  describe('DELETE /api/practice/sessions/:id', () => {
    it('应该删除会话', async () => {
      const { token } = await authHelper.createAndLogin();

      const createRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const sessionId = createRes.body.data.id;

      const res = await request(server)
        .delete(`/api/practice/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '删除成功');
    });
  });

  describe('POST /api/practice/sessions/:id/questions', () => {
    it('应该添加问题到会话', async () => {
      const { token } = await authHelper.createAndLogin();

      const createRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const sessionId = createRes.body.data.id;

      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'multiple_choice',
          question: '1+1=?',
          options: ['A.1', 'B.2', 'C.3', 'D.4'],
          answer: 'B',
          explanation: '简单加法'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', '添加成功');
    });
  });

  describe('POST /api/practice/sessions/:id/answers', () => {
    it('应该提交答案', async () => {
      const { token } = await authHelper.createAndLogin();

      const sessionRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const sessionId = sessionRes.body.data.id;

      // 先添加一个问题
      const questionRes = await request(server)
        .post(`/api/practice/sessions/${sessionId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'multiple_choice',
          question: '1+1=?',
          options: ['A.1', 'B.2'],
          answer: 'B'
        });

      const questionId = questionRes.body.data.id;

      const res = await request(server)
        .post(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, answer: 'B', isCorrect: true });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', '提交成功');
    });
  });

  describe('GET /api/practice/sessions/:id/answers', () => {
    it('应该获取答题记录', async () => {
      const { token } = await authHelper.createAndLogin();

      const sessionRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'test-book-1', unitId: 'unit-1' });

      const sessionId = sessionRes.body.data.id;

      const res = await request(server)
        .get(`/api/practice/sessions/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });
  });
});

// ============================================================================
// Knowledge Controller 测试
// ============================================================================

describe('KnowledgeController', () => {
  describe('POST /api/knowledge/points', () => {
    it('应该创建知识点', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '勾股定理',
          content: '直角三角形两直角边的平方和等于斜边的平方',
          category: '数学',
          tags: ['几何', '三角形']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', '创建成功');
      expect(res.body.data).toHaveProperty('title', '勾股定理');
    });

    it('应该拒绝空标题', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '测试内容' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '知识点标题不能为空');
    });
  });

  describe('GET /api/knowledge/points', () => {
    it('应该获取知识点列表', async () => {
      const { token } = await authHelper.createAndLogin();

      // 先创建一个知识点
      await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '测试知识点', content: '内容' });

      const res = await request(server)
        .get('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('应该支持分类过滤', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/knowledge/points?category=数学')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /api/knowledge/points/:id', () => {
    it('应该获取知识点详情', async () => {
      const { token } = await authHelper.createAndLogin();

      const createRes = await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '测试知识点', content: '内容' });

      const pointId = createRes.body.data.id;

      const res = await request(server)
        .get(`/api/knowledge/points/${pointId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id', pointId);
    });

    it('应该拒绝访问不存在的知识点', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/knowledge/points/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/knowledge/points/:id', () => {
    it('应该更新知识点', async () => {
      const { token } = await authHelper.createAndLogin();

      const createRes = await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '原标题', content: '原内容' });

      const pointId = createRes.body.data.id;

      const res = await request(server)
        .put(`/api/knowledge/points/${pointId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '新标题' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '更新成功');
    });
  });

  describe('DELETE /api/knowledge/points/:id', () => {
    it('应该删除知识点', async () => {
      const { token } = await authHelper.createAndLogin();

      const createRes = await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '测试知识点', content: '内容' });

      const pointId = createRes.body.data.id;

      const res = await request(server)
        .delete(`/api/knowledge/points/${pointId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', '删除成功');
    });
  });

  describe('GET /api/knowledge/points/search', () => {
    it('应该搜索知识点', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/knowledge/points/search?keyword=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('应该拒绝空关键词', async () => {
      const { token } = await authHelper.createAndLogin();

      const res = await request(server)
        .get('/api/knowledge/points/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', '搜索关键词不能为空');
    });
  });
});

// ============================================================================
// Health Controller 测试
// ============================================================================

describe('HealthController', () => {
  describe('GET /api/health', () => {
    it('应该返回健康状态', async () => {
      const res = await request(server)
        .get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/health/ready', () => {
    it('应该返回就绪状态', async () => {
      const res = await request(server)
        .get('/api/health/ready');

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/health/live', () => {
    it('应该返回存活状态', async () => {
      const res = await request(server)
        .get('/api/health/live');

      expect(res.statusCode).toBe(200);
    });
  });
});
