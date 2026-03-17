/**
 * Dynamic Task Generator - 学习任务动态生成
 * 根据学习进度、掌握度、遗忘曲线动态生成每日学习任务
 */

const { db } = require('../../config/database');
const KnowledgeMasteryModel = require('../weakness-analysis/KnowledgeMasteryModel');
const AiGatewayService = require('../ai-gateway/AiGatewayService');

class DynamicTaskGenerator {
  /**
   * 任务类型
   */
  static TASK_TYPES = {
    NEW_LEARNING: 'new_learning',      // 新知识点学习
    PRACTICE: 'practice',              // 练习巩固
    REVIEW: 'review',                  // 复习
    ASSESSMENT: 'assessment',          // 测试评估
    REMEDIAL: 'remedial'               // 补救学习
  };

  /**
   * 优先级
   */
  static PRIORITY = {
    URGENT: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4
  };

  /**
   * 为指定日期生成动态任务
   * @param {number} userId - 用户 ID
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {object} planContext - 计划上下文
   * @returns {Promise<Array>} 任务列表
   */
  static async generateDailyTasks(userId, date, planContext = {}) {
    const { planId, subject, currentStage } = planContext;

    // 1. 获取用户当前状态
    const userStatus = await this.getUserStatus(userId, subject);

    // 2. 获取计划任务（如果有计划）
    const plannedTasks = planId 
      ? await this.getPlannedTasks(planId, date)
      : [];

    // 3. 计算需要复习的知识点（基于遗忘曲线）
    const reviewItems = await this.getReviewItems(userId, subject, date);

    // 4. 识别薄弱点需要补救
    const remedialItems = await this.getRemedialItems(userId, subject);

    // 5. 获取新学习任务
    const newLearningItems = plannedTasks.length > 0
      ? plannedTasks.filter(t => t.type === 'new_learning')
      : await this.getNextLearningItems(userId, subject, currentStage);

    // 6. 动态调整任务优先级
    const allTasks = [
      ...remedialItems.map(item => this.createTask(item, this.TASK_TYPES.REMEDIAL, this.PRIORITY.URGENT)),
      ...reviewItems.map(item => this.createTask(item, this.TASK_TYPES.REVIEW, this.PRIORITY.HIGH)),
      ...newLearningItems.map(item => this.createTask(item, this.TASK_TYPES.NEW_LEARNING, this.PRIORITY.MEDIUM))
    ];

    // 7. 根据用户状态调整任务量
    const adjustedTasks = this.adjustTaskLoad(allTasks, userStatus);

    // 8. 生成练习题目（如果需要）
    const tasksWithQuestions = await this.enrichWithQuestions(userId, adjustedTasks);

    return tasksWithQuestions;
  }

  /**
   * 获取用户当前状态
   */
  static async getUserStatus(userId, subject) {
    const date = new Date().toISOString().split('T')[0];
    // 今日已完成任务
    const todayCompleted = await this.getTodayCompletedTasks(userId, date);
    
    // 当前精力状态（基于最近表现）
    const energyLevel = await this.calculateEnergyLevel(userId);
    
    // 可用学习时间
    const availableTime = await this.getAvailableTime(userId);

    return {
      completedTasks: todayCompleted.length,
      energyLevel, // 0-100
      availableTime, // 分钟
      fatigue: energyLevel < 40,
      momentum: this.calculateMomentum(todayCompleted)
    };
  }

  /**
   * 获取今日已完成任务
   */
  static async getTodayCompletedTasks(userId, date) {
    const stmt = db.prepare(`
      SELECT * FROM learning_plan_tasks
      WHERE user_id = ? 
        AND DATE(scheduled_date) = ?
        AND status = 'completed'
    `);
    return stmt.all(userId, date);
  }

