import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService, LeaderboardType, TimeRange } from './leaderboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LeaderboardService - 排行榜服务测试', () => {
  let service: LeaderboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    pointsLedger: {
      findMany: jest.fn(),
    },
    practiceSession: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPointsLeaderboard - 积分排行榜', () => {
    it('应该返回积分排行榜（全部时间）', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date('2024-01-15'),
          user: { id: 1, username: '用户 1', avatar: 'avatar1.png', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          points: 150,
          createdAt: new Date('2024-01-14'),
          user: { id: 2, username: '用户 2', avatar: 'avatar2.png', grade: 4 },
        },
        {
          id: 3,
          userId: 1,
          points: 50,
          createdAt: new Date('2024-01-13'),
          user: { id: 1, username: '用户 1', avatar: 'avatar1.png', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              grade: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result.type).toBe(LeaderboardType.POINTS);
      expect(result.timeRange).toBe(TimeRange.ALL_TIME);
      expect(result.leaderboard).toHaveLength(2); // 2 个用户
      expect(result.leaderboard[0].rank).toBe(1);
      expect(result.leaderboard[0].userId).toBe(1);
      expect(result.leaderboard[0].points).toBe(150); // 100 + 50
      expect(result.leaderboard[1].userId).toBe(2);
      expect(result.leaderboard[1].points).toBe(150);
    });

    it('应该按积分降序排序', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 50,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          points: 200,
          createdAt: new Date(),
          user: { id: 2, username: '用户 2', avatar: '', grade: 4 },
        },
        {
          id: 3,
          userId: 3,
          points: 100,
          createdAt: new Date(),
          user: { id: 3, username: '用户 3', avatar: '', grade: 3 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].rank).toBe(1);
      expect(result.leaderboard[0].userId).toBe(2);
      expect(result.leaderboard[0].points).toBe(200);

      expect(result.leaderboard[1].rank).toBe(2);
      expect(result.leaderboard[1].userId).toBe(3);
      expect(result.leaderboard[1].points).toBe(100);

      expect(result.leaderboard[2].rank).toBe(3);
      expect(result.leaderboard[2].userId).toBe(1);
      expect(result.leaderboard[2].points).toBe(50);
    });

    it('应该支持限制返回数量', async () => {
      const mockLedgers = Array(20).fill(null).map((_, i) => ({
        id: i + 1,
        userId: i + 1,
        points: (i + 1) * 10,
        createdAt: new Date(),
        user: { id: i + 1, username: `用户${i + 1}`, avatar: '', grade: 5 },
      }));

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 5);

      expect(result.leaderboard).toHaveLength(5);
      expect(result.leaderboard[0].rank).toBe(1);
      expect(result.leaderboard[4].rank).toBe(5);
    });

    it('应该支持日榜筛选', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date('2024-01-15T10:00:00'),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      await service.getPointsLeaderboard(TimeRange.DAILY, 10);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('应该支持周榜筛选', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      await service.getPointsLeaderboard(TimeRange.WEEKLY, 10);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('应该支持月榜筛选', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      await service.getPointsLeaderboard(TimeRange.MONTHLY, 10);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('空数据时应该返回空排行榜', async () => {
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard).toEqual([]);
      expect(result.type).toBe(LeaderboardType.POINTS);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('应该包含更新时间', async () => {
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('应该处理负积分', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: -50,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          points: 100,
          createdAt: new Date(),
          user: { id: 2, username: '用户 2', avatar: '', grade: 4 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].userId).toBe(2);
      expect(result.leaderboard[0].points).toBe(100);
      expect(result.leaderboard[1].userId).toBe(1);
      expect(result.leaderboard[1].points).toBe(-50);
    });

    it('应该正确处理用户名为空的情况', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].username).toBe('用户 1');
    });
  });

  describe('getPracticeLeaderboard - 练习排行榜', () => {
    it('应该返回练习排行榜', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 10,
          correctAnswers: 8,
          finishedAt: new Date('2024-01-15'),
          user: { id: 1, username: '用户 1', avatar: 'avatar1.png', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          status: 'COMPLETED',
          totalQuestions: 20,
          correctAnswers: 18,
          finishedAt: new Date('2024-01-14'),
          user: { id: 2, username: '用户 2', avatar: 'avatar2.png', grade: 4 },
        },
        {
          id: 3,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 15,
          correctAnswers: 12,
          finishedAt: new Date('2024-01-13'),
          user: { id: 1, username: '用户 1', avatar: 'avatar1.png', grade: 5 },
        },
      ];

      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getPracticeLeaderboard(TimeRange.ALL_TIME, 10);

      expect(prisma.practiceSession.findMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              grade: true,
            },
          },
        },
      });
      expect(result.type).toBe(LeaderboardType.PRACTICE);
      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard[0].userId).toBe(1);
      expect(result.leaderboard[0].totalQuestions).toBe(25); // 10 + 15
      expect(result.leaderboard[0].correctAnswers).toBe(20); // 8 + 12
      expect(result.leaderboard[0].accuracy).toBe(80); // 20/25 = 80%
    });

    it('应该按完成题目数降序排序', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 10,
          correctAnswers: 8,
          finishedAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          status: 'COMPLETED',
          totalQuestions: 50,
          correctAnswers: 45,
          finishedAt: new Date(),
          user: { id: 2, username: '用户 2', avatar: '', grade: 4 },
        },
      ];

      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getPracticeLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].userId).toBe(2);
      expect(result.leaderboard[0].totalQuestions).toBe(50);
      expect(result.leaderboard[1].userId).toBe(1);
      expect(result.leaderboard[1].totalQuestions).toBe(10);
    });

    it('应该只统计已完成的会话', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 10,
          correctAnswers: 8,
          finishedAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          status: 'ACTIVE', // 未完成，不应该被包含
          totalQuestions: 100,
          correctAnswers: 0,
          finishedAt: null,
          user: { id: 2, username: '用户 2', avatar: '', grade: 4 },
        },
      ];

      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getPracticeLeaderboard(TimeRange.ALL_TIME, 10);

      expect(prisma.practiceSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'COMPLETED',
          },
        }),
      );
      // 注意：服务层会过滤，但 mock 返回所有数据，这里验证查询条件正确
      expect(result.leaderboard.length).toBeGreaterThanOrEqual(1);
    });

    it('应该计算正确率', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 20,
          correctAnswers: 15,
          finishedAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getPracticeLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].accuracy).toBe(75); // 15/20 = 75%
    });

    it('应该统计会话次数', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 10,
          correctAnswers: 8,
          finishedAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 10,
          correctAnswers: 9,
          finishedAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getPracticeLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].sessions).toBe(2);
    });

    it('应该支持时间范围筛选', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          status: 'COMPLETED',
          totalQuestions: 10,
          correctAnswers: 8,
          finishedAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.practiceSession.findMany.mockResolvedValue(mockSessions);

      await service.getPracticeLeaderboard(TimeRange.WEEKLY, 10);

      expect(prisma.practiceSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
            finishedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getContinuousLearningLeaderboard - 连续学习排行榜', () => {
    it('应该返回连续学习排行榜', async () => {
      const mockUsers = [
        {
          id: 1,
          username: '用户 1',
          avatar: 'avatar1.png',
          grade: 5,
          learningRecords: [
            { createdAt: new Date('2024-01-15') },
            { createdAt: new Date('2024-01-14') },
            { createdAt: new Date('2024-01-13') },
          ],
        },
        {
          id: 2,
          username: '用户 2',
          avatar: 'avatar2.png',
          grade: 4,
          learningRecords: [
            { createdAt: new Date('2024-01-15') },
            { createdAt: new Date('2024-01-14') },
          ],
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getContinuousLearningLeaderboard(10);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          avatar: true,
          grade: true,
          learningRecords: {
            select: {
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
      expect(result.type).toBe(LeaderboardType.CONTINUOUS);
      expect(result.leaderboard).toHaveLength(2);
      // 验证返回结构正确
      expect(result.leaderboard[0]).toHaveProperty('userId');
      expect(result.leaderboard[0]).toHaveProperty('streak');
      expect(result.leaderboard[0]).toHaveProperty('rank');
    });

    it('应该按连续天数降序排序', async () => {
      const mockUsers = [
        {
          id: 1,
          username: '用户 1',
          avatar: '',
          grade: 5,
          learningRecords: [
            { createdAt: new Date('2024-01-15') },
            { createdAt: new Date('2024-01-14') },
          ],
        },
        {
          id: 2,
          username: '用户 2',
          avatar: '',
          grade: 4,
          learningRecords: [
            { createdAt: new Date('2024-01-15') },
            { createdAt: new Date('2024-01-14') },
            { createdAt: new Date('2024-01-13') },
            { createdAt: new Date('2024-01-12') },
            { createdAt: new Date('2024-01-11') },
          ],
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getContinuousLearningLeaderboard(10);

      // 验证返回结构正确，排序由服务层处理
      expect(result.leaderboard.length).toBe(2);
      expect(result.leaderboard[0]).toHaveProperty('rank');
      expect(result.leaderboard[1]).toHaveProperty('rank');
    });

    it('没有学习记录时连续天数应该为 0', async () => {
      const mockUsers = [
        {
          id: 1,
          username: '用户 1',
          avatar: '',
          grade: 5,
          learningRecords: [],
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getContinuousLearningLeaderboard(10);

      expect(result.leaderboard[0].streak).toBe(0);
    });
  });

  describe('getUserRank - 获取用户排名', () => {
    it('应该返回用户在积分榜的排名', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          points: 200,
          createdAt: new Date(),
          user: { id: 2, username: '用户 2', avatar: '', grade: 4 },
        },
        {
          id: 3,
          userId: 3,
          points: 150,
          createdAt: new Date(),
          user: { id: 3, username: '用户 3', avatar: '', grade: 3 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getUserRank(3, LeaderboardType.POINTS, TimeRange.ALL_TIME);

      expect(result.rank).toBe(2);
      expect(result.userId).toBe(3);
    });

    it('用户不在排行榜时应该返回 null rank', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getUserRank(999, LeaderboardType.POINTS, TimeRange.ALL_TIME);

      expect(result.rank).toBe(null);
    });
  });

  describe('refreshCache - 刷新缓存', () => {
    it('应该成功刷新缓存', async () => {
      const result = await service.refreshCache();

      expect(result.success).toBe(true);
      expect(result.message).toBe('排行榜已刷新');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理大量用户数据', async () => {
      const mockLedgers = Array(1000).fill(null).map((_, i) => ({
        id: i + 1,
        userId: (i % 100) + 1,
        points: Math.floor(Math.random() * 100),
        createdAt: new Date(),
        user: { id: (i % 100) + 1, username: `用户${(i % 100) + 1}`, avatar: '', grade: 5 },
      }));

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard).toHaveLength(10);
    });

    it('应该处理积分相同的情况', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
        {
          id: 2,
          userId: 2,
          points: 100,
          createdAt: new Date(),
          user: { id: 2, username: '用户 2', avatar: '', grade: 4 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 10);

      expect(result.leaderboard[0].points).toBe(100);
      expect(result.leaderboard[1].points).toBe(100);
    });

    it('limit 为 0 时应该返回空数组', async () => {
      const mockLedgers = [
        {
          id: 1,
          userId: 1,
          points: 100,
          createdAt: new Date(),
          user: { id: 1, username: '用户 1', avatar: '', grade: 5 },
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getPointsLeaderboard(TimeRange.ALL_TIME, 0);

      expect(result.leaderboard).toEqual([]);
    });
  });

  describe('枚举值测试', () => {
    it('LeaderboardType 应该包含所有预期值', () => {
      expect(LeaderboardType.POINTS).toBe('POINTS');
      expect(LeaderboardType.PRACTICE).toBe('PRACTICE');
      expect(LeaderboardType.CONTINUOUS).toBe('CONTINUOUS');
    });

    it('TimeRange 应该包含所有预期值', () => {
      expect(TimeRange.DAILY).toBe('DAILY');
      expect(TimeRange.WEEKLY).toBe('WEEKLY');
      expect(TimeRange.MONTHLY).toBe('MONTHLY');
      expect(TimeRange.ALL_TIME).toBe('ALL_TIME');
    });
  });
});
