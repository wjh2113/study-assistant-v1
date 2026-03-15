/**
 * Textbook Parser Worker - 异步处理课本解析
 * ISSUE-P1-002: 课本解析功能
 */

const TextbookParserService = require('./TextbookParserService');
const TextbookModel = require('./TextbookModel');

class TextbookParserWorker {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * 添加解析任务到队列
   */
  async addTask(task) {
    const taskId = await TextbookModel.createTask({
      userId: task.userId,
      textbookId: task.textbookId,
      filePath: task.filePath,
      status: 'pending'
    });

    this.processingQueue.push({
      taskId,
      ...task
    });

    // 触发处理
    this.processQueue();

    return taskId;
  }

  /**
   * 处理队列中的任务
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      
      try {
        await this.processTask(task);
      } catch (error) {
        console.error(`任务 ${task.taskId} 处理失败:`, error);
        await TextbookModel.updateTask(task.taskId, {
          status: 'failed',
          errorMessage: error.message
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个任务
   */
  async processTask(task) {
    console.log(`开始处理任务 ${task.taskId}: ${task.filePath}`);

    // 更新状态为 processing
    await TextbookModel.updateTask(task.taskId, {
      status: 'processing',
      startedAt: new Date().toISOString()
    });

    const startTime = Date.now();

    // 1. 解析 PDF
    const parseResult = await TextbookParserService.parsePDF(task.filePath);
    
    if (!parseResult.success) {
      throw new Error(parseResult.error);
    }

    // 2. 识别目录结构
    const structure = await TextbookParserService.recognizeStructure(parseResult.text);

    // 3. 分割内容
    const sections = TextbookParserService.splitByStructure(parseResult.text, structure);

    // 4. 提取知识点（对每个章节）
    const knowledgePoints = [];
    for (const [key, section] of Object.entries(sections)) {
      if (section.type === 'chapter' || (section.chapters && Object.keys(section.chapters).length > 0)) {
        const points = await TextbookParserService.extractKnowledgePoints(section.content);
        knowledgePoints.push(...points.map(p => ({
          ...p,
          section: key
        })));
      }
    }

    const duration = Date.now() - startTime;

    // 5. 保存解析结果
    await TextbookModel.updateTask(task.taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: duration,
      pageCount: parseResult.numpages,
      structure: structure,
      sectionsCount: Object.keys(sections).length,
      knowledgePointsCount: knowledgePoints.length
    });

    // 6. 保存课本内容
    await TextbookModel.create({
      userId: task.userId,
      originalTaskId: task.taskId,
      bookInfo: structure.bookInfo,
      structure: structure.structure,
      sections: sections,
      knowledgePoints: knowledgePoints,
      status: 'completed'
    });

    console.log(`任务 ${task.taskId} 处理完成，耗时 ${duration}ms`);

    return {
      taskId: task.taskId,
      success: true,
      duration,
      pageCount: parseResult.numpages,
      sectionsCount: Object.keys(sections).length,
      knowledgePointsCount: knowledgePoints.length
    };
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId) {
    return await TextbookModel.getTaskById(taskId);
  }

  /**
   * 获取用户的任务列表
   */
  async getUserTasks(userId, options = {}) {
    return await TextbookModel.getTasksByUserId(userId, options);
  }
}

// 导出单例
module.exports = new TextbookParserWorker();
