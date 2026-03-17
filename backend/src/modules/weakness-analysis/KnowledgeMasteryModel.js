/**
 * Knowledge Mastery Model - 知识点掌握度数据模型
 * ISSUE-P1-003: 薄弱点分析功能
 */

const { db } = require('../../config/database');

class KnowledgeMasteryModel {
  /**
   * 创建或更新知识点掌握度记录
   */
  static upsert(data) {
    const stmt = db.prepare(`
      INSERT INTO knowledge_mastery (
        user_id,
        subject,
        knowledge_point_id,
        knowledge_point_name,
        mastery_score,
        correct_count,
        wrong_count,
        total_count,
        last_practiced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, knowledge_point_id) DO UPDATE SET
        mastery_score = excluded.mastery_score,
        correct_count = excluded.correct_count,
        wrong_count = excluded.wrong_count,
        total_count = excluded.total_count,
        last_practiced_at = excluded.last_practiced_at,
        updated_at = CURRENT_TIMESTAMP
    `);

    const result = stmt.run(
      data.userId,
      data.subject,
      data.knowledgePointId,
      data.knowledgePointName,
      data.masteryScore,
      data.correctCount,
      data.wrongCount,
      data.totalCount,
      data.lastPracticedAt || new Date().toISOString()
    );

    return result.lastInsertRowid || result.changes;
  }

  /**
   * 批量更新知识点掌握度
   */
  static batchUpsert(records) {
    const insertStmt = db.prepare(`
      INSERT INTO knowledge_mastery (
        user_id,
        subject,
        knowledge_point_id,
        knowledge_point_name,
        mastery_score,
        correct_count,
        wrong_count,
        total_count,
        last_practiced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, knowledge_point_id) DO UPDATE SET
        mastery_score = excluded.mastery_score,
        correct_count = excluded.correct_count,
        wrong_count = excluded.wrong_count,
        total_count = excluded.total_count,
        last_practiced_at = excluded.last_practiced_at,
        updated_at = CURRENT_TIMESTAMP
    `);

    const insertMany = db.transaction((records) => {
      for (const record of records) {
        insertStmt.run(
          record.userId,
          record.subject,
          record.knowledgePointId,
          record.knowledgePointName,
          record.masteryScore,
          record.correctCount,
          record.wrongCount,
          record.totalCount,
          record.lastPracticedAt || new Date().toISOString()
        );
      }
    });

    insertMany(records);
  }

