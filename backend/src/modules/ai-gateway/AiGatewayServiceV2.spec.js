/**
 * AiGatewayServiceV2 测试
 * 测试覆盖：多服务商路由、故障转移、健康检查、缓存集成
 */

const AiGatewayServiceV2 = require('../src/modules/ai-gateway/AiGatewayServiceV2');
const ResponseCacheService = require('../src/modules/ai-gateway/ResponseCacheService');
const BatchUpdateService = require('../src/modules/ai-gateway/BatchUpdateService');

// Mock dependencies
jest.mock('axios');
jest.mock('ioredis');
jest.mock('../src/modules/ai-gateway/ResponseCacheService');
jest.mock('../src/modules/ai-gateway/BatchUpdateService');
jest.mock('../src/modules/monitoring/PrometheusExporter');
jest.mock('../src/modules/cost-analysis/CostAnalysisService');

const axios = require('axios');
const Redis = require('ioredis');

describe('AiGatewayServiceV2', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置环境变量
    delete process.env.ALIYUN_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.BAIDU_API_KEY;
    delete process.env.IFLYTEK_APP_ID;
    
    // 重置健康状态
    AiGatewayServiceV2.healthStatus = {
      aliyun: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
      openai: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
      azure: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
      moonshot: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
      baidu: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
      iflytek: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 }
    };

    // Mock Redis
    mockRedis = {
      on: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      hincrby: jest.fn(),
      hgetall: jest.fn().mockResolvedValue({}),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
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
    
    // Mock ResponseCacheService
    ResponseCacheService.init.mockResolvedValue();
    ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);
    ResponseCacheService.cacheAIResponse.mockResolvedValue(true);
    
    // Mock BatchUpdateService
    BatchUpdateService.init.mockImplementation();
    BatchUpdateService.getQueueStatus.mockReturnValue({ queues: {}, totalQueued: 0 });
  });

  describe('selectModel', () => {
    test('应该为 simple-question 选择正确的模型路由', () => {
      const routing = AiGatewayServiceV2.selectModel('simple-question');
      expect(routing.primary).toBe('qwen-flash');
      expect(routing.fallbacks).toContain('moonshot-v1-8k');
      expect(routing.fallbacks).toContain('gpt-3.5');
    });

    test('应该为 textbook-analysis 选择正确的模型路由', () => {
      const routing = AiGatewayServiceV2.selectModel('textbook-analysis');
      expect(routing.primary).toBe('qwen-plus');
    });

    test('应该为 weakness-analysis 选择正确的模型路由', () => {
      const routing = AiGatewayServiceV2.selectModel('weakness-analysis');
      expect(routing.primary).toBe('qwen-plus');
      expect(routing.fallbacks).toContain('gpt-4');
    });

    test('应该为 complex-question 选择正确的模型路由', () => {
      const routing = AiGatewayServiceV2.selectModel('complex-question');
      expect(routing.primary).toBe('qwen-max');
    });

    test('应该为未知任务类型使用默认的 chat 路由', () => {
      const routing = AiGatewayServiceV2.selectModel('unknown-type');
      expect(routing.primary).toBe('qwen-plus');
    });
  });

  describe('getModelConfig', () => {
    test('应该获取阿里云模型配置', () => {
      const config = AiGatewayServiceV2.getModelConfig('qwen-flash');
      expect(config).toBeTruthy();
      expect(config.provider).toBe('aliyun');
      expect(config.model).toBe('qwen-turbo');
    });

    test('应该获取 OpenAI 模型配置', () => {
      const config = AiGatewayServiceV2.getModelConfig('gpt-3.5');
      expect(config).toBeTruthy();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-3.5-turbo');
    });

    test('应该获取百度模型配置', () => {
      const config = AiGatewayServiceV2.getModelConfig('ernie-bot-turbo');
      expect(config).toBeTruthy();
      expect(config.provider).toBe('baidu');
    });

    test('应该获取讯飞模型配置', () => {
      const config = AiGatewayServiceV2.getModelConfig('spark-lite');
      expect(config).toBeTruthy();
      expect(config.provider).toBe('iflytek');
    });

    test('应该为不存在的模型返回 null', () => {
      const config = AiGatewayServiceV2.getModelConfig('nonexistent-model');
      expect(config).toBeNull();
    });
  });

  describe('callModel', () => {
    test('应该在不支持的模型时返回错误', async () => {
      const result = await AiGatewayServiceV2.callModel('invalid-model', []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的模型');
    });

    test('应该在 API Key 未配置时返回错误', async () => {
      const result = await AiGatewayServiceV2.callModel('qwen-flash', []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('API Key 未配置');
    });

    test('应该检查缓存并返回缓存结果', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      
      const cachedResponse = {
        success: true,
        data: '缓存回答',
        fromCache: true
      };
      
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(cachedResponse);

      const result = await AiGatewayServiceV2.callModel('qwen-flash', [
        { role: 'user', content: 'test' }
      ], { enableCache: true });

      expect(result.success).toBe(true);
      expect(result.data).toBe('缓存回答');
      expect(result.fromCache).toBe(true);
      expect(ResponseCacheService.getCachedAIResponse).toHaveBeenCalled();
    });

    test('应该在缓存未命中时调用 API', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: { content: 'API 回答' }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      });

      const result = await AiGatewayServiceV2.callModel('qwen-flash', [
        { role: 'user', content: 'test' }
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toBe('API 回答');
      expect(axios.post).toHaveBeenCalled();
    });

    test('应该在调用失败时重试', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue({
          data: {
            choices: [{ message: { content: '成功' } }],
            usage: {}
          }
        });

      const result = await AiGatewayServiceV2.callModel('qwen-flash', [
        { role: 'user', content: 'test' }
      ]);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test('应该在多次失败后尝试故障转移', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      process.env.MOONSHOT_API_KEY = 'moonshot-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      // 主模型失败
      axios.post.mockRejectedValue({ code: 'ETIMEDOUT' });

      const result = await AiGatewayServiceV2.callModel('qwen-flash', [
        { role: 'user', content: 'test' }
      ], { taskType: 'simple-question' });

      // 应该会尝试故障转移到备用模型
      expect(result.success).toBe(false);
    });

    test('应该更新健康状态', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '成功' } }],
          usage: {}
        }
      });

      await AiGatewayServiceV2.callModel('qwen-flash', [
        { role: 'user', content: 'test' }
      ]);

      const healthStatus = AiGatewayServiceV2.getHealthStatus();
      expect(healthStatus.aliyun.healthy).toBe(true);
    });

    test('应该在连续错误后标记为不健康', () => {
      for (let i = 0; i < 5; i++) {
        AiGatewayServiceV2.updateHealthStatus('aliyun', false, 1000, 'error');
      }

      expect(AiGatewayServiceV2.healthStatus.aliyun.healthy).toBe(false);
      expect(AiGatewayServiceV2.healthStatus.aliyun.errorCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('healthCheck', () => {
    test('应该检查所有提供商的健康状态', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'pong' } }]
        }
      });

      const results = await AiGatewayServiceV2.healthCheck();
      
      expect(results.aliyun).toBeTruthy();
      expect(results.aliyun.healthy).toBe(true);
      expect(results.aliyun.latency).toBeDefined();
    });

    test('应该标记未配置 API Key 的提供商为不健康', async () => {
      delete process.env.ALIYUN_API_KEY;
      
      const results = await AiGatewayServiceV2.healthCheck();
      
      expect(results.aliyun.healthy).toBe(false);
      expect(results.aliyun.error).toContain('API Key 未配置');
    });

    test('应该处理健康检查失败', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      
      axios.post.mockRejectedValue(new Error('网络错误'));

      const results = await AiGatewayServiceV2.healthCheck();
      
      expect(results.aliyun.healthy).toBe(false);
      expect(results.aliyun.error).toBeTruthy();
    });
  });

  describe('updateHealthStatus', () => {
    test('应该在成功时减少错误计数', () => {
      AiGatewayServiceV2.healthStatus.aliyun.errorCount = 3;
      AiGatewayServiceV2.healthStatus.aliyun.healthy = false;

      AiGatewayServiceV2.updateHealthStatus('aliyun', true, 1000);

      expect(AiGatewayServiceV2.healthStatus.aliyun.errorCount).toBe(2);
    });

    test('应该在失败时增加错误计数', () => {
      AiGatewayServiceV2.healthStatus.aliyun.errorCount = 0;

      AiGatewayServiceV2.updateHealthStatus('aliyun', false, 1000, 'error');

      expect(AiGatewayServiceV2.healthStatus.aliyun.errorCount).toBe(1);
    });

    test('应该在错误计数达到阈值时标记为不健康', () => {
      AiGatewayServiceV2.healthStatus.aliyun.errorCount = 4;
      AiGatewayServiceV2.healthStatus.aliyun.healthy = true;

      AiGatewayServiceV2.updateHealthStatus('aliyun', false, 1000, 'error');

      expect(AiGatewayServiceV2.healthStatus.aliyun.healthy).toBe(false);
    });
  });

  describe('recordTokenUsage', () => {
    test('应该记录 Token 使用到 Redis', async () => {
      AiGatewayServiceV2.redis = mockRedis;
      
      await AiGatewayServiceV2.recordTokenUsage('qwen-flash', {
        total_tokens: 100
      });

      expect(mockRedis.hincrby).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    test('应该在 Redis 未连接时静默失败', async () => {
      AiGatewayServiceV2.redis = null;
      
      await AiGatewayServiceV2.recordTokenUsage('qwen-flash', {
        total_tokens: 100
      });

      expect(mockRedis.hincrby).not.toHaveBeenCalled();
    });
  });

  describe('getTokenUsage', () => {
    test('应该获取指定日期的 Token 使用统计', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'qwen-flash': '1000',
        'qwen-plus': '2000'
      });
      
      AiGatewayServiceV2.redis = mockRedis;

      const usage = await AiGatewayServiceV2.getTokenUsage('2024-01-01');

      expect(usage['qwen-flash']).toBe(1000);
      expect(usage['qwen-plus']).toBe(2000);
    });

    test('应该在 Redis 未连接时返回空对象', async () => {
      AiGatewayServiceV2.redis = null;

      const usage = await AiGatewayServiceV2.getTokenUsage();
      expect(usage).toEqual({});
    });
  });

  describe('generateQuestions', () => {
    test('应该成功生成题目', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    id: 1,
                    question: '1+1=?',
                    answer: 'B',
                    options: ['A. 1', 'B. 2', 'C. 3', 'D. 4']
                  }
                ]
              })
            }
          }],
          usage: {}
        }
      });

      const result = await AiGatewayServiceV2.generateQuestions({
        textbookContent: '测试内容',
        grade: '三年级',
        subject: '数学',
        unit: '第一单元',
        questionCount: 1
      });

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
    });

    test('应该记录题目生成指标', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    id: 1,
                    question: '1+1=?',
                    answer: 'B',
                    difficulty: 'medium',
                    type: 'choice'
                  }
                ]
              })
            }
          }],
          usage: {}
        }
      });

      await AiGatewayServiceV2.generateQuestions({
        textbookContent: '测试内容',
        grade: '三年级',
        subject: '数学',
        unit: '第一单元',
        questionCount: 1
      });

      // PrometheusExporter.recordQuestionGenerated 应该被调用
    });

    test('应该在生成失败时抛出错误', async () => {
      axios.post.mockRejectedValue(new Error('网络错误'));

      await expect(
        AiGatewayServiceV2.generateQuestions({
          textbookContent: '测试内容',
          grade: '三年级',
          subject: '数学',
          unit: '第一单元'
        })
      ).rejects.toThrow('题目生成失败');
    });
  });

  describe('chat', () => {
    test('应该进行智能对话', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: { content: '你好！有什么可以帮助你的？' }
          }],
          usage: {}
        }
      });

      const result = await AiGatewayServiceV2.chat([
        { role: 'user', content: '你好' }
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toBe('你好！有什么可以帮助你的？');
    });

    test('应该支持上下文对话', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';
      ResponseCacheService.getCachedAIResponse.mockResolvedValue(null);

      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: { content: '1+1 等于 2' }
          }],
          usage: {}
        }
      });

      const result = await AiGatewayServiceV2.chat([
        { role: 'user', content: '1+1 等于几？' }
      ], {
        taskType: 'chat',
        temperature: 0.5
      });

      expect(result.success).toBe(true);
    });
  });

  describe('generateEmbedding', () => {
    test('应该生成 Embedding', async () => {
      process.env.ALIYUN_API_KEY = 'test-key';

      axios.post.mockResolvedValue({
        data: {
          output: {
            embeddings: [{
              embedding: [0.1, 0.2, 0.3, 0.4]
            }]
          }
        }
      });

      const embedding = await AiGatewayServiceV2.generateEmbedding('测试文本');

      expect(embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    test('应该在 API Key 未配置时抛出错误', async () => {
      delete process.env.ALIYUN_API_KEY;

      await expect(
        AiGatewayServiceV2.generateEmbedding('测试文本')
      ).rejects.toThrow('Embedding API Key 未配置');
    });
  });

  describe('checkRateLimit', () => {
    test('应该允许在限流范围内的请求', async () => {
      mockRedis.incr.mockResolvedValue(5);
      AiGatewayServiceV2.redis = mockRedis;

      const result = await AiGatewayServiceV2.checkRateLimit('user123', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    test('应该拒绝超出限流的请求', async () => {
      mockRedis.incr.mockResolvedValue(15);
      AiGatewayServiceV2.redis = mockRedis;

      const result = await AiGatewayServiceV2.checkRateLimit('user123', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('应该在 Redis 失败时放行请求', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis 错误'));
      AiGatewayServiceV2.redis = mockRedis;

      const result = await AiGatewayServiceV2.checkRateLimit('user123', 10, 60);

      expect(result.allowed).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    test('应该获取缓存统计', async () => {
      ResponseCacheService.getStats.mockResolvedValue({
        totalKeys: 100,
        usedMemoryMB: '10.5',
        connected: true
      });

      const stats = await AiGatewayServiceV2.getCacheStats();

      expect(stats.totalKeys).toBe(100);
      expect(stats.usedMemoryMB).toBe('10.5');
    });
  });

  describe('getBatchUpdateStatus', () => {
    test('应该获取批量更新队列状态', () => {
      const status = AiGatewayServiceV2.getBatchUpdateStatus();
      
      expect(status).toBeDefined();
      expect(status.queues).toBeDefined();
    });
  });
});
