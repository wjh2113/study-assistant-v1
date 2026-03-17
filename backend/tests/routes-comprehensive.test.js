/**
 * 路由层综合测试
 * 覆盖所有路由文件
 * 目标：路由层覆盖率 100%
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
// Auth Routes 测试
// ============================================================================

describe('Auth Routes', () => {
  describe('POST /api/auth/send-code', () => {
    it('应该路由到发送验证码接口', async () => {
      const phone = generatePhone();
      const res = await request(server)
        .post('/api/auth/send-code')
        .send({ phone });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该路由到登录接口', async () => {
      const phone = generatePhone();
      await request(server).post('/api/auth/send-code').send({ phone });
      
      const res = await request(server)
        .post('/api/auth/login')
        .send({ phone, code: '123456' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/auth/register', () => {
    it('应该路由到注册接口', async () => {
      const phone = generatePhone();
      await request(server).post('/api/auth/send-code').send({ phone, purpose: 'register' });
      
      const res = await request(server)
        .post('/api/auth/register')
        .send({ phone, code: '123456', nickname: '测试用户' });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该路由到获取当前用户接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/auth/user', () => {
    it('应该路由到更新用户接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/auth/user')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '新昵称' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('应该路由到刷新 token 接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// AI Routes 测试
// ============================================================================

describe('AI Routes', () => {
  describe('POST /api/ai/ask', () => {
    it('应该路由到 AI 提问接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '测试问题' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/ai/history', () => {
    it('应该路由到获取历史接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/ai/search', () => {
    it('应该路由到搜索接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/ai/search?keyword=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/ai/history/:id', () => {
    it('应该路由到删除接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/ai/history/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// Practice Routes 测试
// ============================================================================

describe('Practice Routes', () => {
  describe('POST /api/practice/sessions', () => {
    it('应该路由到创建会话接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ textbookId: 'book-1', unitId: 'unit-1' });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /api/practice/sessions', () => {
    it('应该路由到获取会话列表接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/practice/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/practice/sessions/:id', () => {
    it('应该路由到获取会话详情接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/practice/sessions/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/practice/sessions/:id', () => {
    it('应该路由到更新会话接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/practice/sessions/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/practice/sessions/:id', () => {
    it('应该路由到删除会话接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/practice/sessions/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('POST /api/practice/sessions/:id/questions', () => {
    it('应该路由到添加问题接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/practice/sessions/test-id/questions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'multiple_choice', question: '测试', answer: 'A' });

      expect([201, 404]).toContain(res.statusCode);
    });
  });

  describe('POST /api/practice/sessions/:id/answers', () => {
    it('应该路由到提交答案接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/practice/sessions/test-id/answers')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: 'q1', answer: 'A' });

      expect([201, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/practice/sessions/:id/answers', () => {
    it('应该路由到获取答题记录接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/practice/sessions/test-id/answers')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// Knowledge Routes 测试
// ============================================================================

describe('Knowledge Routes', () => {
  describe('POST /api/knowledge/points', () => {
    it('应该路由到创建知识点接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '测试知识点', content: '内容' });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('GET /api/knowledge/points', () => {
    it('应该路由到获取知识点列表接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/knowledge/points')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/knowledge/points/:id', () => {
    it('应该路由到获取知识点详情接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/knowledge/points/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('PUT /api/knowledge/points/:id', () => {
    it('应该路由到更新知识点接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/knowledge/points/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '新标题' });

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/knowledge/points/:id', () => {
    it('应该路由到删除知识点接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .delete('/api/knowledge/points/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/knowledge/points/search', () => {
    it('应该路由到搜索知识点接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/knowledge/points/search?keyword=测试')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// Health Routes 测试
// ============================================================================

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('应该路由到健康检查接口', async () => {
      const res = await request(server).get('/api/health');
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/health/ready', () => {
    it('应该路由到就绪检查接口', async () => {
      const res = await request(server).get('/api/health/ready');
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/health/live', () => {
    it('应该路由到存活检查接口', async () => {
      const res = await request(server).get('/api/health/live');
      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// Progress Routes 测试
// ============================================================================

describe('Progress Routes', () => {
  describe('GET /api/progress', () => {
    it('应该路由到获取进度接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/progress/knowledge-points', () => {
    it('应该路由到获取知识点进度接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/progress/knowledge-points')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/progress/knowledge-points/:id', () => {
    it('应该路由到更新知识点进度接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/progress/knowledge-points/test-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ completion_rate: 0.5 });

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// Leaderboard Routes 测试
// ============================================================================

describe('Leaderboard Routes', () => {
  describe('GET /api/leaderboard', () => {
    it('应该路由到获取排行榜接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/leaderboard/weekly', () => {
    it('应该路由到获取周榜接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/leaderboard/monthly', () => {
    it('应该路由到获取月榜接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard/monthly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/leaderboard/my-rank', () => {
    it('应该路由到获取我的排名接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/leaderboard/my-rank')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// Points Routes 测试
// ============================================================================

describe('Points Routes', () => {
  describe('GET /api/points', () => {
    it('应该路由到获取积分接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/points')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/points/ledger', () => {
    it('应该路由到获取积分明细接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/points/ledger')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// Weakness Routes 测试
// ============================================================================

describe('Weakness Routes', () => {
  describe('GET /api/weakness/analysis', () => {
    it('应该路由到弱点分析接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/weakness/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/weakness/improve', () => {
    it('应该路由到弱点提升接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/weakness/improve')
        .set('Authorization', `Bearer ${token}`)
        .send({ knowledgePointId: 'kp-1' });

      expect([200, 400]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// Textbook Routes 测试
// ============================================================================

describe('Textbook Routes', () => {
  describe('GET /api/textbooks', () => {
    it('应该路由到获取教材列表接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/textbooks/:id', () => {
    it('应该路由到获取教材详情接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/test-id')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('POST /api/textbooks/:id/parse', () => {
    it('应该路由到解析教材接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/textbooks/test-id/parse')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('GET /api/textbooks/:id/units', () => {
    it('应该路由到获取单元列表接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/textbooks/test-id/units')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// Upload Routes 测试
// ============================================================================

describe('Upload Routes', () => {
  describe('POST /api/upload/textbook', () => {
    it('应该路由到上传教材接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/upload/textbook')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400, 500]).toContain(res.statusCode);
    });
  });
});

// ============================================================================
// AI Gateway Routes 测试
// ============================================================================

describe('AI Gateway Routes', () => {
  describe('POST /api/ai-gateway/chat', () => {
    it('应该路由到 AI 聊天接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai-gateway/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '你好' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/ai-gateway/grade', () => {
    it('应该路由到 AI 评分接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai-gateway/grade')
        .set('Authorization', `Bearer ${token}`)
        .send({ answer: '测试答案', correctAnswer: '正确答案' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/ai-gateway/generate', () => {
    it('应该路由到 AI 生成接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai-gateway/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: '生成题目' });

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// AI Gateway V2 Routes 测试
// ============================================================================

describe('AI Gateway V2 Routes', () => {
  describe('POST /api/ai-gateway-v2/chat', () => {
    it('应该路由到 AI 聊天 V2 接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai-gateway-v2/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '你好' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /api/ai-gateway-v2/analyze', () => {
    it('应该路由到 AI 分析 V2 接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai-gateway-v2/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '测试内容' });

      expect(res.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// AI Planning Routes 测试
// ============================================================================

describe('AI Planning Routes', () => {
  describe('POST /api/ai-planning/generate', () => {
    it('应该路由到生成学习计划接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .post('/api/ai-planning/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ goals: ['提高数学成绩'] });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/ai-planning/my-plan', () => {
    it('应该路由到获取我的计划接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .get('/api/ai-planning/my-plan')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/ai-planning/my-plan', () => {
    it('应该路由到更新我的计划接口', async () => {
      const { token } = await authHelper.createAndLogin();
      
      const res = await request(server)
        .put('/api/ai-planning/my-plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: '新计划' });

      expect(res.statusCode).toBe(200);
    });
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
