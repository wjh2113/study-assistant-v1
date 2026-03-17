/**
 * AI Gateway Phase 2 集成测试
 * 测试 ResponseCacheService、BatchUpdateService、PrometheusExporter、CostAnalysisService 集成
 */

const AiGatewayServiceV2 = require('../src/modules/ai-gateway/AiGatewayServiceV2');
const ResponseCacheService = require('../src/modules/ai-gateway/ResponseCacheService');
const BatchUpdateService = require('../src/modules/ai-gateway/BatchUpdateService');
const PrometheusExporter = require('../src/modules/monitoring/PrometheusExporter');
const CostAnalysisService = require('../src/modules/cost-analysis/CostAnalysisService');
const { BaiduWenxinProvider, IFlytekSparkProvider } = require('../src/modules/ai-gateway/providers');

describe('Phase 2 服务初始化', () => {
  test('AiGatewayServiceV2 应该包含 Phase 2 服务引用', () => {
    expect(ResponseCacheService).toBeDefined();
    expect(BatchUpdateService).toBeDefined();
    expect(PrometheusExporter).toBeDefined();
    expect(CostAnalysisService).toBeDefined();
  });

  test('Providers 应该正确导出', () => {
    expect(BaiduWenxinProvider).toBeDefined();
    expect(IFlytekSparkProvider).toBeDefined();
    expect(typeof BaiduWenxinProvider.callModel).toBe('function');
    expect(typeof IFlytekSparkProvider.callModel).toBe('function');
  });

  test('AiGatewayServiceV2 应该包含新增的 Provider 配置', () => {
    expect(AiGatewayServiceV2.PROVIDER_CONFIGS.baidu).toBeDefined();
    expect(AiGatewayServiceV2.PROVIDER_CONFIGS.iflytek).toBeDefined();
    expect(AiGatewayServiceV2.PROVIDER_CONFIGS.baidu.provider).toBe(BaiduWenxinProvider);
    expect(AiGatewayServiceV2.PROVIDER_CONFIGS.iflytek.provider).toBe(IFlytekSparkProvider);
  });

  test('模型路由应该包含新的 fallback 模型', () => {
    const routing = AiGatewayServiceV2.selectModel('simple-question');
    expect(routing.fallbacks).toContain('ernie-bot-turbo');
    expect(routing.fallbacks).toContain('spark-lite');
  });
});

describe('ResponseCacheService 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该生成一致的缓存键', () => {
    const params1 = { model: 'qwen-flash', messages: ['test'] };
    const params2 = { model: 'qwen-flash', messages: ['test'] };
    
    const key1 = ResponseCacheService.generateCacheKey('chat', params1);
    const key2 = ResponseCacheService.generateCacheKey('chat', params2);
    
    expect(key1).toBe(key2);
  });

  test('应该为不同参数生成不同的缓存键', () => {
    const params1 = { model: 'qwen-flash', messages: ['test1'] };
    const params2 = { model: 'qwen-flash', messages: ['test2'] };
    
    const key1 = ResponseCacheService.generateCacheKey('chat', params1);
    const key2 = ResponseCacheService.generateCacheKey('chat', params2);
    
    expect(key1).not.toBe(key2);
  });

  test('应该根据任务类型返回正确的 TTL', () => {
    expect(ResponseCacheService.getTTLForTaskType('simple-question')).toBe(ResponseCacheService.config.questionTTL);
    expect(ResponseCacheService.getTTLForTaskType('embedding')).toBe(ResponseCacheService.config.embeddingTTL);
    expect(ResponseCacheService.getTTLForTaskType('chat')).toBe(ResponseCacheService.config.chatTTL);
  });
});

describe('BatchUpdateService 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该正确配置批量更新参数', () => {
    expect(BatchUpdateService.config.batchSize).toBeDefined();
    expect(BatchUpdateService.config.maxQueueSize).toBeDefined();
    expect(BatchUpdateService.config.flushInterval).toBeDefined();
  });

  test('应该能获取队列状态', () => {
    const status = BatchUpdateService.getQueueStatus();
    expect(status).toBeDefined();
    expect(status.queues).toBeDefined();
    expect(status.totalQueued).toBeDefined();
  });
});

