/**
 * Batch Update Service - 批量 Token 更新服务
 * Phase 2 性能优化：批量处理数据库更新，减少 I/O 开销
 */

const { db } = require('../../config/database');

class BatchUpdateService {
  static config = {
    batchSize: parseInt(process.env.BATCH_UPDATE_SIZE) || 50, // 默认每批 50 条
    maxQueueSize: parseInt(process.env.BATCH_MAX_QUEUE) || 500, // 最大队列大小
    flushInterval: parseInt(process.env.BATCH_FLUSH_INTERVAL) || 5000, // 5 秒自动刷新
    maxRetries: 3
  };

  static updateQueue = new Map(); // 按表名分队的更新队列
  static flushTimers = new Map(); // 按表名的刷新定时器

  /**
   * 初始化批量更新服务
   */
  static init() {
    console.log(`📦 批量更新服务已启动 (batchSize=${this.config.batchSize}, interval=${this.config.flushInterval}ms)`);
    
    // 设置定期刷新
    setInterval(() => this.forceFlushAll(), this.config.flushInterval);
  }

  /**
   * 添加更新到队列
   * @param {string} tableName - 表名
   * @param {object} updateData - 更新数据
   * @returns {Promise<boolean>}
   */
  static async queueUpdate(tableName, updateData) {
    if (!this.updateQueue.has(tableName)) {
      this.updateQueue.set(tableName, []);
    }

    const queue = this.updateQueue.get(tableName);
    queue.push({
      ...updateData,
      queuedAt: Date.now()
    });

    // 达到批次大小时立即刷新
    if (queue.length >= this.config.batchSize) {
      await this.flushQueue(tableName);
      return true;
    }

    // 设置延迟刷新定时器
    if (!this.flushTimers.has(tableName)) {
      const timer = setTimeout(() => {
        this.flushQueue(tableName);
      }, this.config.flushInterval);
      this.flushTimers.set(tableName, timer);
    }

    return true;
  }

  /**
   * 刷新指定队列
   * @param {string} tableName 
   * @returns {Promise<boolean>}
   */
  static async flushQueue(tableName) {
    const queue = this.updateQueue.get(tableName);
    if (!queue || queue.length === 0) return true;

    // 清除定时器
    if (this.flushTimers.has(tableName)) {
      clearTimeout(this.flushTimers.get(tableName));
      this.flushTimers.delete(tableName);
    }

    // 取出当前队列
    this.updateQueue.set(tableName, []);
    
    try {
      await this.executeBatchUpdate(tableName, queue);
      console.log(`✅ 批量更新 [${tableName}] ${queue.length} 条记录`);
      return true;
    } catch (error) {
      console.error(`❌ 批量更新失败 [${tableName}]:`, error.message);
      
      // 失败时将数据放回队列头部
      const currentQueue = this.updateQueue.get(tableName) || [];
      this.updateQueue.set(tableName, [...queue, ...currentQueue]);
      
      return false;
    }
  }

  /**
   * 强制刷新所有队列
   */
  static async forceFlushAll() {
    const tableNames = Array.from(this.updateQueue.keys());
    
    for (const tableName of tableNames) {
      await this.flushQueue(tableName);
    }
  }

