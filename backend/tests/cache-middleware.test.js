/**
 * Cache Middleware Tests
 * 测试 Redis 缓存中间件功能
 */

// Mock Redis client before requiring the module
const mockRedisInstance = {
  get: jest.fn(),
  setex: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
  dbsize: jest.fn(),
  info: jest.fn()
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

const { 
  cacheMiddleware, 
  invalidateCache, 
  warmCache, 
  getCacheStats,
  getCacheClient 
} = require('../src/middleware/cache');

describe('Cache Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.setex.mockResolvedValue('OK');
    mockRedisInstance.keys.mockResolvedValue([]);
    mockRedisInstance.del.mockResolvedValue(0);
    mockRedisInstance.dbsize.mockResolvedValue(0);
    mockRedisInstance.info.mockResolvedValue('');
  });

  // ============================================================================
  // 缓存命中测试
  // ============================================================================

  describe('缓存命中场景', () => {
    it('应该从缓存中返回 GET 请求的数据', async () => {
      const cachedData = { id: 1, name: '测试数据' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const req = {
        method: 'GET',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      await middleware(req, res, next);
      
      expect(mockRedisInstance.get).toHaveBeenCalledWith('api:/api/test');
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.set).toHaveBeenCalledWith('X-Cache-TTL', '300');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('应该使用自定义命名空间', async () => {
      const cachedData = { data: 'custom' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const req = {
        method: 'GET',
        url: '/api/users'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const middleware = cacheMiddleware('users', 600);
      await middleware(req, res, jest.fn());
      
      expect(mockRedisInstance.get).toHaveBeenCalledWith('users:/api/users');
    });

    it('应该使用自定义 key 生成器', async () => {
      const cachedData = { result: 'custom-key' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const req = {
        method: 'GET',
        originalUrl: '/api/data?page=1&size=10',
        query: { page: 1, size: 10 }
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const keyGenerator = (req) => `${req.query.page}-${req.query.size}`;
      const middleware = cacheMiddleware('api', 300, keyGenerator);
      await middleware(req, res, jest.fn());
      
      expect(mockRedisInstance.get).toHaveBeenCalledWith('api:1-10');
    });
  });

  // ============================================================================
  // 缓存未命中测试
  // ============================================================================

  describe('缓存未命中场景', () => {
    it('应该继续处理未命中的 GET 请求', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      
      const req = {
        method: 'GET',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn(),
        statusCode: 200
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      await middleware(req, res, next);
      
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(next).toHaveBeenCalled();
    });

    it('应该只缓存 200 状态码的响应', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      
      const req = {
        method: 'GET',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn(),
        statusCode: 404
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      await middleware(req, res, next);
      
      // 调用包装后的 json 方法
      res.json({ error: 'Not found' });
      
      // 非 200 状态码不应该缓存
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 非 GET 请求测试
  // ============================================================================

  describe('非 GET 请求处理', () => {
    it('应该跳过 POST 请求的缓存', async () => {
      const req = {
        method: 'POST',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      await middleware(req, res, next);
      
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('应该跳过 PUT 请求的缓存', async () => {
      const req = {
        method: 'PUT',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('应该跳过 DELETE 请求的缓存', async () => {
      const req = {
        method: 'DELETE',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 缓存清除功能测试
  // ============================================================================

  describe('缓存清除功能', () => {
    it('应该清除匹配模式的缓存', async () => {
      mockRedisInstance.keys.mockResolvedValue(['api:/api/test1', 'api:/api/test2']);
      mockRedisInstance.del.mockResolvedValue(2);
      
      await invalidateCache('api:/api/test*');
      
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('api:/api/test*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('api:/api/test1', 'api:/api/test2');
    });

    it('应该处理没有匹配键的情况', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);
      
      await invalidateCache('api:/api/nonexistent*');
      
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('api:/api/nonexistent*');
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('应该处理 Redis 错误', async () => {
      mockRedisInstance.keys.mockRejectedValue(new Error('Redis connection error'));
      
      // 不应该抛出异常
      await expect(invalidateCache('api:*')).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // 缓存预热功能测试
  // ============================================================================

  describe('缓存预热功能', () => {
    it('应该预热指定的缓存键', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      
      const data = { id: 1, name: '预热数据' };
      await warmCache('api:/api/preload', data, 3600);
      
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'api:/api/preload',
        3600,
        JSON.stringify(data)
      );
    });

    it('应该使用默认 TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      
      await warmCache('api:/api/default', { data: 'test' });
      
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'api:/api/default',
        3600,
        expect.any(String)
      );
    });

    it('应该处理 Redis 错误', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'));
      
      await expect(warmCache('api:/api/test', {})).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // 缓存统计功能测试
  // ============================================================================

  describe('缓存统计功能', () => {
    it('应该获取缓存统计信息', async () => {
      mockRedisInstance.info.mockResolvedValue(`
# Stats
keyspace_hits:100
keyspace_misses:50
      `);
      mockRedisInstance.dbsize.mockResolvedValue(150);
      
      const stats = await getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.keysCount).toBe(150);
      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(50);
    });

    it('应该处理缺少统计信息的情况', async () => {
      mockRedisInstance.info.mockResolvedValue('');
      mockRedisInstance.dbsize.mockResolvedValue(0);
      
      const stats = await getCacheStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('应该处理 Redis 错误', async () => {
      mockRedisInstance.info.mockRejectedValue(new Error('Redis error'));
      
      const stats = await getCacheStats();
      
      expect(stats).toBeNull();
    });
  });

  // ============================================================================
  // 边界测试
  // ============================================================================

  describe('边界测试', () => {
    it('应该处理空 URL', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      
      const req = {
        method: 'GET',
        url: ''
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn(),
        statusCode: 200
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('应该处理缓存数据解析错误', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid json{{{');
      
      const req = {
        method: 'GET',
        originalUrl: '/api/test'
      };
      
      const res = {
        set: jest.fn(),
        json: jest.fn()
      };
      
      const next = jest.fn();
      
      const middleware = cacheMiddleware('api', 300);
      
      // 不应该抛出异常
      await expect(middleware(req, res, next)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Redis 客户端测试
  // ============================================================================

  describe('Redis 客户端管理', () => {
    it('应该复用 Redis 客户端实例', () => {
      const client1 = getCacheClient();
      const client2 = getCacheClient();
      
      expect(client1).toBe(client2);
    });
  });
});
