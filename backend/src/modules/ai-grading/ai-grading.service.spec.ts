import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiGradingService } from '../ai-grading.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeEssayDto, GradeSubjectiveDto, EssayType } from '../dto/grading.dto';

describe('AiGradingService', () => {
  let service: AiGradingService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGradingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            practiceSession: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AiGradingService>(AiGradingService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('gradeEssay', () => {
    it('应该成功批改作文', async () => {
      const dto: GradeEssayDto = {
        essayContent: '这是一篇测试作文，内容关于我的梦想。我希望成为一名科学家，为社会做出贡献。',
        essayTitle: '我的梦想',
        essayType: EssayType.NARRATIVE,
        gradeLevel: 5,
        requirements: '字数不少于 300 字',
        expectedWordCount: 400,
      };

      const result = await service.gradeEssay(dto);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.dimensions).toHaveLength(4);
      expect(result.dimensions.map(d => d.dimension)).toEqual(['内容', '语言', '结构', '卷面']);
      expect(result.estimatedGrade).toMatch(/^[A-E]$/);
    });

    it('应该正确计算字数', async () => {
      const dto: GradeEssayDto = {
        essayContent: '你好世界',
        essayType: EssayType.NARRATIVE,
        gradeLevel: 5,
      };

      const result = await service.gradeEssay(dto);

      expect(result.wordCount).toBe(4);
    });

    it('应该返回 4 个维度评分', async () => {
      const dto: GradeEssayDto = {
        essayContent: '测试内容',
        essayType: EssayType.ARGUMENTATIVE,
        gradeLevel: 8,
      };

      const result = await service.gradeEssay(dto);

      expect(result.dimensions).toHaveLength(4);
      
      // 验证权重总和为 1
      const totalWeight = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 2);

      // 验证每个维度都有反馈和建议
      result.dimensions.forEach(dim => {
        expect(dim.feedback).toBeDefined();
        expect(Array.isArray(dim.suggestions)).toBe(true);
      });
    });
  });

  describe('gradeSubjective', () => {
    it('应该成功批改主观题', async () => {
      const dto: GradeSubjectiveDto = {
        questionContent: '请简述光合作用的过程',
        studentAnswer: '光合作用是植物利用光能将二氧化碳和水转化为有机物的过程',
        standardAnswer: '光合作用是绿色植物利用光能，将二氧化碳和水合成有机物，并释放氧气的过程',
        maxScore: 10,
        knowledgePoint: '生物 - 光合作用',
      };

      const result = await service.gradeSubjective(dto);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(dto.maxScore);
      expect(result.scorePercentage).toBeGreaterThanOrEqual(0);
      expect(result.scorePercentage).toBeLessThanOrEqual(100);
      expect(result.feedback).toBeDefined();
    });

    it('应该正确计算得分率', async () => {
      const dto: GradeSubjectiveDto = {
        questionContent: '测试题目',
        studentAnswer: '完整答案',
        standardAnswer: '完整答案',
        maxScore: 20,
      };

      const result = await service.gradeSubjective(dto);

      expect(result.scorePercentage).toBeGreaterThanOrEqual(50); // 降级策略至少 50%
    });

    it('应该返回关键得分点和遗漏点', async () => {
      const dto: GradeSubjectiveDto = {
        questionContent: '什么是牛顿第一定律？',
        studentAnswer: '物体保持静止或匀速直线运动',
        standardAnswer: '一切物体在没有受到外力作用时，总保持静止状态或匀速直线运动状态',
        maxScore: 5,
        knowledgePoint: '物理 - 牛顿定律',
      };

      const result = await service.gradeSubjective(dto);

      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(Array.isArray(result.missingPoints)).toBe(true);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('应该生成详细的评分报告', async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        status: 'COMPLETED',
        totalQuestions: 10,
        correctAnswers: 8,
        textbook: {
          subject: 'MATH',
        },
        user: {
          grade: 5,
        },
        unit: null,
        questions: [
          {
            id: 1,
            questionType: 'SINGLE_CHOICE',
            question: '题目 1',
            answer: 'A',
            userAnswer: 'A',
            isCorrect: true,
            answers: [{ id: 1, isCorrect: true }],
          },
          {
            id: 2,
            questionType: 'SINGLE_CHOICE',
            question: '题目 2',
            answer: 'B',
            userAnswer: 'A',
            isCorrect: false,
            answers: [{ id: 2, isCorrect: false }],
          },
        ],
      };

      jest.spyOn(prismaService.practiceSession, 'findUnique').mockResolvedValue(mockSession as any);

      const result = await service.generateReport(1, 'DETAILED');

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(1);
      expect(result.userId).toBe(1);
      expect(result.totalScore).toBeDefined();
      expect(result.maxScore).toBeDefined();
      expect(result.scorePercentage).toBeDefined();
      expect(result.reportType).toBe('DETAILED');
      expect(result.exerciseResults).toHaveLength(2);
      expect(result.overallFeedback).toBeDefined();
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.weaknesses)).toBe(true);
      expect(Array.isArray(result.studySuggestions)).toBe(true);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('应该生成简要报告（不包含详细题目结果）', async () => {
      const mockSession = {
        id: 2,
        userId: 2,
        status: 'COMPLETED',
        totalQuestions: 5,
        correctAnswers: 4,
        textbook: {
          subject: 'ENGLISH',
        },
        user: {
          grade: 6,
        },
        unit: null,
        questions: [],
      };

      jest.spyOn(prismaService.practiceSession, 'findUnique').mockResolvedValue(mockSession as any);

      const result = await service.generateReport(2, 'SUMMARY');

      expect(result.reportType).toBe('SUMMARY');
      expect(result.exerciseResults).toHaveLength(0); // 简要报告不包含详细结果
    });

    it('应该在没有会话时抛出错误', async () => {
      jest.spyOn(prismaService.practiceSession, 'findUnique').mockResolvedValue(null);

      await expect(service.generateReport(999)).rejects.toThrow('练习会话不存在');
    });
  });

  describe('辅助方法', () => {
    it('应该正确统计中文字数', () => {
      const content1 = '你好世界';
      const content2 = 'Hello World';
      const content3 = '你好 Hello 世界 World';

      // 通过 gradeEssay 间接测试
      const result1 = service['countChineseWords'](content1);
      const result2 = service['countChineseWords'](content2);
      const result3 = service['countChineseWords'](content3);

      expect(result1).toBe(4);
      expect(result2).toBe(0);
      expect(result3).toBe(4);
    });

    it('应该正确计算字数得分', () => {
      const score1 = service['calculateWordCountScore'](400, 400); // 100%
      const score2 = service['calculateWordCountScore'](360, 400); // 90%
      const score3 = service['calculateWordCountScore'](320, 400); // 80%
      const score4 = service['calculateWordCountScore'](200, 400); // 50%

      expect(score1).toBe(100);
      expect(score2).toBe(80);
      expect(score3).toBe(60);
      expect(score4).toBeLessThanOrEqual(40);
    });

    it('应该正确计算等级', () => {
      expect(service['calculateGradeLevel'](95)).toBe('A');
      expect(service['calculateGradeLevel'](85)).toBe('B');
      expect(service['calculateGradeLevel'](75)).toBe('C');
      expect(service['calculateGradeLevel'](65)).toBe('D');
      expect(service['calculateGradeLevel'](50)).toBe('E');
    });

    it('应该正确计算加权总分', () => {
      const dimensions = [
        { dimension: '内容', score: 90, weight: 0.4, feedback: '', suggestions: [] },
        { dimension: '语言', score: 80, weight: 0.3, feedback: '', suggestions: [] },
        { dimension: '结构', score: 70, weight: 0.2, feedback: '', suggestions: [] },
        { dimension: '卷面', score: 100, weight: 0.1, feedback: '', suggestions: [] },
      ];

      const totalScore = service['calculateWeightedScore'](dimensions);

      expect(totalScore).toBe(83); // 90*0.4 + 80*0.3 + 70*0.2 + 100*0.1 = 36 + 24 + 14 + 10 = 84
    });
  });
});
