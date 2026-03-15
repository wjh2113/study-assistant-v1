require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');

// 导入中间件
const { requestLogger, errorLogger, globalLimiter, sendCodeLimiter } = require('./modules');

// 导入路由
const authRoutes = require('./routes/auth');
const knowledgeRoutes = require('./routes/knowledge');
const progressRoutes = require('./routes/progress');
const aiRoutes = require('./routes/ai');
const healthRoutes = require('./routes/health');

// 新增模块路由
const aiGatewayRoutes = require('./routes/ai-gateway');
const textbookRoutes = require('./routes/textbooks');
const weaknessRoutes = require('./routes/weakness');
const pointsRoutes = require('./routes/points');
const leaderboardRoutes = require('./routes/leaderboard');
const uploadRoutes = require('./routes/upload');
const practiceRoutes = require('./routes/practice'); // P0-006: 练习会话

// 初始化数据库
initDatabase();

// 启动排行榜定时计算任务（生产环境）
if (process.env.NODE_ENV === 'production') {
  const { startLeaderboardScheduler } = require('./workers/leaderboardCalculator');
  startLeaderboardScheduler();
}

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 暴露上传目录
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 全局速率限制
app.use(globalLimiter);

// 请求日志
app.use(requestLogger);

// API 路由
app.use('/api/health', healthRoutes); // 修复 BUG-003：统一健康检查路径为 /api/health
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes); // 原有 AI 问答路由（修复 BUG-001：统一路由路径）

// 新增 AI 核心功能路由
app.use('/api/ai', aiGatewayRoutes); // AI 出题
app.use('/api/textbooks', textbookRoutes); // 课本解析
app.use('/api/weakness', weaknessRoutes); // 薄弱点分析
app.use('/api/points', pointsRoutes); // 积分系统
app.use('/api/leaderboard', leaderboardRoutes); // 排行榜
app.use('/api/upload', uploadRoutes); // 文件上传
app.use('/api/practice', practiceRoutes); // P0-006: 练习会话（带所有权校验）

// 发送验证码接口（单独速率限制）
app.use('/api/auth/send-code', sendCodeLimiter);

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
      console.log(`\n📚 已加载模块:`);
      console.log('   - AI 出题 (ISSUE-P0-003)');
      console.log('   - 课本解析 (ISSUE-P1-002) ✅ 增强版：pdf-parse + AI 目录识别 + Worker 异步');
      console.log('   - 薄弱点分析 (ISSUE-P1-003) ✅ 增强版：遗忘曲线 + 批量更新');
      console.log('   - 积分系统 (ISSUE-P1-004) ✅ 增强版：完整积分规则 + 连续奖励');
      console.log('   - 排行榜 (ISSUE-P1-005) ✅ 增强版：Redis 缓存 + 定时计算');
      console.log('   - 文件上传 (OSS 存储) ✅ P1-006：替代 FTP');
      console.log('   - 速率限制 (ISSUE-P1-007)');
      console.log('   - 日志系统 (ISSUE-P1-008)');
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
