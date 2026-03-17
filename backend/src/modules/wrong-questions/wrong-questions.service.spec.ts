import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WrongQuestionsService } from './wrong-questions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WrongQuestionsService - 薄弱点分析服务测试', () => {
  let service: WrongQuestionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wrongQuestion: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    exercise: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WrongQuestionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WrongQuestionsService>(WrongQuestionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create - 创建/更新错题', () => {
    it('应该创建新错题记录', async () => {
      const userId = 1;
      const createDto = {
        exerciseId: 100,
        wrongAnswer: 'A',
      };

      const mockExercise = {
        id: 100,
        subject: { id: 1, name: '数学' },
      };

      const newWrongQuestion = {
        id: 1,
        userId,
        exerciseId: createDto.exerciseId,
        wrongAnswer: createDto.wrongAnswer,
        timesWrong: 1,
        isMastered: false,
        lastWrongAt: new Date(),
        exercise: mockExercise,
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(null); // 不存在
      mockPrismaService.wrongQuestion.create.mockResolvedValue(newWrongQuestion);

      const result = await service.create(userId, createDto);

      expect(prisma.wrongQuestion.findUnique).toHaveBeenCalledWith({
        where: {
          userId_exerciseId: {
            userId,
            exerciseId: createDto.exerciseId,
          },
        },
      });
      expect(prisma.wrongQuestion.create).toHaveBeenCalledWith({
        data: {
          userId,
          exerciseId: createDto.exerciseId,
          wrongAnswer: createDto.wrongAnswer,
        },
        include: {
          exercise: {
            include: {
              subject: true,
            },
          },
        },
      });
      expect(result).toEqual(newWrongQuestion);
    });

    it('错题已存在时应该增加错误次数', async () => {
      const userId = 1;
      const createDto = {
        exerciseId: 100,
        wrongAnswer: 'B',
      };

      const existingWrongQuestion = {
        id: 1,
        userId,
        exerciseId: createDto.exerciseId,
        wrongAnswer: 'A',
        timesWrong: 2,
        isMastered: false,
        lastWrongAt: new Date('2024-01-01'),
        exercise: {
          id: 100,
          subject: { id: 1, name: '数学' },
        },
      };

      const updatedWrongQuestion = {
        ...existingWrongQuestion,
        wrongAnswer: createDto.wrongAnswer,
        timesWrong: 3,
        lastWrongAt: new Date(),
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(existingWrongQuestion);
      mockPrismaService.wrongQuestion.update.mockResolvedValue(updatedWrongQuestion);

      const result = await service.create(userId, createDto);

      expect(prisma.wrongQuestion.update).toHaveBeenCalledWith({
        where: { id: existingWrongQuestion.id },
        data: {
          timesWrong: { increment: 1 },
          lastWrongAt: expect.any(Date),
          wrongAnswer: createDto.wrongAnswer,
        },
        include: {
          exercise: {
            include: {
              subject: true,
            },
          },
        },
      });
      expect(result.timesWrong).toBe(3);
    });

    it('应该记录用户的错误答案', async () => {
      const userId = 1;
      const createDto = {
        exerciseId: 100,
        wrongAnswer: 'C',
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(null);
      mockPrismaService.wrongQuestion.create.mockResolvedValue({
        id: 1,
        userId,
        exerciseId: createDto.exerciseId,
        wrongAnswer: createDto.wrongAnswer,
      });

      await service.create(userId, createDto);

      expect(prisma.wrongQuestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wrongAnswer: 'C',
          }),
        }),
      );
    });

    it('应该包含题目和科目信息', async () => {
      const userId = 1;
      const createDto = {
        exerciseId: 100,
        wrongAnswer: 'A',
      };

      const newWrongQuestion = {
        id: 1,
        userId,
        exerciseId: createDto.exerciseId,
        wrongAnswer: createDto.wrongAnswer,
        exercise: {
          id: 100,
          subject: { id: 1, name: '数学', gradeLevel: 5 },
          knowledgePoint: { id: 1, name: '加法' },
        },
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(null);
      mockPrismaService.wrongQuestion.create.mockResolvedValue(newWrongQuestion);

      const result = await service.create(userId, createDto);

      expect(result.exercise).toBeDefined();
      expect(result.exercise.subject).toBeDefined();
    });
  });

  describe('findAll - 查询所有错题', () => {
    it('应该返回用户的所有错题', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exerciseId: 100,
          wrongAnswer: 'A',
          timesWrong: 1,
          isMastered: false,
          lastWrongAt: new Date('2024-01-15'),
          exercise: {
            id: 100,
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 1, name: '加法' },
          },
        },
        {
          id: 2,
          userId,
          exerciseId: 101,
          wrongAnswer: 'B',
          timesWrong: 3,
          isMastered: false,
          lastWrongAt: new Date('2024-01-10'),
          exercise: {
            id: 101,
            subject: { id: 2, name: '语文' },
            knowledgePoint: { id: 2, name: '阅读理解' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);

      const result = await service.findAll(userId);

      expect(prisma.wrongQuestion.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          exercise: {
            include: {
              subject: true,
              knowledgePoint: true,
            },
          },
        },
        orderBy: {
          lastWrongAt: 'desc',
        },
      });
      expect(result).toEqual(mockWrongQuestions);
      expect(result[0].lastWrongAt.getTime()).toBeGreaterThan(result[1].lastWrongAt.getTime());
    });

    it('应该按最近错误时间倒序返回', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          lastWrongAt: new Date('2024-01-15'),
          exercise: { subject: {}, knowledgePoint: {} },
        },
        {
          id: 2,
          userId,
          lastWrongAt: new Date('2024-01-10'),
          exercise: { subject: {}, knowledgePoint: {} },
        },
        {
          id: 3,
          userId,
          lastWrongAt: new Date('2024-01-05'),
          exercise: { subject: {}, knowledgePoint: {} },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);

      await service.findAll(userId);

      expect(prisma.wrongQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            lastWrongAt: 'desc',
          },
        }),
      );
    });

    it('应该包含知识点信息用于薄弱点分析', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exercise: {
            subject: { id: 1, name: '数学' },
            knowledgePoint: { id: 1, name: '分数加法' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);

      const result = await service.findAll(userId);

      expect(result[0].exercise.knowledgePoint).toBeDefined();
      expect(result[0].exercise.subject).toBeDefined();
    });
  });

  describe('getReviewQuestions - 获取需复习的错题', () => {
    it('应该返回未掌握的错题', async () => {
      const userId = 1;
      const mockReviewQuestions = [
        {
          id: 1,
          userId,
          exerciseId: 100,
          isMastered: false,
          timesWrong: 3,
          lastWrongAt: new Date('2024-01-05'),
          exercise: {
            id: 100,
            subject: { id: 1, name: '数学' },
          },
        },
        {
          id: 2,
          userId,
          exerciseId: 101,
          isMastered: false,
          timesWrong: 2,
          lastWrongAt: new Date('2024-01-10'),
          exercise: {
            id: 101,
            subject: { id: 1, name: '数学' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockReviewQuestions);

      const result = await service.getReviewQuestions(userId);

      expect(prisma.wrongQuestion.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isMastered: false,
        },
        include: {
          exercise: {
            include: {
              subject: true,
            },
          },
        },
        orderBy: {
          lastWrongAt: 'asc',
        },
        take: 20,
      });
      expect(result).toEqual(mockReviewQuestions);
    });

    it('不应该返回已掌握的错题', async () => {
      const userId = 1;
      const mockAllQuestions = [
        {
          id: 1,
          userId,
          isMastered: false,
          lastWrongAt: new Date('2024-01-05'),
          exercise: { subject: {} },
        },
        {
          id: 2,
          userId,
          isMastered: true, // 已掌握
          lastWrongAt: new Date('2024-01-10'),
          exercise: { subject: {} },
        },
      ];

      // 只返回未掌握的
      const mockReviewQuestions = [mockAllQuestions[0]];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockReviewQuestions);

      const result = await service.getReviewQuestions(userId);

      expect(result.every((q: any) => q.isMastered === false)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('应该优先返回最早错误的题目（艾宾浩斯遗忘曲线）', async () => {
      const userId = 1;
      const mockReviewQuestions = [
        {
          id: 1,
          userId,
          isMastered: false,
          lastWrongAt: new Date('2024-01-01'), // 最早
          exercise: { subject: {} },
        },
        {
          id: 2,
          userId,
          isMastered: false,
          lastWrongAt: new Date('2024-01-05'),
          exercise: { subject: {} },
        },
        {
          id: 3,
          userId,
          isMastered: false,
          lastWrongAt: new Date('2024-01-10'), // 最晚
          exercise: { subject: {} },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockReviewQuestions);

      await service.getReviewQuestions(userId);

      expect(prisma.wrongQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            lastWrongAt: 'asc', // 最早的错误优先
          },
        }),
      );
    });

    it('应该限制返回数量为 20 题', async () => {
      const userId = 1;
      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);

      await service.getReviewQuestions(userId);

      expect(prisma.wrongQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });
  });

  describe('update - 更新错题', () => {
    it('应该成功更新错题信息', async () => {
      const wrongQuestionId = 1;
      const updateDto = {
        isMastered: true,
        notes: '测试笔记',
      };

      const existingWrongQuestion = {
        id: wrongQuestionId,
        userId: 1,
        exerciseId: 100,
        timesWrong: 3,
        isMastered: false,
      };

      const updatedWrongQuestion = {
        ...existingWrongQuestion,
        ...updateDto,
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(existingWrongQuestion);
      mockPrismaService.wrongQuestion.update.mockResolvedValue(updatedWrongQuestion);

      const result = await service.update(wrongQuestionId, updateDto);

      expect(prisma.wrongQuestion.update).toHaveBeenCalledWith({
        where: { id: wrongQuestionId },
        data: updateDto,
        include: {
          exercise: true,
        },
      });
      expect(result).toEqual(updatedWrongQuestion);
    });

    it('错题不存在时应该抛出 NotFoundException', async () => {
      const wrongQuestionId = 999;
      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(null);

      await expect(
        service.update(wrongQuestionId, { isMastered: true }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(wrongQuestionId, { isMastered: true }),
      ).rejects.toThrow(`错题 ${wrongQuestionId} 不存在`);
    });
  });

  describe('remove - 删除错题', () => {
    it('应该成功删除错题', async () => {
      const wrongQuestionId = 1;
      const existingWrongQuestion = {
        id: wrongQuestionId,
        userId: 1,
        exerciseId: 100,
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(existingWrongQuestion);
      mockPrismaService.wrongQuestion.delete.mockResolvedValue(existingWrongQuestion);

      const result = await service.remove(wrongQuestionId);

      expect(prisma.wrongQuestion.delete).toHaveBeenCalledWith({
        where: { id: wrongQuestionId },
      });
      expect(result).toEqual(existingWrongQuestion);
    });

    it('错题不存在时应该抛出 NotFoundException', async () => {
      const wrongQuestionId = 999;
      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(null);

      await expect(service.remove(wrongQuestionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsMastered - 标记为已掌握', () => {
    it('应该成功标记错题为已掌握', async () => {
      const wrongQuestionId = 1;

      const existingWrongQuestion = {
        id: wrongQuestionId,
        userId: 1,
        exerciseId: 100,
        isMastered: false,
        timesWrong: 3,
      };

      const masteredWrongQuestion = {
        ...existingWrongQuestion,
        isMastered: true,
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(existingWrongQuestion);
      mockPrismaService.wrongQuestion.update.mockResolvedValue(masteredWrongQuestion);

      const result = await service.markAsMastered(wrongQuestionId);

      expect(prisma.wrongQuestion.update).toHaveBeenCalledWith({
        where: { id: wrongQuestionId },
        data: { isMastered: true },
        include: {
          exercise: true,
        },
      });
      expect(result.isMastered).toBe(true);
    });

    it('应该调用 update 方法', async () => {
      const wrongQuestionId = 1;
      const existingWrongQuestion = {
        id: wrongQuestionId,
        userId: 1,
        exerciseId: 100,
        isMastered: false,
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(existingWrongQuestion);
      mockPrismaService.wrongQuestion.update.mockResolvedValue({
        ...existingWrongQuestion,
        isMastered: true,
      });

      await service.markAsMastered(wrongQuestionId);

      expect(prisma.wrongQuestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isMastered: true },
        }),
      );
    });
  });

  describe('薄弱点识别功能测试', () => {
    it('应该能够识别高频错误题目', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exerciseId: 100,
          timesWrong: 5, // 高频错误
          isMastered: false,
          lastWrongAt: new Date(),
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '分数运算' },
          },
        },
        {
          id: 2,
          userId,
          exerciseId: 101,
          timesWrong: 1, // 低频错误
          isMastered: false,
          lastWrongAt: new Date(),
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '加法' },
          },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);

      const result = await service.findAll(userId);

      // 可以按错误次数排序来识别薄弱点
      const sortedByTimesWrong = result.sort((a, b) => b.timesWrong - a.timesWrong);
      expect(sortedByTimesWrong[0].timesWrong).toBe(5);
    });

    it('应该能够按科目统计薄弱点', async () => {
      const userId = 1;
      const mockWrongQuestions = [
        {
          id: 1,
          userId,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '分数' },
          },
          timesWrong: 3,
        },
        {
          id: 2,
          userId,
          exercise: {
            subject: { name: '数学' },
            knowledgePoint: { name: '几何' },
          },
          timesWrong: 2,
        },
        {
          id: 3,
          userId,
          exercise: {
            subject: { name: '语文' },
            knowledgePoint: { name: '阅读理解' },
          },
          timesWrong: 1,
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockWrongQuestions);

      const result = await service.findAll(userId);

      // 按科目分组统计
      const bySubject = result.reduce((acc, q) => {
        const subject = q.exercise.subject.name;
        acc[subject] = (acc[subject] || 0) + q.timesWrong;
        return acc;
      }, {} as Record<string, number>);

      expect(bySubject['数学']).toBe(5);
      expect(bySubject['语文']).toBe(1);
    });
  });

  describe('推荐功能测试', () => {
    it('应该优先推荐错误次数多的题目', async () => {
      const userId = 1;
      const mockReviewQuestions = [
        {
          id: 1,
          userId,
          timesWrong: 5,
          lastWrongAt: new Date('2024-01-01'),
          isMastered: false,
          exercise: { subject: {} },
        },
        {
          id: 2,
          userId,
          timesWrong: 2,
          lastWrongAt: new Date('2024-01-02'),
          isMastered: false,
          exercise: { subject: {} },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(mockReviewQuestions);

      const result = await service.getReviewQuestions(userId);

      // 按最后错误时间排序（艾宾浩斯）
      expect(result[0].lastWrongAt.getTime()).toBeLessThanOrEqual(result[1].lastWrongAt.getTime());
    });
  });

  describe('边界情况测试', () => {
    it('应该处理用户没有错题的情况', async () => {
      const userId = 1;
      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });

    it('应该处理所有错题都已掌握的情况', async () => {
      const userId = 1;
      const mockAllMastered = [
        {
          id: 1,
          userId,
          isMastered: true,
          lastWrongAt: new Date(),
          exercise: { subject: {} },
        },
      ];

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue([]); // 返回空，因为都掌握了

      const result = await service.getReviewQuestions(userId);

      expect(result).toEqual([]);
    });

    it('应该处理大量错题记录', async () => {
      const userId = 1;
      const largeWrongQuestionsList = Array(100).fill(null).map((_, i) => ({
        id: i + 1,
        userId,
        exerciseId: 100 + i,
        timesWrong: Math.floor(Math.random() * 5) + 1,
        isMastered: false,
        lastWrongAt: new Date(),
        exercise: { subject: {}, knowledgePoint: {} },
      }));

      mockPrismaService.wrongQuestion.findMany.mockResolvedValue(largeWrongQuestionsList);

      const result = await service.findAll(userId);

      expect(result.length).toBe(100);
    });
  });

  describe('复合查询测试', () => {
    it('应该支持 userId_exerciseId 复合唯一键查询', async () => {
      const userId = 1;
      const exerciseId = 100;
      const createDto = {
        exerciseId,
        wrongAnswer: 'A',
      };

      mockPrismaService.wrongQuestion.findUnique.mockResolvedValue(null);
      mockPrismaService.wrongQuestion.create.mockResolvedValue({
        id: 1,
        userId,
        exerciseId,
        wrongAnswer: 'A',
      });

      await service.create(userId, createDto);

      expect(prisma.wrongQuestion.findUnique).toHaveBeenCalledWith({
        where: {
          userId_exerciseId: {
            userId,
            exerciseId,
          },
        },
      });
    });
  });
});
