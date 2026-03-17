/**
 * AI Planning Service - AI 学习规划服务
 * ISSUE-P2-AI-003: AI 学习规划
 */

const { db } = require('../../config/database');
const AiGatewayService = require('../ai-gateway/AiGatewayService');
const KnowledgeMasteryModel = require('../weakness-analysis/KnowledgeMasteryModel');

class AIPlanningService {
  /**
   * 生成学习计划
   * @param {number} userId - 用户 ID
   * @param {object} params - 计划参数
   * @returns {Promise<object>} 生成的计划
   */
  static async generatePlan(userId, params) {
    const {
      subject,
      timeframe,
      goals,
      options = {}
    } = params;

    // 1. 获取用户当前状态
    const userProfile = await this.getUserProfile(userId, subject);
    
    // 2. 分析薄弱点
    const weakPoints = await this.getWeakPoints(userId, subject);
    
    // 3. 分析目标可行性
    const feasibility = this.analyzeFeasibility(goals, userProfile, timeframe);
    if (!feasibility.feasible) {
      return {
        success: false,
        reason: feasibility.reason,
        suggestion: feasibility.suggestion
      };
    }

    // 4. 分解目标到周
    const weeklyGoals = this.decomposeToWeekly(goals, timeframe.totalDays);

    // 5. 生成每日任务
    const schedule = await this.generateDailySchedule(weeklyGoals, userProfile, options);

    // 6. 设置里程碑和奖励
    const milestones = this.createMilestones(schedule, options.rewards);

    // 7. 保存计划
    const planId = this.savePlan(userId, {
      subject,
      timeframe,
      goals,
      weeklyGoals,
      schedule,
      milestones,
      options
    });

    return {
      success: true,
      planId,
      plan: {
        planId,
        userId,
        subject,
        timeframe,
        weeklyGoals,
        schedule,
        milestones,
        estimatedCompletionRate: feasibility.estimatedRate,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * 获取用户画像
   */
  static async getUserProfile(userId, subject) {
    // 获取历史学习数据
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_practices,
        AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) * 100 as avg_accuracy,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM exercise_records
      WHERE user_id = ?
      ${subject ? 'AND subject = ?' : ''}
    `);

    const params = subject ? [userId, subject] : [userId];
    const stats = stmt.get(...params);

    // 计算平均每日练习量
    const avgDailyPractice = stats.active_days > 0 
      ? stats.total_practices / stats.active_days 
      : 5; // 默认值

    return {
      totalPractices: stats.total_practices || 0,
      avgAccuracy: parseFloat(stats.avg_accuracy) || 0,
      activeDays: stats.active_days || 0,
      avgDailyPractice: Math.round(avgDailyPractice)
    };
  }

  /**
   * 获取薄弱点
   */
  static async getWeakPoints(userId, subject, limit = 10) {
    return KnowledgeMasteryModel.getWeakPoints(userId, {
      subject,
      limit
    });
  }

  /**
   * 分析目标可行性
   */
  static analyzeFeasibility(goals, userProfile, timeframe) {
    const totalDays = timeframe.totalDays;
    const totalKnowledgePoints = goals.length;

    // 计算每个知识点需要的练习次数
    const practicesNeeded = goals.reduce((sum, goal) => {
      const gap = goal.targetMastery - (goal.currentMastery || 0);
      // 每提升 1% 掌握度需要约 1 次练习
      return sum + Math.ceil(Math.max(0, gap) * 1);
    }, 0);

    // 计算每日需要练习量
    const dailyPracticeNeeded = Math.ceil(practicesNeeded / totalDays);

    // 用户历史平均每日练习量
    const userAvgDailyPractice = userProfile.avgDailyPractice || 5;

    // 判断可行性
    if (dailyPracticeNeeded > userAvgDailyPractice * 4) {
      return {
        feasible: false,
        reason: '目标过于激进，超出用户能力范围',
        suggestion: `建议将时间延长至${Math.ceil(practicesNeeded / userAvgDailyPractice)}天，或减少目标知识点数量`,
        estimatedRate: 0.3
      };
    }

    if (dailyPracticeNeeded >= userAvgDailyPractice * 2) {
      return {
        feasible: true,
        reason: '目标有一定挑战性',
        suggestion: '建议保持稳定的学习节奏，不要中途放弃',
        estimatedRate: 0.7
      };
    }

    return {
      feasible: true,
      reason: '目标合理',
      estimatedRate: Math.min(0.95, 0.8 + (userAvgDailyPractice / dailyPracticeNeeded) * 0.2)
    };
  }

  /**
   * 分解目标到周
   */
  static decomposeToWeekly(goals, totalDaysOrTimeframe, startDate) {
    // 支持两种调用方式：
    // 1. decomposeToWeekly(goals, timeframe) - timeframe 包含 totalDays 和 startDate
    // 2. decomposeToWeekly(goals, totalDays, startDate)
    let totalDays, start;
    if (typeof totalDaysOrTimeframe === 'object') {
      totalDays = totalDaysOrTimeframe.totalDays;
      start = totalDaysOrTimeframe.startDate;
    } else {
      totalDays = totalDaysOrTimeframe;
      start = startDate || new Date().toISOString().split('T')[0];
    }

    const totalWeeks = Math.ceil(totalDays / 7);
    
    // 按优先级和掌握度差距排序
    const sortedGoals = [...goals].sort((a, b) => {
      const priorityScore = (g) => {
        const gap = g.targetMastery - (g.currentMastery || 0);
        const priorityWeight = g.priority === 'high' ? 2 : (g.priority === 'medium' ? 1.5 : 1);
        return gap * priorityWeight;
      };
      return priorityScore(b) - priorityScore(a);
    });

    // 分配到各周
    const weeklyGoals = [];
    const goalsPerWeek = Math.ceil(sortedGoals.length / totalWeeks);

    for (let week = 0; week < totalWeeks; week++) {
      const weekGoals = sortedGoals.slice(week * goalsPerWeek, (week + 1) * goalsPerWeek);
      
      weeklyGoals.push({
        week: week + 1,
        startDate: this.addDays(start, week * 7),
        endDate: this.addDays(start, (week + 1) * 7 - 1),
        focus: weekGoals.map(g => ({
          knowledgePointId: g.knowledgePointId,
          knowledgePointName: g.knowledgePointName,
          currentMastery: g.currentMastery || 0,
          targetMastery: g.targetMastery,
          priority: g.priority
        })),
        estimatedHours: weekGoals.length * 2 // 每个知识点约 2 小时
      });
    }

    return weeklyGoals;
  }

  /**
   * 生成每日任务安排
   */
  static async generateDailySchedule(weeklyGoals, userProfile, options) {
    const { dailyTimeLimit = 60, includeWeekend = true } = options;
    const schedule = [];

    let currentDate = weeklyGoals[0]?.startDate || new Date().toISOString().split('T')[0];

    for (const week of weeklyGoals) {
      for (let day = 0; day < 7; day++) {
        // 周末处理
        if (!includeWeekend && (day === 5 || day === 6)) {
          currentDate = this.addDays(currentDate, 1);
          continue;
        }

        // 每周第 7 天设为缓冲日
        if (day === 6) {
          schedule.push({
            date: currentDate,
            week: week.week,
            type: 'buffer',
            tasks: [],
            note: '缓冲日 - 用于补上未完成的任务或休息'
          });
          currentDate = this.addDays(currentDate, 1);
          continue;
        }

        // 生成当日任务
        const dayGoals = week.focus.slice(day * 2, (day + 1) * 2);
        const tasks = [];

        for (const goal of dayGoals) {
          // 学习任务
          tasks.push({
            type: 'learn',
            knowledgePointId: goal.knowledgePointId,
            knowledgePointName: goal.knowledgePointName,
            title: `学习：${goal.knowledgePointName}`,
            estimatedTime: 25,
            status: 'pending'
          });

          // 练习任务
          tasks.push({
            type: 'practice',
            knowledgePointId: goal.knowledgePointId,
            knowledgePointName: goal.knowledgePointName,
            title: `练习：${goal.knowledgePointName}相关题目`,
            questionCount: 5,
            estimatedTime: 25,
            status: 'pending'
          });
        }

        const totalEstimatedTime = tasks.reduce((sum, t) => sum + t.estimatedTime, 0);

        schedule.push({
          date: currentDate,
          week: week.week,
          type: 'normal',
          tasks,
          totalEstimatedTime,
          status: 'pending'
        });

        currentDate = this.addDays(currentDate, 1);
      }
    }

    return schedule;
  }

  /**
   * 创建里程碑
   */
  static createMilestones(schedule, rewardsEnabled = true) {
    const milestones = [];
    const weekTasks = {};

    // 按周分组任务
    schedule.forEach(day => {
      if (!weekTasks[day.week]) {
        weekTasks[day.week] = 0;
      }
      if (day.type === 'normal') {
        weekTasks[day.week] += day.tasks.length;
      }
    });

    // 创建周里程碑
    Object.entries(weekTasks).forEach(([week, taskCount]) => {
      milestones.push({
        id: `milestone_week_${week}`,
        type: 'weekly',
        week: parseInt(week),
        target: `完成第${week}周学习`,
        criteria: {
          completedTasks: taskCount
        },
        reward: rewardsEnabled ? {
          type: 'points',
          amount: 50 * parseInt(week),
          description: `积分 +${50 * parseInt(week)}`
        } : null
      });
    });

    // 创建最终里程碑
    const totalWeeks = Math.max(...Object.keys(weekTasks).map(Number));
    milestones.push({
      id: 'milestone_final',
      type: 'final',
      week: totalWeeks,
      target: '完成整个学习计划',
      criteria: {
        completedTasks: Object.values(weekTasks).reduce((a, b) => a + b, 0)
      },
      reward: rewardsEnabled ? {
        type: 'points',
        amount: 500,
        description: '积分 +500，获得"学习达人"勋章'
      } : null
    });

    return milestones;
  }

  /**
   * 保存计划到数据库
   */
  static savePlan(userId, planData) {
    const stmt = db.prepare(`
      INSERT INTO learning_plans (
        user_id,
        subject,
        timeframe,
        goals,
        weekly_goals,
        schedule,
        milestones,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const result = stmt.run(
      userId,
      planData.subject,
      JSON.stringify(planData.timeframe),
      JSON.stringify(planData.goals),
      JSON.stringify(planData.weeklyGoals),
      JSON.stringify(planData.schedule),
      JSON.stringify(planData.milestones)
    );

    // 保存每日任务
    const taskStmt = db.prepare(`
      INSERT INTO learning_plan_tasks (
        plan_id,
        task_type,
        content,
        scheduled_date,
        status
      ) VALUES (?, ?, ?, ?, 'pending')
    `);

    planData.schedule.forEach((day, index) => {
      if (day.type === 'normal') {
        day.tasks.forEach(task => {
          taskStmt.run(
            result.lastInsertRowid,
            task.type,
            JSON.stringify(task),
            day.date
          );
        });
      }
    });

    return result.lastInsertRowid;
  }

  /**
   * 获取每日任务
   */
  static getDailyTasks(planId, date) {
    const stmt = db.prepare(`
      SELECT * FROM learning_plan_tasks
      WHERE plan_id = ? AND scheduled_date = ?
      ORDER BY id
    `);

    return stmt.all(planId, date).map(task => {
      try {
        if (task.content) task.content = JSON.parse(task.content);
      } catch (e) {}
      return task;
    });
  }

  /**
   * 更新任务状态
   */
  static updateTaskStatus(taskId, status, data = {}) {
    const updates = ['status = ?', 'completed_at = ?'];
    const values = [status, status === 'completed' ? new Date().toISOString() : null];

    if (data.actualTime) {
      updates.push('actual_time = ?');
      values.push(data.actualTime);
    }

    if (data.feedback) {
      updates.push('feedback = ?');
      values.push(data.feedback);
    }

    values.push(taskId);

    const stmt = db.prepare(`
      UPDATE learning_plan_tasks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * 获取计划进度
   */
  static getPlanProgress(planId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
      FROM learning_plan_tasks
      WHERE plan_id = ?
    `);

    const stats = stmt.get(planId);
    const progress = stats.total_tasks > 0 
      ? (stats.completed_tasks / stats.total_tasks * 100).toFixed(1)
      : 0;

    return {
      totalTasks: stats.total_tasks,
      completedTasks: stats.completed_tasks,
      pendingTasks: stats.pending_tasks,
      progress: parseFloat(progress)
    };
  }

  /**
   * 辅助函数：日期加法
   */
  static addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

module.exports = AIPlanningService;
