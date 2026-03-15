const { db } = require('../config/database');

class AIQARecordModel {
  // 创建问答记录
  static create(userId, question, answer, knowledgePointId = null) {
    const stmt = db.prepare(`
      INSERT INTO ai_qa_records (user_id, question, answer, knowledge_point_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(userId, question, answer, knowledgePointId);
    return this.getById(result.lastInsertRowid);
  }

  // 根据 ID 获取
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM ai_qa_records WHERE id = ?');
    return stmt.get(id);
  }

  // 获取用户的问答记录
  static getByUserId(userId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM ai_qa_records 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  }

  // 搜索问答记录
  static search(userId, keyword) {
    const stmt = db.prepare(`
      SELECT * FROM ai_qa_records 
      WHERE user_id = ? AND (question LIKE ? OR answer LIKE ?)
      ORDER BY created_at DESC
    `);
    const searchPattern = `%${keyword}%`;
    return stmt.all(userId, searchPattern, searchPattern);
  }

  // 删除问答记录
  static delete(id, userId) {
    const stmt = db.prepare('DELETE FROM ai_qa_records WHERE id = ? AND user_id = ?');
    return stmt.run(id, userId);
  }
}

module.exports = AIQARecordModel;
