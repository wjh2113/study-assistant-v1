/**
 * 路由层完整测试 - 覆盖所有 9 大路由模块
 * 目标：routes 层覆盖率 85%+
 * 
 * 测试模块：
 * 1. 认证路由（/api/auth/*）
 * 2. AI 路由（/api/ai/*）
 * 3. 知识点路由（/api/knowledge/*）
 * 4. 练习路由（/api/practice/*）
 * 5. 用户路由（/api/user/*）
 * 6. 课本路由（/api/textbooks/*）
 * 7. 薄弱点路由（/api/weakness/*）
 * 8. 积分路由（/api/points/*）
 * 9. 排行榜路由（/api/leaderboard/*）
 */

const request = require('supertest');
const { db } = require('../src/config/database');
const { generatePhone, AuthHelper, DbCleaner } = require('./test-utils');

let app, server, authHelper, dbCleaner;

// 启动服务器
beforeAll(async () => {
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
// 1. 认证路由测试（/api/auth/*）
// ============================================================================

describe('1. Auth Routes - 认证路由', () => {
  describe('POST /api/auth/send-code', () => {
    it('应该成功发送验证码', async () => {
      const phone = generatePhone();
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('应该拒绝缺少手机号的请求', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录', async () => {
      const phone = generatePhone();
      await request(server).post('/api/auth/send-code').send({ phone });
      
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: '123456' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('应该拒绝错误的验证码', async () => {
      const phone = generatePhone();
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: 'wrong' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const phone = generatePhone();
      await request(server).post('/api/auth/send-code').send({ phone, purpose: 'register' });
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({ phone, code: '123456', nickname: '测试用户' });

      expect([200, 201]).toContain(res.statusCode);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该获取当前用户信息', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id');
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/auth/me', () => {
    it('应该更新用户信息', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '新昵称' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('应该刷新 token', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// 2. AI 路由测试（/api/ai/*）
// ============================================================================

describe('2. AI Routes - AI 路由', () => {
  describe('POST /api/ai/ask', () => {
    it('应该向 AI 提问', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '测试问题' });

      expect(res.statusCode).toBe(200);
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(server)
        .post('/api/ai/ask')
        .send({ question: '测试' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/ai/history', () => {
    it('应该获取 AI 对话历史', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/ai/search', () => {
    it('应该搜索 AI 历史', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/ai/search?keyword=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/ai/:id', () => {
    it('应该删除 AI 记录', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/ai/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// 3. 知识点路由测试（/api/knowledge/*）
// ============================================================================

describe('3. Knowledge Routes - 知识点路由', () => {
  describe('POST /api/knowledge/', () => {
    it('应该创建知识点', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/knowledge/')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '测试知识点', content: '内容' });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /api/knowledge/', () => {
    it('应该获取知识点列表', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/knowledge/')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/knowledge/search', () => {
    it('应该搜索知识点', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/knowledge/search?keyword=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/knowledge/:id', () => {
    it('应该获取单个知识点', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/knowledge/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/knowledge/:id', () => {
    it('应该更新知识点', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/knowledge/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '新标题' });

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/knowledge/:id', () => {
    it('应该删除知识点', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/knowledge/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// 4. 练习路由测试（/api/practice/*）
// ============================================================================

describe('4. Practice Routes - 练习路由', () => {
  describe('POST /api/practice/sessions', () => {
    it('应该创建练习会话', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'book-1', unitId: 'unit-1' });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /api/practice/sessions', () => {
    it('应该获取会话列表', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/practice/sessions/:id', () => {
    it('应该获取会话详情', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/practice/sessions/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/practice/sessions/:id', () => {
    it('应该更新会话状态', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/practice/sessions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/practice/sessions/:id', () => {
    it('应该删除会话', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/practice/sessions/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('POST /api/practice/sessions/:id/questions', () => {
    it('应该添加问题到会话', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/practice/sessions/test-id/questions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'multiple_choice', question: '测试', answer: 'A' });

      expect([201, 404]).toContain(res.statusCode);
    });
  });

  describe('POST /api/practice/sessions/:id/answers', () => {
    it('应该提交答案', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/practice/sessions/test-id/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: 'q1', answer: 'A' });

      expect([201, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/practice/sessions/:id/answers', () => {
    it('应该获取答题记录', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/practice/sessions/test-id/answers')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// 5. 用户路由测试（通过 auth 路由）
// ============================================================================

describe('5. User Routes - 用户路由', () => {
  describe('GET /api/auth/me', () => {
    it('应该获取当前用户信息', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('phone');
    });
  });

  describe('PUT /api/auth/me', () => {
    it('应该更新用户昵称', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '新昵称' });

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// 6. 课本路由测试（/api/textbooks/*）
// ============================================================================

describe('6. Textbook Routes - 课本路由', () => {
  describe('GET /api/textbooks/', () => {
    it('应该获取课本文本列表', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/textbooks/:id', () => {
    it('应该获取课本详情', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/textbooks/:id/units', () => {
    it('应该获取课本单元列表', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/test-id/units')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/textbooks/:id', () => {
    it('应该删除课本', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/textbooks/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/textbooks/tasks', () => {
    it('应该获取任务列表', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/textbooks/tasks/:taskId', () => {
    it('应该获取任务状态', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/tasks/test-task-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// 7. 薄弱点路由测试（/api/weakness/*）
// ============================================================================

describe('7. Weakness Routes - 薄弱点路由', () => {
  describe('GET /api/weakness/analyze', () => {
    it('应该分析薄弱点', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/weakness/analyze')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/weakness/mastery', () => {
    it('应该获取知识点掌握度列表', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/weakness/mastery')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/weakness/update', () => {
    it('应该更新掌握度', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/weakness/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ knowledgePointId: 'kp-1', mastery: 0.8 });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/weakness/recommend', () => {
    it('应该获取推荐题目', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/weakness/recommend')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/weakness/trend/:knowledgePointId', () => {
    it('应该获取掌握度趋势', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/weakness/trend/kp-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// 8. 积分路由测试（/api/points/*）
// ============================================================================

describe('8. Points Routes - 积分路由', () => {
  describe('GET /api/points/me', () => {
    it('应该获取我的积分', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/points/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/points/records', () => {
    it('应该获取积分记录', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/points/records')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/points/check-in', () => {
    it('应该打卡', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/points/check-in')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/points/practice', () => {
    it('应该记录练习积分', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/points/practice')
        .set('Authorization', `Bearer ${token}`)
        .send({ sessionId: 'session-1', points: 10 });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/points/check-in/status', () => {
    it('应该获取打卡状态', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/points/check-in/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// 9. 排行榜路由测试（/api/leaderboard/*）
// ============================================================================

describe('9. Leaderboard Routes - 排行榜路由', () => {
  describe('GET /api/leaderboard/:type?', () => {
    it('应该获取总排行榜', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });

    it('应该获取指定类型的排行榜', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/leaderboard/me/rank', () => {
    it('应该获取我的排名', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard/me/rank')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/leaderboard/history', () => {
    it('应该获取排行榜历史', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/leaderboard/refresh', () => {
    it('应该刷新排行榜', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/leaderboard/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// 认证中间件测试
// ============================================================================

describe('Auth Middleware Tests', () => {
  it('应该拒绝所有需要认证但未提供 token 的请求', async () => {
    const protectedRoutes = [
      { method: 'get', url: '/api/ai/history' },
      { method: 'get', url: '/api/knowledge/' },
      { method: 'get', url: '/api/practice/sessions' },
      { method: 'get', url: '/api/points/me' },
      { method: 'get', url: '/api/leaderboard' },
      { method: 'get', url: '/api/weakness/analyze' },
      { method: 'get', url: '/api/textbooks/' },
    ];

    for (const route of protectedRoutes) {
      const res = await request(server)[route.method](route.url);
      expect(res.statusCode).toBe(401);
    }
  });
});

// ============================================================================
// 404 处理测试
// ============================================================================

describe('404 Handling', () => {
  it('应该返回 404 对于不存在的路由', async () => {
    const res = await request(server).get('/api/non-existent');
    expect(res.statusCode).toBe(404);
  });

  it('应该返回 404 对于不存在的 POST 路由', async () => {
    const res = await request(server).post('/api/non-existent');
    expect(res.statusCode).toBe(404);
  });
});
