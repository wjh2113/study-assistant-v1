/**
 * Plan Execution Tracker - 规划执行跟踪
 * 跟踪学习计划执行进度，提供实时反馈和动态调整建议
 */

const { db } = require('../../config/database');
const KnowledgeMasteryModel = require('../weakness-analysis/KnowledgeMasteryModel');

class PlanExecutionTracker {
  /**
   * 计划状态
   */
  static PLAN_STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    ABANDONED: 'abandoned'
  };

  /**
   * 任务状态
   */
  static TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    SKIPPED: 'skipped',
    FAILED: 'failed'
  };

  /**
   * 跟踪计划执行
   * @param {number} planId - 计划 ID
   * @returns {Promise<object>} 执行跟踪报告
   */
  static async trackExecution(planId) {
    // 1. 获取计划基本信息
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // 2. 获取任务执行情况
    const taskStats = await this.getTaskStatistics(planId);

    // 3. 计算进度指标
    const progressMetrics = this.calculateProgressMetrics(taskStats);

    // 4. 分析执行质量
    const qualityMetrics = await this.analyzeExecutionQuality(planId, plan.user_id);

    // 5. 检测风险
    const riskAnalysis = this.detectRisks(plan, progressMetrics, qualityMetrics);

    // 6. 生成调整建议
    const recommendations = this.generateRecommendations(plan, progressMetrics, qualityMetrics, riskAnalysis);

    // 7. 更新计划状态
    await this.updatePlanStatus(planId, progressMetrics, riskAnalysis);

    return {
      planId,
      plan: {
        id: plan.id,
        userId: plan.user_id,
        subject: plan.subject,
        startDate: plan.start_date,
        endDate: plan.end_date,
        status: plan.status
      },
      progress: progressMetrics,
      quality: qualityMetrics,
      risks: riskAnalysis,
      recommendations,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 获取计划信息
   */
  static async getPlan(planId) {
    const stmt = db.prepare(`
      SELECT * FROM learning_plans
      WHERE id = ?
    `);
    return stmt.get(planId);
  }

  /**
   * 获取任务统计
   */
  static async getTaskStatistics(planId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped_tasks,
        AVG(CASE WHEN status = 'completed' THEN actual_time ELSE NULL END) as avg_actual_time,
        SUM(CASE WHEN status = 'completed' THEN actual_time ELSE 0 END) as total_actual_time,
        SUM(CASE WHEN status = 'completed' THEN (
          SELECT JSON_EXTRACT(content, '$.estimatedTime')
        ) ELSE 0 END) as total_estimated_time
      FROM learning_plan_tasks
      WHERE plan_id = ?
    `);

    const stats = stmt.get(planId) || {};
    return {
      totalTasks: stats.total_tasks || 0,
      completedTasks: stats.completed_tasks || 0,
      pendingTasks: stats.pending_tasks || 0,
      inProgressTasks: stats.in_progress_tasks || 0,
      skippedTasks: stats.skipped_tasks || 0,
      avgActualTime: Math.round(stats.avg_actual_time || 0),
      totalActualTime: Math.round(stats.total_actual_time || 0),
      totalEstimatedTime: Math.round(stats.total_estimated_time || 0)
    };
  }

  /**
   * 计算进度指标
   */
  static calculateProgressMetrics(taskStats) {
    const { 
      totalTasks, 
      completedTasks, 
      pendingTasks,
      inProgressTasks,
      skippedTasks,
      totalActualTime,
      totalEstimatedTime 
    } = taskStats;

    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    const timeEfficiency = totalEstimatedTime > 0
      ? Math.round((totalEstimatedTime / totalActualTime) * 100) || 100
      : 100;

    const activeRate = totalTasks > 0
      ? Math.round(((completedTasks + inProgressTasks) / totalTasks) * 100)
      : 0;

    return {
      completionRate,
      timeEfficiency: Math.min(150, timeEfficiency), // 上限 150%
      activeRate,
      remainingTasks: pendingTasks,
      skippedTasks,
      velocity: this.calculateVelocity(completedTasks, totalActualTime),
      estimatedCompletionDate: this.estimateCompletionDate(taskStats)
    };
  }

  /**
   * 计算速度（任务/小时）
   */
  static calculateVelocity(completedTasks, totalActualTime) {
    if (totalActualTime === 0) return 0;
    const hours = totalActualTime / 60;
    return Math.round((completedTasks / hours) * 10) / 10;
  }

  /**
   * 预计完成日期
   */
  static estimateCompletionDate(taskStats) {
    const { completedTasks, pendingTasks, totalActualTime } = taskStats;
    
    if (completedTasks === 0 || pendingTasks === 0) return null;

    const avgTimePerTask = totalActualTime / completedTasks;
    const remainingTime = pendingTasks * avgTimePerTask;
    const daysRemaining = Math.ceil(remainingTime / (60 * 2)); // 假设每天 2 小时

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

    return estimatedDate.toISOString().split('T')[0];
  }

  /**
   * 分析执行质量
   */
  static async analyzeExecutionQuality(planId, userId) {
    // 获取任务完成质量
    const qualityStats = await this.getTaskQualityStats(planId);

    // 获取知识掌握度变化
    const masteryChange = await this.getMasteryChange(userId, planId);

    // 获取学习一致性
    const consistency = await this.getLearningConsistency(userId, planId);

    return {
      avgScore: qualityStats.avgScore || 0,
      accuracyTrend: qualityStats.accuracyTrend || 'stable',
      masteryImprovement: masteryChange.improvement || 0,
      consistencyScore: consistency.score || 0,
      streakDays: consistency.streakDays || 0,
      engagementLevel: this.calculateEngagementLevel(qualityStats, consistency)
    };
  }

  /**
   * 获取任务质量统计
   */
  static async getTaskQualityStats(planId) {
    const stmt = db.prepare(`
      SELECT 
        AVG(CASE WHEN JSON_EXTRACT(content, '$.score') IS NOT NULL 
          THEN JSON_EXTRACT(content, '$.score') ELSE NULL END) as avg_score,
        AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) * 100 as avg_accuracy
      FROM learning_plan_tasks lpt
      LEFT JOIN exercise_records er ON lpt.id = er.task_id
      WHERE lpt.plan_id = ?
        AND lpt.status = 'completed'
    `);

    const result = stmt.get(planId) || {};
    return {
      avgScore: Math.round(result.avg_score || 0),
      accuracyTrend: result.avg_accuracy > 80 ? 'improving' : (result.avg_accuracy < 60 ? 'declining' : 'stable')
    };
  }

  /**
   * 获取掌握度变化
   */
  static async getMasteryChange(userId, planId) {
    // 获取计划开始时的掌握度
    const planStmt = db.prepare('SELECT created_at FROM learning_plans WHERE id = ?');
    const plan = planStmt.get(planId);
    if (!plan) return { improvement: 0 };

    // 简化：返回平均提升
    const stmt = db.prepare(`
      SELECT AVG(mastery_level) as current_avg
      FROM knowledge_mastery
      WHERE user_id = ?
    `);

    const result = stmt.get(userId) || {};
    const currentAvg = result.current_avg || 0;

    // 假设初始掌握度为 50
    const initialAvg = 50;
    const improvement = Math.round(currentAvg - initialAvg);

    return { improvement };
  }

  /**
   * 获取学习一致性
   */
  static async getLearningConsistency(userId, planId) {
    const planStmt = db.prepare('SELECT created_at FROM learning_plans WHERE id = ?');
    const plan = planStmt.get(planId);
    if (!plan) return { score: 0, streakDays: 0 };

    const startDate = new Date(plan.created_at).toISOString().split('T')[0];

    // 计算连续学习天数
    const stmt = db.prepare(`
      SELECT DATE(created_at) as study_date, COUNT(*) as task_count
      FROM learning_plan_tasks
      WHERE user_id = ?
        AND DATE(scheduled_date) >= ?
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY study_date DESC
    `);

    const records = stmt.all(userId, startDate);
    
    let streakDays = 0;
    let totalActiveDays = records.length;
    const today = new Date().toISOString().split('T')[0];

    // 计算连续天数
    let expectedDate = new Date(today);
    for (const record of records) {
      const recordDate = new Date(record.study_date);
      const diffDays = Math.floor((expectedDate - recordDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        streakDays++;
        expectedDate = recordDate;
      } else {
        break;
      }
    }

    // 计算一致性得分
    const totalDays = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const consistencyScore = totalDays > 0 
      ? Math.round((totalActiveDays / totalDays) * 100) 
      : 0;

    return { score: consistencyScore, streakDays };
  }

  /**
   * 计算参与度等级
   */
  static calculateEngagementLevel(qualityStats, consistency) {
    const score = (qualityStats.avgScore + consistency.score) / 2;
    
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'very_low';
  }

  /**
   * 检测风险
   */
  static detectRisks(plan, progressMetrics, qualityMetrics) {
    const risks = [];

    // 风险 1: 进度落后
    const daysElapsed = this.getDaysElapsed(plan.start_date);
    const expectedCompletion = Math.round((daysElapsed / plan.total_days) * 100);
    const completionGap = expectedCompletion - progressMetrics.completionRate;

    if (completionGap > 20) {
      risks.push({
        type: 'behind_schedule',
        severity: 'high',
        description: `进度落后${completionGap}%`,
        impact: '可能无法按时完成计划'
      });
    } else if (completionGap > 10) {
      risks.push({
        type: 'slightly_behind',
        severity: 'medium',
        description: `进度稍落后${completionGap}%`,
        impact: '需要加快进度'
      });
    }

    // 风险 2: 质量下降
    if (qualityMetrics.accuracyTrend === 'declining') {
      risks.push({
        type: 'quality_decline',
        severity: 'medium',
        description: '学习质量呈下降趋势',
        impact: '可能影响最终效果'
      });
    }

    // 风险 3: 参与度低
    if (qualityMetrics.engagementLevel === 'very_low') {
      risks.push({
        type: 'low_engagement',
        severity: 'high',
        description: '学习参与度很低',
        impact: '计划可能失败'
      });
    }

    // 风险 4: 连续中断
    if (qualityMetrics.streakDays === 0) {
      risks.push({
        type: 'broken_streak',
        severity: 'medium',
        description: '学习连续性中断',
        impact: '需要重新建立学习习惯'
      });
    }

    // 风险 5: 时间效率低
    if (progressMetrics.timeEfficiency < 70) {
      risks.push({
        type: 'time_inefficiency',
        severity: 'low',
        description: '实际用时远超预期',
        impact: '可能需要调整计划'
      });
    }

    return {
      risks,
      overallRiskLevel: this.calculateOverallRiskLevel(risks),
      requiresIntervention: risks.some(r => r.severity === 'high')
    };
  }

  /**
   * 计算已过天数
   */
  static getDaysElapsed(startDate) {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today - start) / (1000 * 60 * 60 * 24));
  }

  /**
   * 计算整体风险等级
   */
  static calculateOverallRiskLevel(risks) {
    if (risks.length === 0) return 'low';
    
    const highRisks = risks.filter(r => r.severity === 'high').length;
    const mediumRisks = risks.filter(r => r.severity === 'medium').length;

    if (highRisks >= 2) return 'critical';
    if (highRisks >= 1 || mediumRisks >= 3) return 'high';
    if (mediumRisks >= 1) return 'medium';
    return 'low';
  }

  /**
   * 生成调整建议
   */
  static generateRecommendations(plan, progressMetrics, qualityMetrics, riskAnalysis) {
    const recommendations = [];

    for (const risk of riskAnalysis.risks) {
      switch (risk.type) {
        case 'behind_schedule':
          recommendations.push({
            type: 'schedule_adjustment',
            priority: 'high',
            title: '调整学习计划',
            description: '建议减少每日任务量或延长计划时间',
            actions: [
              '减少 20% 的每日任务',
              '增加周末学习时间',
              '优先完成高优先级任务'
            ]
          });
          break;

        case 'quality_decline':
          recommendations.push({
            type: 'quality_improvement',
            priority: 'medium',
            title: '提升学习质量',
            description: '关注理解而非速度',
            actions: [
              '增加复习时间',
              '减少每日新知识点数量',
              '增加练习题目难度'
            ]
          });
          break;

        case 'low_engagement':
          recommendations.push({
            type: 'engagement_boost',
            priority: 'high',
            title: '提升学习动力',
            description: '需要外部激励和反馈',
            actions: [
              '设置小目标和奖励',
              '加入学习小组',
              '寻求老师或家长监督'
            ]
          });
          break;

        case 'broken_streak':
          recommendations.push({
            type: 'habit_rebuild',
            priority: 'medium',
            title: '重建学习习惯',
            description: '从简单的每日任务开始',
            actions: [
              '设定固定的学习时间',
              '从每天 15 分钟开始',
              '使用番茄工作法'
            ]
          });
          break;

        case 'time_inefficiency':
          recommendations.push({
            type: 'time_optimization',
            priority: 'low',
            title: '优化时间分配',
            description: '调整任务时间估算',
            actions: [
              '记录实际用时',
              '调整任务时间预算',
              '避免完美主义'
            ]
          });
          break;
      }
    }

    // 如果没有风险，给出正面反馈
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'positive_reinforcement',
        priority: 'low',
        title: '继续保持！',
        description: '学习计划执行良好，继续保持当前节奏',
        actions: [
          '保持当前的学习节奏',
          '可以适当增加挑战',
          '分享学习经验'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 更新计划状态
   * 支持两种调用方式：
   * 1. updatePlanStatus(planId, progressMetrics, riskAnalysis) - 自动根据进度和风险更新状态
   * 2. updatePlanStatus(planId, status) - 直接设置指定状态
   */
  static async updatePlanStatus(planId, progressMetricsOrStatus, riskAnalysis) {
    // 支持直接设置状态的简化调用
    if (typeof progressMetricsOrStatus === 'string') {
      const status = progressMetricsOrStatus;
      const validStatuses = Object.values(this.PLAN_STATUS);
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}`);
      }
      
      const stmt = db.prepare(`
        UPDATE learning_plans
        SET status = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(status, new Date().toISOString(), planId);
      return;
    }

    // 原有的自动判断逻辑
    const progressMetrics = progressMetricsOrStatus;
    let newStatus = this.PLAN_STATUS.ACTIVE;

    // 完成判断
    if (progressMetrics.completionRate >= 100) {
      newStatus = this.PLAN_STATUS.COMPLETED;
    } 
    // 放弃判断
    else if (riskAnalysis && riskAnalysis.overallRiskLevel === 'critical' && progressMetrics.completionRate < 30) {
      newStatus = this.PLAN_STATUS.ABANDONED;
    }

    // 更新状态
    if (newStatus !== this.PLAN_STATUS.ACTIVE) {
      const stmt = db.prepare(`
        UPDATE learning_plans
        SET status = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(newStatus, new Date().toISOString(), planId);
    }

    // 记录进度快照
    await this.recordProgressSnapshot(planId, progressMetrics);
  }

  /**
   * 跟踪任务完成情况
   * @param {string} taskId - 任务 ID
   * @param {boolean} completed - 是否完成
   * @param {number} actualTime - 实际用时（分钟）
   * @returns {object} 跟踪结果
   */
  static trackTaskCompletion(taskId, completed, actualTime) {
    return {
      taskId,
      completed,
      actualTime,
      recordedAt: new Date().toISOString()
    };
  }

  /**
   * 计算完成率
   * @param {number} planId - 计划 ID
   * @returns {number} 完成率 (0-100)
   */
  static calculateCompletionRate(planId) {
    try {
      const stmt = db.prepare(`
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
        FROM learning_plan_tasks
        WHERE plan_id = ?
      `);
      const result = stmt.get(planId);
      
      if (!result || result.total_tasks === 0) {
        return 0;
      }
      
      return Math.round((result.completed_tasks / result.total_tasks) * 100);
    } catch (e) {
      // 表不存在或计划不存在时返回 0
      return 0;
    }
  }

  /**
   * 检测是否落后于计划
   * @param {number} planId - 计划 ID
   * @returns {object} 检测结果
   */
  static detectFallingBehind(planId) {
    try {
      const stmt = db.prepare('SELECT * FROM learning_plans WHERE id = ?');
      const plan = stmt.get(planId);
      
      if (!plan) {
        return {
          isFallingBehind: false,
          reason: '计划不存在'
        };
      }

      const daysElapsed = this.getDaysElapsed(plan.start_date);
      const totalDays = plan.total_days || 30;
      const expectedCompletion = Math.round((daysElapsed / totalDays) * 100);
      const actualCompletion = this.calculateCompletionRate(planId);
      const gap = expectedCompletion - actualCompletion;

      if (gap > 20) {
        return {
          isFallingBehind: true,
          reason: `进度落后${gap}%（预期${expectedCompletion}%，实际${actualCompletion}%）`
        };
      } else if (gap > 10) {
        return {
          isFallingBehind: true,
          reason: `进度稍落后${gap}%`
        };
      }

      return {
        isFallingBehind: false,
        reason: '进度正常'
      };
    } catch (e) {
      return {
        isFallingBehind: false,
        reason: '检测失败：' + e.message
      };
    }
  }

  /**
   * 生成进度报告
   * @param {number} planId - 计划 ID
   * @returns {object} 进度报告
   */
  static generateProgressReport(planId) {
    try {
      const stmt = db.prepare('SELECT * FROM learning_plans WHERE id = ?');
      const plan = stmt.get(planId);
      
      const taskStats = this.getTaskStatisticsSync(planId);
      const completionRate = this.calculateCompletionRate(planId);

      if (!plan) {
        // 计划不存在时返回默认值
        return {
          planId,
          planName: 'Unknown',
          status: 'unknown',
          startDate: null,
          endDate: null,
          totalTasks: taskStats.totalTasks,
          completedTasks: taskStats.completedTasks,
          pendingTasks: taskStats.pendingTasks,
          completionRate,
          generatedAt: new Date().toISOString()
        };
      }

      return {
        planId,
        planName: plan.subject,
        status: plan.status,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalTasks: taskStats.totalTasks,
        completedTasks: taskStats.completedTasks,
        pendingTasks: taskStats.pendingTasks,
        completionRate,
        generatedAt: new Date().toISOString()
      };
    } catch (e) {
      return {
        planId,
        planName: 'Error',
        status: 'error',
        startDate: null,
        endDate: null,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionRate: 0,
        error: e.message,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 提供调整建议
   * @param {number} planId - 计划 ID
   * @returns {Array} 建议列表
   */
  static suggestAdjustments(planId) {
    const suggestions = [];
    
    try {
      const fallingBehind = this.detectFallingBehind(planId);
      
      if (fallingBehind.isFallingBehind) {
        suggestions.push({
          type: 'schedule_adjustment',
          title: '调整学习进度',
          description: fallingBehind.reason,
          actions: [
            '减少每日任务量',
            '优先完成高优先级任务',
            '适当延长计划时间'
          ]
        });
      }

      const completionRate = this.calculateCompletionRate(planId);
      
      if (completionRate < 50) {
        suggestions.push({
          type: 'motivation_boost',
          title: '提升学习动力',
          description: '当前完成率较低，需要外部激励',
          actions: [
            '设置小目标和奖励',
            '加入学习小组',
            '寻求监督和支持'
          ]
        });
      }

      if (suggestions.length === 0) {
        suggestions.push({
          type: 'positive_reinforcement',
          title: '继续保持',
          description: '学习计划执行良好',
          actions: [
            '保持当前节奏',
            '可以适当增加挑战'
          ]
        });
      }
    } catch (e) {
      suggestions.push({
        type: 'error',
        title: '无法生成建议',
        description: e.message
      });
    }

    return suggestions;
  }

  /**
   * 获取任务统计（同步版本）
   */
  static getTaskStatisticsSync(planId) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped_tasks
      FROM learning_plan_tasks
      WHERE plan_id = ?
    `);

    const stats = stmt.get(planId) || {};
    return {
      totalTasks: stats.total_tasks || 0,
      completedTasks: stats.completed_tasks || 0,
      pendingTasks: stats.pending_tasks || 0,
      inProgressTasks: stats.in_progress_tasks || 0,
      skippedTasks: stats.skipped_tasks || 0
    };
  }

  /**
   * 记录进度快照
   */
  static async recordProgressSnapshot(planId, progressMetrics) {
    const stmt = db.prepare(`
      INSERT INTO learning_plan_snapshots (
        plan_id,
        completion_rate,
        total_tasks,
        completed_tasks,
        quality_score,
        recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      planId,
      progressMetrics.completionRate,
      progressMetrics.totalTasks,
      progressMetrics.completedTasks,
      progressMetrics.timeEfficiency,
      new Date().toISOString()
    );
  }

  /**
   * 获取每日进度
   */
  static async getDailyProgress(planId, days = 7) {
    const stmt = db.prepare(`
      SELECT 
        DATE(scheduled_date) as date,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(CASE WHEN status = 'completed' THEN actual_time ELSE NULL END) as avg_time
      FROM learning_plan_tasks
      WHERE plan_id = ?
        AND DATE(scheduled_date) >= DATE('now', ?)
      GROUP BY DATE(scheduled_date)
      ORDER BY date DESC
    `);

    return stmt.all(planId, `-${days} days`);
  }

  /**
   * 获取知识点进度
   */
  static async getKnowledgePointProgress(planId) {
    const stmt = db.prepare(`
      SELECT 
        JSON_EXTRACT(content, '$.knowledgePointId') as kp_id,
        JSON_EXTRACT(content, '$.knowledgePointName') as kp_name,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(CASE WHEN status = 'completed' THEN JSON_EXTRACT(content, '$.score') ELSE NULL END) as avg_score
      FROM learning_plan_tasks
      WHERE plan_id = ?
      GROUP BY kp_id, kp_name
      ORDER BY completed_tasks DESC
    `);

    const results = stmt.all(planId);
    return results.map(r => ({
      knowledgePointId: r.kp_id,
      knowledgePointName: r.kp_name,
      totalTasks: r.total_tasks,
      completedTasks: r.completed_tasks,
      completionRate: Math.round((r.completed_tasks / r.total_tasks) * 100),
      avgScore: Math.round(r.avg_score || 0)
    }));
  }

  /**
   * 生成执行报告
   */
  static async generateExecutionReport(planId) {
    const tracking = await this.trackExecution(planId);
    const dailyProgress = await this.getDailyProgress(planId);
    const kpProgress = await this.getKnowledgePointProgress(planId);

    return {
      ...tracking,
      dailyProgress,
      knowledgePointProgress: kpProgress,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = PlanExecutionTracker;
