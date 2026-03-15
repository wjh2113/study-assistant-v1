/**
 * 课本解析 Worker（增强版）
 * 处理课本 PDF 上传后的解析任务
 * ISSUE-P1-002: 课本解析功能完善
 */

const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const TextbookParserService = require('../modules/textbook-parser/TextbookParserService');

const prisma = new PrismaClient();

/**
 * 解析课本 PDF 文件（增强版）
 * @param {Object} job - BullMQ 任务对象
 * @returns {Promise<Object>} 解析结果
 */
async function parseTextbookPDF(job) {
  const { textbookId, filePath } = job.data;
  
  console.log(`📖 [${textbookId}] 开始解析课本，文件：${filePath}`);
  
  const startTime = Date.now();
  
  try {
    // 1. 更新课本状态为解析中
    await prisma.textbook.update({
      where: { id: textbookId },
      data: { parse_status: 'processing' },
    });
    
    // 2. 解析 PDF（本地文件存储）
    let parseResult;
    
    if (filePath) {
      // 本地文件解析
      await fs.access(filePath);
      parseResult = await TextbookParserService.parseComplete(filePath, textbookId, (progress) => {
        job.updateProgress(Math.round(progress.progress * 100));
        console.log(`📊 [${textbookId}] 进度：${progress.stage} - ${Math.round(progress.progress * 100)}%`);
      });
    } else {
      throw new Error('缺少 filePath 参数');
    }
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || '解析失败');
    }
    
    // 3. 更新课本状态为已完成
    const durationMs = Date.now() - startTime;
    
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        parse_status: 'completed',
        parse_result: parseResult.parseResult,
        updated_at: new Date(),
      },
    });
    
    console.log(`✅ [${textbookId}] 课本解析完成，耗时：${durationMs}ms`);
    console.log(`   - 页数：${parseResult.stages.extract?.pageCount || 0}`);
    console.log(`   - 单元数：${parseResult.stages.structure?.unitsCount || 0}`);
    console.log(`   - 章节数：${parseResult.stages.structure?.chaptersCount || 0}`);
    console.log(`   - 知识点数：${parseResult.stages.knowledge?.knowledgePointsCount || 0}`);
    
    return {
      success: true,
      textbookId,
      pageCount: parseResult.stages.extract?.pageCount || 0,
      unitsCount: parseResult.stages.structure?.unitsCount || 0,
      chaptersCount: parseResult.stages.structure?.chaptersCount || 0,
      knowledgePointsCount: parseResult.stages.knowledge?.knowledgePointsCount || 0,
      durationMs,
      bookInfo: parseResult.parseResult?.bookInfo
    };
    
  } catch (error) {
    console.error(`❌ [${textbookId}] 课本解析失败:`, error);
    
    // 更新状态为失败
    await prisma.textbook.update({
      where: { id: textbookId },
      data: {
        parse_status: 'failed',
        parse_result: { error: error.message, stack: error.stack },
        updated_at: new Date(),
      },
    });
    
    throw error;
  }
}

/**
 * 创建课本解析 Worker
 */
function createTextbookParserWorker() {
  const worker = new Worker(
    'textbook-parse',
    async (job) => {
      return await parseTextbookPDF(job);
    },
    {
      connection,
      concurrency: 2, // 同时处理 2 个任务
    }
  );
  
  worker.on('completed', (job) => {
    console.log(`🎉 任务完成：${job.id}`, job.returnvalue);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`💥 任务失败：${job?.id}`, err);
  });
  
  worker.on('error', (err) => {
    console.error(`⚠️ Worker 错误:`, err);
  });
  
  console.log('🚀 课本解析 Worker 已启动');
  
  return worker;
}

// 如果直接运行此文件，则启动 Worker
if (require.main === module) {
  const worker = createTextbookParserWorker();
  
  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭课本解析 Worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = {
  parseTextbookPDF,
  createTextbookParserWorker,
};
