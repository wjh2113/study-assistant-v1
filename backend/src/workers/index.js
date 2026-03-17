/**
 * Workers 入口文件
 * 启动所有后台任务处理器
 * Redis 7.0.15 兼容版本
 */

const { createTextbookParserWorker } = require('./textbookParser');
const { createAIGeneratorWorker } = require('./aiQuestionGenerator');
const { createReportGeneratorWorker } = require('./reportGenerator');

/**
 * 启动所有 Worker
 */
function startAllWorkers() {
  console.log('🚀 启动所有后台任务处理器...');
  
  const workers = [
    createTextbookParserWorker(),
    createAIGeneratorWorker(),
    createReportGeneratorWorker(),
  ];
  
  console.log('✅ 所有 Worker 已启动');
  console.log('   - textbook-parse: 课本解析队列');
  console.log('   - ai-generate: AI 题目生成队列');
  console.log('   - report-generate: 学习报告生成队列');
  
  return workers;
}

/**
 * 优雅关闭所有 Worker
 */
async function stopAllWorkers(workers) {
  console.log('\n🛑 正在关闭所有 Worker...');
  
  for (const worker of workers) {
    await worker.close();
  }
  
  console.log('✅ 所有 Worker 已关闭');
}

module.exports = {
  startAllWorkers,
  stopAllWorkers,
};
