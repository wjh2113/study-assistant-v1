/**
 * AI Task Log Model - 支持更多字段
 */

const { db } = require('../../config/database');

class AiTaskLogModel {
  /**
   * 创建任务日志
   */
  static create(data) {
    const {
      userId,
      taskType,
      input,
      output = null,
      status = 'pending',
      errorMessage = null,
      modelUsed = null,
      providerUsed = null,
      tokenUsage = null,
      duration_ms = null
    } = data;

    const stmt = db.prepare(`
      INSERT INTO ai_task_logs 
      (user_id, task_type, input, output, status, error_message, model_used, provider_used, token_usage, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      taskType,
      JSON.stringify(input),
      output ? JSON.stringify(output) : null,
      status,
      errorMessage,
      modelUsed,
      providerUsed,
      tokenUsage ? JSON.stringify(tokenUsage) : null,
      duration_ms
    );

    return result.lastInsertRowid;
  }

  /**
   * 更新任务日志
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.output !== undefined) {
      fields.push('output = ?');
      values.push(data.output ? JSON.stringify(data.output) : null);
    }
    if (data.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(data.errorMessage);
    }
    if (data.modelUsed !== undefined) {
      fields.push('model_used = ?');
      values.push(data.modelUsed);
    }
    if (data.providerUsed !== undefined) {
      fields.push('provider_used = ?');
      values.push(data.providerUsed);
    }
    if (data.tokenUsage !== undefined) {
      fields.push('token_usage = ?');
      values.push(data.tokenUsage ? JSON.stringify(data.tokenUsage) : null);
    }
    if (data.duration_ms !== undefined) {
      fields.push('duration_ms = ?');
      values.push(data.duration_ms);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE ai_task_logs
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    return stmt.run(...values);
  }

  /**
   * 获取单条日志
   */
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM ai_task_logs WHERE id = ?');
    const log = stmt.get(id);
    
    if (log) {
      try {
        log.input = log.input ? JSON.parse(log.input) : null;
        log.output = log.output ? JSON.parse(log.output) : null;
        log.token_usage = log.token_usage ? JSON.parse(log.token_usage) : null;
      } catch (e) {
        console.error('解析日志数据失败:', e.message);
      }
    }
    
    return log;
  }

  /**
   * 按用户 ID 获取日志
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

    return logs.map(log => {
      try {
        log.input = log.input ? JSON.parse(log.input) : null;
        log.output = log.output ? JSON.parse(log.output) : null;
        log.token_usage = log.token_usage ? JSON.parse(log.token_usage) : null;
      } catch (e) {
        log.input = null;
        log.output = null;
        log.token_usage = null;
      }
      return log;
    });
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
   * 删除日志
   */
  static delete(id, userId) {
    const stmt = db.prepare(`
      DELETE FROM ai_task_logs
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  /**
   * 获取统计信息
   */
  static getStats(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration,
        SUM(CASE WHEN token_usage IS NOT NULL THEN json_extract(token_usage, '$.total_tokens') ELSE 0 END) as total_tokens
      FROM ai_task_logs
      WHERE user_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY status
    `);

    return stmt.all(userId, days);
  }
}

module.exports = AiTaskLogModel;
