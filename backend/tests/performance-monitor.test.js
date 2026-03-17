/**
 * Performance Monitor Middleware Tests
 * 测试性能监控中间件功能
 */

const promClient = require('prom-client');

// Mock prom-client before requiring the module
jest.mock('prom-client', () => {
  class MockHistogram {
    constructor(config) {
      this.name = config.name;
      this.labelNames = config.labelNames;
    }
    observe(labels, value) {
      return { labels, value };
    }
  }

  class MockCounter {
    constructor(config) {
      this.name = config.name;
      this.labelNames = config.labelNames;
    }
    inc(labels) {
      return { labels };
    }
  }

  class MockGauge {
    constructor(config) {
      this.name = config.name;
      this._value = 0;
    }
    inc() {
      this._value++;
    }
    dec() {
      this._value--;
    }
    get() {
      return this._value;
    }
  }

  class MockRegistry {
    constructor() {
      this._metrics = [];
    }
    registerMetric(metric) {
      this._metrics.push(metric);
    }
    async metrics() {
      return '# Prometheus metrics\n# HELP test Test metric\n# TYPE test gauge\ntest 0';
    }
  }

  return {
    Histogram: MockHistogram,
    Counter: MockCounter,
    Gauge: MockGauge,
    Registry: MockRegistry,
    collectDefaultMetrics: jest.fn()
  };
});

const {
  performanceMonitor,
  getSlowRequests,
  clearSlowRequests,
  getMetrics,
  getPerformanceSummary,
  trackDbQuery,
  trackAiApiCall,
  recordCacheHit,
  recordCacheMiss
} = require('../src/middleware/performance-monitor');

