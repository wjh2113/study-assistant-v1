/**
 * AI Planning Service Tests
 * 测试个性化学习规划算法、动态任务生成、规划执行跟踪
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { db, initDatabase, closeDatabase } = require('../src/config/database');
const PersonalizedPlanningAlgorithm = require('../src/modules/ai-planning/PersonalizedPlanningAlgorithm');
const DynamicTaskGenerator = require('../src/modules/ai-planning/DynamicTaskGenerator');
const PlanExecutionTracker = require('../src/modules/ai-planning/PlanExecutionTracker');
const AIPlanningService = require('../src/modules/ai-planning/AIPlanningService');

describe('AI Planning Service', () => {
  let testUserId;

  beforeEach(async () => {
    // 初始化测试数据库
    initDatabase();
    
    // 创建测试用户（id 需要是字符串）
    const testUserIdStr = `user_test_planning_${Date.now()}`;
    const userStmt = db.prepare(`
      INSERT INTO users (id, phone, role, created_at)
      VALUES (?, ?, 'STUDENT', ?)
    `);
    
    userStmt.run(
      testUserIdStr,
      `test_planning_${Date.now()}`,
      new Date().toISOString()
    );
    
    testUserId = testUserIdStr;

    // 创建测试知识点（需要指定 id，因为 id 是 TEXT PRIMARY KEY 无 AUTOINCREMENT）
    const kpStmt = db.prepare(`
      INSERT INTO knowledge_points (id, user_id, title, category, status, created_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?)
    `);

    for (let i = 1; i <= 10; i++) {
      kpStmt.run(
        `kp_${testUserId}_${i}`,
        testUserId,
        `知识点${i}`,
        'math',
        new Date().toISOString()
      );
    }

    // 创建测试练习记录
    const exerciseStmt = db.prepare(`
      INSERT INTO exercise_records (user_id, subject, is_correct, created_at)
      VALUES (?, 'math', ?, ?)
    `);

    for (let i = 0; i < 50; i++) {
      exerciseStmt.run(
        testUserId,
        i % 3 === 0 ? 0 : 1, // 67% 正确率
        new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      );
    }

    // 创建 user_preferences 表（DynamicTaskGenerator 需要）
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id TEXT PRIMARY KEY,
          daily_time_limit INTEGER DEFAULT 60,
          preferred_study_time TEXT,
          learning_style TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      // 插入测试用户偏好
      db.prepare(`
        INSERT OR REPLACE INTO user_preferences (user_id, daily_time_limit)
        VALUES (?, 60)
      `).run(testUserId);
    } catch (e) {
      // 表可能已存在
    }

    // 创建 learning_plan_snapshots 表（PlanExecutionTracker 需要）
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS learning_plan_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plan_id INTEGER NOT NULL,
          completion_rate REAL,
          total_tasks INTEGER,
          completed_tasks INTEGER,
          quality_score REAL,
          recorded_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (plan_id) REFERENCES learning_plans(id)
        )
      `);
    } catch (e) {
      // 表可能已存在
    }
  });

  afterEach(() => {
    // 清理测试数据（不关闭数据库，避免影响后续测试）
    const tables = [
      'exercise_records',
      'knowledge_mastery',
      'learning_plan_tasks',
      'learning_plans',
      'study_sessions',
      'knowledge_points',
      'users'
    ];

    tables.forEach(table => {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (e) {
        // 表可能不存在
      }
    });
  });

  describe('PersonalizedPlanningAlgorithm', () => {
    describe('generatePersonalizedPlan', () => {
      it('应该成功生成个性化学习计划', async () => {
        const params = {
          subject: 'math',
          timeframe: {
            totalDays: 30,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          goals: [
            {
              knowledgePointId: '1',
              knowledgePointName: '知识点 1',
              currentMastery: 30,
              targetMastery: 80,
              priority: 'high'
            },
            {
              knowledgePointId: '2',
              knowledgePointName: '知识点 2',
              currentMastery: 50,
              targetMastery: 85,
              priority: 'medium'
            }
          ],
          preferences: {
            dailyTimeLimit: 60,
            includeWeekend: true
          }
        };

        const result = await PersonalizedPlanningAlgorithm.generatePersonalizedPlan(testUserId, params);

        expect(result.success).toBe(true);
        expect(result.plan).toBeDefined();
        expect(result.plan.userId).toBe(testUserId);
        expect(result.plan.subject).toBe('math');
        expect(result.plan.learningStyle).toBeDefined();
        expect(result.plan.learningPath).toBeDefined();
        expect(result.plan.dailySchedule).toBeDefined();
        expect(result.plan.checkpoints).toBeDefined();
        expect(result.plan.estimatedCompletionRate).toBeGreaterThan(0);
        expect(result.plan.confidenceScore).toBeGreaterThan(0);
      });

      it('当目标过于激进时应该返回不可行', async () => {
        const params = {
          subject: 'math',
          timeframe: {
            totalDays: 3, // 时间太短
            startDate: new Date().toISOString().split('T')[0]
          },
          goals: Array(20).fill(null).map((_, i) => ({
            knowledgePointId: `${i + 1}`,
            knowledgePointName: `知识点${i + 1}`,
            currentMastery: 20,
            targetMastery: 90,
            priority: 'high'
          })),
          preferences: {
            dailyTimeLimit: 30
          }
        };

        const result = await PersonalizedPlanningAlgorithm.generatePersonalizedPlan(testUserId, params);

        expect(result.success).toBe(false);
        expect(result.reason).toBeDefined();
        expect(result.suggestion).toBeDefined();
        expect(result.adjustedPlan).toBeDefined();
      });

      it('应该根据用户画像调整学习风格', async () => {
        const params = {
          subject: 'math',
          timeframe: {
            totalDays: 14,
            startDate: new Date().toISOString().split('T')[0]
          },
          goals: [
            {
              knowledgePointId: '1',
              knowledgePointName: '知识点 1',
              currentMastery: 40,
              targetMastery: 80,
              priority: 'medium'
            }
          ],
          preferences: {}
        };

        const result = await PersonalizedPlanningAlgorithm.generatePersonalizedPlan(testUserId, params);

        expect(result.plan.learningStyle).toBeDefined();
        expect(Object.values(PersonalizedPlanningAlgorithm.LEARNING_STYLES))
          .toContain(result.plan.learningStyle);
      });
    });

    describe('analyzeFeasibility', () => {
      it('应该正确评估目标可行性', () => {
        const goals = [
          {
            knowledgePointId: '1',
            knowledgePointName: '知识点 1',
            currentMastery: 30,
            targetMastery: 80,
            priority: 'high',
            difficulty: 'medium'
          }
        ];

        const userProfile = {
          avgDailyPractice: 10,
          planCompletionRate: 80
        };

        const timeframe = {
          totalDays: 10
        };

        const result = PersonalizedPlanningAlgorithm.evaluateFeasibility(goals, userProfile, timeframe);

        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('reason');
        expect(result).toHaveProperty('estimatedRate');
      });

      it('当每日练习量超出用户能力时应该标记为不可行', () => {
        const goals = Array(50).fill(null).map((_, i) => ({
          knowledgePointId: `${i}`,
          currentMastery: 20,
          targetMastery: 90,
          priority: 'high'
        }));

        const userProfile = {
          avgDailyPractice: 5,
          planCompletionRate: 50
        };

        const timeframe = {
          totalDays: 5
        };

        const result = PersonalizedPlanningAlgorithm.evaluateFeasibility(goals, userProfile, timeframe);

        expect(result.feasible).toBe(false);
        expect(result.adjustedPlan).toBeDefined();
      });
    });

    describe('calculatePriorityWeights', () => {
      it('应该正确计算优先级权重', () => {
        const goals = [
          {
            knowledgePointId: '1',
            currentMastery: 20,
            targetMastery: 80,
            priority: 'high'
          },
          {
            knowledgePointId: '2',
            currentMastery: 60,
            targetMastery: 80,
            priority: 'low'
          }
        ];

        const userProfile = { avgDailyPractice: 10 };
        const weighted = PersonalizedPlanningAlgorithm.calculatePriorityWeights(goals, userProfile);

        expect(weighted[0].weight).toBeGreaterThan(weighted[1].weight);
      });
    });

    describe('buildUserProfile', () => {
      it('应该构建完整的用户画像', async () => {
        const userProfile = await PersonalizedPlanningAlgorithm.buildUserProfile(testUserId, 'math');

        expect(userProfile).toHaveProperty('totalPractices');
        expect(userProfile).toHaveProperty('avgAccuracy');
        expect(userProfile).toHaveProperty('activeDays');
        expect(userProfile).toHaveProperty('avgDailyPractice');
        expect(userProfile).toHaveProperty('consistencyScore');
        expect(userProfile.masteryDistribution).toBeDefined();
      });
    });
  });

  describe('DynamicTaskGenerator', () => {
    describe('generateDailyTasks', () => {
      it('应该生成每日学习任务', async () => {
        const date = new Date().toISOString().split('T')[0];
        
        const tasks = await DynamicTaskGenerator.generateDailyTasks(testUserId, date, {
          subject: 'math'
        });

        expect(Array.isArray(tasks)).toBe(true);
        
        if (tasks.length > 0) {
          const task = tasks[0];
          expect(task).toHaveProperty('type');
          expect(task).toHaveProperty('knowledgePointId');
          expect(task).toHaveProperty('knowledgePointName');
          expect(task).toHaveProperty('title');
          expect(task).toHaveProperty('estimatedTime');
          expect(task).toHaveProperty('status');
        }
      });

      it('应该根据用户状态调整任务量', async () => {
        const date = new Date().toISOString().split('T')[0];
        
        // 模拟用户疲劳状态
        const userStatus = {
          energyLevel: 30,
          availableTime: 30,
          fatigue: true,
          completedTasks: 0,
          momentum: 0
        };

        const baseTasks = Array(10).fill(null).map((_, i) => ({
          type: 'practice',
          knowledgePointId: `${i}`,
          knowledgePointName: `知识点${i}`,
          title: `任务${i}`,
          estimatedTime: 25,
          priority: i + 1
        }));

        const adjustedTasks = DynamicTaskGenerator.adjustTaskLoad(baseTasks, userStatus);

        expect(adjustedTasks.length).toBeLessThan(baseTasks.length);
      });
    });

    describe('getReviewItems', () => {
      it('应该基于遗忘曲线获取需要复习的知识点', async () => {
        const date = new Date().toISOString().split('T')[0];
        
        // 先创建测试知识点
        const kpStmt = db.prepare(`
          INSERT INTO knowledge_points (id, user_id, title, category, status, created_at)
          VALUES (?, ?, ?, ?, 'ACTIVE', ?)
        `);
        kpStmt.run(`kp_review_1_${testUserId}`, testUserId, '复习知识点 1', 'math', new Date().toISOString());
        kpStmt.run(`kp_review_2_${testUserId}`, testUserId, '复习知识点 2', 'math', new Date().toISOString());
        
        // 再创建知识掌握度记录
        const masteryStmt = db.prepare(`
          INSERT INTO knowledge_mastery (user_id, knowledge_point_id, mastery_level, last_reviewed_at, review_count)
          VALUES (?, ?, ?, ?, ?)
        `);

        // 3 天前复习过，掌握度 60%
        masteryStmt.run(
          testUserId,
          `kp_review_1_${testUserId}`,
          60,
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          1
        );

        // 10 天前复习过，掌握度 40%
        masteryStmt.run(
          testUserId,
          `kp_review_2_${testUserId}`,
          40,
          new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          2
        );

        const reviewItems = await DynamicTaskGenerator.getReviewItems(testUserId, 'math', date);

        expect(Array.isArray(reviewItems)).toBe(true);
      });
    });

    describe('updateTaskStatus', () => {
      it('应该更新任务状态并记录完成时间', async () => {
        // 创建测试任务
        const taskStmt = db.prepare(`
          INSERT INTO learning_plan_tasks (user_id, task_type, content, scheduled_date, status)
          VALUES (?, ?, ?, ?, 'pending')
        `);

        const taskResult = taskStmt.run(
          testUserId,
          'practice',
          JSON.stringify({ knowledgePointId: '1', knowledgePointName: '测试知识点' }),
          new Date().toISOString().split('T')[0]
        );

        const taskId = taskResult.lastInsertRowid;

        // 更新状态
        await DynamicTaskGenerator.updateTaskStatus(taskId, 'completed', {
          score: 85,
          actualTime: 30
        });

        // 验证更新
        const verifyStmt = db.prepare('SELECT * FROM learning_plan_tasks WHERE id = ?');
        const updatedTask = verifyStmt.get(taskId);

        expect(updatedTask.status).toBe('completed');
        expect(updatedTask.completed_at).toBeDefined();
      });
    });
  });

  describe('PlanExecutionTracker', () => {
    describe('trackExecution', () => {
      it('应该生成完整的执行跟踪报告', async () => {
        // 创建测试计划
        const planStmt = db.prepare(`
          INSERT INTO learning_plans (user_id, subject, timeframe, goals, status, created_at)
          VALUES (?, ?, ?, ?, 'active', ?)
        `);

        const planResult = planStmt.run(
          testUserId,
          'math',
          JSON.stringify({ totalDays: 30, startDate: new Date().toISOString() }),
          JSON.stringify([]),
          new Date().toISOString()
        );

        const planId = planResult.lastInsertRowid;

        // 创建测试任务
        const taskStmt = db.prepare(`
          INSERT INTO learning_plan_tasks (plan_id, user_id, task_type, content, scheduled_date, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < 10; i++) {
          taskStmt.run(
            planId,
            testUserId,
            'practice',
            JSON.stringify({ knowledgePointId: `${i}` }),
            new Date().toISOString().split('T')[0],
            i < 5 ? 'completed' : 'pending'
          );
        }

        // 跟踪执行
        const report = await PlanExecutionTracker.trackExecution(planId);

        expect(report).toBeDefined();
        expect(report.planId).toBe(planId);
        expect(report.progress).toBeDefined();
        expect(report.progress.completionRate).toBe(50); // 5/10
        expect(report.quality).toBeDefined();
        expect(report.risks).toBeDefined();
        expect(report.recommendations).toBeDefined();
      });
    });

    describe('detectRisks', () => {
      it('应该检测进度落后风险', () => {
        const plan = {
          start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          total_days: 30
        };

        const progressMetrics = {
          completionRate: 20, // 只完成了 20%
          timeEfficiency: 80
        };

        const qualityMetrics = {
          avgScore: 70,
          engagementLevel: 'medium'
        };

        const risks = PlanExecutionTracker.detectRisks(plan, progressMetrics, qualityMetrics);

        expect(risks.risks.some(r => r.type === 'behind_schedule' || r.type === 'slightly_behind')).toBe(true);
      });

      it('当没有风险时应该返回空风险列表', () => {
        const plan = {
          start_date: new Date().toISOString(),
          total_days: 30
        };

        const progressMetrics = {
          completionRate: 50, // 正常进度
          timeEfficiency: 100
        };

        const qualityMetrics = {
          avgScore: 85,
          engagementLevel: 'high'
        };

        const risks = PlanExecutionTracker.detectRisks(plan, progressMetrics, qualityMetrics);

        expect(risks.risks.length).toBe(0);
        expect(risks.overallRiskLevel).toBe('low');
      });
    });

    describe('generateRecommendations', () => {
      it('应该根据风险生成对应的建议', () => {
        const plan = { start_date: new Date().toISOString(), total_days: 30 };
        
        const progressMetrics = { completionRate: 20 };
        const qualityMetrics = { avgScore: 60, engagementLevel: 'low' };
        
        const riskAnalysis = {
          risks: [
            { type: 'behind_schedule', severity: 'high' },
            { type: 'low_engagement', severity: 'high' }
          ],
          overallRiskLevel: 'high'
        };

        const recommendations = PlanExecutionTracker.generateRecommendations(
          plan,
          progressMetrics,
          qualityMetrics,
          riskAnalysis
        );

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations.some(r => r.type === 'schedule_adjustment')).toBe(true);
        expect(recommendations.some(r => r.type === 'engagement_boost')).toBe(true);
      });
    });

    describe('getDailyProgress', () => {
      it('应该获取每日进度数据', async () => {
        // 创建测试计划
        const planStmt = db.prepare(`
          INSERT INTO learning_plans (user_id, subject, timeframe, status, created_at)
          VALUES (?, ?, ?, 'active', ?)
        `);

        const planResult = planStmt.run(
          testUserId,
          'math',
          JSON.stringify({ totalDays: 30 }),
          new Date().toISOString()
        );

        const planId = planResult.lastInsertRowid;

        // 创建测试任务
        const taskStmt = db.prepare(`
          INSERT INTO learning_plan_tasks (plan_id, user_id, task_type, scheduled_date, status)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < 7; i++) {
          taskStmt.run(
            planId,
            testUserId,
            'practice',
            new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            i < 3 ? 'completed' : 'pending'
          );
        }

        const dailyProgress = await PlanExecutionTracker.getDailyProgress(planId, 7);

        expect(Array.isArray(dailyProgress)).toBe(true);
        expect(dailyProgress.length).toBeLessThanOrEqual(7);
      });
    });
  });

  describe('AIPlanningService Integration', () => {
    it('应该完整执行计划生成到跟踪的流程', async () => {
      // 1. 生成个性化计划
      const planParams = {
        subject: 'math',
        timeframe: {
          totalDays: 14,
          startDate: new Date().toISOString().split('T')[0]
        },
        goals: [
          {
            knowledgePointId: '1',
            knowledgePointName: '知识点 1',
            currentMastery: 40,
            targetMastery: 80,
            priority: 'high'
          }
        ],
        preferences: {
          dailyTimeLimit: 60,
          includeWeekend: true
        }
      };

      const planResult = await PersonalizedPlanningAlgorithm.generatePersonalizedPlan(testUserId, planParams);
      expect(planResult.success).toBe(true);

      // 2. 保存计划
      const planId = AIPlanningService.savePlan(testUserId, {
        subject: 'math',
        timeframe: planParams.timeframe,
        goals: planParams.goals,
        weeklyGoals: planResult.plan.learningPath,
        schedule: planResult.plan.dailySchedule,
        milestones: [],
        options: planParams.preferences
      });

      expect(planId).toBeDefined();
      expect(planId).toBeGreaterThan(0);

      // 3. 获取计划进度
      const progress = AIPlanningService.getPlanProgress(planId);
      expect(progress).toBeDefined();
      expect(progress).toHaveProperty('totalTasks');
      expect(progress).toHaveProperty('completedTasks');
      expect(progress).toHaveProperty('progress');
    });
  });
});