  /**
   * 计算精力水平
   */
  static async calculateEnergyLevel(userId) {
    // 基于最近 3 天的学习表现
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as sessions,
        AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) * 100 as avg_accuracy,
        AVG(duration) as avg_duration
      FROM study_sessions
      WHERE user_id = ?
        AND created_at >= datetime('now', '-3 days')
    `);

    const result = stmt.get(userId) || {};
    const sessions = result.sessions || 0;
    const accuracy = parseFloat(result.avg_accuracy) || 0;
    const duration = parseFloat(result.avg_duration) || 0;

    // 简单计算：准确率 * 0.6 + (1 - 疲劳度) * 0.4
    const fatigueFactor = Math.min(1, sessions * 0.1);
    const energyScore = accuracy * 0.6 + (1 - fatigueFactor) * 100 * 0.4;

    return Math.round(Math.max(0, Math.min(100, energyScore)));
  }

  /**
   * 获取可用学习时间
   */
  static async getAvailableTime(userId) {
    // 从用户偏好获取
    const stmt = db.prepare(`
      SELECT daily_time_limit FROM user_preferences
      WHERE user_id = ?
    `);

    const result = stmt.get(userId);
    return result?.daily_time_limit || 60; // 默认 60 分钟
  }

  /**
   * 计算学习势头
   */
  static calculateMomentum(completedTasks) {
    if (completedTasks.length === 0) return 0;
    if (completedTasks.length <= 2) return 1;
    if (completedTasks.length <= 5) return 2;
    return 3; // 高势头
  }

  /**
   * 获取计划任务
   */
  static async getPlannedTasks(planId, date) {
    const stmt = db.prepare(`
      SELECT * FROM learning_plan_tasks
      WHERE plan_id = ? 
        AND DATE(scheduled_date) = ?
        AND status = 'pending'
      ORDER BY priority, id
    `);

    const tasks = stmt.all(planId, date);
    return tasks.map(task => {
      try {
        if (task.content) task.content = JSON.parse(task.content);
      } catch (e) {}
      return task;
    });
  }

  /**
   * 获取需要复习的知识点（基于遗忘曲线）
   */
  static async getReviewItems(userId, subject, date) {
    // 艾宾浩斯遗忘曲线复习间隔（天）
    const reviewIntervals = [1, 2, 4, 7, 15, 30];

    const stmt = db.prepare(`
      SELECT 
        km.knowledge_point_id,
        kp.title as knowledge_point_name,
        km.mastery_level,
        km.last_reviewed_at,
        km.review_count,
        kp.category as subject
      FROM knowledge_mastery km
      LEFT JOIN knowledge_points kp ON km.knowledge_point_id = kp.id
      WHERE km.user_id = ?
        ${subject ? 'AND kp.category = ?' : ''}
        AND km.last_reviewed_at IS NOT NULL
      ORDER BY km.mastery_level ASC
    `);

    const params = subject ? [userId, subject] : [userId];
    const items = stmt.all(...params);

    const today = new Date(date);
    const reviewItems = [];

    for (const item of items) {
      if (!item.last_reviewed_at) continue;

      const lastReview = new Date(item.last_reviewed_at);
      const daysSinceReview = Math.floor((today - lastReview) / (1000 * 60 * 60 * 24));
      
      // 找到下一个复习间隔
      const nextReviewIndex = Math.min(item.review_count || 0, reviewIntervals.length - 1);
      const nextReviewInterval = reviewIntervals[nextReviewIndex];

      // 如果到了复习时间且掌握度不够高
      if (daysSinceReview >= nextReviewInterval && item.mastery_level < 90) {
        reviewItems.push({
          knowledgePointId: item.knowledge_point_id,
          knowledgePointName: item.knowledge_point_name,
          masteryLevel: item.mastery_level,
          reviewCount: item.review_count,
          daysSinceReview,
          urgency: this.calculateReviewUrgency(daysSinceReview, nextReviewInterval, item.mastery_level)
        });
      }
    }

    // 按紧急程度排序
    return reviewItems.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * 计算复习紧急度
   */
  static calculateReviewUrgency(daysSinceReview, interval, masteryLevel) {
    const overdue = daysSinceReview - interval;
    const masteryFactor = (100 - masteryLevel) / 100;
    return overdue * 2 + masteryFactor * 10;
  }

  /**
   * 获取需要补救的薄弱点
   */
  static async getRemedialItems(userId, subject) {
    const weakPoints = await KnowledgeMasteryModel.getWeakPoints(userId, {
      subject,
      limit: 5
    });

    return weakPoints
      .filter(wp => wp.masteryLevel < 40) // 掌握度低于 40% 需要补救
      .map(wp => ({
        knowledgePointId: wp.knowledgePointId,
        knowledgePointName: wp.knowledgePointName,
        masteryLevel: wp.masteryLevel,
        trend: wp.trend,
        reason: wp.reason
      }));
  }

  /**
   * 获取下一个学习任务
   */
  static async getNextLearningItems(userId, subject, currentStage) {
    // 获取未学习的知识点
    const stmt = db.prepare(`
      SELECT 
        kp.id as knowledge_point_id,
        kp.title as knowledge_point_name,
        kp.category,
        kp.tags,
        COALESCE(km.mastery_level, 0) as mastery_level
      FROM knowledge_points kp
      LEFT JOIN knowledge_mastery km ON kp.id = km.knowledge_point_id AND km.user_id = ?
      WHERE kp.user_id = ?
        ${subject ? 'AND kp.category = ?' : ''}
        AND (km.mastery_level IS NULL OR km.mastery_level < 80)
      ORDER BY 
        CASE WHEN km.mastery_level IS NULL THEN 0 ELSE 1 END,
        km.mastery_level ASC
      LIMIT 5
    `);

    const params = subject ? [userId, userId, subject] : [userId, userId];
    const items = stmt.all(...params);

    return items.map(item => ({
      knowledgePointId: item.knowledge_point_id,
      knowledgePointName: item.knowledge_point_name,
      category: item.category,
      tags: item.tags,
      masteryLevel: item.mastery_level
    }));
  }

  /**
   * 创建任务对象
   */
  static createTask(item, type, priority) {
    const baseTime = 25;
    
    let title = '';
    let estimatedTime = baseTime;
    let content = {};

    switch (type) {
      case this.TASK_TYPES.NEW_LEARNING:
        title = `学习：${item.knowledgePointName}`;
        content = { action: 'learn', materials: ['video', 'text'] };
        break;
      case this.TASK_TYPES.PRACTICE:
        title = `练习：${item.knowledgePointName}`;
        content = { action: 'practice', questionCount: 5 };
        break;
      case this.TASK_TYPES.REVIEW:
        title = `复习：${item.knowledgePointName}`;
        estimatedTime = baseTime * 0.8; // 复习时间稍短
        content = { action: 'review', lastMastery: item.masteryLevel };
        break;
      case this.TASK_TYPES.REMEDIAL:
        title = `补救学习：${item.knowledgePointName}`;
        estimatedTime = baseTime * 1.5; // 补救需要更多时间
        content = { action: 'remedial', reason: item.reason, currentMastery: item.masteryLevel };
        break;
      case this.TASK_TYPES.ASSESSMENT:
        title = `测试：${item.knowledgePointName}`;
        estimatedTime = baseTime * 2;
        content = { action: 'assessment', questionCount: 10 };
        break;
    }

    return {
      type,
      priority,
      knowledgePointId: item.knowledgePointId,
      knowledgePointName: item.knowledgePointName,
      title,
      estimatedTime,
      content,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 根据用户状态调整任务量
   */
  static adjustTaskLoad(tasks, userStatus) {
    const { energyLevel, availableTime, fatigue } = userStatus;

    // 计算总预计时间
    const totalEstimatedTime = tasks.reduce((sum, t) => sum + t.estimatedTime, 0);

    // 如果用户疲劳，减少任务量
    if (fatigue) {
      return tasks.slice(0, Math.ceil(tasks.length * 0.6));
    }

    // 如果时间不足，按优先级排序并裁剪
    if (totalEstimatedTime > availableTime) {
      const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
      let accumulatedTime = 0;
      
      return sorted.filter(task => {
        if (accumulatedTime + task.estimatedTime <= availableTime) {
          accumulatedTime += task.estimatedTime;
          return true;
        }
        return false;
      });
    }

    return tasks;
  }

  /**
   * 为任务 enrich 题目
   */
  static async enrichWithQuestions(userId, tasks) {
    const enrichedTasks = [];

    for (const task of tasks) {
      if (task.content.questionCount) {
        try {
          // 调用 AI Gateway 生成题目
          const questions = await AiGatewayService.generateQuestions({
            userId,
            knowledgePointId: task.knowledgePointId,
            knowledgePointName: task.knowledgePointName,
            count: task.content.questionCount,
            difficulty: 'medium'
          });

          task.content.questions = questions;
        } catch (error) {
          console.error('Failed to generate questions:', error);
          task.content.questions = [];
        }
      }
      enrichedTasks.push(task);
    }

    return enrichedTasks;
  }

  /**
   * 保存任务到数据库
   */
  static async saveTasks(userId, tasks, scheduledDate) {
    const stmt = db.prepare(`
      INSERT INTO learning_plan_tasks (
        user_id,
        task_type,
        content,
        scheduled_date,
        priority,
        status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `);

    for (const task of tasks) {
      stmt.run(
        userId,
        task.type,
        JSON.stringify(task.content),
        scheduledDate,
        task.priority
      );
    }
  }

  /**
   * 更新任务状态
   */
  static async updateTaskStatus(taskId, status, data = {}) {
    const updates = ['status = ?', 'updated_at = ?'];
    const values = [status, new Date().toISOString()];

    if (status === 'completed') {
      updates.push('completed_at = ?');
      values.push(new Date().toISOString());
    }

    if (data.actualTime) {
      updates.push('actual_time = ?');
      values.push(data.actualTime);
    }

    if (data.feedback) {
      updates.push('feedback = ?');
      values.push(JSON.stringify(data.feedback));
    }

    if (data.score !== undefined) {
      updates.push('score = ?');
      values.push(data.score);
    }

    values.push(taskId);

    const stmt = db.prepare(`
      UPDATE learning_plan_tasks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // 如果完成任务，更新知识掌握度
    if (status === 'completed') {
      await this.updateMasteryAfterTask(taskId, data);
    }
  }

