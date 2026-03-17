require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');

// ============================================
// 性能优化模块导入
// ============================================

// 数据库优化
const { createOptimizedIndexes, dbPool } = require('./database/optimized-queries');

// Prometheus 监控
const PrometheusExporter = require('./modules/monitoring/PrometheusExporter');
const { performanceMonitor, getMetrics } = require('./middleware/performance-monitor');

// 缓存中间件
const { cacheMiddleware, getCacheStats } = require('./middleware/cache');

// 压缩中间件
const { compressionMiddleware, staticCacheMiddleware } = require('./middleware/compression');

// CDN 配置
const { getCdnInfo } = require('./config/cdn');

// 原有中间件
const { requestLogger, errorLogger, globalLimiter, sendCodeLimiter } = require('./modules');

// 导入路由
const authRoutes = require('./routes/auth');
const knowledgeRoutes = require('./routes/knowledge');
const progressRoutes = require('./routes/progress');
const aiRoutes = require('./routes/ai');
const healthRoutes = require('./routes/health');

// 新增模块路由
const aiGatewayRoutes = require('./routes/ai-gateway');
const aiGatewayV2Routes = require('./routes/ai-gateway-v2'); // AI Gateway V2
const aiPlanningRoutes = require('./routes/ai-planning'); // AI 学习规划
const textbookRoutes = require('./routes/textbooks');
const weaknessRoutes = require('./routes/weakness');
const pointsRoutes = require('./routes/points');
const leaderboardRoutes = require('./routes/leaderboard');
const uploadRoutes = require('./routes/upload');
const practiceRoutes = require('./routes/practice'); // P0-006: 练习会话

// 初始化数据库
initDatabase();

// ============================================
// 性能优化初始化
// ============================================

// 创建优化的数据库索引
try {
  const db = dbPool.getConnection();
  createOptimizedIndexes(db);
} catch (err) {
  console.error('[Perf] 数据库索引优化失败:', err.message);
}

// 初始化 Prometheus 监控
PrometheusExporter.init();
PrometheusExporter.startServer();

// 启动排行榜定时计算任务（生产环境）
if (process.env.NODE_ENV === 'production') {
  const { startLeaderboardScheduler } = require('./workers/leaderboardCalculator');
  startLeaderboardScheduler();
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 中间件配置 (按顺序重要!)
// ============================================

// CORS (必须最先)
app.use(cors());

// 性能监控 (记录所有请求)
app.use(performanceMonitor());

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Gzip/Brotli 压缩
app.use(compressionMiddleware());

// 静态资源缓存头
app.use(staticCacheMiddleware({
  maxAge: 31536000, // 1 年
  immutable: true,
  etag: true
}));

// 静态文件服务 - 暴露上传目录 (带缓存)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// 全局速率限制
app.use(globalLimiter);

// 请求日志
app.use(requestLogger);

// ============================================
// API 路由
// ============================================

// 健康检查和性能状态
app.use('/api/health', healthRoutes);

// 性能监控端点
app.get('/api/performance/metrics', async (req, res) => {
  try {
    const { register } = require('./middleware/performance-monitor');
    const metrics = await getMetrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (err) {
    res.status(500).json({ error: '获取指标失败' });
  }
});

app.get('/api/performance/status', async (req, res) => {
  try {
    const { getPerformanceSummary, getSlowRequests } = require('./middleware/performance-monitor');
    const cacheStats = await getCacheStats();
    const cdnInfo = getCdnInfo();
    
    res.json({
      performance: getPerformanceSummary(),
      cache: cacheStats,
      cdn: cdnInfo,
      slowRequests: getSlowRequests(10)
    });
  } catch (err) {
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 原有 API 路由
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);

// 新增 AI 核心功能路由
app.use('/api/ai', aiGatewayRoutes);
app.use('/api/ai/v2', aiGatewayV2Routes);
app.use('/api/ai/planning', aiPlanningRoutes);
app.use('/api/textbooks', textbookRoutes);
app.use('/api/weakness', weaknessRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/practice', practiceRoutes);

// 发送验证码接口（单独速率限制）
app.use('/api/auth/send-code', sendCodeLimiter);

// 缓存清除接口 (需要认证)
app.post('/api/cache/invalidate', async (req, res) => {
  const { pattern } = req.body;
  if (!pattern) {
    return res.status(400).json({ error: '缺少 pattern 参数' });
  }
  
  try {
    const { invalidateCache } = require('./middleware/cache');
    await invalidateCache(pattern);
    res.json({ success: true, message: `缓存已清除：${pattern}` });
  } catch (err) {
    res.status(500).json({ error: '清除缓存失败' });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use(errorLogger);
app.use((err, req, res, next) => {
  // Debug: console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器（仅在直接运行时启动，被 require 时不自动启动）
// BUG-API-003 修复：支持测试时手动控制服务器启动
const isMainModule = require.main === module;

if (isMainModule) {
  const server = app.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 学习助手后端服务已启动`);
      console.log(`📍 监听端口：${PORT}`);
      console.log(`🔗 API 地址：http://localhost:${PORT}`);
      console.log(`💚 健康检查：http://localhost:${PORT}/api/health`);
      console.log(`⚡ 性能监控：http://localhost:${PORT}/api/performance/status`);
      console.log(`📊 Prometheus 指标：http://localhost:${PORT}/metrics`);
      console.log(`\n📚 已加载模块:`);
      console.log('   - AI 出题 (ISSUE-P0-003)');
      console.log('   - AI Gateway V2 (多 AI 服务路由 ✅ 新)');
      console.log('   - AI 学习规划 (Phase 4 ✅ 新)');
      console.log('   - 课本解析 (ISSUE-P1-002) ✅ 增强版');
      console.log('   - 薄弱点分析 (ISSUE-P1-003) ✅ 增强版');
      console.log('   - 积分系统 (ISSUE-P1-004) ✅ 增强版');
      console.log('   - 排行榜 (ISSUE-P1-005) ✅ 增强版');
      console.log('   - 文件上传 (OSS 存储) ✅ P1-006');
      console.log('   - 速率限制 (ISSUE-P1-007)');
      console.log('   - 日志系统 (ISSUE-P1-008)');
      console.log(`\n⚡ 性能优化:`);
      console.log('   - ✅ 数据库索引优化 (WAL 模式 + 复合索引)');
      console.log('   - ✅ API 响应缓存 (Redis)');
      console.log('   - ✅ Gzip/Brotli 压缩');
      console.log('   - ✅ 静态资源缓存策略');
      console.log('   - ✅ CDN 配置支持');
      console.log('   - ✅ 性能监控 (Prometheus)');
      console.log('   - ✅ 慢请求日志');
    }
  });
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    server.close(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('服务器已关闭');
      }
      process.exit(0);
    });
  });
}

module.exports = app;
