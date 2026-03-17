/**
 * 学习报告生成 Worker
 * 生成用户学习报告（周报/月报）
 * Redis 7.0.15 兼容版本
 */

const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 生成学习报告
 * @param {Object} job - BullMQ 任务对象
 * @returns {Promise<Object>} 报告生成结果
 */
async function generateReport(job) {
  const { userId, reportType = 'weekly', startDate, endDate } = job.data;
  
  console.log(`📊 [${userId}] 开始生成${reportType}报告`);
  
  try {
    // 1. 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 2. 获取学习数据
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // 默认最近 7 天（周报）或 30 天（月报）
      const days = reportType === 'weekly' ? 7 : 30;
      dateFilter.created_at = {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      };
    }
    
    // 获取练习会话
    const sessions = await prisma.practiceSession.findMany({
      where: {
        user_id: userId,
        ...dateFilter,
      },
      include: {
        questions: {
          select: {
            is_correct: true,
            question_type: true,
          },
        },
      },
    });
    
    // 3. 计算统计数据
    const totalQuestions = sessions.reduce(
      (sum, s) => sum + (s.questions?.length || 0),
      0
    );
    
    const correctQuestions = sessions.reduce(
      (sum, s) => sum + (s.questions?.filter(q => q.is_correct).length || 0),
      0
    );
    
    const accuracy = totalQuestions > 0 
      ? ((correctQuestions / totalQuestions) * 100).toFixed(2)
      : 0;
    
    // 4. 生成报告
    const report = {
      userId,
      reportType,
      period: {
        startDate: dateFilter.created_at.gte.toISOString(),
        endDate: dateFilter.created_at.lte?.toISOString() || new Date().toISOString(),
      },
      summary: {
        totalSessions: sessions.length,
        totalQuestions,
        correctQuestions,
        accuracy: `${accuracy}%`,
      },
      generatedAt: new Date().toISOString(),
    };
    
    console.log(`✅ [${userId}] 报告生成完成：${totalQuestions}道题，正确率${accuracy}%`);
    
    return {
      success: true,
      report,
    };
    
  } catch (error) {
    console.error(`❌ [${userId}] 报告生成失败:`, error);
    throw error;
  }
}

/**
 * 创建报告生成 Worker - Redis 7.0.15 兼容
 */
function createReportGeneratorWorker() {
  const worker = new Worker(
    'report-generate',
    async (job) => {
      return await generateReport(job);
    },
    {
      connection,
      concurrency: 2, // 同时处理 2 个任务
      
      // Redis 7.x 兼容性配置
      blockingConnection: {
        maxRetriesPerRequest: null,
      },
    }
  );
  
  worker.on('completed', (job) => {
    console.log(`🎉 报告生成完成：${job.id}`, job.returnvalue);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`💥 报告生成失败：${job?.id}`, err);
  });
  
  worker.on('error', (err) => {
    console.error(`⚠️ 报告 Worker 错误:`, err);
  });
  
  console.log('🚀 学习报告生成 Worker 已启动');
  
  return worker;
}

// 如果直接运行此文件，则启动 Worker
if (require.main === module) {
  const worker = createReportGeneratorWorker();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭报告生成 Worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = {
  generateReport,
  createReportGeneratorWorker,
};
