/**
 * WeaknessAnalysisService 单元测试
 * 测试覆盖率目标：80%+
 */

import { WeaknessAnalysisService, WeaknessType } from './weakness-analysis.service';

// Mock PrismaService
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

describe('WeaknessAnalysisService', () => {
  let service: WeaknessAnalysisService;
  let prismaService: any;

  beforeEach(() => {
    service = new WeaknessAnalysisService(mockPrismaService as any);
    prismaService = (service as any).prisma;
    jest.clearAllMocks();
  });

  describe('analyzeWeaknesses', () => {
    it('应该成功分析用户薄弱点', async () => {
      const userId = 1;

      // Mock 错题记录
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 3,
          exercise: {
            id: 100,
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 10, name: '分数运算' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 2,
          exercise: {
            id: 101,
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 10, name: '分数运算' },
          },
        },
      ];

      // Mock 练习记录
      const mockPracticeSessions = [
        {
          id: 1,
          userId,
          status: 'COMPLETED',
          questions: [
            { questionType: 'SINGLE_CHOICE', isCorrect: true },
            { questionType: 'SINGLE_CHOICE', isCorrect: false },
            { questionType: 'MULTIPLE_CHOICE', isCorrect: false },
          ],
        },
      ];

      prismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      prismaService.practiceSession.findMany.mockResolvedValue(mockPracticeSessions);

      const result = await service.analyzeWeaknesses(userId);

      expect(result).toHaveProperty('knowledgePoints');
      expect(result).toHaveProperty('questionTypes');
      expect(result).toHaveProperty('subjects');
      expect(result).toHaveProperty('overallMastery');
      expect(prismaService.wrongQuestion.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          exercise: {
            include: {
              subject: true,
              knowledgePoint: true,
            },
          },
        },
      });
    });

    it('应该处理没有错题记录的情况', async () => {
      const userId = 999;

      prismaService.wrongQuestion.findMany.mockResolvedValue([]);
      prismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      expect(result.knowledgePoints).toEqual([]);
      expect(result.questionTypes).toEqual([]);
      expect(result.subjects).toEqual([]);
      expect(result.overallMastery).toBe(100);
    });

    it('应该正确计算优先级', async () => {
      const userId = 1;

      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 6, // HIGH priority
          exercise: {
            id: 100,
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 10, name: '知识点 A' },
          },
        },
        {
          id: 2,
          userId,
          timesWrong: 4, // MEDIUM priority
          exercise: {
            id: 101,
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 11, name: '知识点 B' },
          },
        },
        {
          id: 3,
          userId,
          timesWrong: 2, // LOW priority
          exercise: {
            id: 102,
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 12, name: '知识点 C' },
          },
        },
      ];

      prismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);
      prismaService.practiceSession.findMany.mockResolvedValue([]);

      const result = await service.analyzeWeaknesses(userId);

      const highPriority = result.knowledgePoints.find(kp => kp.name === '知识点 A');
      const mediumPriority = result.knowledgePoints.find(kp => kp.name === '知识点 B');
      const lowPriority = result.knowledgePoints.find(kp => kp.name === '知识点 C');

      expect(highPriority?.priority).toBe('HIGH');
      expect(mediumPriority?.priority).toBe('MEDIUM');
      expect(lowPriority?.priority).toBe('LOW');
    });
  });

  describe('getRecommendedExercises', () => {
    it('应该返回推荐的练习题目', async () => {
      const userId = 1;
      const limit = 10;

      const mockWeaknesses = {
        knowledgePoints: [
          {
            type: WeaknessType.KNOWLEDGE_POINT,
            name: '分数运算',
            errorCount: 5,
            masteryLevel: 50,
            priority: 'HIGH' as const,
            recommendations: ['建议重新学习'],
          },
        ],
        questionTypes: [],
        subjects: [],
        overallMastery: 50,
      };

      const mockExercises = [
        { id: 1, title: '练习题 1', subject: { name: '数学' }, knowledgePoint: { name: '分数运算' } },
        { id: 2, title: '练习题 2', subject: { name: '数学' }, knowledgePoint: { name: '分数运算' } },
      ];

      // Mock analyzeWeaknesses
      jest.spyOn(service, 'analyzeWeaknesses').mockResolvedValue(mockWeaknesses as any);
      prismaService.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await service.getRecommendedExercises(userId, limit);

      expect(result).toEqual(mockExercises);
      expect(prismaService.exercise.findMany).toHaveBeenCalledWith({
        where: {
          knowledgePoint: {
            name: '分数运算',
          },
        },
        take: limit,
        include: {
          subject: true,
          knowledgePoint: true,
        },
      });
    });

    it('应该在没有薄弱点时返回空数组', async () => {
      const userId = 999;
      const limit = 10;

      const mockWeaknesses = {
        knowledgePoints: [],
        questionTypes: [],
        subjects: [],
        overallMastery: 100,
      };

      jest.spyOn(service, 'analyzeWeaknesses').mockResolvedValue(mockWeaknesses as any);

      const result = await service.getRecommendedExercises(userId, limit);

      expect(result).toEqual([]);
      expect(prismaService.exercise.findMany).not.toHaveBeenCalled();
    });
  });

  describe('generateLearningReport', () => {
    it('应该生成完整的学习报告', async () => {
      const userId = 1;

      const mockWeaknesses = {
        knowledgePoints: [
          {
            type: WeaknessType.KNOWLEDGE_POINT,
            name: '分数运算',
            errorCount: 5,
            masteryLevel: 50,
            priority: 'HIGH' as const,
            recommendations: ['重新学习分数运算'],
          },
          {
            type: WeaknessType.KNOWLEDGE_POINT,
            name: '小数运算',
            errorCount: 2,
            masteryLevel: 80,
            priority: 'LOW' as const,
            recommendations: ['巩固小数运算'],
          },
        ],
        questionTypes: [
          {
            type: WeaknessType.QUESTION_TYPE,
            name: '单选题',
            errorCount: 3,
            masteryLevel: 70,
            priority: 'MEDIUM' as const,
            recommendations: ['提高答题准确率'],
          },
        ],
        subjects: [
          {
            type: WeaknessType.SUBJECT,
            name: '数学',
            errorCount: 7,
            masteryLevel: 65,
            priority: 'MEDIUM' as const,
            recommendations: ['加强数学学习'],
          },
        ],
        overallMastery: 66,
      };

      jest.spyOn(service, 'analyzeWeaknesses').mockResolvedValue(mockWeaknesses as any);

      const result = await service.generateLearningReport(userId);

      expect(result).toHaveProperty('overallMastery');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('weaknesses');
      expect(result).toHaveProperty('studyPlan');
      expect(result.weaknesses.length).toBeLessThanOrEqual(3);
    });

    it('应该在没有薄弱点时生成鼓励性计划', async () => {
      const userId = 1;

      const mockWeaknesses = {
        knowledgePoints: [
          {
            type: WeaknessType.KNOWLEDGE_POINT,
            name: '分数运算',
            errorCount: 1,
            masteryLevel: 90,
            priority: 'LOW' as const,
            recommendations: ['巩固'],
          },
        ],
        questionTypes: [],
        subjects: [],
        overallMastery: 90,
      };

      jest.spyOn(service, 'analyzeWeaknesses').mockResolvedValue(mockWeaknesses as any);

      const result = await service.generateLearningReport(userId);

      expect(result.studyPlan).toContain('继续保持当前的学习状态！');
    });
  });
});
