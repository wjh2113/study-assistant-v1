/**
 * Personalized Planning Algorithm - 个性化学习规划算法
 * 基于用户画像、学习目标、时间约束生成个性化学习计划
 */

const { db } = require('../../config/database');
const KnowledgeMasteryModel = require('../weakness-analysis/KnowledgeMasteryModel');

class PersonalizedPlanningAlgorithm {
  /**
   * 学习风格枚举
   */
  static LEARNING_STYLES = {
    VISUAL: 'visual',        // 视觉型
    AUDITORY: 'auditory',    // 听觉型
    KINESTHETIC: 'kinesthetic', // 动觉型
    READING: 'reading'       // 读写型
  };

  /**
   * 难度级别
   */
  static DIFFICULTY_LEVELS = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
  };

  /**
   * 生成个性化学习计划
   * @param {number} userId - 用户 ID
   * @param {object} params - 计划参数
   * @returns {Promise<object>} 个性化计划
   */
  static async generatePersonalizedPlan(userId, params) {
    const {
      subject,
      timeframe,
      goals,
      preferences = {}
    } = params;

    // 1. 构建用户画像
    const userProfile = await this.buildUserProfile(userId, subject);

    // 2. 分析学习风格
    const learningStyle = this.analyzeLearningStyle(userProfile);

    // 3. 评估目标可行性
    const feasibility = this.evaluateFeasibility(goals, userProfile, timeframe, preferences);
    
    if (!feasibility.feasible) {
      return {
        success: false,
        reason: feasibility.reason,
        suggestion: feasibility.suggestion,
        adjustedPlan: feasibility.adjustedPlan
      };
    }

    // 4. 计算优先级权重
    const priorityWeights = this.calculatePriorityWeights(goals, userProfile);

    // 5. 生成个性化学习路径
    const learningPath = this.generateLearningPath(goals, priorityWeights, learningStyle);

    // 6. 分配时间资源
    const timeAllocation = this.allocateTimeResources(
      learningPath, 
      timeframe, 
      userProfile,
      preferences
    );

    // 7. 生成每日计划
    const dailySchedule = this.generateDailySchedule(
      timeAllocation, 
      learningStyle,
      preferences
    );

    // 8. 设置检查点和调整机制
    const checkpoints = this.createCheckpoints(dailySchedule, timeframe);

    return {
      success: true,
      plan: {
        userId,
        subject,
        timeframe,
        goals,
        userProfile,
        learningStyle,
        learningPath,
        dailySchedule,
        checkpoints,
        estimatedCompletionRate: feasibility.estimatedRate,
        confidenceScore: this.calculateConfidenceScore(userProfile, feasibility),
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * 构建用户画像
   */
  static async buildUserProfile(userId, subject) {
    // 获取历史学习数据
    const learningStats = await this.getLearningStatistics(userId, subject);
    
    // 获取知识掌握度分布
    const masteryDistribution = await this.getMasteryDistribution(userId, subject);
    
    // 获取学习习惯
    const learningHabits = await this.getLearningHabits(userId);

    // 获取历史计划完成情况
    const planHistory = await this.getPlanHistory(userId);

    return {
      totalPractices: learningStats.totalPractices,
      avgAccuracy: learningStats.avgAccuracy,
      activeDays: learningStats.activeDays,
      avgDailyPractice: learningStats.avgDailyPractice,
      avgSessionDuration: learningStats.avgSessionDuration,
      preferredStudyTime: learningHabits.preferredStudyTime,
      avgFocusDuration: learningHabits.avgFocusDuration,
      consistencyScore: this.calculateConsistencyScore(learningHabits),
      masteryDistribution,
      planCompletionRate: planHistory.completionRate,
      avgPlanProgress: planHistory.avgProgress
    };
  }

  /**
   * 获取学习统计数据
   */
  static async getLearningStatistics(userId, subject) {
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
    const stats = stmt.get(...params) || {};

    const activeDays = stats.active_days || 1;
    const totalPractices = stats.total_practices || 0;

    return {
      totalPractices,
      avgAccuracy: parseFloat(stats.avg_accuracy) || 0,
      activeDays,
      avgDailyPractice: Math.round(totalPractices / activeDays),
      avgSessionDuration: 25 // 默认值
    };
  }

  /**
   * 获取知识掌握度分布
   */
  static async getMasteryDistribution(userId, subject) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN mastery_level >= 80 THEN 1 ELSE 0 END) as excellent,
        SUM(CASE WHEN mastery_level >= 60 AND mastery_level < 80 THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN mastery_level >= 40 AND mastery_level < 60 THEN 1 ELSE 0 END) as fair,
        SUM(CASE WHEN mastery_level < 40 THEN 1 ELSE 0 END) as needs_improvement,
        AVG(mastery_level) as avg_mastery
      FROM knowledge_mastery
      WHERE user_id = ?
    `);

    const result = stmt.get(userId) || {};
    return {
      total: result.total || 0,
      excellent: result.excellent || 0,
      good: result.good || 0,
      fair: result.fair || 0,
      needsImprovement: result.needs_improvement || 0,
      avgMastery: parseFloat(result.avg_mastery) || 0
    };
  }

  /**
   * 获取学习习惯
   */
  static async getLearningHabits(userId) {
    const stmt = db.prepare(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as count
      FROM exercise_records
      WHERE user_id = ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `);

    const result = stmt.get(userId);
    const preferredHour = result ? parseInt(result.hour) : 20; // 默认晚上 8 点

    // 计算专注时长
    const focusStmt = db.prepare(`
      SELECT AVG(duration) as avg_duration
      FROM study_sessions
      WHERE user_id = ?
    `);

    const focusResult = focusStmt.get(userId);

    return {
      preferredStudyTime: this.getPreferredTimeSlot(preferredHour),
      preferredHour,
      avgFocusDuration: Math.round(focusResult?.avg_duration || 25)
    };
  }

  /**
   * 获取时间段
   */
  static getPreferredTimeSlot(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * 计算一致性得分
   */
  static calculateConsistencyScore(learningHabits) {
    // 基于学习时间的规律性计算一致性得分
    const hourVariance = 2; // 简化：假设方差为 2 小时
    const score = Math.max(0, 100 - hourVariance * 10);
    return Math.round(score);
  }

  /**
   * 获取历史计划完成情况
   */
  static async getPlanHistory(userId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_plans,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as completion_rate
      FROM learning_plans
      WHERE user_id = ?
    `);

    const result = stmt.get(userId) || {};
    return {
      totalPlans: result.total_plans || 0,
      avgProgress: 50, // 默认值
      completionRate: parseFloat(result.completion_rate) || 0
    };
  }

  /**
   * 分析学习风格
   */
  static analyzeLearningStyle(userProfile) {
    // 基于用户行为推断学习风格
    const { avgAccuracy, avgSessionDuration, avgDailyPractice } = userProfile;

    // 简单启发式规则
    if (avgSessionDuration > 40) {
      return this.LEARNING_STYLES.READING; // 长时间学习可能是读写型
    } else if (avgDailyPractice > 20) {
      return this.LEARNING_STYLES.KINESTHETIC; // 大量练习可能是动觉型
    } else if (avgAccuracy > 80) {
      return this.LEARNING_STYLES.VISUAL; // 高准确率可能是视觉型
    }
    
    return this.LEARNING_STYLES.AUDITORY; // 默认听觉型
  }

  /**
   * 评估目标可行性
   */
  static evaluateFeasibility(goals, userProfile, timeframe, preferences = {}) {
    const totalDays = timeframe.totalDays;
    const totalKnowledgePoints = goals.length;

    // 计算每个知识点需要的练习次数
    const practicesNeeded = goals.reduce((sum, goal) => {
      const gap = goal.targetMastery - (goal.currentMastery || 0);
      const difficulty = goal.difficulty || 'medium';
      const difficultyMultiplier = difficulty === 'hard' ? 3 : (difficulty === 'easy' ? 1.5 : 2);
      return sum + Math.ceil(Math.max(0, gap) * difficultyMultiplier);
    }, 0);

    // 计算每日需要练习量
    const dailyPracticeNeeded = Math.ceil(practicesNeeded / totalDays);

    // 用户历史平均每日练习量
    const userAvgDailyPractice = userProfile.avgDailyPractice || 5;

    // 计算用户计划完成率调整因子
    const completionFactor = userProfile.planCompletionRate > 0 
      ? userProfile.planCompletionRate / 100 
      : 0.8;

    // 调整后的用户能力（基于历史）
    const adjustedUserCapacity = userAvgDailyPractice * completionFactor;

    // 考虑用户每日时间限制（从 preferences 获取）
    const dailyTimeLimit = preferences.dailyTimeLimit || 60;
    // 假设每个练习平均需要 5 分钟，计算基于时间的容量
    const timeBasedCapacity = Math.floor(dailyTimeLimit / 5);

    // 使用历史容量和时间容量的较大值（用户可能有意愿投入更多时间）
    const effectiveCapacity = Math.max(adjustedUserCapacity, timeBasedCapacity);

    // 判断可行性
    if (dailyPracticeNeeded > effectiveCapacity * 2.5) {
      const suggestedDays = Math.ceil(practicesNeeded / (effectiveCapacity * 1.5));
      return {
        feasible: false,
        reason: '目标过于激进，超出用户能力范围',
        suggestion: `建议将时间延长至${suggestedDays}天，或减少目标知识点数量`,
        estimatedRate: 0.3,
        adjustedPlan: {
          suggestedTimeframe: { ...timeframe, totalDays: suggestedDays },
          reducedGoals: goals.slice(0, Math.floor(goals.length * 0.6))
        }
      };
    }

    if (dailyPracticeNeeded > effectiveCapacity * 1.5) {
      return {
        feasible: true,
        reason: '目标有一定挑战性',
        suggestion: '建议保持稳定的学习节奏，不要中途放弃',
        estimatedRate: 0.7 * completionFactor
      };
    }

    return {
      feasible: true,
      reason: '目标合理',
      estimatedRate: Math.min(0.95, 0.8 + (effectiveCapacity / dailyPracticeNeeded) * 0.2)
    };
  }

  /**
   * 计算优先级权重
   */
  static calculatePriorityWeights(goals, userProfile) {
    return goals.map(goal => {
      const gap = goal.targetMastery - (goal.currentMastery || 0);
      const priorityWeight = goal.priority === 'high' ? 3 : (goal.priority === 'medium' ? 2 : 1);
      const urgencyWeight = goal.deadline ? 1.5 : 1;
      
      // 考虑用户当前掌握度
      const currentMastery = goal.currentMastery || 0;
      const foundationWeight = currentMastery < 30 ? 1.3 : 1; // 基础薄弱优先

      return {
        ...goal,
        weight: gap * priorityWeight * urgencyWeight * foundationWeight
      };
    }).sort((a, b) => b.weight - a.weight);
  }

  /**
   * 生成学习路径
   */
  static generateLearningPath(weightedGoals, learningStyle) {
    const path = [];
    const remainingGoals = [...weightedGoals];

    // 根据学习风格调整路径生成策略
    let batchSize = learningStyle === this.LEARNING_STYLES.KINESTHETIC ? 2 : 3;

    while (remainingGoals.length > 0) {
      const batch = remainingGoals.splice(0, batchSize);
      
      path.push({
        stage: path.length + 1,
        goals: batch.map(g => ({
          knowledgePointId: g.knowledgePointId,
          knowledgePointName: g.knowledgePointName,
          targetMastery: g.targetMastery,
          weight: g.weight
        })),
        estimatedDuration: batch.length * 2 // 每个知识点 2 天
      });

      // 动觉型学习者批次更小但更频繁
      if (learningStyle === this.LEARNING_STYLES.KINESTHETIC) {
        batchSize = 2;
      }
    }

    return path;
  }

  /**
   * 分配时间资源
   */
  static allocateTimeResources(learningPath, timeframe, userProfile, preferences) {
    const { dailyTimeLimit = 60, includeWeekend = true } = preferences;
    const totalDays = timeframe.totalDays;
    
    // 计算每个阶段的时间分配
    const totalWeight = learningPath.reduce((sum, stage) => 
      sum + stage.goals.reduce((s, g) => s + g.weight, 0), 0
    );

    return learningPath.map(stage => {
      const stageWeight = stage.goals.reduce((sum, g) => sum + g.weight, 0);
      const stageDays = Math.max(
        stage.estimatedDuration,
        Math.floor((stageWeight / totalWeight) * totalDays)
      );

      return {
        ...stage,
        allocatedDays: stageDays,
        dailyTimeBudget: dailyTimeLimit,
        includeWeekend,
        bufferDays: Math.ceil(stageDays * 0.15) // 15% 缓冲时间
      };
    });
  }

  /**
   * 生成每日计划
   */
  static generateDailySchedule(timeAllocation, learningStyle, preferences) {
    const schedule = [];
    let currentDate = new Date();

    for (const stage of timeAllocation) {
      const { allocatedDays, bufferDays, goals } = stage;
      const studyDays = allocatedDays - bufferDays;
      const goalsPerDay = Math.ceil(goals.length / studyDays);

      for (let day = 0; day < allocatedDays; day++) {
        const isBufferDay = day >= studyDays;
        const dayGoals = isBufferDay ? [] : goals.slice(
          Math.floor(day * goalsPerDay),
          Math.floor((day + 1) * goalsPerDay)
        );

        const tasks = dayGoals.map(goal => this.createTask(goal, learningStyle));

        schedule.push({
          date: this.formatDate(currentDate),
          stage: stage.stage,
          type: isBufferDay ? 'buffer' : 'study',
          tasks,
          totalEstimatedTime: tasks.reduce((sum, t) => sum + t.estimatedTime, 0),
          status: 'pending'
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return schedule;
  }

  /**
   * 创建任务
   */
  static createTask(goal, learningStyle) {
    const baseTime = 25;
    
    // 根据学习风格调整任务类型
    let taskType = 'practice';
    let additionalContent = null;

    switch (learningStyle) {
      case this.LEARNING_STYLES.VISUAL:
        additionalContent = { video: true, diagram: true };
        break;
      case this.LEARNING_STYLES.AUDITORY:
        additionalContent = { audio: true, explanation: true };
        break;
      case this.LEARNING_STYLES.KINESTHETIC:
        taskType = 'interactive';
        additionalContent = { handsOn: true };
        break;
      case this.LEARNING_STYLES.READING:
        additionalContent = { reading: true, notes: true };
        break;
    }

    return {
      type: taskType,
      knowledgePointId: goal.knowledgePointId,
      knowledgePointName: goal.knowledgePointName,
      title: `${taskType === 'interactive' ? '互动练习' : '学习'}：${goal.knowledgePointName}`,
      estimatedTime: baseTime,
      additionalContent,
      status: 'pending'
    };
  }

  /**
   * 创建检查点
   */
  static createCheckpoints(schedule, timeframe) {
    const checkpoints = [];
    const totalDays = schedule.length;
    
    // 每周设置一个检查点
    const checkInterval = 7;
    
    for (let i = checkInterval; i < totalDays; i += checkInterval) {
      checkpoints.push({
        day: i,
        date: schedule[i]?.date,
        type: 'weekly_review',
        tasks: [
          { type: 'review', title: '本周学习回顾', estimatedTime: 30 },
          { type: 'assessment', title: '阶段性测试', estimatedTime: 45 },
          { type: 'adjustment', title: '计划调整', estimatedTime: 15 }
        ]
      });
    }

    // 最终检查点
    checkpoints.push({
      day: totalDays - 1,
      date: schedule[totalDays - 1]?.date,
      type: 'final_review',
      tasks: [
        { type: 'comprehensive_assessment', title: '综合测试', estimatedTime: 90 },
        { type: 'summary', title: '学习总结', estimatedTime: 30 }
      ]
    });

    return checkpoints;
  }

  /**
   * 计算信心得分
   */
  static calculateConfidenceScore(userProfile, feasibility) {
    const factors = [
      userProfile.planCompletionRate / 100 * 0.3,
      userProfile.consistencyScore / 100 * 0.2,
      feasibility.estimatedRate * 0.5
    ];

    const score = factors.reduce((sum, f) => sum + f, 0) * 100;
    return Math.round(score);
  }

  /**
   * 格式化日期
   */
  static formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * 计算优先级分数
   * @param {object} goal - 学习目标
   * @returns {number} 优先级分数
   */
  static calculatePriorityScore(goal) {
    const gap = (goal.targetMastery || 80) - (goal.currentMastery || 0);
    const priorityWeight = goal.priority === 'high' ? 3 : (goal.priority === 'medium' ? 2 : 1);
    return gap * priorityWeight;
  }

  /**
   * 估算所需时间（分钟）
   * @param {object} goal - 学习目标
   * @returns {number} 所需时间（分钟）
   */
  static estimateTimeRequired(goal) {
    const gap = (goal.targetMastery || 80) - (goal.currentMastery || 0);
    if (gap <= 0) return 0;
    // 每提升 1% 掌握度约需 5 分钟
    return Math.round(gap * 5);
  }

  /**
   * 生成学习建议
   * @param {Array} weakPoints - 薄弱知识点列表
   * @returns {Array} 学习建议列表
   */
  static generateStudyRecommendations(weakPoints) {
    if (!weakPoints || weakPoints.length === 0) {
      return [];
    }

    // 按掌握度排序（掌握度低的优先级高）
    const sorted = [...weakPoints].sort((a, b) => 
      (a.masteryLevel || 0) - (b.masteryLevel || 0)
    );

    return sorted.map((point, index) => ({
      knowledgePointId: point.knowledgePointId,
      title: point.title,
      masteryLevel: point.masteryLevel,
      priority: index === 0 ? 'high' : (index < 3 ? 'medium' : 'low'),
      recommendation: `建议优先复习${point.title}，当前掌握度${point.masteryLevel || 0}%`,
      estimatedTime: this.estimateTimeRequired({ currentMastery: point.masteryLevel, targetMastery: 80 })
    }));
  }
}

module.exports = PersonalizedPlanningAlgorithm;
