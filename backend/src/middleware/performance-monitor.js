/**
 * 性能监控中间件
 * 收集 API 响应时间、慢查询等指标
 */

const promClient = require('prom-client');

// Prometheus 指标注册表
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// HTTP 请求指标
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 请求耗时',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'HTTP 请求总数',
  labelNames: ['method', 'route', 'status']
});

const httpConcurrentRequests = new promClient.Gauge({
  name: 'http_concurrent_requests',
  help: '当前并发请求数'
});

// 数据库查询指标
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: '数据库查询耗时',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});

const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: '数据库查询总数',
  labelNames: ['operation', 'table']
});

// 缓存指标
const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: '缓存命中数',
  labelNames: ['namespace']
});

const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: '缓存未命中数',
  labelNames: ['namespace']
});

// AI API 调用指标
const aiApiDuration = new promClient.Histogram({
  name: 'ai_api_duration_seconds',
  help: 'AI API 调用耗时',
  labelNames: ['provider', 'model', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60]
});

const aiApiTotal = new promClient.Counter({
  name: 'ai_api_calls_total',
  help: 'AI API 调用总数',
  labelNames: ['provider', 'model', 'endpoint', 'status']
});

// 注册所有指标
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpConcurrentRequests);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueryTotal);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(aiApiDuration);
register.registerMetric(aiApiTotal);

// 慢请求日志
const slowRequests = [];
const SLOW_THRESHOLD_MS = 1000; // 1 秒

/**
 * 性能监控中间件
 */
function performanceMonitor() {
  return (req, res, next) => {
    const start = Date.now();
    const startTime = process.hrtime.bigint();
    
    httpConcurrentRequests.inc();

    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - start;
      const durationSeconds = duration / 1000;
      
      httpConcurrentRequests.dec();
      httpRequestDuration.observe(
        { method: req.method, route: req.route?.path || req.path, status: res.statusCode },
        durationSeconds
      );
      httpRequestTotal.inc(
        { method: req.method, route: req.route?.path || req.path, status: res.statusCode }
      );

      // 记录慢请求
      if (duration > SLOW_THRESHOLD_MS) {
        const slowRequest = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl || req.url,
          duration: duration,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent']
        };
        slowRequests.push(slowRequest);
        
        // 只保留最近 100 条
        if (slowRequests.length > 100) {
          slowRequests.shift();
        }

        console.log(`[Perf] 慢请求警告: ${req.method} ${req.originalUrl} - ${duration}ms`);
      }
    });

    next();
  };
}

/**
 * 获取慢请求日志
 */
function getSlowRequests(limit = 20) {
  return slowRequests.slice(-limit);
}

/**
 * 清除慢请求日志
 */
function clearSlowRequests() {
  slowRequests.length = 0;
}

/**
 * 获取性能指标
 */
async function getMetrics() {
  return await register.metrics();
}

/**
 * 获取性能摘要
 */
function getPerformanceSummary() {
  return {
    slowRequests: slowRequests.length,
    recentSlowRequests: slowRequests.slice(-10),
    concurrentRequests: httpConcurrentRequests.get()
  };
}

/**
 * 数据库查询包装器 (用于手动记录指标)
 */
function trackDbQuery(operation, table, fn) {
  const start = process.hrtime.bigint();
  
  try {
    const result = fn();
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    
    dbQueryDuration.observe({ operation, table }, duration);
    dbQueryTotal.inc({ operation, table });
    
    return result;
  } catch (err) {
    throw err;
  }
}

/**
 * AI API 调用包装器
 */
async function trackAiApiCall(provider, model, endpoint, fn) {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = (Date.now() - start) / 1000;
    
    aiApiDuration.observe({ provider, model, endpoint }, duration);
    aiApiTotal.inc({ provider, model, endpoint, status: 'success' });
    
    return result;
  } catch (err) {
    aiApiTotal.inc({ provider, model, endpoint, status: 'error' });
    throw err;
  }
}

/**
 * 缓存命中/未命中记录
 */
function recordCacheHit(namespace) {
  cacheHits.inc({ namespace });
}

function recordCacheMiss(namespace) {
  cacheMisses.inc({ namespace });
}

module.exports = {
  performanceMonitor,
  getSlowRequests,
  clearSlowRequests,
  getMetrics,
  getPerformanceSummary,
  trackDbQuery,
  trackAiApiCall,
  recordCacheHit,
  recordCacheMiss,
  register,
  httpRequestDuration,
  httpRequestTotal,
  dbQueryDuration,
  dbQueryTotal,
  cacheHits,
  cacheMisses,
  aiApiDuration,
  aiApiTotal
};