  /**
   * 执行批量更新
   * @param {string} tableName 
   * @param {array} updates 
   * @returns {Promise<void>}
   */
  static async executeBatchUpdate(tableName, updates) {
    if (!updates.length) return;

    // 开启事务
    db.exec('BEGIN TRANSACTION');

    try {
      let retryCount = 0;
      let success = false;

      while (retryCount < this.config.maxRetries && !success) {
        try {
          switch (tableName) {
            case 'ai_task_logs':
              this.batchUpdateAITaskLogs(updates);
              break;
            case 'learning_progress':
              this.batchUpdateLearningProgress(updates);
              break;
            case 'practice_sessions':
              this.batchUpdatePracticeSessions(updates);
              break;
            default:
              console.warn(`未知的表名：${tableName}`);
          }
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount >= this.config.maxRetries) {
            throw error;
          }
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        }
      }

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 批量更新 AI 任务日志
   * @param {array} updates 
   */
  static batchUpdateAITaskLogs(updates) {
    const stmt = db.prepare(`
      UPDATE ai_task_logs
      SET status = ?,
          output = ?,
          error_message = ?,
          model_used = ?,
          provider_used = ?,
          token_usage = ?,
          duration_ms = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const update of updates) {
      stmt.run(
        update.status,
        update.output ? JSON.stringify(update.output) : null,
        update.errorMessage || null,
        update.modelUsed || null,
        update.providerUsed || null,
        update.tokenUsage ? JSON.stringify(update.tokenUsage) : null,
        update.duration_ms || null,
        update.id
      );
    }
  }

  /**
   * 批量更新学习进度
   * @param {array} updates 
   */
  static batchUpdateLearningProgress(updates) {
    const stmt = db.prepare(`
      UPDATE learning_progress
      SET mastery_level = ?,
          last_practiced_at = ?,
          correct_count = ?,
          wrong_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND knowledge_point_id = ?
    `);

    for (const update of updates) {
      stmt.run(
        update.masteryLevel,
        update.lastPracticedAt || new Date().toISOString(),
        update.correctCount || 0,
        update.wrongCount || 0,
        update.userId,
        update.knowledgePointId
      );
    }
  }

  /**
   * 批量更新练习会话
   * @param {array} updates 
   */
  static batchUpdatePracticeSessions(updates) {
    const stmt = db.prepare(`
      UPDATE practice_sessions
      SET score = ?,
          duration_ms = ?,
          completed_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const update of updates) {
      stmt.run(
        update.score || null,
        update.duration_ms || null,
        update.completedAt || new Date().toISOString(),
        update.id
      );
    }
  }

  /**
   * 批量插入（适用于日志等）
   * @param {string} tableName 
   * @param {array} records 
   * @returns {Promise<number>} 插入的数量
   */
  static async batchInsert(tableName, records) {
    if (!records.length) return 0;

    db.exec('BEGIN TRANSACTION');

    try {
      let inserted = 0;
      let retryCount = 0;
      let success = false;

      while (retryCount < this.config.maxRetries && !success) {
        try {
          inserted = 0;
          
          switch (tableName) {
            case 'ai_task_logs':
              inserted = this.batchInsertAITaskLogs(records);
              break;
            default:
              console.warn(`不支持批量插入的表：${tableName}`);
          }
          
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount >= this.config.maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        }
      }

      db.exec('COMMIT');
      return inserted;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 批量插入 AI 任务日志
   * @param {array} records 
   * @returns {number}
   */
  static batchInsertAITaskLogs(records) {
    const stmt = db.prepare(`
      INSERT INTO ai_task_logs 
      (user_id, task_type, input, output, status, error_message, model_used, provider_used, token_usage, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const record of records) {
      try {
        stmt.run(
          record.userId,
          record.taskType,
          JSON.stringify(record.input),
          record.output ? JSON.stringify(record.output) : null,
          record.status || 'pending',
          record.errorMessage || null,
          record.modelUsed || null,
          record.providerUsed || null,
          record.tokenUsage ? JSON.stringify(record.tokenUsage) : null,
          record.duration_ms || null
        );
        count++;
      } catch (error) {
        console.error('插入单条日志失败:', error.message);
      }
    }

    return count;
  }

  /**
   * 获取队列状态
   * @returns {object}
   */
  static getQueueStatus() {
    const status = {};
    
    for (const [tableName, queue] of this.updateQueue.entries()) {
      status[tableName] = {
        queueSize: queue.length,
        hasTimer: this.flushTimers.has(tableName),
        oldestItem: queue.length > 0 ? queue[0].queuedAt : null
      };
    }

    return {
      queues: status,
      totalQueued: Object.values(status).reduce((sum, s) => sum + s.queueSize, 0),
      config: this.config
    };
  }

  /**
   * 清空所有队列（用于测试或关闭时）
   */
  static async clearAll() {
    // 清除所有定时器
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();

    // 强制刷新所有队列
    await this.forceFlushAll();

    console.log('🧹 批量更新队列已清空');
  }
}

module.exports = BatchUpdateService;
