/**
 * Cost Analysis Module - Comprehensive Unit Tests
 * Coverage Target: 60%+
 */

const CostAnalysisService = require('../../src/modules/cost-analysis/CostAnalysisService');
const Redis = require('ioredis');

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    hincrbyfloat: jest.fn().mockResolvedValue(1),
    hincrby: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    hvals: jest.fn().mockResolvedValue([]),
    hgetall: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    lpush: jest.fn().mockResolvedValue(1),
    ltrim: jest.fn().mockResolvedValue('OK'),
    lrange: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    disconnect: jest.fn()
  };
  return jest.fn(() => mockRedis);
});

describe('CostAnalysisService', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    CostAnalysisService.redis = null;
    mockRedis = new Redis();
  });

  afterEach(() => {
    if (CostAnalysisService.redis) {
      CostAnalysisService.redis.disconnect();
      CostAnalysisService.redis = null;
    }
  });

  describe('PRICING', () => {
    it('应该包含所有提供商的定价配置', () => {
      expect(CostAnalysisService.PRICING.aliyun).toBeDefined();
      expect(CostAnalysisService.PRICING.openai).toBeDefined();
      expect(CostAnalysisService.PRICING.moonshot).toBeDefined();
      expect(CostAnalysisService.PRICING.baidu).toBeDefined();
      expect(CostAnalysisService.PRICING.iflytek).toBeDefined();
    });

    it('应该包含主要模型的价格', () => {
      expect(CostAnalysisService.PRICING.aliyun['qwen-turbo']).toBeDefined();
      expect(CostAnalysisService.PRICING.aliyun['qwen-plus']).toBeDefined();
      expect(CostAnalysisService.PRICING.aliyun['qwen-max']).toBeDefined();
    });

    it('应该定义 prompt 和 completion 价格', () => {
      const pricing = CostAnalysisService.PRICING.aliyun['qwen-turbo'];
      expect(pricing).toHaveProperty('prompt');
      expect(pricing).toHaveProperty('completion');
    });
  });

  describe('BUDGET_CONFIG', () => {
    it('应该包含预算配置', () => {
      expect(CostAnalysisService.BUDGET_CONFIG).toHaveProperty('daily');
      expect(CostAnalysisService.BUDGET_CONFIG).toHaveProperty('weekly');
      expect(CostAnalysisService.BUDGET_CONFIG).toHaveProperty('monthly');
      expect(CostAnalysisService.BUDGET_CONFIG).toHaveProperty('alertThresholds');
    });

    it('应该使用环境变量或默认值', () => {
      expect(typeof CostAnalysisService.BUDGET_CONFIG.daily).toBe('number');
      expect(CostAnalysisService.BUDGET_CONFIG.daily).toBeGreaterThan(0);
    });

    it('应该包含告警阈值数组', () => {
      expect(Array.isArray(CostAnalysisService.BUDGET_CONFIG.alertThresholds)).toBe(true);
      expect(CostAnalysisService.BUDGET_CONFIG.alertThresholds).toContain(0.5);
      expect(CostAnalysisService.BUDGET_CONFIG.alertThresholds).toContain(0.75);
      expect(CostAnalysisService.BUDGET_CONFIG.alertThresholds).toContain(0.9);
      expect(CostAnalysisService.BUDGET_CONFIG.alertThresholds).toContain(1.0);
    });
  });

  describe('init', () => {
    it('应该初始化 Redis 连接', async () => {
      const redis = await CostAnalysisService.init();
      
      expect(redis).toBeDefined();
      expect(CostAnalysisService.redis).toBeDefined();
      expect(Redis).toHaveBeenCalled();
    });

    it('应该重复使用已有的 Redis 连接', async () => {
      await CostAnalysisService.init();
      const firstRedis = CostAnalysisService.redis;
      
      await CostAnalysisService.init();
      const secondRedis = CostAnalysisService.redis;
      
      expect(firstRedis).toBe(secondRedis);
    });

    it('应该使用环境变量配置 Redis', async () => {
      process.env.REDIS_HOST = 'test-host';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'test-pass';
      
      await CostAnalysisService.init();
      
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'test-host',
          port: 6380,
          password: 'test-pass'
        })
      );

      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
    });
  });

  describe('calculateCost', () => {
    it('应该计算阿里云模型的成本', () => {
      const cost = CostAnalysisService.calculateCost('aliyun', 'qwen-turbo', 1000, 500);
      
      // qwen-turbo: prompt 0.002/1k, completion 0.006/1k
      // 1000 tokens * 0.002 + 500 tokens * 0.006 = 0.002 + 0.003 = 0.005
      expect(cost).toBeCloseTo(0.005, 4);
    });

    it('应该计算 OpenAI 模型的成本', () => {
      const cost = CostAnalysisService.calculateCost('openai', 'gpt-3.5-turbo', 1000, 1000);
      
      // gpt-3.5-turbo: prompt 0.0015/1k, completion 0.002/1k
      expect(cost).toBeCloseTo(0.0035, 4);
    });

    it('应该为未知模型使用默认价格', () => {
      const cost = CostAnalysisService.calculateCost('unknown', 'unknown-model', 1000, 1000);
      
      // 默认价格：0.00001 per token
      expect(cost).toBeCloseTo(0.02, 4);
    });

    it('应该处理零 tokens', () => {
      const cost = CostAnalysisService.calculateCost('aliyun', 'qwen-turbo', 0, 0);
      expect(cost).toBe(0);
    });

    it('应该处理大量 tokens', () => {
      const cost = CostAnalysisService.calculateCost('aliyun', 'qwen-max', 100000, 50000);
      
      // qwen-max: prompt 0.02/1k, completion 0.06/1k
      // 100000 * 0.02/1000 + 50000 * 0.06/1000 = 2 + 3 = 5
      expect(cost).toBeCloseTo(5, 2);
    });
  });

  describe('getWeekNumber', () => {
    it('应该计算日期所在的周数', () => {
      const date = new Date('2024-01-15');
      const week = CostAnalysisService.getWeekNumber(date);
      
      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });

    it('应该正确处理年初', () => {
      const date = new Date('2024-01-01');
      const week = CostAnalysisService.getWeekNumber(date);
      
      expect(week).toBeGreaterThanOrEqual(1);
    });

    it('应该正确处理年末', () => {
      const date = new Date('2024-12-31');
      const week = CostAnalysisService.getWeekNumber(date);
      
      expect(week).toBeLessThanOrEqual(53);
    });
  });

  describe('recordUsage', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该记录 Token 使用及成本', async () => {
      const result = await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(result).toBeDefined();
      expect(result.cost).toBeDefined();
      expect(result.totalTokens).toBe(300);
    });

    it('应该更新日统计', async () => {
      await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(mockRedis.hincrbyfloat).toHaveBeenCalledWith(
        expect.stringContaining('cost:daily:'),
        'aliyun:qwen-plus',
        expect.any(Number)
      );
    });

    it('应该更新周统计', async () => {
      await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(mockRedis.hincrbyfloat).toHaveBeenCalledWith(
        expect.stringContaining('cost:weekly:'),
        'aliyun:qwen-plus',
        expect.any(Number)
      );
    });

    it('应该更新月统计', async () => {
      await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(mockRedis.hincrbyfloat).toHaveBeenCalledWith(
        expect.stringContaining('cost:monthly:'),
        'aliyun:qwen-plus',
        expect.any(Number)
      );
    });

    it('应该更新用户统计', async () => {
      await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(mockRedis.hincrbyfloat).toHaveBeenCalledWith(
        expect.stringContaining('cost:user:user123:'),
        'total',
        expect.any(Number)
      );
    });

    it('应该更新任务类型统计', async () => {
      await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(mockRedis.hincrbyfloat).toHaveBeenCalledWith(
        expect.stringContaining('cost:task:question-generation:'),
        'total',
        expect.any(Number)
      );
    });

    it('应该设置正确的过期时间', async () => {
      await CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      });

      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringContaining('cost:daily:'),
        86400 * 35
      );
    });

    it('应该在没有 Redis 时不抛出错误', async () => {
      CostAnalysisService.redis = null;
      
      await expect(CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      })).resolves.toBeUndefined();
    });

    it('应该处理记录失败的情况', async () => {
      mockRedis.hincrbyfloat.mockRejectedValueOnce(new Error('Redis error'));
      
      await expect(CostAnalysisService.recordUsage({
        provider: 'aliyun',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
        userId: 'user123',
        taskType: 'question-generation'
      })).resolves.toBeUndefined();
    });
  });

  describe('checkBudgetAlerts', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该检查预算并返回告警', async () => {
      mockRedis.hvals.mockResolvedValue(['50']); // 日成本 50 元
      
      const alerts = await CostAnalysisService.checkBudgetAlerts('2024-01-15', 3, '2024-01');
      
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该在达到阈值时触发告警', async () => {
      // 设置日预算为 100，当前花费 75（75%）
      mockRedis.hvals.mockResolvedValue(['75']);
      mockRedis.get.mockResolvedValue('0'); // 之前没有告警
      
      const alerts = await CostAnalysisService.checkBudgetAlerts('2024-01-15', 3, '2024-01');
      
      expect(alerts.some(a => a.type === 'daily')).toBe(true);
    });

    it('应该记录告警到 Redis', async () => {
      mockRedis.hvals.mockResolvedValue(['75']);
      mockRedis.get.mockResolvedValue('0');
      
      await CostAnalysisService.checkBudgetAlerts('2024-01-15', 3, '2024-01');
      
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'budget_alerts',
        expect.any(String)
      );
    });

    it('应该限制告警数量为最近 100 条', async () => {
      mockRedis.hvals.mockResolvedValue(['75']);
      mockRedis.get.mockResolvedValue('0');
      
      await CostAnalysisService.checkBudgetAlerts('2024-01-15', 3, '2024-01');
      
      expect(mockRedis.ltrim).toHaveBeenCalledWith('budget_alerts', 0, 99);
    });

    it('应该避免重复发送同一阈值的告警', async () => {
      mockRedis.hvals.mockResolvedValue(['75']);
      mockRedis.get.mockResolvedValue('0.75'); // 已经发送过 75% 的告警
      
      const alerts = await CostAnalysisService.checkBudgetAlerts('2024-01-15', 3, '2024-01');
      
      // 不应该有日告警（因为已经发送过）
      expect(alerts.some(a => a.type === 'daily')).toBe(false);
    });
  });

  describe('shouldAlert', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该在达到阈值时返回 true', async () => {
      mockRedis.get.mockResolvedValue('0');
      
      const shouldAlert = await CostAnalysisService.shouldAlert(0.75, 'daily');
      
      expect(shouldAlert).toBe(true);
    });

    it('应该在没有达到阈值时返回 false', async () => {
      const shouldAlert = await CostAnalysisService.shouldAlert(0.3, 'daily');
      
      expect(shouldAlert).toBe(false);
    });

    it('应该在已经发送过告警时返回 false', async () => {
      mockRedis.get.mockResolvedValue('0.75');
      
      const shouldAlert = await CostAnalysisService.shouldAlert(0.75, 'daily');
      
      expect(shouldAlert).toBe(false);
    });

    it('应该设置告警标记', async () => {
      mockRedis.get.mockResolvedValue('0');
      
      await CostAnalysisService.shouldAlert(0.75, 'daily');
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('alert:daily:'),
        86400,
        '0.75'
      );
    });
  });

  describe('getDailyTotal', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取日总成本', async () => {
      mockRedis.hvals.mockResolvedValue(['10', '20', '30']);
      
      const total = await CostAnalysisService.getDailyTotal('2024-01-15');
      
      expect(total).toBe(60);
    });

    it('应该使用当前日期作为默认值', async () => {
      mockRedis.hvals.mockResolvedValue(['10']);
      
      const total = await CostAnalysisService.getDailyTotal();
      
      expect(total).toBe(10);
      expect(mockRedis.hvals).toHaveBeenCalledWith(
        expect.stringContaining('cost:daily:')
      );
    });

    it('应该在没有数据时返回 0', async () => {
      mockRedis.hvals.mockResolvedValue([]);
      
      const total = await CostAnalysisService.getDailyTotal('2024-01-15');
      
      expect(total).toBe(0);
    });

    it('应该在没有 Redis 时返回 0', async () => {
      CostAnalysisService.redis = null;
      
      const total = await CostAnalysisService.getDailyTotal('2024-01-15');
      
      expect(total).toBe(0);
    });
  });

  describe('getWeeklyTotal', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取周总成本', async () => {
      mockRedis.hvals.mockResolvedValue(['50', '50']);
      
      const total = await CostAnalysisService.getWeeklyTotal(2024, 3);
      
      expect(total).toBe(100);
    });

    it('应该在没有数据时返回 0', async () => {
      mockRedis.hvals.mockResolvedValue([]);
      
      const total = await CostAnalysisService.getWeeklyTotal(2024, 3);
      
      expect(total).toBe(0);
    });
  });

  describe('getMonthlyTotal', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取月总成本', async () => {
      mockRedis.hvals.mockResolvedValue(['100', '200', '300']);
      
      const total = await CostAnalysisService.getMonthlyTotal('2024-01');
      
      expect(total).toBe(600);
    });

    it('应该使用当前月份作为默认值', async () => {
      mockRedis.hvals.mockResolvedValue(['100']);
      
      const total = await CostAnalysisService.getMonthlyTotal();
      
      expect(total).toBe(100);
    });
  });

  describe('getCostStats', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取日成本统计', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '10',
        'aliyun:qwen-max': '20'
      });
      
      const stats = await CostAnalysisService.getCostStats('daily');
      
      expect(stats).toBeDefined();
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.trend).toHaveLength(7);
    });

    it('应该获取月成本统计', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '100'
      });
      
      const stats = await CostAnalysisService.getCostStats('monthly');
      
      expect(stats).toBeDefined();
      expect(stats.trend).toHaveLength(12);
    });

    it('应该按提供商聚合成本', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '10',
        'aliyun:qwen-max': '20',
        'openai:gpt-3.5-turbo': '30'
      });
      
      const stats = await CostAnalysisService.getCostStats('daily');
      
      expect(stats.byProvider.aliyun).toBeDefined();
      expect(stats.byProvider.openai).toBeDefined();
    });

    it('应该按模型聚合成本', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '10',
        'aliyun:qwen-max': '20'
      });
      
      const stats = await CostAnalysisService.getCostStats('daily');
      
      expect(stats.byModel['qwen-plus']).toBeDefined();
      expect(stats.byModel['qwen-max']).toBeDefined();
    });

    it('应该在没有 Redis 时返回 null', async () => {
      CostAnalysisService.redis = null;
      
      const stats = await CostAnalysisService.getCostStats('daily');
      
      expect(stats).toBeNull();
    });

    it('应该处理获取失败的情况', async () => {
      mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));
      
      const stats = await CostAnalysisService.getCostStats('daily');
      
      expect(stats).toBeNull();
    });
  });

  describe('getUserCostStats', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取用户成本统计', async () => {
      mockRedis.hgetall.mockResolvedValue({
        total: '10'
      });
      mockRedis.hgetall.mockResolvedValue({ total: '100' }); // tokens
      
      const stats = await CostAnalysisService.getUserCostStats('user123', 7);
      
      expect(stats).toBeDefined();
      expect(stats.totalCost).toBeDefined();
      expect(stats.daily).toHaveLength(7);
    });

    it('应该处理用户没有数据的情况', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      
      const stats = await CostAnalysisService.getUserCostStats('user123', 7);
      
      expect(stats).toBeDefined();
      expect(stats.totalCost).toBe(0);
    });

    it('应该在没有 Redis 时返回 null', async () => {
      CostAnalysisService.redis = null;
      
      const stats = await CostAnalysisService.getUserCostStats('user123', 7);
      
      expect(stats).toBeNull();
    });
  });

  describe('getBudgetUsage', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取预算使用情况', async () => {
      mockRedis.hvals.mockResolvedValue(['50']);
      
      const usage = await CostAnalysisService.getBudgetUsage();
      
      expect(usage).toHaveProperty('daily');
      expect(usage).toHaveProperty('weekly');
      expect(usage).toHaveProperty('monthly');
    });

    it('应该包含预算、花费和剩余', async () => {
      mockRedis.hvals.mockResolvedValue(['50']);
      
      const usage = await CostAnalysisService.getBudgetUsage();
      
      expect(usage.daily).toHaveProperty('budget');
      expect(usage.daily).toHaveProperty('spent');
      expect(usage.daily).toHaveProperty('remaining');
      expect(usage.daily).toHaveProperty('usagePercent');
    });

    it('应该计算正确的使用百分比', async () => {
      mockRedis.hvals.mockResolvedValue(['50']); // 50/100 = 50%
      
      const usage = await CostAnalysisService.getBudgetUsage();
      
      expect(usage.daily.usagePercent).toBe(50);
    });
  });

  describe('getRecentAlerts', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该获取最近的告警记录', async () => {
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({ timestamp: '2024-01-15', alerts: [] })
      ]);
      
      const alerts = await CostAnalysisService.getRecentAlerts(10);
      
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(1);
    });

    it('应该限制返回数量', async () => {
      const alerts = await CostAnalysisService.getRecentAlerts(5);
      
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该在没有 Redis 时返回空数组', async () => {
      CostAnalysisService.redis = null;
      
      const alerts = await CostAnalysisService.getRecentAlerts(10);
      
      expect(alerts).toEqual([]);
    });
  });

  describe('getOptimizationSuggestions', () => {
    beforeEach(async () => {
      await CostAnalysisService.init();
    });

    it('应该生成优化建议', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '100',
        'aliyun:qwen-max': '20'
      });
      
      const suggestions = await CostAnalysisService.getOptimizationSuggestions();
      
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('应该在单一提供商占比过高时给出建议', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '100'
      });
      
      const suggestions = await CostAnalysisService.getOptimizationSuggestions();
      
      expect(suggestions.some(s => s.type === 'provider_concentration')).toBe(true);
    });

    it('应该在高成本模型时给出建议', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:expensive-model': '50'
      });
      
      const suggestions = await CostAnalysisService.getOptimizationSuggestions();
      
      expect(suggestions.some(s => s.type === 'expensive_model')).toBe(true);
    });

    it('应该在成本增长时给出建议', async () => {
      mockRedis.hgetall
        .mockResolvedValueOnce({ 'aliyun:qwen-plus': '100' }) // trend[0]
        .mockResolvedValueOnce({ total: '100' }) // tokens
        .mockResolvedValueOnce({ 'aliyun:qwen-plus': '100' })
        .mockResolvedValueOnce({ total: '100' })
        .mockResolvedValueOnce({ 'aliyun:qwen-plus': '100' })
        .mockResolvedValueOnce({ total: '100' })
        .mockResolvedValueOnce({ 'aliyun:qwen-plus': '50' }) // trend[4]
        .mockResolvedValueOnce({ total: '50' })
        .mockResolvedValueOnce({ 'aliyun:qwen-plus': '50' })
        .mockResolvedValueOnce({ total: '50' })
        .mockResolvedValueOnce({ 'aliyun:qwen-plus': '50' })
        .mockResolvedValueOnce({ total: '50' });
      
      const suggestions = await CostAnalysisService.getOptimizationSuggestions();
      
      expect(suggestions.some(s => s.type === 'cost_increase')).toBe(true);
    });

    it('应该包含潜在节省金额', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'aliyun:qwen-plus': '100'
      });
      
      const suggestions = await CostAnalysisService.getOptimizationSuggestions();
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('potentialSavings');
      }
    });

    it('应该在没有 Redis 时返回空数组', async () => {
      CostAnalysisService.redis = null;
      
      const suggestions = await CostAnalysisService.getOptimizationSuggestions();
      
      expect(suggestions).toEqual([]);
    });
  });
});