describe('PrometheusExporter 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该定义所有必需的指标', () => {
    expect(PrometheusExporter.metrics.aiRequestsTotal).toBeDefined();
    expect(PrometheusExporter.metrics.aiRequestDuration).toBeDefined();
    expect(PrometheusExporter.metrics.aiRequestErrors).toBeDefined();
    expect(PrometheusExporter.metrics.aiTokenUsage).toBeDefined();
    expect(PrometheusExporter.metrics.aiCacheHits).toBeDefined();
    expect(PrometheusExporter.metrics.aiCacheMisses).toBeDefined();
  });

  test('应该能记录 AI 请求指标', () => {
    expect(() => {
      PrometheusExporter.recordAIRequest('aliyun', 'qwen-flash', 'chat', 'success');
    }).not.toThrow();
  });

  test('应该能记录 AI 请求延迟', () => {
    expect(() => {
      PrometheusExporter.recordAIDuration('aliyun', 'qwen-flash', 'chat', 0.5);
    }).not.toThrow();
  });

  test('应该能记录 Token 使用', () => {
    expect(() => {
      PrometheusExporter.recordTokenUsage('aliyun', 'qwen-flash', 100, 50, 150);
    }).not.toThrow();
  });

  test('应该能记录缓存命中/未命中', () => {
    expect(() => {
      PrometheusExporter.recordCacheHit('chat');
      PrometheusExporter.recordCacheMiss('chat');
    }).not.toThrow();
  });

  test('应该能记录 AI 错误', () => {
    expect(() => {
      PrometheusExporter.recordAIError('aliyun', 'qwen-flash', 'chat', 'timeout');
    }).not.toThrow();
  });
});

