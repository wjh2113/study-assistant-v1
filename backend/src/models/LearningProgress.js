const { db } = require('../config/database');

class LearningProgressModel {
  // 创建或更新学习进度
  static upsert(userId, knowledgePointId, data) {
    const { studyDuration, completionRate } = data;
    
    // 检查是否已存在
    const existing = this.getByUserIdAndPointId(userId, knowledgePointId);
    
    if (existing) {
      return this.update(existing.id, {
        studyDuration: (existing.study_duration || 0) + (studyDuration || 0),
        completionRate: completionRate || existing.completion_rate,
        lastStudiedAt: new Date().toISOString()
      });
    } else {
      return this.create(userId, knowledgePointId, {
        studyDuration,
        completionRate
      });
    }
  }

  // 创建学习进度
  static create(userId, knowledgePointId, data) {
    const { studyDuration = 0, completionRate = 0 } = data;
    const stmt = db.prepare(`
      INSERT INTO learning_progress (user_id, knowledge_point_id, study_duration, completion_rate, last_studied_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(userId, knowledgePointId, studyDuration, completionRate);
    return this.getById(result.lastInsertRowid);
  }

  // 根据 ID 获取
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM learning_progress WHERE id = ?');
    return stmt.get(id);
  }

  // 根据用户 ID 和知识点 ID 获取
  static getByUserIdAndPointId(userId, knowledgePointId) {
    const stmt = db.prepare('SELECT * FROM learning_progress WHERE user_id = ? AND knowledge_point_id = ?');
    return stmt.get(userId, knowledgePointId);
  }

  // 获取用户的所有学习进度
  static getByUserId(userId) {
    const stmt = db.prepare(`
      SELECT lp.*, kp.title as knowledge_point_title
      FROM learning_progress lp
      LEFT JOIN knowledge_points kp ON lp.knowledge_point_id = kp.id
      WHERE lp.user_id = ?
      ORDER BY lp.updated_at DESC
    `);
    return stmt.all(userId);
  }

  // 更新学习进度
  static update(id, data) {
    const { studyDuration, completionRate, lastStudiedAt } = data;
    const stmt = db.prepare(`
      UPDATE learning_progress 
      SET study_duration = ?, completion_rate = ?, last_studied_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(studyDuration, completionRate, lastStudiedAt || new Date().toISOString(), id);
    return this.getById(id);
  }

  // 获取用户学习统计
  static getStats(userId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalPoints,
        SUM(study_duration) as totalDuration,
        AVG(completion_rate) as avgCompletionRate,
        COUNT(CASE WHEN completion_rate >= 100 THEN 1 END) as completedPoints
      FROM learning_progress
      WHERE user_id = ?
    `);
    return stmt.get(userId);
  }
}

module.exports = LearningProgressModel;
