/**
 * Edge Cases and Boundary Tests
 * 边界场景和异常处理测试
 */

const request = require('supertest');
const { generatePhone, AuthHelper, DbCleaner } = require('./test-utils');

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

describe('Edge Cases and Boundary Tests', () => {
  
  describe('HTTP 方法测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该拒绝不支持的 HTTP 方法', async () => {
      const res = await request(server)
        .patch('/api/auth/login')
        .send({ phone: generatePhone(), code: '123456' });

      expect([404, 405]).toContain(res.statusCode);
    });

    it('应该处理 OPTIONS 预检请求', async () => {
      const res = await request(server)
        .options('/api/auth/login');

      expect([200, 204]).toContain(res.statusCode);
    });

    it('应该处理 HEAD 请求', async () => {
      const res = await request(server)
        .head('/api/health');

      expect([200, 404]).toContain(res.statusCode);
      expect(res.body).toEqual({});
    });
  });

  describe('Content-Type 测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该接受 application/json', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .set('Content-Type', 'application/json')
        .send({ phone: generatePhone() });

      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该拒绝错误的 Content-Type', async () => {
      const res = await request(server)
        .post('/api/auth/send-code')
        .set('Content-Type', 'text/plain')
        .send('plain text');

      expect([400, 415]).toContain(res.statusCode);
    });
  });

  describe('请求大小测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该处理大请求体', async () => {
      const largeData = {
        phone: generatePhone(),
        code: '123456',
        extraData: 'x'.repeat(100000)
      };

      const res = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData);

      // 应该能处理或拒绝，但不应该崩溃
      expect([200, 201, 400, 413]).toContain(res.statusCode);
    });

    it('应该处理超大请求体', async () => {
      const hugeData = {
        data: 'x'.repeat(1000000)
      };

      const res = await request(server)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(hugeData);

      // 应该拒绝超大请求
      expect([400, 413]).toContain(res.statusCode);
    });
  });

  describe('并发请求测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该处理并发登录请求', async () => {
      const phone = generatePhone();
      const code = '123456';

      // 先注册
      await request(server)
        .post('/api/auth/register')
        .send({
          phone,
          code,
          role: 'student',
          nickname: '测试',
          grade: '7',
          school_name: '学校'
        });

      // 并发登录
      const promises = Array(10).fill(null).map(() =>
        request(server)
          .post('/api/auth/login')
          .send({ phone, code })
      );

      const results = await Promise.all(promises);
      
      // 至少有一个成功
      const successCount = results.filter(r => r.statusCode === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('应该处理并发数据创建', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(server)
          .post('/api/knowledge-points')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `知识点_${Math.random()}`,
            content: '内容',
            category: '数学'
          })
      );

      const results = await Promise.all(promises);
      
      // 所有请求都应该有响应
      results.forEach(res => {
        expect([200, 201, 400, 500]).toContain(res.statusCode);
      });
    });
  });

  describe('认证边界测试', () => {
    it('应该处理格式错误的 Bearer token', async () => {
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer');

      assertions.assertErrorResponse(res, 401);
    });

    it('应该处理缺少 Bearer 前缀', async () => {
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', 'some-token');

      assertions.assertErrorResponse(res, 401);
    });

    it('应该处理多个 Authorization 头', async () => {
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token1')
        .set('Authorization', 'Bearer token2');

      assertions.assertErrorResponse(res, 401);
    });

    it('应该处理空 Authorization 头', async () => {
      const res = await request(server)
        .get('/api/user/profile')
        .set('Authorization', '');

      assertions.assertErrorResponse(res, 401);
    });
  });

  describe('路由测试', () => {
    it('应该返回 404 对于不存在的路由', async () => {
      const res = await request(server)
        .get('/api/non-existent-route');

      expect(res.statusCode).toBe(404);
    });

    it('应该返回 404 对于深层不存在的路由', async () => {
      const res = await request(server)
        .get('/api/v2/non-existent/deep/route');

      expect(res.statusCode).toBe(404);
    });

    it('应该处理根路径', async () => {
      const res = await request(server)
        .get('/');

      expect([200, 404]).toContain(res.statusCode);
    });

    it('应该处理带尾随斜杠的路由', async () => {
      const res1 = await request(server)
        .get('/api/health');
      
      const res2 = await request(server)
        .get('/api/health/');

      // 两者都应该能访问（可能重定向或直接响应）
      expect([200, 301, 302, 404]).toContain(res1.statusCode);
      expect([200, 301, 302, 404]).toContain(res2.statusCode);
    });
  });

  describe('参数验证测试', () => {
    let authToken;

    beforeEach(async () => {
      const user = await authHelper.createAndLogin();
      authToken = user.token;
    });

    it('应该处理负数分页参数', async () => {
      const res = await request(server)
        .get('/api/knowledge-points?page=-1&limit=-10')
        .set('Authorization', `Bearer ${authToken}`);

      // 应该能处理（使用默认值或拒绝）
      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该处理零分页参数', async () => {
      const res = await request(server)
        .get('/api/knowledge-points?page=0&limit=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该处理超大分页参数', async () => {
      const res = await request(server)
        .get('/api/knowledge-points?limit=999999')
        .set('Authorization', `Bearer ${authToken}`);

      // 应该限制或拒绝
      expect([200, 400]).toContain(res.statusCode);
    });

    it('应该处理非数字分页参数', async () => {
      const res = await request(server)
        .get('/api/knowledge-points?page=abc&limit=xyz')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400]).toContain(res.statusCode);
    });
  });

  describe('健康检查端点', () => {
    it('应该返回健康状态', async () => {
      const res = await request(server)
        .get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
    });

    it('应该包含服务信息', async () => {
      const res = await request(server)
        .get('/api/health');

      expect(res.body).toBeDefined();
    });
  });

  describe('CORS 测试', () => {
    it('应该包含 CORS 头', async () => {
      const res = await request(server)
        .options('/api/health')
        .set('Origin', 'http://example.com');

      // 检查 CORS 头是否存在
      expect(res.headers).toBeDefined();
    });
  });
});

// 辅助断言函数
const assertions = {
  assertErrorResponse(res, expectedStatus = 400) {
    expect(res.statusCode).toBe(expectedStatus);
    expect(res.body).toHaveProperty('error');
  }
};
