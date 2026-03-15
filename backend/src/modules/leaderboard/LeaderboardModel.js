/**
 * Leaderboard Model - 排行榜数据模型
 * ISSUE-P1-005: 排行榜功能
 */

const { db } = require('../../config/database');

class LeaderboardModel {
  /**
   * 创建排行榜快照
   */
  static createSnapshot(type, period, data) {
    const stmt = db.prepare(`
      INSERT INTO leaderboard_snapshots (
        type,
        period,
        snapshot_date,
        data
      ) VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      type,
      period,
      new Date().toISOString(),
      JSON.stringify(data)
    );

    return result.lastInsertRowid;
  }

  /**
   * 获取最新排行榜快照
   */
  static getLatestSnapshot(type, period = 'total') {
    const stmt = db.prepare(`
      SELECT * FROM leaderboard_snapshots
      WHERE type = ? AND period = ?
      ORDER BY snapshot_date DESC LIMIT 1
    `);

    const snapshot = stmt.get(type, period);
    
    if (snapshot && snapshot.data) {
      try {
        snapshot.data = JSON.parse(snapshot.data);
      } catch (e) {
        snapshot.data = [];
      }
    }

    return snapshot;
  }

  /**
   * 获取排行榜历史
   */
  static getHistory(type, period, limit = 10) {
    const stmt = db.prepare(`
      SELECT * FROM leaderboard_snapshots
      WHERE type = ? AND period = ?
      ORDER BY snapshot_date DESC LIMIT ?
    `);

    const snapshots = stmt.all(type, period, limit);
    
    return snapshots.map(s => {
      if (s.data) {
        try {
          s.data = JSON.parse(s.data);
        } catch (e) {
          s.data = [];
        }
      }
      return s;
    });
  }

  /**
   * 计算总榜排名
   */
  static calculateTotalRanking(limit = 100) {
    const stmt = db.prepare(`
      SELECT 
        sp.user_id,
        u.nickname,
        u.avatar_url,
        sp.total_points,
        RANK() OVER (ORDER BY sp.total_points DESC) as rank
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.total_points > 0
      ORDER BY sp.total_points DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * 计算科目榜排名
   */
  static calculateSubjectRanking(subject, limit = 100) {
    const stmt = db.prepare(`
      SELECT 
        km.user_id,
        u.nickname,
        u.avatar_url,
        SUM(km.mastery_score) as total_mastery,
        COUNT(km.id) as mastered_count,
        RANK() OVER (ORDER BY SUM(km.mastery_score) DESC) as rank
      FROM knowledge_mastery km
      JOIN users u ON km.user_id = u.id
      WHERE km.subject = ?
      GROUP BY km.user_id
      HAVING COUNT(km.id) > 0
      ORDER BY total_mastery DESC
      LIMIT ?
    `);

    return stmt.all(subject, limit);
  }

  /**
   * 计算周榜排名（基于本周积分记录）
   */
  static calculateWeeklyRanking(limit = 100) {
    const stmt = db.prepare(`
      SELECT 
        pr.user_id,
        u.nickname,
        u.avatar_url,
        SUM(pr.points) as weekly_points,
        COUNT(pr.id) as activity_count,
        RANK() OVER (ORDER BY SUM(pr.points) DESC) as rank
      FROM points_records pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.created_at >= datetime('now', '-7 days')
      GROUP BY pr.user_id
      ORDER BY weekly_points DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * 计算月榜排名（基于本月积分记录）
   */
  static calculateMonthlyRanking(limit = 100) {
    const stmt = db.prepare(`
      SELECT 
        pr.user_id,
        u.nickname,
        u.avatar_url,
        SUM(pr.points) as monthly_points,
        COUNT(pr.id) as activity_count,
        RANK() OVER (ORDER BY SUM(pr.points) DESC) as rank
      FROM points_records pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.created_at >= datetime('now', '-30 days')
      GROUP BY pr.user_id
      ORDER BY monthly_points DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * 获取用户排名
   */
  static getUserRanking(userId, type = 'total') {
    let query = '';
    const params = [userId];

    switch (type) {
      case 'weekly':
        query = `
          SELECT rank, points as score FROM (
            SELECT 
              user_id,
              SUM(points) as points,
              RANK() OVER (ORDER BY SUM(points) DESC) as rank
            FROM points_records
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY user_id
          )
          WHERE user_id = ?
        `;
        break;
      case 'monthly':
        query = `
          SELECT rank, points as score FROM (
            SELECT 
              user_id,
              SUM(points) as points,
              RANK() OVER (ORDER BY SUM(points) DESC) as rank
            FROM points_records
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY user_id
          )
          WHERE user_id = ?
        `;
        break;
      default: // total
        query = `
          SELECT rank, total_points as score FROM (
            SELECT 
              user_id,
              total_points,
              RANK() OVER (ORDER BY total_points DESC) as rank
            FROM student_profiles
          )
          WHERE user_id = ?
        `;
    }

    const stmt = db.prepare(query);
    return stmt.get(...params);
  }

  /**
   * 获取排行榜分页数据
   */
  static getPaginated(type, period, page = 1, pageSize = 20) {
    let rankingData;
    
    switch (type) {
      case 'subject':
        rankingData = this.calculateSubjectRanking(period, page * pageSize);
        break;
      case 'weekly':
        rankingData = this.calculateWeeklyRanking(page * pageSize);
        break;
      case 'monthly':
        rankingData = this.calculateMonthlyRanking(page * pageSize);
        break;
      default: // total
        rankingData = this.calculateTotalRanking(page * pageSize);
    }

    const offset = (page - 1) * pageSize;
    const paginatedData = rankingData.slice(offset, offset + pageSize);

    return {
      data: paginatedData,
      total: rankingData.length,
      page,
      pageSize
    };
  }
}

module.exports = LeaderboardModel;