  /**
   * 根据 ID 获取掌握度记录
   */
  static getById(id) {
    const stmt = db.prepare('SELECT * FROM knowledge_mastery WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * 获取用户的知识点掌握度列表
   */
  static getByUserId(userId, options = {}) {
    const {
      subject,
      masteryLevel,
      sortBy = 'mastery_score',
      sortOrder = 'ASC',
      limit = 100,
      offset = 0
    } = options;

    let query = 'SELECT * FROM knowledge_mastery WHERE user_id = ?';
    const params = [userId];

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }

    if (masteryLevel) {
      query += ' AND mastery_level = ?';
      params.push(masteryLevel);
    }

    // 排序
    const validSorts = ['mastery_score', 'total_count', 'last_practiced_at', 'created_at'];
    const sortField = validSorts.includes(sortBy) ? sortBy : 'mastery_score';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 获取用户的薄弱点（掌握度低的知识点）
   */
  static getWeakPoints(userId, options = {}) {
    const {
      subject,
      limit = 10,
      minMastery = 0,
      maxMastery = 60
    } = options;

    let query = `
      SELECT 
        km.knowledge_point_id as knowledgePointId,
        km.mastery_level as masteryLevel,
        km.review_count as reviewCount,
        kp.title as knowledgePointName,
        kp.category as subject
      FROM knowledge_mastery km
      LEFT JOIN knowledge_points kp ON km.knowledge_point_id = kp.id
      WHERE km.user_id = ?
        AND km.mastery_level >= ?
        AND km.mastery_level <= ?
    `;
    const params = [userId, minMastery, maxMastery];

    if (subject) {
      query += ' AND kp.category = ?';
      params.push(subject);
    }

    query += `
      ORDER BY km.mastery_level ASC, km.review_count DESC
      LIMIT ?
    `;
    params.push(limit);

    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    // 转换为标准格式
    return results.map(r => ({
      knowledgePointId: r.knowledgePointId,
      knowledgePointName: r.knowledgePointName,
      masteryLevel: r.masteryLevel,
      reviewCount: r.reviewCount,
      subject: r.subject,
      trend: 'stable',
      reason: '掌握度较低'
    }));
  }

  /**
   * 获取掌握度统计
   */
  static getStats(userId, subject = null) {
    let query = `
      SELECT
        COUNT(*) as total_points,
        AVG(mastery_score) as avg_mastery,
        SUM(correct_count) as total_correct,
        SUM(wrong_count) as total_wrong,
        SUM(total_count) as total_practices,
        COUNT(CASE WHEN mastery_level = 'weak' THEN 1 END) as weak_count,
        COUNT(CASE WHEN mastery_level = 'learning' THEN 1 END) as learning_count,
        COUNT(CASE WHEN mastery_level = 'proficient' THEN 1 END) as proficient_count,
        COUNT(CASE WHEN mastery_level = 'mastered' THEN 1 END) as mastered_count
      FROM knowledge_mastery
      WHERE user_id = ?
    `;
    const params = [userId];

    if (subject) {
      query += ' AND subject = ?';
      params.push(subject);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params);
  }

  /**
   * 更新掌握度（基于练习结果，增强版）
   * @param {number} userId - 用户 ID
   * @param {number} knowledgePointId - 知识点 ID
   * @param {boolean} isCorrect - 是否正确
   * @param {string} subject - 科目
   * @param {string} knowledgePointName - 知识点名称
   * @param {number} recentCorrectCount - 最近正确次数（可选）
   * @param {number} recentTotalCount - 最近总次数（可选）
   */
  static updateMastery(userId, knowledgePointId, isCorrect, subject, knowledgePointName, recentCorrectCount = null, recentTotalCount = null) {
    const existing = this.getByKnowledgePointId(userId, knowledgePointId);

    let correctCount = isCorrect ? 1 : 0;
    let wrongCount = isCorrect ? 0 : 1;
    let totalCount = 1;
    let lastPracticedAt = new Date().toISOString();

    if (existing) {
      correctCount = existing.correct_count + (isCorrect ? 1 : 0);
      wrongCount = existing.wrong_count + (isCorrect ? 0 : 1);
      totalCount = existing.total_count + 1;
      lastPracticedAt = existing.last_practiced_at || lastPracticedAt;
    }

    // 计算掌握度分数（带遗忘因子）
    const masteryScore = this.calculateMasteryScoreWithForgetting(
      correctCount,
      wrongCount,
      totalCount,
      lastPracticedAt
    );
    
    const masteryLevel = this.getMasteryLevel(masteryScore);

    return this.upsert({
      userId,
      subject,
      knowledgePointId,
      knowledgePointName,
      masteryScore,
      correctCount,
      wrongCount,
      totalCount,
      lastPracticedAt
    });
  }

  /**
   * 批量更新掌握度（练习后批量调用）
   * @param {number} userId - 用户 ID
   * @param {Array} questions - 练习题目结果
   */
  static batchUpdateMastery(userId, questions) {
    /**
     * questions 格式：
     * [
     *   {
     *     knowledgePointId: 1,
     *     knowledgePointName: '知识点名称',
     *     subject: '数学',
     *     isCorrect: true
     *   }
     * ]
     */
    
    const updates = [];
    
    for (const q of questions) {
      const result = this.updateMastery(
        userId,
        q.knowledgePointId,
        q.isCorrect,
        q.subject,
        q.knowledgePointName
      );
      updates.push({
        knowledgePointId: q.knowledgePointId,
        isCorrect: q.isCorrect,
        result
      });
    }

    return {
      success: true,
      updatedCount: updates.length,
      updates
    };
  }

  /**
   * 根据知识点 ID 获取记录
   */
  static getByKnowledgePointId(userId, knowledgePointId) {
    const stmt = db.prepare(`
      SELECT * FROM knowledge_mastery
      WHERE user_id = ? AND knowledge_point_id = ?
    `);
    return stmt.get(userId, knowledgePointId);
  }

  /**
   * 计算掌握度分数（增强版）
   * 考虑因素：
   * 1. 正确率（50% 权重）
   * 2. 练习次数（25% 权重）- 鼓励多次练习
   * 3. 近期表现（25% 权重）- 最近 5 次练习的正确率更高权重
   */
  static calculateMasteryScore(correctCount, wrongCount, totalCount, recentCorrectCount = null, recentTotalCount = 5) {
    if (totalCount === 0) return 0;

    // 1. 正确率分数（50% 权重）
    const accuracy = correctCount / totalCount;
    const accuracyScore = accuracy * 50;

    // 2. 练习次数分数（25% 权重）- 20 次练习达到满分
    const practiceFactor = Math.min(totalCount / 20, 1);
    const practiceScore = practiceFactor * 25;

    // 3. 近期表现分数（25% 权重）- 如果有近期数据
    let recentScore = 0;
    if (recentCorrectCount !== null && recentTotalCount > 0) {
      const recentAccuracy = recentCorrectCount / recentTotalCount;
      recentScore = recentAccuracy * 25;
    } else {
      // 如果没有近期数据，使用总体正确率
      recentScore = accuracy * 25;
    }

    const score = accuracyScore + practiceScore + recentScore;
    return Math.round(Math.min(score, 100)); // 不超过 100
  }

  /**
   * 计算艾宾浩斯遗忘曲线因子
   * @param {Date} lastPracticedAt - 最后练习时间
   * @returns {number} 遗忘因子（0-1，1 表示完全记住）
   */
  static calculateForgettingFactor(lastPracticedAt) {
    if (!lastPracticedAt) return 1;
    
    const now = new Date();
    const last = new Date(lastPracticedAt);
    const daysSincePractice = (now - last) / (1000 * 60 * 60 * 24);
    
    // 艾宾浩斯遗忘曲线简化模型
    // 1 天后保留 33.7%，7 天后保留 25.4%，30 天后保留 21%
    if (daysSincePractice <= 1) return 1;
    if (daysSincePractice <= 7) return 0.8;
    if (daysSincePractice <= 30) return 0.6;
    return 0.4;
  }

  /**
   * 计算掌握度分数（带遗忘因子）
   */
  static calculateMasteryScoreWithForgetting(correctCount, wrongCount, totalCount, lastPracticedAt) {
    const baseScore = this.calculateMasteryScore(correctCount, wrongCount, totalCount);
    const forgettingFactor = this.calculateForgettingFactor(lastPracticedAt);
    
    return Math.round(baseScore * forgettingFactor);
  }

  /**
   * 获取掌握度等级
   */
  static getMasteryLevel(score) {
    if (score >= 80) return 'mastered';
    if (score >= 60) return 'proficient';
    if (score >= 40) return 'learning';
    return 'weak';
  }
}

module.exports = KnowledgeMasteryModel;
