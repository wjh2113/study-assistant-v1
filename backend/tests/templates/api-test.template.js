/**
 * API 测试标准化模板
 * 
 * 使用说明：
 * 1. 复制此模板到新的测试文件
 * 2. 替换 MODULE_NAME 为实际模块名
 * 3. 替换 ENDPOINT_BASE 为实际 API 路径
 * 4. 添加具体的测试用例
 * 
 * 测试规范：
 * - 每个 API 端点至少包含：成功场景、失败场景、边界场景
 * - 使用 test-utils 中的工厂函数创建测试数据
 * - 使用 AuthHelper 管理认证
 * - 使用 DbCleaner 清理测试数据
 */

const request = require('supertest');
const app = require('../src/server');
const { 
  AuthHelper, 
  DbCleaner,
  generatePhone,
  generateId,
  assertions 
} = require('../test-utils');

// ============================================================================
// 测试配置
// ============================================================================

const MODULE_NAME = 'MODULE_NAME'; // 替换为实际模块名
const ENDPOINT_BASE = '/api/ENDPOINT_BASE'; // 替换为实际 API 路径
const TEST_TIMEOUT = 30000;

describe(`${MODULE_NAME} API Tests`, () => {
  let server;
  let authHelper;
  let dbCleaner;
  let db;
  let authToken;
  let testUser;

  // ============================================================================
  // 测试生命周期
  // ============================================================================

  beforeAll(async () => {
    console.log(`🧪 开始 ${MODULE_NAME} 模块测试`);
    
    // 启动测试服务器
    server = app.listen(0);
    await new Promise(resolve => server.on('listening', resolve));
    console.log(`🔌 测试服务器启动在端口 ${server.address().port}`);
    
    // 初始化助手
    authHelper = new AuthHelper(server);
    
    // 获取数据库实例进行清理
    try {
      db = require('../src/database');
      dbCleaner = new DbCleaner(db);
    } catch (error) {
      console.warn('⚠️  数据库清理不可用');
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    console.log(`✅ ${MODULE_NAME} 模块测试完成`);
    
    // 清理数据库
    if (dbCleaner) {
      await dbCleaner.cleanupAll();
    }
    
    // 关闭服务器
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    if (dbCleaner) {
      await dbCleaner.cleanupAll();
    }
    
    // 创建测试用户并登录
    const loginResult = await authHelper.createAndLogin();
    authToken = loginResult.token;
    testUser = loginResult.user;
  });

  afterEach(async () => {
    // 清理用户数据
    if (dbCleaner && testUser) {
      await dbCleaner.cleanupUser(testUser.id);
    }
    authHelper.cleanup();
  });

  // ============================================================================
  // 测试用例：创建资源
  // ============================================================================

  describe('POST ' + ENDPOINT_BASE, () => {
    it('应该成功创建资源', async () => {
      const testData = {
        // 填写测试数据
        name: '测试数据',
        description: '测试描述'
      };

      const res = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData);

      assertions.assertSuccessResponse(res, 201);
      assertions.assertHasFields(res.body, ['message', 'data']);
      assertions.assertHasFields(res.body.data, ['id']);
    });

    it('应该拒绝未授权请求', async () => {
      const testData = { name: '测试数据' };

      const res = await request(server)
        .post(ENDPOINT_BASE)
        .send(testData);

      assertions.assertErrorResponse(res, 401);
    });

    it('应该拒绝无效数据', async () => {
      const res = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      assertions.assertErrorResponse(res, 400);
    });
  });

  // ============================================================================
  // 测试用例：获取资源列表
  // ============================================================================

  describe('GET ' + ENDPOINT_BASE, () => {
    it('应该成功获取资源列表', async () => {
      const res = await request(server)
        .get(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const res = await request(server)
        .get(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      assertions.assertSuccessResponse(res);
    });

    it('应该只返回当前用户的数据', async () => {
      // 创建另一个用户
      const anotherUser = await authHelper.createAndLogin({
        phone: generatePhone()
      });

      const res = await request(server)
        .get(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${anotherUser.token}`);

      assertions.assertSuccessResponse(res);
      // 验证返回的数据不属于第一个用户
      if (res.body.data.length > 0) {
        expect(res.body.data[0].user_id).not.toBe(testUser.id);
      }
    });
  });

  // ============================================================================
  // 测试用例：获取单个资源
  // ============================================================================

  describe('GET ' + ENDPOINT_BASE + '/:id', () => {
    let resourceId;

    beforeEach(async () => {
      // 创建测试资源
      const createRes = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '测试资源' });
      
      resourceId = createRes.body.data.id;
    });

    it('应该成功获取资源详情', async () => {
      const res = await request(server)
        .get(`${ENDPOINT_BASE}/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      assertions.assertHasFields(res.body.data, ['id']);
      expect(res.body.data.id).toBe(resourceId);
    });

    it('应该拒绝访问不存在的资源', async () => {
      const fakeId = generateId();
      
      const res = await request(server)
        .get(`${ENDPOINT_BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(res, 404);
    });

    it('应该拒绝访问其他用户的资源', async () => {
      // 创建另一个用户
      const anotherUser = await authHelper.createAndLogin({
        phone: generatePhone()
      });

      const res = await request(server)
        .get(`${ENDPOINT_BASE}/${resourceId}`)
        .set('Authorization', `Bearer ${anotherUser.token}`);

      assertions.assertErrorResponse(res, 404);
    });
  });

  // ============================================================================
  // 测试用例：更新资源
  // ============================================================================

  describe('PUT ' + ENDPOINT_BASE + '/:id', () => {
    let resourceId;

    beforeEach(async () => {
      const createRes = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '原始数据' });
      
      resourceId = createRes.body.data.id;
    });

    it('应该成功更新资源', async () => {
      const updateData = { name: '更新后的数据' };

      const res = await request(server)
        .put(`${ENDPOINT_BASE}/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      assertions.assertSuccessResponse(res);
      expect(res.body.data.name).toBe('更新后的数据');
    });

    it('应该拒绝更新不存在的资源', async () => {
      const fakeId = generateId();
      
      const res = await request(server)
        .put(`${ENDPOINT_BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '更新' });

      assertions.assertErrorResponse(res, 404);
    });

    it('应该拒绝更新其他用户的资源', async () => {
      const anotherUser = await authHelper.createAndLogin({
        phone: generatePhone()
      });

      const res = await request(server)
        .put(`${ENDPOINT_BASE}/${resourceId}`)
        .set('Authorization', `Bearer ${anotherUser.token}`)
        .send({ name: '更新' });

      assertions.assertErrorResponse(res, 404);
    });
  });

  // ============================================================================
  // 测试用例：删除资源
  // ============================================================================

  describe('DELETE ' + ENDPOINT_BASE + '/:id', () => {
    let resourceId;

    beforeEach(async () => {
      const createRes = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '待删除数据' });
      
      resourceId = createRes.body.data.id;
    });

    it('应该成功删除资源', async () => {
      const res = await request(server)
        .delete(`${ENDPOINT_BASE}/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccessResponse(res);
      expect(res.body).toHaveProperty('message');
    });

    it('应该拒绝删除不存在的资源', async () => {
      const fakeId = generateId();
      
      const res = await request(server)
        .delete(`${ENDPOINT_BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertErrorResponse(res, 404);
    });

    it('应该拒绝删除其他用户的资源', async () => {
      const anotherUser = await authHelper.createAndLogin({
        phone: generatePhone()
      });

      const res = await request(server)
        .delete(`${ENDPOINT_BASE}/${resourceId}`)
        .set('Authorization', `Bearer ${anotherUser.token}`);

      assertions.assertErrorResponse(res, 404);
    });
  });

  // ============================================================================
  // 边界测试场景
  // ============================================================================

  describe('边界测试', () => {
    it('应该处理超长输入', async () => {
      const longString = 'a'.repeat(10000);
      
      const res = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: longString });

      // 根据实际业务逻辑调整预期
      expect([200, 201, 400]).toContain(res.statusCode);
    });

    it('应该处理特殊字符', async () => {
      const specialChars = '<script>alert("xss")</script>';
      
      const res = await request(server)
        .post(ENDPOINT_BASE)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: specialChars });

      // 根据实际业务逻辑调整预期
      expect([200, 201, 400]).toContain(res.statusCode);
    });

    it('应该处理并发请求', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(server)
          .post(ENDPOINT_BASE)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '并发测试' })
      );

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect([200, 201, 400, 429]).toContain(res.statusCode);
      });
    });
  });
});