  /**
   * 任务完成后更新掌握度
   */
  static async updateMasteryAfterTask(taskId, data) {
    const taskStmt = db.prepare('SELECT * FROM learning_plan_tasks WHERE id = ?');
    const task = taskStmt.get(taskId);

    if (!task || !task.content) return;

    try {
      const content = typeof task.content === 'string' 
        ? JSON.parse(task.content) 
        : task.content;

      const score = data.score || 0;
      const masteryGain = score / 100 * 10; // 最高增加 10 点掌握度

      // 更新知识掌握度
      const upsertStmt = db.prepare(`
        INSERT INTO knowledge_mastery (
          user_id,
          knowledge_point_id,
          mastery_level,
          last_reviewed_at,
          review_count,
          updated_at
        ) VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(user_id, knowledge_point_id) DO UPDATE SET
          mastery_level = MIN(100, mastery_level + ?),
          last_reviewed_at = ?,
          review_count = review_count + 1,
          updated_at = ?
      `);

      const now = new Date().toISOString();
      upsertStmt.run(
        task.user_id,
        content.knowledgePointId,
        masteryGain,
        now,
        now,
        masteryGain,
        now,
        now
      );
    } catch (error) {
      console.error('Failed to update mastery:', error);
    }
  }

  /**
   * 获取任务统计
   */
  static async getTaskStatistics(userId, dateRange) {
    const { startDate, endDate } = dateRange;

    const stmt = db.prepare(`
      SELECT 
        task_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(CASE WHEN status = 'completed' THEN actual_time ELSE NULL END) as avg_actual_time
      FROM learning_plan_tasks
      WHERE user_id = ?
        AND DATE(scheduled_date) BETWEEN ? AND ?
      GROUP BY task_type
    `);

    return stmt.all(userId, startDate, endDate);
  }

