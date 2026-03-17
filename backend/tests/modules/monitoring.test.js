/**
 * Monitoring Module - Comprehensive Unit Tests
 * Coverage Target: 60%+
 */

const http = require('http');

// Mock prom-client before importing PrometheusExporter
jest.mock('prom-client', () => {
  const mockFn = jest.fn();
  
  return {
    collectDefaultMetrics: jest.fn(),
    Registry: jest.fn().mockImplementation(() => ({
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      metrics: jest.fn().mockResolvedValue('# HELP test\n# TYPE test gauge\ntest_metric 0'),
      clear: jest.fn()
    })),
    Counter: jest.fn().mockImplementation(() => ({
      inc: mockFn,
      labels: jest.fn().mockReturnThis()
    })),
    Gauge: jest.fn().mockImplementation(() => ({
      set: mockFn,
      labels: jest.fn().mockReturnThis()
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      observe: mockFn,
      labels: jest.fn().mockReturnThis()
    })),
    Summary: jest.fn().mockImplementation(() => ({
      observe: mockFn,
      labels: jest.fn().mockReturnThis()
    }))
  };
});

const PrometheusExporter = require('../../src/modules/monitoring/PrometheusExporter');
const promClient = require('prom-client');

describe('PrometheusExporter', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    PrometheusExporter.server = null;
    PrometheusExporter.registry = null;
    PrometheusExporter.metrics = {};
    
    // Save original environment
    originalEnv = {
      PROMETHEUS_PORT: process.env.PROMETHEUS_PORT,
      PROMETHEUS_PATH: process.env.PROMETHEUS_PATH
    };

    // Reset environment
    delete process.env.PROMETHEUS_PORT;
    delete process.env.PROMETHEUS_PATH;
  });

  afterEach(() => {
    // Restore original environment
    process.env.PROMETHEUS_PORT = originalEnv.PROMETHEUS_PORT;
    process.env.PROMETHEUS_PATH = originalEnv.PROMETHEUS_PATH;

    // Stop server if running
    if (PrometheusExporter.server) {
      try {
        PrometheusExporter.server.close();
      } catch (e) {}
      PrometheusExporter.server = null;
    }
  });

  describe('config', () => {
    it('应该包含默认配置', () => {
      expect(PrometheusExporter.config).toHaveProperty('port');
      expect(PrometheusExporter.config).toHaveProperty('path');
      expect(PrometheusExporter.config).toHaveProperty('collectDefaultMetrics');
    });

    it('应该使用默认端口 9090', () => {
      expect(PrometheusExporter.config.port).toBe(9090);
    });

    it('应该使用默认路径 /metrics', () => {
      expect(PrometheusExporter.config.path).toBe('/metrics');
    });

    it('应该默认收集默认指标', () => {
      expect(PrometheusExporter.config.collectDefaultMetrics).toBe(true);
    });
  });

  describe('init', () => {
    it('应该初始化 Prometheus 导出器', () => {
      expect(() => {
        PrometheusExporter.init();
      }).not.toThrow();
    });

    it('应该注册自定义指标', () => {
      PrometheusExporter.init();
      
      expect(PrometheusExporter.metrics.aiRequestsTotal).toBeDefined();
      expect(PrometheusExporter.metrics.aiRequestDuration).toBeDefined();
      expect(PrometheusExporter.metrics.aiRequestErrors).toBeDefined();
    });

    it('应该收集默认指标', () => {
      PrometheusExporter.init();
      
      expect(promClient.collectDefaultMetrics).toHaveBeenCalled();
    });
  });

  describe('startServer', () => {
    it('应该启动 HTTP 服务器', () => {
      PrometheusExporter.init();
      PrometheusExporter.startServer();

      expect(PrometheusExporter.server).toBeDefined();
    });

    it('应该警告如果服务器已在运行', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      PrometheusExporter.init();
      PrometheusExporter.startServer();
      PrometheusExporter.startServer();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Prometheus 服务器已在运行');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('stopServer', () => {
    it('应该停止服务器', () => {
      PrometheusExporter.init();
      PrometheusExporter.startServer();
      
      expect(PrometheusExporter.server).toBeDefined();
      
      PrometheusExporter.stopServer();
      
      expect(PrometheusExporter.server).toBeNull();
    });

    it('应该处理服务器未运行的情况', () => {
      expect(() => {
        PrometheusExporter.stopServer();
      }).not.toThrow();
    });
  });

  describe('recordAIRequest', () => {
    it('应该记录 AI 请求', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordAIRequest('aliyun', 'qwen-plus', 'question-generation', 'success');
      
      expect(PrometheusExporter.metrics.aiRequestsTotal.inc).toHaveBeenCalledWith({
        provider: 'aliyun',
        model: 'qwen-plus',
        task_type: 'question-generation',
        status: 'success'
      });
    });

    it('应该默认状态为 success', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordAIRequest('aliyun', 'qwen-plus', 'question-generation');
      
      expect(PrometheusExporter.metrics.aiRequestsTotal.inc).toHaveBeenCalledWith({
        provider: 'aliyun',
        model: 'qwen-plus',
        task_type: 'question-generation',
        status: 'success'
      });
    });
  });

  describe('recordAIDuration', () => {
    it('应该记录 AI 请求延迟', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordAIDuration('aliyun', 'qwen-plus', 'question-generation', 1.5);
      
      expect(PrometheusExporter.metrics.aiRequestDuration.observe).toHaveBeenCalledWith(
        {
          provider: 'aliyun',
          model: 'qwen-plus',
          task_type: 'question-generation'
        },
        1.5
      );
    });
  });

  describe('recordAIError', () => {
    it('应该记录 AI 错误', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordAIError('aliyun', 'qwen-plus', 'question-generation', 'timeout');
      
      expect(PrometheusExporter.metrics.aiRequestErrors.inc).toHaveBeenCalledWith({
        provider: 'aliyun',
        model: 'qwen-plus',
        task_type: 'question-generation',
        error_type: 'timeout'
      });
    });
  });

  describe('recordTokenUsage', () => {
    it('应该记录 Token 使用', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordTokenUsage('aliyun', 'qwen-plus', 100, 200, 300);
      
      expect(PrometheusExporter.metrics.aiTokenUsage.inc).toHaveBeenCalledTimes(3);
    });
  });

  describe('recordCacheHit', () => {
    it('应该记录缓存命中', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordCacheHit('question-generation');
      
      expect(PrometheusExporter.metrics.aiCacheHits.inc).toHaveBeenCalledWith({
        task_type: 'question-generation'
      });
    });
  });

  describe('recordCacheMiss', () => {
    it('应该记录缓存未命中', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordCacheMiss('question-generation');
      
      expect(PrometheusExporter.metrics.aiCacheMisses.inc).toHaveBeenCalledWith({
        task_type: 'question-generation'
      });
    });
  });

  describe('recordResponseTime', () => {
    it('应该记录 HTTP 响应时间', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordResponseTime('GET', '/api/questions', 200, 0.05);
      
      expect(PrometheusExporter.metrics.responseTime.observe).toHaveBeenCalledWith(
        {
          method: 'GET',
          route: '/api/questions',
          status: '200'
        },
        0.05
      );
    });
  });

  describe('setActiveConnections', () => {
    it('应该设置活跃连接数', () => {
      PrometheusExporter.init();
      PrometheusExporter.setActiveConnections(50);
      
      expect(PrometheusExporter.metrics.activeConnections.set).toHaveBeenCalledWith(50);
    });
  });

  describe('setQueueSize', () => {
    it('应该设置队列大小', () => {
      PrometheusExporter.init();
      PrometheusExporter.setQueueSize('ai-queue', 10);
      
      expect(PrometheusExporter.metrics.queueSize.set).toHaveBeenCalledWith(
        { queue_name: 'ai-queue' },
        10
      );
    });
  });

  describe('recordQuestionGenerated', () => {
    it('应该记录生成的题目', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordQuestionGenerated('medium', 'choice');
      
      expect(PrometheusExporter.metrics.questionsGenerated.inc).toHaveBeenCalledWith({
        difficulty: 'medium',
        type: 'choice'
      });
    });
  });

  describe('setActiveUsers', () => {
    it('应该设置活跃用户数', () => {
      PrometheusExporter.init();
      PrometheusExporter.setActiveUsers(100);
      
      expect(PrometheusExporter.metrics.usersActive.set).toHaveBeenCalledWith(100);
    });
  });

  describe('recordPracticeSessionCompleted', () => {
    it('应该记录完成的练习会话', () => {
      PrometheusExporter.init();
      PrometheusExporter.recordPracticeSessionCompleted();
      
      expect(PrometheusExporter.metrics.practiceSessionsCompleted.inc).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('应该获取当前所有指标', async () => {
      PrometheusExporter.init();
      const metrics = await PrometheusExporter.getMetrics();
      
      expect(typeof metrics).toBe('string');
    });
  });

  describe('resetMetrics', () => {
    it('应该重置所有指标', () => {
      PrometheusExporter.init();
      PrometheusExporter.resetMetrics();
      
      expect(PrometheusExporter.registry.clear).toHaveBeenCalled();
    });
  });
});
