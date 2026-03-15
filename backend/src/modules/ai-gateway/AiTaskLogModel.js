/**
 * AI Task Log Model - AI 任务调用日志
 * ISSUE-P0-003: AI 出题功能
 */

const { db } = require('../../config/database');

class AiTaskLogModel {
  /**
   * 创建任务日志
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO ai_task_logs (
        user_id,
        task_type,
        input,
        output,
        status,
        error_message,
        model_used,
        token_usage,
        duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.taskType,
      JSON.stringify(data.input || {}),
      data.output ? JSON.stringify(data.output) : null,
      data.status || 'pending',
      data.errorMessage || null,
      data.modelUsed || null,
      data.tokenUsage ? JSON.stringify(data.tokenUsage) : null,
      data.durationMs || null
    );

    return result.lastInsertRowid;
  }

  /**
   * 更新任务日志
   */
  static update(id, data) {
    const updates = [];
    const values = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.output !== undefined) {
      updates.push('output = ?');
      values.push(data.output ? JSON.stringify(data.output) : null);
    }
    if (data.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(data.errorMessage);
    }
    if (data.modelUsed !== undefined) {
      updates.push('model_used = ?');
      values.push(data.modelUsed);
    }
    if (data.tokenUsage !== undefined) {
      updates.push('token_usage = ?');
      values.push(data.tokenUsage ? JSON.stringify(data.tokenUsage) : null);
    }
    if (data.durationMs !== undefined) {
      updates.push('duration_ms = ?');
      values.push(data.durationMs);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE ai_task_logs
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * 根据 ID 获取日志
   */
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM ai_task_logs WHERE id = ?');
    const log = stmt.get(id);
    return this.parseLog(log);
  }

  /**
   * 根据用户 ID 获取日志列表
   */
  static getByUserId(userId, options = {}) {
    const {
      page = 1,
      pageSize = 20,
      taskType,
      status
    } = options;

    let query = 'SELECT * FROM ai_task_logs WHERE user_id = ?';
    const params = [userId];

    if (taskType) {
      query += ' AND task_type = ?';
      params.push(taskType);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const stmt = db.prepare(query);
    const logs = stmt.all(...params);

    return logs.map(log => this.parseLog(log));
  }

  /**
   * 统计用户日志数量
   */
  static countByUserId(userId, options = {}) {
    const { taskType, status } = options;

    let query = 'SELECT COUNT(*) as count FROM ai_task_logs WHERE user_id = ?';
    const params = [userId];

    if (taskType) {
      query += ' AND task_type = ?';
      params.push(taskType);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }

  /**
   * 解析日志数据
   */
  static parseLog(log) {
    if (!log) return null;

    try {
      if (log.input) log.input = JSON.parse(log.input);
    } catch (e) {
      log.input = {};
    }

    try {
      if (log.output) log.output = JSON.parse(log.output);
    } catch (e) {
      log.output = null;
    }

    try {
      if (log.token_usage) log.token_usage = JSON.parse(log.token_usage);
    } catch (e) {
      log.token_usage = null;
    }

    return log;
  }

  /**
   * 获取统计信息
   */
  static getStats(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT
        task_type,
        status,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration
      FROM ai_task_logs
      WHERE user_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY task_type, status
    `);

    return stmt.all(userId, days);
  }
}

module.exports = AiTaskLogModel;
