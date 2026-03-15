/**
 * Points System Model - 积分系统数据模型
 * ISSUE-P1-004: 积分系统完善
 */

const { db } = require('../../config/database');

/**
 * 积分规则配置
 */
const POINTS_RULES = {
  // 练习相关
  practice_correct: 10,           // 答对一题
  practice_accuracy_bonus: 20,    // 正确率≥80% 额外奖励
  practice_perfect_bonus: 50,     // 全对额外奖励（100% 正确率）
  practice_streak_bonus: 5,       // 连续练习奖励（每连续 3 天）
  
  // 打卡相关
  daily_check_in: 5,              // 每日打卡
  check_in_streak_7: 20,          // 连续 7 天打卡奖励
  check_in_streak_30: 100,        // 连续 30 天打卡奖励
  
  // 学习时长
  study_duration: 1,              // 每分钟学习时长积分
  
  // 成就相关
  first_practice: 50,             // 首次练习
  first_perfect: 100,             // 首次全对
  mastery_milestone: 50           // 知识点掌握度达到 80%
};

class PointsSystemModel {
  /**
   * 添加积分记录
   */
  static addPoints(userId, points, source, description = '') {
    if (points === 0) return null;
    
    const stmt = db.prepare(`
      INSERT INTO points_records (
        user_id,
        points,
        source,
        description
      ) VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(userId, points, source, description);

    // 更新用户总积分
    this.updateUserTotalPoints(userId);

    return result.lastInsertRowid;
  }

  /**
   * 计算练习积分（完整规则）
   * 规则：
   * - 答对一题：+10 分
   * - 正确率≥80%：+20 分额外奖励
   * - 正确率=100%：+50 分完美奖励
   * - 连续练习（3 天以上）：+5 分/天
   */
  static calculatePracticePoints(questions, userId = null) {
    /**
     * questions 格式：
     * [
     *   { isCorrect: true, ... },
     *   { isCorrect: false, ... }
     * ]
     */
    
    if (!questions || questions.length === 0) return { points: 0, breakdown: {} };

    const correctCount = questions.filter(q => q.isCorrect).length;
    const accuracy = correctCount / questions.length;
    
    let points = 0;
    const breakdown = {};

    // 1. 基础分：每答对一题 +10 分
    const basePoints = correctCount * POINTS_RULES.practice_correct;
    points += basePoints;
    breakdown.base = basePoints;

    // 2. 正确率奖励：≥80% +20 分
    if (accuracy >= 0.8) {
      points += POINTS_RULES.practice_accuracy_bonus;
      breakdown.accuracyBonus = POINTS_RULES.practice_accuracy_bonus;
    }

    // 3. 完美奖励：100% 正确率 +50 分
    if (accuracy === 1.0 && questions.length >= 3) {
      points += POINTS_RULES.practice_perfect_bonus;
      breakdown.perfectBonus = POINTS_RULES.practice_perfect_bonus;
    }

    // 4. 连续练习奖励
    if (userId) {
      const streakDays = this.getCurrentStreak(userId);
      if (streakDays >= 3) {
        const streakBonus = Math.floor(streakDays / 3) * POINTS_RULES.practice_streak_bonus;
        points += streakBonus;
        breakdown.streakBonus = streakBonus;
      }
    }

    return { points, breakdown, accuracy: (accuracy * 100).toFixed(1) };
  }

  /**
   * 记录练习积分（增强版）
   */
  static recordPractice(userId, questions, practiceId = null) {
    const result = this.calculatePracticePoints(questions, userId);
    const points = result.points;
    
    if (points > 0) {
      const description = this.buildPracticeDescription(result, questions.length);
      
      const recordId = this.addPoints(
        userId,
        points,
        'practice',
        description
      );

      // 同时更新打卡记录
      if (practiceId) {
        this.updateStreak(userId);
      }

      return {
        success: true,
        points,
        recordId,
        breakdown: result.breakdown,
        accuracy: result.accuracy
      };
    }

    return {
      success: true,
      points: 0,
      recordId: null,
      breakdown: result.breakdown,
      accuracy: result.accuracy
    };
  }

  /**
   * 构建练习积分描述
   */
  static buildPracticeDescription(result, questionCount) {
    const parts = [`练习${questionCount}道题`];
    
    if (result.breakdown.base) {
      parts.push(`基础${result.breakdown.base}分`);
    }
    if (result.breakdown.accuracyBonus) {
      parts.push(`正确率奖励${result.breakdown.accuracyBonus}分`);
    }
    if (result.breakdown.perfectBonus) {
      parts.push(`完美奖励${result.breakdown.perfectBonus}分`);
    }
    if (result.breakdown.streakBonus) {
      parts.push(`连续练习奖励${result.breakdown.streakBonus}分`);
    }
    
    return parts.join('，');
  }

  /**
   * 更新打卡（连续学习天数，增强版）
   * 规则：
   * - 每日打卡：+5 分
   * - 连续 7 天：+20 分额外奖励
   * - 连续 30 天：+100 分额外奖励
   */
  static updateStreak(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取上次打卡日期
    const lastCheck = this.getLastCheckDate(userId);
    
    let newStreak = 1;
    let bonusPoints = 0;
    let bonusReason = '';
    
    if (lastCheck) {
      const lastDate = new Date(lastCheck);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // 今天已经打卡过
        return { 
          streak: this.getCurrentStreak(userId), 
          checkedToday: true,
          points: 0,
          bonusPoints: 0
        };
      } else if (diffDays === 1) {
        // 连续打卡
        newStreak = this.getCurrentStreak(userId) + 1;
      }
      // diffDays > 1 则重置为 1
    }

    // 更新打卡记录
    const stmt = db.prepare(`
      INSERT INTO daily_check_ins (user_id, check_in_date)
      VALUES (?, ?)
    `);
    stmt.run(userId, today);

    // 更新用户连续天数
    const updateStmt = db.prepare(`
      UPDATE student_profiles
      SET streak_days = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    updateStmt.run(newStreak, userId);

    // 计算积分
    let totalPoints = POINTS_RULES.daily_check_in; // 基础打卡积分
    
    // 连续 7 天奖励
    if (newStreak === 7) {
      bonusPoints = POINTS_RULES.check_in_streak_7;
      bonusReason = '连续 7 天打卡奖励';
      totalPoints += bonusPoints;
    }
    // 连续 30 天奖励
    else if (newStreak === 30) {
      bonusPoints = POINTS_RULES.check_in_streak_30;
      bonusReason = '连续 30 天打卡奖励';
      totalPoints += bonusPoints;
    }

    // 记录积分
    if (totalPoints > 0) {
      const description = bonusReason 
        ? `连续打卡第${newStreak}天，${bonusReason}`
        : `连续打卡第${newStreak}天`;
      this.addPoints(userId, totalPoints, 'check_in', description);
    }

    return {
      streak: newStreak,
      checkedToday: false,
      points: totalPoints,
      bonusPoints,
      bonusReason
    };
  }

  /**
   * 获取上次打卡日期
   */
  static getLastCheckDate(userId) {
    const stmt = db.prepare(`
      SELECT check_in_date FROM daily_check_ins
      WHERE user_id = ?
      ORDER BY check_in_date DESC LIMIT 1
    `);
    const result = stmt.get(userId);
    return result ? result.check_in_date : null;
  }

  /**
   * 获取当前连续天数
   */
  static getCurrentStreak(userId) {
    const stmt = db.prepare(`
      SELECT streak_days FROM student_profiles
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result ? result.streak_days : 0;
  }

  /**
   * 更新用户总积分
   */
  static updateUserTotalPoints(userId) {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(points), 0) as total FROM points_records
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    
    const updateStmt = db.prepare(`
      UPDATE student_profiles
      SET total_points = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    updateStmt.run(result.total, userId);
  }

  /**
   * 获取用户积分记录
   */
  static getRecords(userId, options = {}) {
    const { page = 1, pageSize = 20, source } = options;

    let query = 'SELECT * FROM points_records WHERE user_id = ?';
    const params = [userId];

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * 获取用户总积分
   */
  static getTotalPoints(userId) {
    const stmt = db.prepare(`
      SELECT total_points FROM student_profiles
      WHERE user_id = ?
    `);
    const result = stmt.get(userId);
    return result ? result.total_points : 0;
  }

  /**
   * 获取积分统计
   */
  static getStats(userId, days = 7) {
    const stmt = db.prepare(`
      SELECT
        source,
        COUNT(*) as count,
        SUM(points) as total_points
      FROM points_records
      WHERE user_id = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY source
    `);

    return stmt.all(userId, days);
  }
}

module.exports = PointsSystemModel;