  /**
   * 生成复习任务
   * @param {Array} weakPoints - 薄弱知识点列表
   * @returns {Array} 复习任务列表
   */
  static generateReviewTasks(weakPoints) {
    if (!weakPoints || weakPoints.length === 0) {
      return [];
    }

    return weakPoints.map(point => ({
      type: 'review',
      knowledgePointId: point.knowledgePointId,
      knowledgePointName: point.title,
      title: `复习：${point.title}`,
      priority: (point.masteryLevel || 0) < 50 ? 'high' : 'medium',
      estimatedTime: 20,
      lastPracticed: point.lastPracticed,
      masteryLevel: point.masteryLevel
    }));
  }

  /**
   * 生成练习任务
   * @param {Array} learningGoals - 学习目标列表
   * @returns {Array} 练习任务列表
   */
  static generatePracticeTasks(learningGoals) {
    if (!learningGoals || learningGoals.length === 0) {
      return [];
    }

    return learningGoals.map(goal => ({
      type: 'practice',
      knowledgePointId: goal.knowledgePointId,
      knowledgePointName: goal.title,
      title: `练习：${goal.title}`,
      questionCount: 10,
      estimatedTime: 25,
      targetMastery: goal.targetMastery || 80,
      difficulty: 'medium'
    }));
  }

  /**
   * 根据正确率调整难度
   * @param {string} baseDifficulty - 基础难度
   * @param {number} accuracy - 正确率 (0-1)
   * @returns {string} 调整后的难度
   */
  static adjustDifficulty(baseDifficulty, accuracy) {
    const difficulties = ['easy', 'medium', 'hard'];
    const currentIndex = difficulties.indexOf(baseDifficulty);
    
    if (accuracy >= 0.8 && currentIndex < difficulties.length - 1) {
      // 正确率高，提升难度
      return difficulties[currentIndex + 1];
    } else if (accuracy <= 0.4 && currentIndex > 0) {
      // 正确率低，降低难度
      return difficulties[currentIndex - 1];
    }
    
    return baseDifficulty;
  }

  /**
   * 根据艾宾浩斯遗忘曲线计算下次复习日期
   * @param {string} lastPracticed - 上次练习日期
   * @param {number} masteryLevel - 当前掌握度
   * @returns {string} 下次复习日期
   */
  static calculateNextReviewDate(lastPracticed, masteryLevel) {
    const lastDate = new Date(lastPracticed);
    
    // 艾宾浩斯遗忘曲线复习间隔（天）
    // 掌握度越低，复习间隔越短
    const intervals = {
      0: 1,    // 0-20%: 1 天后复习
      20: 2,   // 20-40%: 2 天后复习
      40: 4,   // 40-60%: 4 天后复习
      60: 7,   // 60-80%: 7 天后复习
      80: 14   // 80-100%: 14 天后复习
    };

    let interval = 7; // 默认 7 天
    for (const threshold of Object.keys(intervals).sort((a, b) => b - a)) {
      if (masteryLevel >= parseInt(threshold)) {
        interval = intervals[threshold];
        break;
      }
    }

    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + interval);
    return nextDate.toISOString().split('T')[0];
  }
}

module.exports = DynamicTaskGenerator;
