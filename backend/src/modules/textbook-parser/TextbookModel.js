/**
 * Textbook Model - 课本文本和解析任务数据模型
 * ISSUE-P1-002: 课本解析功能
 */

const { db } = require('../../config/database');

class TextbookModel {
  /**
   * 创建课本文本记录
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO textbooks (
        user_id,
        title,
        file_path,
        file_url,
        file_size,
        units,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id || data.userId,
      data.title,
      data.file_path,
      data.file_url,
      data.file_size,
      JSON.stringify(data.units || []),
      data.status || 'pending'
    );

    return { id: result.lastInsertRowid, ...data };
  }

  /**
   * 删除课本
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM textbooks WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * 根据 ID 获取课本
   */
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM textbooks WHERE id = ?');
    const textbook = stmt.get(id);
    return this.parseTextbook(textbook);
  }

  /**
   * 根据用户 ID 获取课本列表
   */
  static getByUserId(userId, options = {}) {
    const { page = 1, pageSize = 20, status } = options;

    let query = 'SELECT * FROM textbooks WHERE user_id = ?';
    const params = [userId];

    query += ' ORDER BY created_at DESC';
    
    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);
    }

    const stmt = db.prepare(query);
    const textbooks = stmt.all(...params);

    return textbooks.map(t => this.parseTextbook(t));
  }

  /**
   * 更新课本状态
   */
  static updateStatus(id, status, data = {}) {
    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];

    if (data.units) {
      updates.push('units = ?');
      values.push(JSON.stringify(data.units));
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE textbooks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * 解析课本数据
   */
  static parseTextbook(textbook) {
    if (!textbook) return null;

    try {
      if (textbook.units) textbook.units = JSON.parse(textbook.units);
    } catch (e) {
      textbook.units = [];
    }

    return textbook;
  }

  /**
   * 创建解析任务
   */
  static createTask(data) {
    const stmt = db.prepare(`
      INSERT INTO textbook_parse_tasks (
        user_id,
        textbook_id,
        file_path,
        file_name,
        file_size,
        status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.textbookId || null,
      data.filePath,
      data.fileName || null,
      data.fileSize || null,
      data.status || 'pending'
    );

    return result.lastInsertRowid;
  }

  /**
   * 更新解析任务
   */
  static updateTask(taskId, data) {
    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.startedAt !== undefined) {
      updates.push('started_at = ?');
      values.push(data.startedAt);
    }
    if (data.completedAt !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completedAt);
    }
    if (data.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(data.errorMessage);
    }
    if (data.durationMs !== undefined) {
      updates.push('duration_ms = ?');
      values.push(data.durationMs);
    }
    if (data.pageCount !== undefined) {
      updates.push('page_count = ?');
      values.push(data.pageCount);
    }
    if (data.structure !== undefined) {
      updates.push('structure = ?');
      values.push(JSON.stringify(data.structure));
    }
    if (data.sectionsCount !== undefined) {
      updates.push('sections_count = ?');
      values.push(data.sectionsCount);
    }
    if (data.knowledgePointsCount !== undefined) {
      updates.push('knowledge_points_count = ?');
      values.push(data.knowledgePointsCount);
    }

    values.push(taskId);

    const stmt = db.prepare(`
      UPDATE textbook_parse_tasks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * 根据 ID 获取任务
   */
  static getTaskById(taskId) {
    const stmt = db.prepare('SELECT * FROM textbook_parse_tasks WHERE id = ?');
    return stmt.get(taskId);
  }

  /**
   * 根据用户 ID 获取任务列表
   */
  static getTasksByUserId(userId, options = {}) {
    const { page = 1, pageSize = 20, status } = options;

    let query = 'SELECT * FROM textbook_parse_tasks WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 获取用户的课本文本（按知识点搜索）
   */
  static searchByKnowledgePoint(userId, keyword) {
    const stmt = db.prepare(`
      SELECT * FROM textbooks
      WHERE user_id = ?
        AND knowledge_points LIKE ?
      ORDER BY created_at DESC
    `);

    const textbooks = stmt.all(userId, `%${keyword}%`);
    return textbooks.map(t => this.parseTextbook(t));
  }
}

module.exports = TextbookModel;