describe('CostAnalysisService 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该定义所有服务商的定价', () => {
    expect(CostAnalysisService.PRICING.aliyun).toBeDefined();
    expect(CostAnalysisService.PRICING.openai).toBeDefined();
    expect(CostAnalysisService.PRICING.baidu).toBeDefined();
    expect(CostAnalysisService.PRICING.iflytek).toBeDefined();
  });

  test('应该能计算阿里云模型成本', () => {
    const cost = CostAnalysisService.calculateCost('aliyun', 'qwen-turbo', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  test('应该能计算百度模型成本', () => {
    const cost = CostAnalysisService.calculateCost('baidu', 'ernie-bot-turbo', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  test('应该能计算讯飞模型成本', () => {
    const cost = CostAnalysisService.calculateCost('iflytek', 'spark-lite', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  test('未知模型应该使用默认价格', () => {
    const cost = CostAnalysisService.calculateCost('unknown', 'unknown-model', 1000, 500);
    expect(cost).toBe((1000 + 500) * 0.00001);
  });

  test('应该能获取周数', () => {
    const week = CostAnalysisService.getWeekNumber(new Date());
    expect(week).toBeGreaterThan(0);
    expect(week).toBeLessThanOrEqual(53);
  });

  test('预算配置应该正确', () => {
    expect(CostAnalysisService.BUDGET_CONFIG.daily).toBeDefined();
    expect(CostAnalysisService.BUDGET_CONFIG.weekly).toBeDefined();
    expect(CostAnalysisService.BUDGET_CONFIG.monthly).toBeDefined();
    expect(CostAnalysisService.BUDGET_CONFIG.alertThresholds).toBeDefined();
  });
});

describe('AiGatewayServiceV2 Phase 2 方法', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该包含 Phase 2 新增方法', () => {
    expect(typeof AiGatewayServiceV2.getCacheStats).toBe('function');
    expect(typeof AiGatewayServiceV2.getCostStats).toBe('function');
    expect(typeof AiGatewayServiceV2.getBudgetUsage).toBe('function');
    expect(typeof AiGatewayServiceV2.getOptimizationSuggestions).toBe('function');
    expect(typeof AiGatewayServiceV2.getPrometheusMetrics).toBe('function');
    expect(typeof AiGatewayServiceV2.getBatchUpdateStatus).toBe('function');
  });

  test('健康状态应该包含新的 provider', () => {
    const status = AiGatewayServiceV2.getHealthStatus();
    expect(status.baidu).toBeDefined();
    expect(status.iflytek).toBeDefined();
  });

  test('Provider 配置应该包含 provider 类引用', () => {
    expect(AiGatewayServiceV2.PROVIDER_CONFIGS.baidu.provider).toBe(BaiduWenxinProvider);
    expect(AiGatewayServiceV2.PROVIDER_CONFIGS.iflytek.provider).toBe(IFlytekSparkProvider);
  });
});

describe('BaiduWenxinProvider 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该定义所有模型', () => {
    expect(BaiduWenxinProvider.MODELS['ernie-bot-turbo']).toBeDefined();
    expect(BaiduWenxinProvider.MODELS['ernie-bot']).toBeDefined();
    expect(BaiduWenxinProvider.MODELS['ernie-bot-4']).toBeDefined();
  });

  test('API Key 未配置时应该返回错误', async () => {
    const originalKey = process.env.BAIDU_API_KEY;
    delete process.env.BAIDU_API_KEY;

    const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
      { role: 'user', content: '测试' }
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('API Key 未配置');

    if (originalKey) {
      process.env.BAIDU_API_KEY = originalKey;
    }
  });

  test('不支持的模型应该返回错误', async () => {
    const result = await BaiduWenxinProvider.callModel('non-existent-model', [
      { role: 'user', content: '测试' }
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('不支持的百度模型');
  });
});

describe('IFlytekSparkProvider 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该定义所有模型', () => {
    expect(IFlytekSparkProvider.MODELS['spark-lite']).toBeDefined();
    expect(IFlytekSparkProvider.MODELS['spark-v2']).toBeDefined();
    expect(IFlytekSparkProvider.MODELS['spark-pro']).toBeDefined();
    expect(IFlytekSparkProvider.MODELS['spark-max']).toBeDefined();
  });

  test('API Key 未配置时应该返回错误', async () => {
    const originalId = process.env.IFLYTEK_APP_ID;
    delete process.env.IFLYTEK_APP_ID;

    const result = await IFlytekSparkProvider.callModel('spark-lite', [
      { role: 'user', content: '测试' }
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('API Key 未配置');

    if (originalId) {
      process.env.IFLYTEK_APP_ID = originalId;
    }
  });

  test('不支持的模型应该返回错误', async () => {
    const result = await IFlytekSparkProvider.callModel('non-existent-model', [
      { role: 'user', content: '测试' }
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('不支持的讯飞模型');
  });
});

describe('环境变量配置测试', () => {
  test('.env 应该包含 Phase 2 配置项', () => {
    expect(process.env.CACHE_DEFAULT_TTL).toBeDefined();
    expect(process.env.BATCH_UPDATE_SIZE).toBeDefined();
    expect(process.env.DAILY_BUDGET).toBeDefined();
    expect(process.env.PROMETHEUS_PORT).toBeDefined();
  });
});

describe('集成流程测试', () => {
  test('AiGatewayServiceV2 应该能正确路由到百度 provider', () => {
    const config = AiGatewayServiceV2.getModelConfig('ernie-bot-turbo');
    expect(config).toBeDefined();
    expect(config.provider).toBe('baidu');
    expect(config.providerClass).toBe(BaiduWenxinProvider);
  });

  test('AiGatewayServiceV2 应该能正确路由到讯飞 provider', () => {
    const config = AiGatewayServiceV2.getModelConfig('spark-lite');
    expect(config).toBeDefined();
    expect(config.provider).toBe('iflytek');
    expect(config.providerClass).toBe(IFlytekSparkProvider);
  });

  test('模型调用应该包含 taskType 参数支持', async () => {
    // 验证 callModel 方法签名支持 taskType
    const methodStr = AiGatewayServiceV2.callModel.toString();
    expect(methodStr).toContain('taskType');
  });

  test('模型调用应该包含 userId 参数支持', async () => {
    // 验证 callModel 方法签名支持 userId
    const methodStr = AiGatewayServiceV2.callModel.toString();
    expect(methodStr).toContain('userId');
  });

  test('模型调用应该包含 enableCache 参数支持', async () => {
    // 验证 callModel 方法签名支持 enableCache
    const methodStr = AiGatewayServiceV2.callModel.toString();
    expect(methodStr).toContain('enableCache');
  });
});
