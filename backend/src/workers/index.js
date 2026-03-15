/**
 * Workers 入口文件
 * 启动所有后台任务处理器
 */

const { createTextbookParserWorker } = require('./textbookParser');
const { createAIGeneratorWorker } = require('./aiQuestionGenerator');

/**
 * 启动所有 Worker
 */
function startAllWorkers() {
  console.log('🚀 启动所有后台任务处理器...');
  
  const workers = [
    createTextbookParserWorker(),
    createAIGeneratorWorker(),
    // 未来可以添加更多 Worker
    // createReportGeneratorWorker(),
  ];
  
  console.log('✅ 所有 Worker 已启动');
  
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