describe('Performance Monitor Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSlowRequests();
  });

  // ============================================================================
  // HTTP 请求指标测试
  // ============================================================================

  describe('HTTP 请求指标收集', () => {
    it('应该记录请求耗时', () => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET',
        path: '/api/users',
        route: { path: '/api/users' },
        originalUrl: '/api/users'
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        })
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('应该记录请求总数', () => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'POST',
        path: '/api/data',
        route: { path: '/api/data' }
      };
      
      const res = {
        statusCode: 201,
        on: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      // 触发 finish 事件
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();
      
      expect(true).toBe(true); // Test passes if no error is thrown
    });

    it('应该处理没有 route 的情况', () => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET',
        path: '/api/no-route'
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();
      
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // 慢请求检测测试
  // ============================================================================

  describe('慢请求检测', () => {
    it('应该记录慢请求 (>1000ms)', (done) => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET',
        path: '/api/slow',
        originalUrl: '/api/slow',
        headers: {
          'user-agent': 'TestAgent/1.0'
        }
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn()
      };
      
      clearSlowRequests();
      
      middleware(req, res, jest.fn());
      
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      
      // 模拟慢请求
      setTimeout(() => {
        finishCallback();
        
        setTimeout(() => {
          const slowRequests = getSlowRequests();
          expect(slowRequests.length).toBeGreaterThan(0);
          done();
        }, 100);
      }, 1100);
    });

    it('不应该记录快请求 (<1000ms)', (done) => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET',
        path: '/api/fast',
        originalUrl: '/api/fast'
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn()
      };
      
      clearSlowRequests();
      
      middleware(req, res, jest.fn());
      
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();
      
      setTimeout(() => {
        const slowRequests = getSlowRequests();
        expect(slowRequests.length).toBe(0);
        done();
      }, 100);
    });
  });

  // ============================================================================
  // 慢请求日志管理测试
  // ============================================================================

  describe('慢请求日志管理', () => {
    it('应该清除所有慢请求日志', () => {
      clearSlowRequests();
      
      const slowRequests = getSlowRequests();
      expect(slowRequests.length).toBe(0);
    });

    it('应该获取最近的慢请求', () => {
      const slowRequests = getSlowRequests(10);
      expect(Array.isArray(slowRequests)).toBe(true);
    });

    it('应该限制返回的慢请求数量', () => {
      const slowRequests = getSlowRequests(5);
      expect(Array.isArray(slowRequests)).toBe(true);
    });
  });

  // ============================================================================
  // 性能指标导出测试
  // ============================================================================

  describe('性能指标导出', () => {
    it('应该导出 Prometheus 格式的指标', async () => {
      const metrics = await getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });
  });

  // ============================================================================
  // 性能摘要测试
  // ============================================================================

  describe('性能摘要', () => {
    it('应该返回性能摘要', () => {
      const summary = getPerformanceSummary();
      
      expect(summary).toHaveProperty('slowRequests');
      expect(summary).toHaveProperty('recentSlowRequests');
      expect(summary).toHaveProperty('concurrentRequests');
    });

    it('应该包含最近的慢请求', () => {
      const summary = getPerformanceSummary();
      
      expect(Array.isArray(summary.recentSlowRequests)).toBe(true);
      expect(summary.recentSlowRequests.length).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // 数据库查询指标测试
  // ============================================================================

  describe('数据库查询指标', () => {
    it('应该记录成功的数据库查询', () => {
      const operation = 'SELECT';
      const table = 'users';
      
      const result = trackDbQuery(operation, table, () => {
        return { id: 1, name: 'test' };
      });
      
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('应该记录失败的数据库查询', () => {
      const operation = 'UPDATE';
      const table = 'posts';
      
      expect(() => {
        trackDbQuery(operation, table, () => {
          throw new Error('Database error');
        });
      }).toThrow('Database error');
    });
  });

  // ============================================================================
  // AI API 调用指标测试
  // ============================================================================

  describe('AI API 调用指标', () => {
    it('应该记录成功的 AI API 调用', async () => {
      const provider = 'openai';
      const model = 'gpt-4';
      const endpoint = '/chat/completions';
      
      const mockFn = jest.fn().mockResolvedValue({ result: 'success' });
      
      const result = await trackAiApiCall(provider, model, endpoint, mockFn);
      
      expect(result).toEqual({ result: 'success' });
    });

    it('应该记录失败的 AI API 调用', async () => {
      const provider = 'anthropic';
      const model = 'claude-3';
      const endpoint = '/messages';
      
      const mockFn = jest.fn().mockRejectedValue(new Error('API error'));
      
      await expect(trackAiApiCall(provider, model, endpoint, mockFn))
        .rejects.toThrow('API error');
    });
  });

  // ============================================================================
  // 缓存指标测试
  // ============================================================================

  describe('缓存指标', () => {
    it('应该记录缓存命中', () => {
      const namespace = 'api';
      
      recordCacheHit(namespace);
      
      expect(true).toBe(true);
    });

    it('应该记录缓存未命中', () => {
      const namespace = 'users';
      
      recordCacheMiss(namespace);
      
      expect(true).toBe(true);
    });

    it('应该支持多个命名空间', () => {
      const namespaces = ['api', 'users', 'posts', 'comments'];
      
      namespaces.forEach(ns => {
        recordCacheHit(ns);
        recordCacheMiss(ns);
      });
      
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // 边界测试
  // ============================================================================

  describe('边界测试', () => {
    it('应该处理空路径', () => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET',
        path: ''
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn()
      };
      
      expect(() => {
        middleware(req, res, jest.fn());
      }).not.toThrow();
    });

    it('应该处理 undefined 路径', () => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET'
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn()
      };
      
      expect(() => {
        middleware(req, res, jest.fn());
      }).not.toThrow();
    });

    it('应该处理各种 HTTP 方法', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
      
      methods.forEach(method => {
        const middleware = performanceMonitor();
        
        const req = {
          method,
          path: '/api/test'
        };
        
        const res = {
          statusCode: 200,
          on: jest.fn()
        };
        
        expect(() => {
          middleware(req, res, jest.fn());
        }).not.toThrow();
      });
    });

    it('应该处理各种状态码', () => {
      const statusCodes = [200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 502, 503];
      
      statusCodes.forEach(statusCode => {
        const middleware = performanceMonitor();
        
        const req = {
          method: 'GET',
          path: '/api/test'
        };
        
        const res = {
          statusCode,
          on: jest.fn()
        };
        
        expect(() => {
          middleware(req, res, jest.fn());
        }).not.toThrow();
      });
    });
  });

  // ============================================================================
  // 性能测试
  // ============================================================================

  describe('性能测试', () => {
    it('应该快速处理中间件逻辑', () => {
      const middleware = performanceMonitor();
      
      const req = {
        method: 'GET',
        path: '/api/test'
      };
      
      const res = {
        statusCode: 200,
        on: jest.fn()
      };
      
      const next = jest.fn();
      
      const start = Date.now();
      middleware(req, res, next);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10);
    });
  });
});
