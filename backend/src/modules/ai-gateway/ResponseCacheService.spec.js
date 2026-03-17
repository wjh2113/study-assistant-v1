/**
 * ResponseCacheService 测试
 * 测试覆盖：缓存命中/未命中、TTL、清理、预热
 */

const ResponseCacheService = require('../src/modules/ai-gateway/ResponseCacheService');
const Redis = require('ioredis');

jest.mock('ioredis');

describe('ResponseCacheService', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    ResponseCacheService.redis = null;

    // Mock Redis
    mockRedis = {
      on: jest.fn(),
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      dbsize: jest.fn().mockResolvedValue(0),
      info: jest.fn().mockResolvedValue('used_memory:1000'),
      pipeline: jest.fn().mockReturnValue({
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      }),
      quit: jest.fn()
    };

    Redis.mockImplementation(() => mockRedis);
  });

  describe('init', () => {
    test('应该初始化 Redis 连接', async () => {
      await ResponseCacheService.init();
      
      expect(ResponseCacheService.redis).toBeTruthy();
      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: expect.any(String),
        port: expect.any(Number)
      }));
    });

    test('应该使用自定义 Redis 配置', async () => {
      process.env.REDIS_HOST = 'custom-host';
      process.env.REDIS_PORT = '6380';
      process.env.CACHE_REDIS_DB = '2';

      await ResponseCacheService.init();

      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: 'custom-host',
        port: 6380,
        db: 2
      }));

      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.CACHE_REDIS_DB;
    });

    test('应该重复使用已有的 Redis 连接', async () => {
      ResponseCacheService.redis = mockRedis;
      
      await ResponseCacheService.init();
      
      expect(Redis).not.toHaveBeenCalled();
    });
  });

  describe('generateCacheKey', () => {
    test('应该为相同参数生成相同的键', () => {
      const params1 = { model: 'qwen-flash', prompt: 'test' };
      const params2 = { model: 'qwen-flash', prompt: 'test' };

      const key1 = ResponseCacheService.generateCacheKey('chat', params1);
      const key2 = ResponseCacheService.generateCacheKey('chat', params2);

      expect(key1).toBe(key2);
    });

    test('应该为不同参数生成不同的键', () => {
      const params1 = { model: 'qwen-flash', prompt: 'test1' };
      const params2 = { model: 'qwen-flash', prompt: 'test2' };

      const key1 = ResponseCacheService.generateCacheKey('chat', params1);
      const key2 = ResponseCacheService.generateCacheKey('chat', params2);

      expect(key1).not.toBe(key2);
    });

    test('应该忽略参数顺序', () => {
      const params1 = { a: 1, b: 2 };
      const params2 = { b: 2, a: 1 };

      const key1 = ResponseCacheService.generateCacheKey('test', params1);
      const key2 = ResponseCacheService.generateCacheKey('test', params2);

      expect(key1).toBe(key2);
    });

    test('应该包含任务类型在键中', () => {
      const params = { model: 'qwen-flash' };

      const key1 = ResponseCacheService.generateCacheKey('chat', params);
      const key2 = ResponseCacheService.generateCacheKey('embedding', params);

      expect(key1).not.toBe(key2);
      expect(key1).toContain('chat');
      expect(key2).toContain('embedding');
    });
  });

  describe('get', () => {
    test('应该获取缓存数据', async () => {
      const cachedData = {
        value: { success: true, data: 'cached' },
        timestamp: Date.now(),
        expireAt: Date.now() + 3600000
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.get('test-key');

      expect(result).toEqual({ success: true, data: 'cached' });
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    test('应该在缓存未命中时返回 null', async () => {
      mockRedis.get.mockResolvedValue(null);
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    test('应该删除过期的缓存', async () => {
      const expiredData = {
        value: { success: true },
        timestamp: Date.now() - 7200000,
        expireAt: Date.now() - 3600000
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(expiredData));
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.get('expired-key');

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('expired-key');
    });

    test('应该在 Redis 错误时返回 null', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis 错误'));
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.get('test-key');

      expect(result).toBeNull();
    });

    test('应该在 JSON 解析失败时返回 null', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    test('应该设置缓存数据', async () => {
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.set('test-key', { data: 'value' }, 3600);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        expect.any(String)
      );
    });

    test('应该使用默认 TTL', async () => {
      ResponseCacheService.redis = mockRedis;

      await ResponseCacheService.set('test-key', { data: 'value' });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600, // 默认 TTL
        expect.any(String)
      );
    });

    test('应该在缓存数据中包含时间戳', async () => {
      ResponseCacheService.redis = mockRedis;

      await ResponseCacheService.set('test-key', { data: 'value' }, 3600);

      const callArgs = mockRedis.setex.mock.calls[0];
      const cachedData = JSON.parse(callArgs[2]);
      
      expect(cachedData.timestamp).toBeDefined();
      expect(cachedData.expireAt).toBeDefined();
      expect(cachedData.value).toEqual({ data: 'value' });
    });

    test('应该在 Redis 错误时返回 false', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis 错误'));
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.set('test-key', { data: 'value' });

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    test('应该删除缓存', async () => {
      mockRedis.del.mockResolvedValue(1);
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    test('应该在键不存在时返回 true', async () => {
      mockRedis.del.mockResolvedValue(0);
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.delete('nonexistent-key');

      expect(result).toBe(true);
    });

    test('应该在 Redis 错误时返回 false', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis 错误'));
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.delete('test-key');

      expect(result).toBe(false);
    });
  });

  describe('deleteByPattern', () => {
    test('应该批量删除匹配模式的缓存', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.del.mockResolvedValue(3);
      ResponseCacheService.redis = mockRedis;

      const deleted = await ResponseCacheService.deleteByPattern('ai:cache:test:*');

      expect(deleted).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith('ai:cache:test:*');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    test('应该在没有匹配键时返回 0', async () => {
      mockRedis.keys.mockResolvedValue([]);
      ResponseCacheService.redis = mockRedis;

      const deleted = await ResponseCacheService.deleteByPattern('ai:cache:test:*');

      expect(deleted).toBe(0);
    });

    test('应该在 Redis 错误时返回 0', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis 错误'));
      ResponseCacheService.redis = mockRedis;

      const deleted = await ResponseCacheService.deleteByPattern('ai:cache:test:*');

      expect(deleted).toBe(0);
    });
  });

  describe('cacheAIResponse', () => {
    test('应该缓存 AI 响应', async () => {
      ResponseCacheService.redis = mockRedis;

      const taskType = 'simple-question';
      const params = { model: 'qwen-flash', prompt: 'test' };
      const response = { success: true, data: 'answer' };

      const result = await ResponseCacheService.cacheAIResponse(taskType, params, response);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    test('应该使用题目类型的自定义 TTL', async () => {
      ResponseCacheService.redis = mockRedis;

      await ResponseCacheService.cacheAIResponse('simple-question', {}, {});
      
      const callArgs = mockRedis.setex.mock.calls[0];
      expect(callArgs[1]).toBe(86400); // 题目生成缓存 24 小时
    });

    test('应该使用对话类型的自定义 TTL', async () => {
      ResponseCacheService.redis = mockRedis;

      await ResponseCacheService.cacheAIResponse('chat', {}, {});
      
      const callArgs = mockRedis.setex.mock.calls[0];
      expect(callArgs[1]).toBe(1800); // 对话缓存 30 分钟
    });

    test('应该使用 Embedding 类型的自定义 TTL', async () => {
      ResponseCacheService.redis = mockRedis;

      await ResponseCacheService.cacheAIResponse('embedding', {}, {});
      
      const callArgs = mockRedis.setex.mock.calls[0];
      expect(callArgs[1]).toBe(604800); // Embedding 缓存 7 天
    });
  });

  describe('getCachedAIResponse', () => {
    test('应该获取缓存的 AI 响应', async () => {
      const cachedData = {
        value: { success: true, data: 'cached answer' },
        timestamp: Date.now(),
        expireAt: Date.now() + 3600000
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.getCachedAIResponse('chat', {
        model: 'qwen-flash',
        messages: []
      });

      expect(result).toEqual({ success: true, data: 'cached answer' });
    });

    test('应该在缓存未命中时返回 null', async () => {
      mockRedis.get.mockResolvedValue(null);
      ResponseCacheService.redis = mockRedis;

      const result = await ResponseCacheService.getCachedAIResponse('chat', {
        model: 'qwen-flash',
        messages: []
      });

      expect(result).toBeNull();
    });
  });

  describe('getTTLForTaskType', () => {
    test('应该为题目类型返回 24 小时 TTL', () => {
      expect(ResponseCacheService.getTTLForTaskType('simple-question')).toBe(86400);
      expect(ResponseCacheService.getTTLForTaskType('complex-question')).toBe(86400);
    });

    test('应该为 Embedding 类型返回 7 天 TTL', () => {
      expect(ResponseCacheService.getTTLForTaskType('embedding')).toBe(604800);
    });

    test('应该为对话类型返回 30 分钟 TTL', () => {
      expect(ResponseCacheService.getTTLForTaskType('chat')).toBe(1800);
    });

    test('应该为分析类型返回更长的 TTL', () => {
      expect(ResponseCacheService.getTTLForTaskType('textbook-analysis')).toBe(7200);
      expect(ResponseCacheService.getTTLForTaskType('weakness-analysis')).toBe(7200);
    });

    test('应该为未知类型返回默认 TTL', () => {
      expect(ResponseCacheService.getTTLForTaskType('unknown')).toBe(3600);
    });
  });

  describe('getStats', () => {
    test('应该获取缓存统计信息', async () => {
      mockRedis.dbsize.mockResolvedValue(100);
      mockRedis.info.mockResolvedValue('used_memory:10485760');
      ResponseCacheService.redis = mockRedis;

      const stats = await ResponseCacheService.getStats();

      expect(stats.totalKeys).toBe(100);
      expect(stats.usedMemoryBytes).toBe(10485760);
      expect(stats.usedMemoryMB).toBe('10.00');
      expect(stats.connected).toBe(true);
    });

    test('应该在 Redis 未连接时返回 null', async () => {
      ResponseCacheService.redis = null;

      const stats = await ResponseCacheService.getStats();

      expect(stats).toBeNull();
    });

    test('应该在获取统计失败时返回错误信息', async () => {
      mockRedis.dbsize.mockRejectedValue(new Error('Redis 错误'));
      ResponseCacheService.redis = mockRedis;

      const stats = await ResponseCacheService.getStats();

      expect(stats.connected).toBe(false);
      expect(stats.error).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    test('应该清理过期缓存', async () => {
      const expiredKey = {
        value: {},
        timestamp: Date.now() - 7200000,
        expireAt: Date.now() - 3600000
      };
      
      mockRedis.keys.mockResolvedValue(['expired1', 'expired2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(expiredKey))
        .mockResolvedValueOnce(JSON.stringify(expiredKey));
      ResponseCacheService.redis = mockRedis;

      const cleaned = await ResponseCacheService.cleanup();

      expect(cleaned).toBe(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    test('应该保留未过期缓存', async () => {
      const validKey = {
        value: {},
        timestamp: Date.now(),
        expireAt: Date.now() + 3600000
      };
      
      mockRedis.keys.mockResolvedValue(['valid1']);
      mockRedis.get.mockResolvedValue(JSON.stringify(validKey));
      ResponseCacheService.redis = mockRedis;

      const cleaned = await ResponseCacheService.cleanup();

      expect(cleaned).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    test('应该删除解析失败的损坏缓存', async () => {
      mockRedis.keys.mockResolvedValue(['corrupted']);
      mockRedis.get.mockResolvedValue('invalid-json');
      ResponseCacheService.redis = mockRedis;

      const cleaned = await ResponseCacheService.cleanup();

      expect(cleaned).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('corrupted');
    });

    test('应该在 Redis 未连接时返回 0', async () => {
      ResponseCacheService.redis = null;

      const cleaned = await ResponseCacheService.cleanup();

      expect(cleaned).toBe(0);
    });
  });

  describe('warmup', () => {
    test('应该预热缓存', async () => {
      ResponseCacheService.redis = mockRedis;

      const items = [
        { params: { id: 1 }, response: { data: 'response1' } },
        { params: { id: 2 }, response: { data: 'response2' } }
      ];

      const count = await ResponseCacheService.warmup(items, 'chat');

      expect(count).toBe(2);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    test('应该使用正确的 TTL 预热', async () => {
      ResponseCacheService.redis = mockRedis;

      const items = [
        { params: {}, response: {} }
      ];

      await ResponseCacheService.warmup(items, 'simple-question');

      const pipeline = mockRedis.pipeline();
      expect(pipeline.setex).toHaveBeenCalledWith(
        expect.any(String),
        86400, // 题目类型 TTL
        expect.any(String)
      );
    });

    test('应该在空数组时返回 0', async () => {
      ResponseCacheService.redis = mockRedis;

      const count = await ResponseCacheService.warmup([], 'chat');

      expect(count).toBe(0);
    });

    test('应该在 Redis 未连接时返回 0', async () => {
      ResponseCacheService.redis = null;

      const count = await ResponseCacheService.warmup([{ params: {}, response: {} }], 'chat');

      expect(count).toBe(0);
    });

    test('应该在批量执行失败时返回 0', async () => {
      ResponseCacheService.redis = mockRedis;
      mockRedis.pipeline().exec.mockRejectedValue(new Error('批量执行失败'));

      const items = [{ params: {}, response: {} }];
      const count = await ResponseCacheService.warmup(items, 'chat');

      expect(count).toBe(0);
    });
  });

  describe('getRedis', () => {
    test('应该返回 Redis 实例', async () => {
      ResponseCacheService.redis = mockRedis;

      const redis = ResponseCacheService.getRedis();

      expect(redis).toBe(mockRedis);
    });
  });
});
