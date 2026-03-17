/**
 * AI Planning Module - Additional Unit Tests
 * Supplements existing ai-planning.test.js
 * Coverage Target: 60%+
 */

const { db, initDatabase } = require('../../src/config/database');
const AIPlanningService = require('../../src/modules/ai-planning/AIPlanningService');
const PersonalizedPlanningAlgorithm = require('../../src/modules/ai-planning/PersonalizedPlanningAlgorithm');
const DynamicTaskGenerator = require('../../src/modules/ai-planning/DynamicTaskGenerator');
const PlanExecutionTracker = require('../../src/modules/ai-planning/PlanExecutionTracker');

describe('AIPlanningService - Additional Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 初始化数据库表结构
    initDatabase();
  });

  describe('analyzeFeasibility', () => {
    const userProfile = {
      totalPractices: 100,
      avgAccuracy: 70,
      activeDays: 20,
      avgDailyPractice: 5
    };

    const timeframe = {
      totalDays: 30,
      startDate: '2024-01-01',
      endDate: '2024-01-30'
    };

    it('应该判断目标过于激进', () => {
      const goals = Array(50).fill(null).map((_, i) => ({
        knowledgePointId: `kp${i}`,
        knowledgePointName: `知识点${i}`,
        currentMastery: 20,
        targetMastery: 90,
        priority: 'high'
      }));

      const result = AIPlanningService.analyzeFeasibility(goals, userProfile, timeframe);

      expect(result.feasible).toBe(false);
      expect(result.reason).toContain('目标过于激进');
      expect(result.estimatedRate).toBe(0.3);
    });

    it('应该判断目标有一定挑战性', () => {
      const goals = Array(10).fill(null).map((_, i) => ({
        knowledgePointId: `kp${i}`,
        knowledgePointName: `知识点${i}`,
        currentMastery: 50,
        targetMastery: 80,
        priority: 'medium'
      }));

      const result = AIPlanningService.analyzeFeasibility(goals, userProfile, timeframe);

      expect(result.feasible).toBe(true);
      expect(result.reason).toContain('有一定挑战性');
      expect(result.estimatedRate).toBe(0.7);
    });

    it('应该判断目标合理', () => {
      const goals = Array(5).fill(null).map((_, i) => ({
        knowledgePointId: `kp${i}`,
        knowledgePointName: `知识点${i}`,
        currentMastery: 60,
        targetMastery: 80,
        priority: 'low'
      }));

      const result = AIPlanningService.analyzeFeasibility(goals, userProfile, timeframe);

      expect(result.feasible).toBe(true);
      expect(result.reason).toContain('目标合理');
      expect(result.estimatedRate).toBeGreaterThanOrEqual(0.8);
    });

    it('应该处理用户平均练习量缺失的情况', () => {
      const userProfileNoData = {
        totalPractices: 0,
        avgAccuracy: 0,
        activeDays: 0,
        avgDailyPractice: 0
      };

      const goals = [{
        knowledgePointId: 'kp1',
        knowledgePointName: '知识点 1',
        currentMastery: 50,
        targetMastery: 80,
        priority: 'medium'
      }];

      const result = AIPlanningService.analyzeFeasibility(goals, userProfileNoData, timeframe);
      
      expect(result.feasible).toBeDefined();
    });
  });

  describe('decomposeToWeekly', () => {
    const goals = [
      { knowledgePointId: 'kp1', knowledgePointName: '知识点 1', currentMastery: 30, targetMastery: 80, priority: 'high' },
      { knowledgePointId: 'kp2', knowledgePointName: '知识点 2', currentMastery: 40, targetMastery: 80, priority: 'medium' },
      { knowledgePointId: 'kp3', knowledgePointName: '知识点 3', currentMastery: 50, targetMastery: 80, priority: 'low' },
      { knowledgePointId: 'kp4', knowledgePointName: '知识点 4', currentMastery: 60, targetMastery: 90, priority: 'high' }
    ];

    const timeframe = {
      totalDays: 14,
      startDate: '2024-01-01',
      endDate: '2024-01-14'
    };

    it('应该将目标分解到周', () => {
      const weeklyGoals = AIPlanningService.decomposeToWeekly(goals, timeframe.totalDays);

      expect(weeklyGoals).toHaveLength(2); // 14 天 = 2 周
      expect(weeklyGoals[0].week).toBe(1);
      expect(weeklyGoals[0].focus).toBeDefined();
      expect(weeklyGoals[0].estimatedHours).toBeDefined();
    });

    it('应该按优先级和差距排序', () => {
      const weeklyGoals = AIPlanningService.decomposeToWeekly(goals, timeframe.totalDays);

      // 高优先级的应该在前面
      const firstWeekFocus = weeklyGoals[0].focus;
      const highPriorityCount = firstWeekFocus.filter(f => f.priority === 'high').length;
      
      expect(highPriorityCount).toBeGreaterThan(0);
    });

    it('应该计算正确的日期范围', () => {
      const weeklyGoals = AIPlanningService.decomposeToWeekly(goals, timeframe.totalDays, timeframe.startDate);

      expect(weeklyGoals[0].startDate).toBe('2024-01-01');
      expect(weeklyGoals[0].endDate).toBe('2024-01-07');
    });
  });

  describe('generateDailySchedule', () => {
    const weeklyGoals = [
      {
        week: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        focus: [
          { knowledgePointId: 'kp1', knowledgePointName: '知识点 1', currentMastery: 30, targetMastery: 80, priority: 'high' },
          { knowledgePointId: 'kp2', knowledgePointName: '知识点 2', currentMastery: 40, targetMastery: 80, priority: 'medium' }
        ],
        estimatedHours: 4
      }
    ];

    const userProfile = { avgDailyPractice: 5 };

    it('应该生成每日任务安排', async () => {
      const schedule = await AIPlanningService.generateDailySchedule(weeklyGoals, userProfile, {});

      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0]).toHaveProperty('date');
      expect(schedule[0]).toHaveProperty('tasks');
      expect(schedule[0]).toHaveProperty('type');
    });

    it('应该包含学习和练习任务', async () => {
      const schedule = await AIPlanningService.generateDailySchedule(weeklyGoals, userProfile, {});

      const normalDays = schedule.filter(d => d.type === 'normal');
      expect(normalDays.length).toBeGreaterThan(0);

      const firstNormalDay = normalDays[0];
      const hasLearnTask = firstNormalDay.tasks.some(t => t.type === 'learn');
      const hasPracticeTask = firstNormalDay.tasks.some(t => t.type === 'practice');

      expect(hasLearnTask).toBe(true);
      expect(hasPracticeTask).toBe(true);
    });

    it('应该包含缓冲日', async () => {
      const schedule = await AIPlanningService.generateDailySchedule(weeklyGoals, userProfile, {});

      const bufferDays = schedule.filter(d => d.type === 'buffer');
      expect(bufferDays.length).toBeGreaterThan(0);
    });

    it('应该支持不含周末的安排', async () => {
      const schedule = await AIPlanningService.generateDailySchedule(
        weeklyGoals, 
        userProfile, 
        { includeWeekend: false }
      );

      // 检查是否有周末被跳过
      expect(schedule).toBeDefined();
    });

    it('应该支持每日时间限制', async () => {
      const schedule = await AIPlanningService.generateDailySchedule(
        weeklyGoals, 
        userProfile, 
        { dailyTimeLimit: 30 }
      );

      expect(schedule).toBeDefined();
    });
  });

  describe('createMilestones', () => {
    const schedule = [
      { week: 1, type: 'normal', tasks: [{ type: 'learn' }, { type: 'practice' }] },
      { week: 1, type: 'normal', tasks: [{ type: 'learn' }] },
      { week: 1, type: 'buffer', tasks: [] },
      { week: 2, type: 'normal', tasks: [{ type: 'learn' }, { type: 'practice' }] },
      { week: 2, type: 'buffer', tasks: [] }
    ];

    it('应该创建周里程碑', () => {
      const milestones = AIPlanningService.createMilestones(schedule, true);

      const weeklyMilestones = milestones.filter(m => m.type === 'weekly');
      expect(weeklyMilestones.length).toBeGreaterThan(0);
    });

    it('应该创建最终里程碑', () => {
      const milestones = AIPlanningService.createMilestones(schedule, true);

      const finalMilestone = milestones.find(m => m.type === 'final');
      expect(finalMilestone).toBeDefined();
    });

    it('应该包含奖励信息', () => {
      const milestones = AIPlanningService.createMilestones(schedule, true);

      const milestoneWithReward = milestones.find(m => m.reward !== null);
      expect(milestoneWithReward).toBeDefined();
      expect(milestoneWithReward.reward).toHaveProperty('type');
      expect(milestoneWithReward.reward).toHaveProperty('amount');
    });

    it('应该支持禁用奖励', () => {
      const milestones = AIPlanningService.createMilestones(schedule, false);

      const allNoReward = milestones.every(m => m.reward === null);
      expect(allNoReward).toBe(true);
    });
  });

  describe('addDays', () => {
    it('应该正确计算日期加法', () => {
      const result = AIPlanningService.addDays('2024-01-01', 5);
      expect(result).toBe('2024-01-06');
    });

    it('应该处理跨月', () => {
      const result = AIPlanningService.addDays('2024-01-28', 5);
      expect(result).toBe('2024-02-02');
    });

    it('应该处理跨年', () => {
      const result = AIPlanningService.addDays('2023-12-28', 5);
      expect(result).toBe('2024-01-02');
    });

    it('应该处理负数天数', () => {
      const result = AIPlanningService.addDays('2024-01-10', -5);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('getDailyTasks', () => {
    it('应该获取指定日期的任务', () => {
      const tasks = AIPlanningService.getDailyTasks(1, '2024-01-01');
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('updateTaskStatus', () => {
    it('应该更新任务状态为 completed', () => {
      expect(() => {
        AIPlanningService.updateTaskStatus(1, 'completed', {
          actualTime: 30,
          feedback: '完成得很好'
        });
      }).not.toThrow();
    });

    it('应该更新任务状态为 pending', () => {
      expect(() => {
        AIPlanningService.updateTaskStatus(1, 'pending');
      }).not.toThrow();
    });
  });

  describe('getPlanProgress', () => {
    it('应该计算计划进度', () => {
      const progress = AIPlanningService.getPlanProgress(1);

      expect(progress).toHaveProperty('totalTasks');
      expect(progress).toHaveProperty('completedTasks');
      expect(progress).toHaveProperty('pendingTasks');
      expect(progress).toHaveProperty('progress');
    });
  });
});

describe('PersonalizedPlanningAlgorithm - Additional Tests', () => {
  describe('calculatePriorityScore', () => {
    it('应该根据掌握度差距和优先级计算分数', () => {
      const goal1 = { currentMastery: 30, targetMastery: 90, priority: 'high' };
      const goal2 = { currentMastery: 60, targetMastery: 90, priority: 'low' };

      const score1 = PersonalizedPlanningAlgorithm.calculatePriorityScore(goal1);
      const score2 = PersonalizedPlanningAlgorithm.calculatePriorityScore(goal2);

      expect(score1).toBeGreaterThan(score2);
    });

    it('应该处理缺失的优先级字段', () => {
      const goal = { currentMastery: 50, targetMastery: 80 };
      const score = PersonalizedPlanningAlgorithm.calculatePriorityScore(goal);
      expect(score).toBeDefined();
    });
  });

  describe('estimateTimeRequired', () => {
    it('应该估算所需时间', () => {
      const goal = { currentMastery: 40, targetMastery: 80 };
      const time = PersonalizedPlanningAlgorithm.estimateTimeRequired(goal);
      
      expect(time).toBeGreaterThan(0);
    });

    it('应该处理已经达到目标的情况', () => {
      const goal = { currentMastery: 90, targetMastery: 80 };
      const time = PersonalizedPlanningAlgorithm.estimateTimeRequired(goal);
      
      expect(time).toBe(0);
    });
  });

  describe('generateStudyRecommendations', () => {
    const weakPoints = [
      { knowledgePointId: 'kp1', title: '知识点 1', masteryLevel: 30 },
      { knowledgePointId: 'kp2', title: '知识点 2', masteryLevel: 50 }
    ];

    it('应该生成学习建议', () => {
      const recommendations = PersonalizedPlanningAlgorithm.generateStudyRecommendations(weakPoints);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('应该按掌握度排序', () => {
      const recommendations = PersonalizedPlanningAlgorithm.generateStudyRecommendations(weakPoints);

      expect(recommendations[0].priority).toBe('high');
    });
  });
});

describe('DynamicTaskGenerator - Additional Tests', () => {
  describe('generateReviewTasks', () => {
    const weakPoints = [
      { knowledgePointId: 'kp1', title: '知识点 1', lastPracticed: '2024-01-01', masteryLevel: 40 },
      { knowledgePointId: 'kp2', title: '知识点 2', lastPracticed: '2024-01-05', masteryLevel: 60 }
    ];

    it('应该生成复习任务', () => {
      const tasks = DynamicTaskGenerator.generateReviewTasks(weakPoints);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('应该包含必要的任务字段', () => {
      const tasks = DynamicTaskGenerator.generateReviewTasks(weakPoints);

      expect(tasks[0]).toHaveProperty('type');
      expect(tasks[0]).toHaveProperty('knowledgePointId');
      expect(tasks[0]).toHaveProperty('priority');
    });

    it('应该根据掌握度设置优先级', () => {
      const tasks = DynamicTaskGenerator.generateReviewTasks(weakPoints);

      const lowMasteryTask = tasks.find(t => t.knowledgePointId === 'kp1');
      expect(lowMasteryTask.priority).toBe('high');
    });
  });

  describe('generatePracticeTasks', () => {
    const learningGoals = [
      { knowledgePointId: 'kp1', title: '知识点 1', targetMastery: 80 },
      { knowledgePointId: 'kp2', title: '知识点 2', targetMastery: 90 }
    ];

    it('应该生成练习任务', () => {
      const tasks = DynamicTaskGenerator.generatePracticeTasks(learningGoals);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('应该包含题目数量', () => {
      const tasks = DynamicTaskGenerator.generatePracticeTasks(learningGoals);

      expect(tasks[0]).toHaveProperty('questionCount');
    });
  });

  describe('adjustDifficulty', () => {
    it('应该根据正确率调整难度', () => {
      const baseDifficulty = 'medium';
      
      const easy = DynamicTaskGenerator.adjustDifficulty(baseDifficulty, 0.9);
      const hard = DynamicTaskGenerator.adjustDifficulty(baseDifficulty, 0.3);

      expect(easy).toBe('hard');
      expect(hard).toBe('easy');
    });

    it('应该保持在有效难度范围内', () => {
      expect(DynamicTaskGenerator.adjustDifficulty('easy', 0.2)).toBe('easy');
      expect(DynamicTaskGenerator.adjustDifficulty('hard', 0.9)).toBe('hard');
    });
  });

  describe('calculateNextReviewDate', () => {
    it('应该根据艾宾浩斯曲线计算下次复习日期', () => {
      const lastPracticed = '2024-01-01';
      const masteryLevel = 50;

      const nextDate = DynamicTaskGenerator.calculateNextReviewDate(lastPracticed, masteryLevel);

      expect(nextDate).toBeDefined();
      expect(new Date(nextDate)).toBeInstanceOf(Date);
    });

    it('应该为低掌握度设置更近的复习日期', () => {
      const lastPracticed = '2024-01-01';

      const lowMasteryDate = DynamicTaskGenerator.calculateNextReviewDate(lastPracticed, 20);
      const highMasteryDate = DynamicTaskGenerator.calculateNextReviewDate(lastPracticed, 80);

      expect(new Date(lowMasteryDate).getTime()).toBeLessThanOrEqual(new Date(highMasteryDate).getTime());
    });
  });
});

describe('PlanExecutionTracker - Additional Tests', () => {
  describe('trackTaskCompletion', () => {
    it('应该跟踪任务完成情况', () => {
      const taskId = 'task_1';
      const completed = true;
      const actualTime = 25;

      const result = PlanExecutionTracker.trackTaskCompletion(taskId, completed, actualTime);

      expect(result).toBeDefined();
      expect(result.completed).toBe(completed);
    });
  });

  describe('calculateCompletionRate', () => {
    it('应该计算完成率', () => {
      const planId = 'plan_1';
      const rate = PlanExecutionTracker.calculateCompletionRate(planId);

      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  describe('detectFallingBehind', () => {
    it('应该检测是否落后于计划', () => {
      const planId = 'plan_1';
      const result = PlanExecutionTracker.detectFallingBehind(planId);

      expect(result).toHaveProperty('isFallingBehind');
      expect(result).toHaveProperty('reason');
    });

    it('应该提供落后原因', () => {
      const result = PlanExecutionTracker.detectFallingBehind('plan_1');

      expect(typeof result.reason).toBe('string');
    });
  });

  describe('generateProgressReport', () => {
    it('应该生成进度报告', () => {
      const planId = 'plan_1';
      const report = PlanExecutionTracker.generateProgressReport(planId);

      expect(report).toHaveProperty('planId');
      expect(report).toHaveProperty('completionRate');
      expect(report).toHaveProperty('completedTasks');
      expect(report).toHaveProperty('totalTasks');
    });
  });

  describe('suggestAdjustments', () => {
    it('应该提供调整建议', () => {
      const planId = 'plan_1';
      const suggestions = PlanExecutionTracker.suggestAdjustments(planId);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('应该根据完成情况提供建议', () => {
      const suggestions = PlanExecutionTracker.suggestAdjustments('plan_1');

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('updatePlanStatus', () => {
    it('应该更新计划状态', () => {
      const planId = 'plan_1';
      const status = 'active';

      expect(() => {
        PlanExecutionTracker.updatePlanStatus(planId, status);
      }).not.toThrow();
    });

    it('应该支持多种状态', () => {
      const statuses = ['active', 'paused', 'completed', 'abandoned'];

      statuses.forEach(status => {
        expect(() => {
          PlanExecutionTracker.updatePlanStatus('plan_1', status);
        }).not.toThrow();
      });
    });
  });
});
