/**
 * BullMQ 队列配置
 * 用于课本解析等异步任务
 * 
 * Redis 7.0.15 兼容性修复：
 * - 更新 ioredis 连接配置以支持 Redis 7.x
 * - 添加 Redis 7 兼容的 blocking 配置
 * - 优化连接池设置
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');

// Redis 连接配置 - Redis 7.0.15 兼容
const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

// Redis 7.x 兼容的连接配置
const connection = new Redis({
  host: process.env.REDIS_HOST || '172.26.168.165', // WSL2 IP
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  
  // BullMQ 推荐配置
  maxRetriesPerRequest: null,
  
  // Redis 7.x 兼容性配置
  enableReadyCheck: true,
  enableAutoPipelining: false,
  
  // 连接超时配置
  connectTimeout: 10000,
  commandTimeout: 5000,
  keepAlive: 30000,
  
  // 重试策略
  retryStrategy: (times) => {
    if (times > 3) {
      console.error(`[Queue] Redis 连接失败，已重试 ${times} 次，请检查 Redis 服务 (172.26.168.165:6379)`);
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  
  // Redis 7.x blocking 命令兼容性（毫秒）
  // BullMQ 使用 BLMOVE/BZPOPMIN 等命令需要正确设置
  showFriendlyErrorStack: true,
  
  // 连接池配置
  maxLoadingRetryTime: 10000,
});

// 队列名称常量
const QueueName = {
  TEXTBOOK_PARSE: 'textbook-parse', // 课本解析队列
  AI_GENERATE: 'ai-generate',       // AI 题目生成队列
  REPORT_GENERATE: 'report-generate', // 学习报告生成队列
};

// BullMQ 队列配置 - Redis 7.0.15 兼容
const queueOptions = {
  connection,
  // BullMQ 5.x 配置
  skipVersionCheck: false, // 允许版本检查，BullMQ 5.71+ 支持 Redis 7.x
  
  // Redis 7.x 兼容性配置
  blockingConnection: {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
    keepAlive: 30000,
  },
};

// 创建队列
const queues = {
  [QueueName.TEXTBOOK_PARSE]: new Queue(QueueName.TEXTBOOK_PARSE, queueOptions),
  [QueueName.AI_GENERATE]: new Queue(QueueName.AI_GENERATE, queueOptions),
  [QueueName.REPORT_GENERATE]: new Queue(QueueName.REPORT_GENERATE, queueOptions),
};

// 队列事件监听器 - 测试模式下不创建以避免错误
const queueEvents = isTestMode ? {} : {
  [QueueName.TEXTBOOK_PARSE]: new QueueEvents(QueueName.TEXTBOOK_PARSE, { connection }),
  [QueueName.AI_GENERATE]: new QueueEvents(QueueName.AI_GENERATE, { connection }),
  [QueueName.REPORT_GENERATE]: new QueueEvents(QueueName.REPORT_GENERATE, { connection }),
};

// 监听队列事件
Object.entries(queueEvents).forEach(([name, events]) => {
  events.on('completed', (job) => {
    console.log(`✅ [${name}] 任务完成: ${job.id}`);
  });

  events.on('failed', (job, err) => {
    console.error(`❌ [${name}] 任务失败: ${job?.id}`, err);
  });

  events.on('error', (err) => {
    console.error(`⚠️ [${name}] 队列错误:`, err);
  });
});

/**
 * 添加课本解析任务到队列
 * @param {Object} data - 任务数据
 * @param {string} data.textbookId - 课本 ID
 * @param {string} data.filePath - 文件路径
 * @param {Object} options - 任务选项
 */
async function addTextbookParseJob(data, options = {}) {
  const job = await queues[QueueName.TEXTBOOK_PARSE].add('parse', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
  console.log(`📚 课本解析任务已加入队列: ${job.id}`);
  return job;
}

/**
 * 添加 AI 题目生成任务到队列
 * @param {Object} data - 任务数据
 * @param {string} data.sessionId - 练习会话 ID
 * @param {string} data.textbookId - 课本 ID
 * @param {string} data.unitId - 单元 ID
 * @param {Object} options - 任务选项
 */
async function addAIGenerateJob(data, options = {}) {
  const job = await queues[QueueName.AI_GENERATE].add('generate', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    ...options,
  });
  console.log(`🤖 AI 题目生成任务已加入队列：${job.id}`);
  return job;
}

/**
 * 添加学习报告生成任务到队列
 * @param {Object} data - 任务数据
 * @param {string} data.userId - 用户 ID
 * @param {string} data.reportType - 报告类型 (weekly/monthly)
 * @param {Object} options - 任务选项
 */
async function addReportGenerateJob(data, options = {}) {
  const job = await queues[QueueName.REPORT_GENERATE].add('generate', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 2000,
    },
    ...options,
  });
  console.log(`📊 学习报告生成任务已加入队列：${job.id}`);
  return job;
}

module.exports = {
  connection,
  queues,
  queueEvents,
  QueueName,
  addTextbookParseJob,
  addAIGenerateJob,
  addReportGenerateJob,
};
