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
        original_task_id,
        book_info,
        structure,
        sections,
        knowledge_points,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.originalTaskId,
      JSON.stringify(data.bookInfo || {}),
      JSON.stringify(data.structure || []),
      JSON.stringify(data.sections || {}),
      JSON.stringify(data.knowledgePoints || []),
      data.status || 'pending'
    );

    return result.lastInsertRowid;
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

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

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

    if (data.bookInfo) {
      updates.push('book_info = ?');
      values.push(JSON.stringify(data.bookInfo));
    }
    if (data.structure) {
      updates.push('structure = ?');
      values.push(JSON.stringify(data.structure));
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
      if (textbook.book_info) textbook.book_info = JSON.parse(textbook.book_info);
    } catch (e) {
      textbook.book_info = {};
    }

    try {
      if (textbook.structure) textbook.structure = JSON.parse(textbook.structure);
    } catch (e) {
      textbook.structure = [];
    }

    try {
      if (textbook.sections) textbook.sections = JSON.parse(textbook.sections);
    } catch (e) {
      textbook.sections = {};
    }

    try {
      if (textbook.knowledge_points) textbook.knowledge_points = JSON.parse(textbook.knowledge_points);
    } catch (e) {
      textbook.knowledge_points = [];
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
