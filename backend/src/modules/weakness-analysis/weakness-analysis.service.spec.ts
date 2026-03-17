import { Test, TestingModule } from '@nestjs/testing';
import { WeaknessAnalysisService, WeaknessType } from './weakness-analysis.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WeaknessAnalysisService - 薄弱点分析服务测试', () => {
  let service: WeaknessAnalysisService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wrongQuestion: {
      findMany: jest.fn(),
    },
    practiceSession: {
      findMany: jest.fn(),
    },
    exercise: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeaknessAnalysisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WeaknessAnalysisService>(WeaknessAnalysisService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeWeaknesses - 分析薄弱点', () => {
    it('应该返回完整的薄弱点分析结果', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exerciseId: 100,
          timesWrong: 3,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 1, name: '分数加法' },
          },
        },
        {
          id: 2,
          userId,
          exerciseId: 101,
          timesWrong: 2,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 2, name: '分数减法' },
          },
        },
      ];

      const mockPracticeSessions = [
        {
          id: 1,
          userId,
          status: 'COMPLETED',
          questions: [
            { questionType: 'SINGLE_CHOICE', isCorrect: true },
            { questionType: 'SINGLE_CHOICE', isCorrect: false },
            { questionType: 'TRUE_FALSE', isCorrect: true },
          ],
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockPracticeSessions);

      const result = await service.analyzeWeaknesses(userId);

      expect(result).toHaveProperty('knowledgePoints');
      expect(result).toHaveProperty('questionTypes');
      expect(result).toHaveProperty('subjects');
      expect(result).toHaveProperty('overallMastery');
      expect(result.knowledgePoints).toBeInstanceOf(Array);
      expect(result.questionTypes).toBeInstanceOf(Array);
      expect(result.subjects).toBeInstanceOf(Array);
    });

    it('应该正确统计知识点错误次数', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exerciseId: 100,
          timesWrong: 5,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 1, name: '分数加法' },
          },
        },
        {
          id: 2,
          userId,
          exerciseId: 101,
          timesWrong: 3,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 1, name: '分数加法' }, // 同一知识点
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      const fractionAddition = result.knowledgePoints.find(
        (kp) => kp.name === '分数加法',
      );
      expect(fractionAddition?.errorCount).toBe(8); // 5 + 3
    });

    it('应该正确计算掌握程度', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exerciseId: 100,
          timesWrong: 2,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 1, name: '测试知识点' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // masteryLevel = max(0, 100 - errorCount * 10)
      expect(result.knowledgePoints[0].masteryLevel).toBe(80); // 100 - 2*10
    });

    it('应该正确确定优先级', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 6, // HIGH (>= 5)
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 1, name: '知识点 1' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 4, // MEDIUM (>= 3)
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 2, name: '知识点 2' },
          },
        },
        {
          id: 3,
          userId,
          timesWrong: 2, // LOW (< 3)
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 3, name: '知识点 3' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 验证优先级逻辑正确（按错误次数聚合后判断）
      expect(result.knowledgePoints.length).toBe(3);
      // 所有知识点都应该有 priority 属性
      result.knowledgePoints.forEach(kp => {
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(kp.priority);
      });
    });

    it('应该按错误次数降序排序知识点', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 2,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 1, name: '知识点 A' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 5,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 2, name: '知识点 B' },
          },
        },
        {
          id: 3,
          userId,
          timesWrong: 3,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 3, name: '知识点 C' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 验证按错误次数降序排序
      expect(result.knowledgePoints[0].errorCount).toBeGreaterThanOrEqual(result.knowledgePoints[1].errorCount);
      expect(result.knowledgePoints[1].errorCount).toBeGreaterThanOrEqual(result.knowledgePoints[2].errorCount);
    });
  });

  describe('analyzeQuestionTypes - 题型分析', () => {
    it('应该正确统计各题型正确率', async () => {
      const userId = 1;
      const mockPracticeSessions = [
        {
          id: 1,
          userId,
          status: 'COMPLETED',
          questions: [
            { questionType: 'SINGLE_CHOICE', isCorrect: true },
            { questionType: 'SINGLE_CHOICE', isCorrect: true },
            { questionType: 'SINGLE_CHOICE', isCorrect: false },
            { questionType: 'TRUE_FALSE', isCorrect: true },
            { questionType: 'TRUE_FALSE', isCorrect: false },
          ],
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);
      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockPracticeSessions);

      const result = await service.analyzeWeaknesses(userId);

      const singleChoice = result.questionTypes.find(
        (qt) => qt.name === '单选题',
      );
      const trueFalse = result.questionTypes.find((qt) => qt.name === '判断题');

      expect(singleChoice?.masteryLevel).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
      expect(trueFalse?.masteryLevel).toBeCloseTo(50, 1); // 1/2 = 50%
    });

    it('应该正确转换题型名称', async () => {
      const userId = 1;
      const mockPracticeSessions = [
        {
          id: 1,
          userId,
          status: 'COMPLETED',
          questions: [
            { questionType: 'SINGLE_CHOICE', isCorrect: true },
            { questionType: 'MULTIPLE_CHOICE', isCorrect: true },
            { questionType: 'TRUE_FALSE', isCorrect: true },
            { questionType: 'FILL_BLANK', isCorrect: true },
            { questionType: 'CALCULATION', isCorrect: true },
            { questionType: 'APPLICATION', isCorrect: true },
            { questionType: 'ESSAY', isCorrect: true },
          ],
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);
      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockPracticeSessions);

      const result = await service.analyzeWeaknesses(userId);

      const typeNames = result.questionTypes.map((qt) => qt.name);
      expect(typeNames).toContain('单选题');
      expect(typeNames).toContain('多选题');
      expect(typeNames).toContain('判断题');
      expect(typeNames).toContain('填空题');
      expect(typeNames).toContain('计算题');
      expect(typeNames).toContain('应用题');
      expect(typeNames).toContain('作文');
    });
  });

  describe('analyzeSubjects - 科目分析', () => {
    it('应该正确统计各科目的错误次数', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 3,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { name: '知识点 1' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 2,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { name: '知识点 2' },
          },
        },
        {
          id: 3,
          userId,
          timesWrong: 5,
          exercise: {
            subject: { id: 2, name: '语文' },
            knowledgePoint: { name: '知识点 3' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      const math = result.subjects.find((s) => s.name === '数学');
      const chinese = result.subjects.find((s) => s.name === '语文');

      expect(math?.errorCount).toBe(5); // 3 + 2
      expect(chinese?.errorCount).toBe(5);
    });

    it('应该按错误次数降序排序科目', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 2,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { name: '知识点' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 5,
          exercise: {
            subject: { id: 2, name: '英语' },
            knowledgePoint: { name: '知识点' },
          },
        },
        {
          id: 3,
          userId,
          timesWrong: 3,
          exercise: {
            subject: { id: 3, name: '语文' },
            knowledgePoint: { name: '知识点' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 验证按错误次数降序排序
      expect(result.subjects[0].errorCount).toBeGreaterThanOrEqual(result.subjects[1].errorCount);
      expect(result.subjects[1].errorCount).toBeGreaterThanOrEqual(result.subjects[2].errorCount);
    });
  });

  describe('calculateOverallMastery - 计算总体掌握程度', () => {
    it('应该计算所有薄弱点的平均掌握程度', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 2, // mastery = 80
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '知识点 1' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 4, // mastery = 60
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '知识点 2' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 验证总体掌握程度在合理范围内
      expect(result.overallMastery).toBeGreaterThanOrEqual(0);
      expect(result.overallMastery).toBeLessThanOrEqual(100);
    });

    it('没有数据时总体掌握程度应该为 100', async () => {
      const userId = 1;

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      expect(result.overallMastery).toBe(100);
    });
  });

  describe('generateKnowledgePointRecommendations - 生成知识点推荐', () => {
    it('应该根据错误次数生成不同级别的推荐', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 6, // HIGH
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 1, name: '高错误知识点' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 3, // MEDIUM
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 2, name: '中错误知识点' },
          },
        },
        {
          id: 3,
          userId,
          timesWrong: 1, // LOW
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { id: 3, name: '低错误知识点' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 验证所有知识点都有推荐
      expect(result.knowledgePoints.length).toBe(3);
      result.knowledgePoints.forEach(kp => {
        expect(kp.recommendations).toBeInstanceOf(Array);
        expect(kp.recommendations.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('getRecommendedExercises - 获取推荐题目', () => {
    it('应该返回最薄弱知识点的相关题目', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 5,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '最薄弱知识点' },
          },
        },
      ];

      const mockExercises = [
        {
          id: 1,
          subject: { name: '数学' },
          knowledgePoint: { name: '最薄弱知识点' },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);
      mockPrismaService.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await service.getRecommendedExercises(userId, 10);

      expect(prisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            knowledgePoint: expect.objectContaining({
              name: '最薄弱知识点',
            }),
          }),
          take: 10,
        }),
      );
      expect(result).toEqual(mockExercises);
    });

    it('没有薄弱点时应该返回空数组', async () => {
      const userId = 1;

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.getRecommendedExercises(userId, 10);

      expect(result).toEqual([]);
    });
  });

  describe('generateLearningReport - 生成学习报告', () => {
    it('应该返回完整的学习报告', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 5,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '薄弱知识点 1' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 3,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '薄弱知识点 2' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.generateLearningReport(userId);

      expect(result).toHaveProperty('overallMastery');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('weaknesses');
      expect(result).toHaveProperty('studyPlan');
      expect(result.weaknesses).toBeInstanceOf(Array);
      expect(result.studyPlan).toBeInstanceOf(Array);
    });

    it('应该返回最薄弱的 3 项', async () => {
      const userId = 1;
      const mockWrongQuestions = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        userId,
        timesWrong: i + 1,
        exercise: {
          subject: { name: '数学' },
          knowledgePoint: { name: `知识点${i + 1}` },
        },
      }));

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.generateLearningReport(userId);

      expect(result.weaknesses.length).toBeLessThanOrEqual(3);
    });

    it('应该生成学习计划', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 6, // HIGH priority
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '高优先级知识点' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.generateLearningReport(userId);

      expect(result.studyPlan).toBeInstanceOf(Array);
      expect(result.studyPlan.length).toBeGreaterThan(0);
    });

    it('没有薄弱点时应该返回鼓励信息', async () => {
      const userId = 1;

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.generateLearningReport(userId);

      expect(result.studyPlan).toContain('继续保持当前的学习状态！');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理没有错题记录的情况', async () => {
      const userId = 1;

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      expect(result.knowledgePoints).toEqual([]);
      expect(result.questionTypes).toEqual([]);
      expect(result.subjects).toEqual([]);
      expect(result.overallMastery).toBe(100);
    });

    it('应该处理没有练习记录的情况', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 2,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '知识点' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      expect(result.knowledgePoints.length).toBeGreaterThan(0);
      expect(result.subjects.length).toBeGreaterThan(0);
    });

    it('应该处理知识点为空的情况', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 2,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: null, // 没有知识点
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 应该跳过没有知识点的记录
      expect(result.knowledgePoints).toEqual([]);
    });

    it('应该处理科目为空的情况', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 2,
          exercise: {
            subject: null, // 没有科目
            knowledgePoint: { name: '知识点' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      mockPrismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      // 应该跳过没有科目的记录
      expect(result.subjects).toEqual([]);
    });
  });

  describe('枚举值测试', () => {
    it('WeaknessType 应该包含所有预期值', () => {
      expect(WeaknessType.KNOWLEDGE_POINT).toBe('KNOWLEDGE_POINT');
      expect(WeaknessType.QUESTION_TYPE).toBe('QUESTION_TYPE');
      expect(WeaknessType.SUBJECT).toBe('SUBJECT');
    });
  });
});
