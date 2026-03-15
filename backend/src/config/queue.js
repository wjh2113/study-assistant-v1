/**
 * BullMQ 队列配置
 * 用于课本解析等异步任务
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');

// Redis 连接配置
// BUG-001 修复：添加兼容性配置以支持 Redis 3.x/4.x/5.x+
const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // 推荐用于 BullMQ
  // BUG-001 修复：测试模式下跳过版本检查
  enableReadyCheck: !isTestMode,
  retryStrategy: (times) => {
    if (times > 3) {
      if (!isTestMode) {
        console.error('[Queue] Redis 连接失败，请检查 Redis 服务是否启动');
      }
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  // BUG-001 修复：禁用 Redis 6+ 特性以兼容旧版本
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// 队列名称常量
const QueueName = {
  TEXTBOOK_PARSE: 'textbook-parse', // 课本解析队列
  AI_GENERATE: 'ai-generate',       // AI 题目生成队列
  REPORT_GENERATE: 'report-generate', // 学习报告生成队列
};

// BUG-001 修复：测试模式下跳过 Redis 版本检查
const queueOptions = {
  connection,
  // BullMQ 3.x/4.x 支持跳过版本检查
  skipVersionCheck: isTestMode,
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
