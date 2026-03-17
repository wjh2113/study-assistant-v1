/**
 * Prometheus Exporter - 监控指标导出服务
 * Phase 2 监控告警：Prometheus 集成
 */

const http = require('http');
const { collectDefaultMetrics, Registry } = require('prom-client');

class PrometheusExporter {
  static registry = new Registry();
  static server = null;
  static config = {
    port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
    path: process.env.PROMETHEUS_PATH || '/metrics',
    collectDefaultMetrics: true
  };

  // 自定义指标
  static metrics = {
    // AI 请求相关
    aiRequestsTotal: null,
    aiRequestDuration: null,
    aiRequestErrors: null,
    aiTokenUsage: null,
    aiCacheHits: null,
    aiCacheMisses: null,

    // 性能相关
    responseTime: null,
    activeConnections: null,
    queueSize: null,

    // 业务指标
    questionsGenerated: null,
    usersActive: null,
    practiceSessionsCompleted: null
  };

  /**
   * 初始化 Prometheus 导出器
   */
  static init() {
    // 收集默认 Node.js 指标
    if (this.config.collectDefaultMetrics) {
      collectDefaultMetrics({ register: this.registry });
    }

    // 注册自定义指标
    this.registerMetrics();

    console.log(`📊 Prometheus 指标已初始化 (port=${this.config.port}, path=${this.config.path})`);
  }

  /**
   * 注册自定义指标
   */
  static registerMetrics() {
    const { Counter, Gauge, Histogram, Summary } = require('prom-client');

    // AI 请求总数
    this.metrics.aiRequestsTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['provider', 'model', 'task_type', 'status']
    });

    // AI 请求延迟
    this.metrics.aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Duration of AI requests in seconds',
      labelNames: ['provider', 'model', 'task_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    // AI 请求错误数
    this.metrics.aiRequestErrors = new Counter({
      name: 'ai_request_errors_total',
      help: 'Total number of AI request errors',
      labelNames: ['provider', 'model', 'task_type', 'error_type']
    });

    // Token 使用量
    this.metrics.aiTokenUsage = new Counter({
      name: 'ai_tokens_total',
      help: 'Total number of tokens used',
      labelNames: ['provider', 'model', 'type'], // type: prompt/completion/total
      unit: 'tokens'
    });

    // 缓存命中率
    this.metrics.aiCacheHits = new Counter({
      name: 'ai_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['task_type']
    });

    this.metrics.aiCacheMisses = new Counter({
      name: 'ai_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['task_type']
    });

    // API 响应时间
    this.metrics.responseTime = new Histogram({
      name: 'http_response_time_seconds',
      help: 'HTTP response time in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // 活跃连接数
    this.metrics.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });

    // 队列大小
    this.metrics.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Current queue size',
      labelNames: ['queue_name']
    });

    // 生成的题目数
    this.metrics.questionsGenerated = new Counter({
      name: 'questions_generated_total',
      help: 'Total number of questions generated',
      labelNames: ['difficulty', 'type']
    });

    // 活跃用户数
    this.metrics.usersActive = new Gauge({
      name: 'active_users',
      help: 'Number of active users'
    });

    // 完成的练习会话数
    this.metrics.practiceSessionsCompleted = new Counter({
      name: 'practice_sessions_completed_total',
      help: 'Total number of completed practice sessions'
    });
  }

  /**
   * 启动 HTTP 服务器
   */
  static startServer() {
    if (this.server) {
      console.warn('⚠️  Prometheus 服务器已在运行');
      return;
    }

    this.server = http.createServer(async (req, res) => {
      if (req.url === this.config.path && req.method === 'GET') {
        try {
          res.setHeader('Content-Type', this.registry.contentType);
          res.end(await this.registry.metrics());
        } catch (error) {
          res.writeHead(500);
          res.end(error.message);
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.listen(this.config.port, () => {
      console.log(`🌐 Prometheus metrics server running at http://localhost:${this.config.port}${this.config.path}`);
    });

    this.server.on('error', (error) => {
      console.error('❌ Prometheus 服务器错误:', error.message);
    });
  }

  /**
   * 停止服务器
   */
  static stopServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('🛑 Prometheus 服务器已停止');
    }
  }

  // ==================== 指标记录方法 ====================

  /**
   * 记录 AI 请求
   */
  static recordAIRequest(provider, model, taskType, status = 'success') {
    this.metrics.aiRequestsTotal.inc({
      provider,
      model,
      task_type: taskType,
      status
    });
  }

  /**
   * 记录 AI 请求延迟
   */
  static recordAIDuration(provider, model, taskType, durationSeconds) {
    this.metrics.aiRequestDuration.observe({
      provider,
      model,
      task_type: taskType
    }, durationSeconds);
  }

  /**
   * 记录 AI 错误
   */
  static recordAIError(provider, model, taskType, errorType) {
    this.metrics.aiRequestErrors.inc({
      provider,
      model,
      task_type: taskType,
      error_type: errorType
    });
  }

  /**
   * 记录 Token 使用
   */
  static recordTokenUsage(provider, model, promptTokens, completionTokens, totalTokens) {
    this.metrics.aiTokenUsage.inc({
      provider,
      model,
      type: 'prompt'
    }, promptTokens);

    this.metrics.aiTokenUsage.inc({
      provider,
      model,
      type: 'completion'
    }, completionTokens);

    this.metrics.aiTokenUsage.inc({
      provider,
      model,
      type: 'total'
    }, totalTokens);
  }

  /**
   * 记录缓存命中
   */
  static recordCacheHit(taskType) {
    this.metrics.aiCacheHits.inc({ task_type: taskType });
  }

  /**
   * 记录缓存未命中
   */
  static recordCacheMiss(taskType) {
    this.metrics.aiCacheMisses.inc({ task_type: taskType });
  }

  /**
   * 记录 HTTP 响应时间
   */
  static recordResponseTime(method, route, status, durationSeconds) {
    this.metrics.responseTime.observe({
      method,
      route,
      status: status.toString()
    }, durationSeconds);
  }

  /**
   * 设置活跃连接数
   */
  static setActiveConnections(count) {
    this.metrics.activeConnections.set(count);
  }

  /**
   * 设置队列大小
   */
  static setQueueSize(queueName, size) {
    this.metrics.queueSize.set({ queue_name: queueName }, size);
  }

  /**
   * 记录生成的题目
   */
  static recordQuestionGenerated(difficulty, type) {
    this.metrics.questionsGenerated.inc({
      difficulty,
      type
    });
  }

  /**
   * 设置活跃用户数
   */
  static setActiveUsers(count) {
    this.metrics.usersActive.set(count);
  }

  /**
   * 记录完成的练习会话
   */
  static recordPracticeSessionCompleted() {
    this.metrics.practiceSessionsCompleted.inc();
  }

  /**
   * 获取当前所有指标
   */
  static async getMetrics() {
    return await this.registry.metrics();
  }

  /**
   * 重置所有指标（用于测试）
   */
  static resetMetrics() {
    this.registry.clear();
    this.registerMetrics();
  }
}

module.exports = PrometheusExporter;
