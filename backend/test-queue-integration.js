/**
 * 队列集成测试 - Redis 7.0.15 兼容性验证
 * 测试所有队列功能是否正常
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config({ path: './.env' });

// Redis 7.0.15 兼容的连接配置
const connection = new Redis({
  host: process.env.REDIS_HOST || '172.26.168.165',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10000,
  keepAlive: 30000,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error(`Redis 连接失败，已重试 ${times} 次`);
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

const QueueName = {
  TEXTBOOK_PARSE: 'textbook-parse',
  AI_GENERATE: 'ai-generate',
  REPORT_GENERATE: 'report-generate',
};

async function testRedisConnection() {
  console.log('🔍 测试 Redis 连接...');
  console.log(`   主机：${process.env.REDIS_HOST || '172.26.168.165'}:${process.env.REDIS_PORT || 6379}`);
  
  try {
    const info = await connection.info();
    const redisVersion = info.match(/redis_version:(\d+\.\d+\.\d+)/);
    console.log('✅ Redis 连接成功');
    console.log(`   版本：${redisVersion ? redisVersion[1] : '未知'}`);
    
    // 测试 Redis 7.x 特性
    const memoryInfo = await connection.info('memory');
    console.log('   内存信息：已获取');
    
    return true;
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message);
    return false;
  }
}

async function testQueue(queueName, jobData) {
  console.log(`\n📦 测试队列：${queueName}`);
  
  const queue = new Queue(queueName, {
    connection,
    skipVersionCheck: false,
  });
  
  let worker;
  let jobCompleted = false;
  let jobFailed = false;
  
  try {
    // 创建 Worker
    worker = new Worker(
      queueName,
      async (job) => {
        console.log(`   ✅ 收到任务：${job.id}`);
        console.log(`   数据：${JSON.stringify(job.data)}`);
        
        // 模拟处理
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { success: true, processedAt: new Date().toISOString() };
      },
      {
        connection,
        concurrency: 1,
        blockingConnection: {
          maxRetriesPerRequest: null,
        },
      }
    );
    
    // 监听完成事件
    worker.on('completed', (job) => {
      console.log(`   ✅ 任务完成：${job.id}`);
      jobCompleted = true;
    });
    
    worker.on('failed', (job, err) => {
      console.error(`   ❌ 任务失败：${job?.id}`, err.message);
      jobFailed = true;
    });
    
    // 等待 Worker 就绪
    await worker.waitUntilReady();
    console.log('   Worker 已就绪');
    
    // 添加任务
    const job = await queue.add('test', jobData, {
      attempts: 1,
    });
    console.log(`   任务已添加：${job.id}`);
    
    // 等待任务完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 清理
    await queue.close();
    await worker.close();
    
    if (jobFailed) {
      console.log(`   ❌ 队列测试失败：${queueName}`);
      return false;
    }
    
    if (jobCompleted) {
      console.log(`   ✅ 队列测试成功：${queueName}`);
      return true;
    }
    
    console.log(`   ⚠️ 队列测试超时：${queueName}`);
    return false;
    
  } catch (error) {
    console.error(`   ❌ 队列测试错误：${queueName}`, error.message);
    
    if (worker) await worker.close();
    if (queue) await queue.close();
    
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 队列集成测试 - Redis 7.0.15 兼容性验证');
  console.log('='.repeat(60));
  
  const results = {
    redis: false,
    textbookParse: false,
    aiGenerate: false,
    reportGenerate: false,
  };
  
  // 1. 测试 Redis 连接
  results.redis = await testRedisConnection();
  
  if (!results.redis) {
    console.log('\n❌ Redis 连接失败，终止测试');
    process.exit(1);
  }
  
  // 2. 测试各个队列
  results.textbookParse = await testQueue(QueueName.TEXTBOOK_PARSE, {
    textbookId: 'test-123',
    filePath: '/tmp/test.pdf',
  });
  
  results.aiGenerate = await testQueue(QueueName.AI_GENERATE, {
    sessionId: 'test-session-123',
    textbookId: 'test-book-123',
    unitId: 'unit-1',
    questionCount: 5,
  });
  
  results.reportGenerate = await testQueue(QueueName.REPORT_GENERATE, {
    userId: 'user-123',
    reportType: 'weekly',
  });
  
  // 3. 输出结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`Redis 连接：${results.redis ? '✅ 通过' : '❌ 失败'}`);
  console.log(`textbook-parse 队列：${results.textbookParse ? '✅ 通过' : '❌ 失败'}`);
  console.log(`ai-generate 队列：${results.aiGenerate ? '✅ 通过' : '❌ 失败'}`);
  console.log(`report-generate 队列：${results.reportGenerate ? '✅ 通过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 所有测试通过！BullMQ + Redis 7.0.15 完全兼容');
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败，请检查配置');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});
