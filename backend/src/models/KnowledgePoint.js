const { db } = require('../config/database');

class KnowledgePointModel {
  // 创建知识点
  static create(userId, title, content, category, tags) {
    const stmt = db.prepare(`
      INSERT INTO knowledge_points (user_id, title, content, category, tags)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, title, content || null, category || null, tags ? JSON.stringify(tags) : null);
    return this.getById(result.lastInsertRowid);
  }

  // 根据 ID 获取知识点
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM knowledge_points WHERE id = ?');
    const point = stmt.get(id);
    if (point && point.tags) {
      point.tags = JSON.parse(point.tags);
    }
    return point;
  }

  // 获取用户的所有知识点
  static getByUserId(userId, options = {}) {
    const { category, status, limit = 100, offset = 0 } = options;
    let query = 'SELECT * FROM knowledge_points WHERE user_id = ?';
    const params = [userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const points = stmt.all(...params);
    return points.map(point => {
      if (point.tags) {
        point.tags = JSON.parse(point.tags);
      }
      return point;
    });
  }

  // 更新知识点（部分更新，只更新提供的字段）
  static update(id, userId, data) {
    // 获取现有数据
    const existing = this.getById(id);
    if (!existing) return null;

    // 只更新提供的字段，未提供的字段保留原值
    const updates = [];
    const values = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(data.tags ? JSON.stringify(data.tags) : null);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length === 0) {
      return existing; // 没有要更新的字段，返回原数据
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);

    const stmt = db.prepare(`
      UPDATE knowledge_points 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(...values);
    return this.getById(id);
  }

  // 删除知识点
  static delete(id, userId) {
    const stmt = db.prepare('DELETE FROM knowledge_points WHERE id = ? AND user_id = ?');
    return stmt.run(id, userId);
  }

  // 搜索知识点
  static search(userId, keyword) {
    const stmt = db.prepare(`
      SELECT * FROM knowledge_points 
      WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)
      ORDER BY created_at DESC
    `);
    const searchPattern = `%${keyword}%`;
    const points = stmt.all(userId, searchPattern, searchPattern);
    return points.map(point => {
      if (point.tags) {
        point.tags = JSON.parse(point.tags);
      }
      return point;
    });
  }
}

module.exports = KnowledgePointModel;
