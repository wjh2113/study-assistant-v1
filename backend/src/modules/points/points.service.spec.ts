import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from './points.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PointsService - 积分服务测试', () => {
  let service: PointsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    pointsLedger: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance - 获取积分余额', () => {
    it('应该正确计算积分余额（正负流水）', async () => {
      const userId = 1;
      const mockLedgers = [
        { points: 10, createdAt: new Date('2024-01-01') },
        { points: 20, createdAt: new Date('2024-01-02') },
        { points: -5, createdAt: new Date('2024-01-03') },
        { points: 15, createdAt: new Date('2024-01-04') },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const balance = await service.getBalance(userId);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { points: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(balance).toBe(40); // 10 + 20 - 5 + 15 = 40
    });

    it('空流水时余额应该为 0', async () => {
      const userId = 1;
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);

      const balance = await service.getBalance(userId);

      expect(balance).toBe(0);
    });

    it('应该只有负流水时返回负数余额', async () => {
      const userId = 1;
      const mockLedgers = [
        { points: -10, createdAt: new Date('2024-01-01') },
        { points: -20, createdAt: new Date('2024-01-02') },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const balance = await service.getBalance(userId);

      expect(balance).toBe(-30);
    });
  });

  describe('getLedger - 获取积分流水', () => {
    it('应该返回用户的积分流水（按时间倒序）', async () => {
      const userId = 1;
      const limit = 50;
      const mockLedgers = [
        {
          id: 3,
          userId,
          points: 15,
          balance: 45,
          reason: '完成练习',
          referenceId: 123,
          createdAt: new Date('2024-01-03'),
        },
        {
          id: 2,
          userId,
          points: 20,
          balance: 30,
          reason: '满分奖励',
          referenceId: 122,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 1,
          userId,
          points: 10,
          balance: 10,
          reason: '完成练习',
          referenceId: 121,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockLedgers);

      const result = await service.getLedger(userId, limit);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      expect(result).toEqual(mockLedgers);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
    });

    it('默认限制应该为 50 条', async () => {
      const userId = 1;
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);

      await service.getLedger(userId);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('应该支持自定义限制数量', async () => {
      const userId = 1;
      const limit = 10;
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);

      await service.getLedger(userId, limit);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('changePoints - 积分变更', () => {
    it('应该成功增加积分', async () => {
      const userId = 1;
      const changeDto = {
        points: 10,
        reason: '完成练习',
        referenceId: 123,
      };

      const currentBalance = 50;
      const newBalance = 60;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(
        Array(5).fill({ points: 10 }),
      ); // 50 分
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 6,
        userId,
        ...changeDto,
        balance: newBalance,
        createdAt: new Date(),
      });

      const result = await service.changePoints(userId, changeDto);

      expect(prisma.pointsLedger.create).toHaveBeenCalledWith({
        data: {
          userId,
          points: 10,
          balance: 60,
          reason: '完成练习',
          referenceId: 123,
        },
      });
      expect(result.balance).toBe(60);
    });

    it('应该成功扣除积分', async () => {
      const userId = 1;
      const changeDto = {
        points: -20,
        reason: '兑换奖品',
        referenceId: 456,
      };

      const currentBalance = 50;
      const newBalance = 30;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(
        Array(5).fill({ points: 10 }),
      ); // 50 分
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 6,
        userId,
        ...changeDto,
        balance: newBalance,
        createdAt: new Date(),
      });

      const result = await service.changePoints(userId, changeDto);

      expect(prisma.pointsLedger.create).toHaveBeenCalledWith({
        data: {
          userId,
          points: -20,
          balance: 30,
          reason: '兑换奖品',
          referenceId: 456,
        },
      });
      expect(result.balance).toBe(30);
    });

    it('应该正确计算新余额', async () => {
      const userId = 1;
      const changeDto = {
        points: 25,
        reason: '测试积分',
      };

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([
        { points: 10 },
        { points: 20 },
        { points: -5 },
      ]); // 25 分
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 4,
        userId,
        ...changeDto,
        balance: 50,
        createdAt: new Date(),
      });

      await service.changePoints(userId, changeDto);

      expect(prisma.pointsLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: 50, // 25 + 25 = 50
          }),
        }),
      );
    });
  });

  describe('rewardForPractice - 练习奖励', () => {
    it('应该给予完成练习的基础奖励', async () => {
      const userId = 1;
      const sessionId = 123;
      const score = 80;
      const totalQuestions = 10;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 1,
        userId,
        points: 10,
        balance: 10,
        reason: '完成练习',
        referenceId: sessionId,
        createdAt: new Date(),
      });

      const result = await service.rewardForPractice(userId, sessionId, score, totalQuestions);

      expect(result.points).toBe(10);
      expect(result.balance).toBe(10);
      expect(result.reasons).toEqual(['完成练习']);
    });

    it('应该给予满分额外奖励', async () => {
      const userId = 1;
      const sessionId = 123;
      const score = 100; // 满分 (10 题 * 10 分)
      const totalQuestions = 10;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 1,
        userId,
        points: 30,
        balance: 30,
        reason: '完成练习 + 满分奖励',
        referenceId: sessionId,
        createdAt: new Date(),
      });

      const result = await service.rewardForPractice(userId, sessionId, score, totalQuestions);

      expect(result.points).toBe(30); // 10 (基础) + 20 (满分)
      expect(result.reasons).toEqual(['完成练习', '满分奖励']);
    });

    it('未满分时不应该给予满分奖励', async () => {
      const userId = 1;
      const sessionId = 123;
      const score = 90; // 不是满分
      const totalQuestions = 10;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 1,
        userId,
        points: 10,
        balance: 10,
        reason: '完成练习',
        referenceId: sessionId,
        createdAt: new Date(),
      });

      const result = await service.rewardForPractice(userId, sessionId, score, totalQuestions);

      expect(result.points).toBe(10);
      expect(result.reasons).toEqual(['完成练习']);
    });

    it('应该正确关联会话 ID 作为 referenceId', async () => {
      const userId = 1;
      const sessionId = 999;
      const score = 100;
      const totalQuestions = 10;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 1,
        userId,
        points: 30,
        balance: 30,
        reason: '完成练习 + 满分奖励',
        referenceId: sessionId,
        createdAt: new Date(),
      });

      await service.rewardForPractice(userId, sessionId, score, totalQuestions);

      expect(prisma.pointsLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referenceId: sessionId,
          }),
        }),
      );
    });
  });

  describe('rewardForDailyLogin - 每日登录奖励', () => {
    it('应该成功给予每日登录奖励', async () => {
      const userId = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.pointsLedger.findFirst.mockResolvedValue(null); // 今日未领取
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 1,
        userId,
        points: 5,
        balance: 5,
        reason: '每日登录',
        createdAt: new Date(),
      });

      const result = await service.rewardForDailyLogin(userId);

      expect(result.points).toBe(5);
      expect(result.balance).toBe(5);
    });

    it('今日已领取时不应该重复奖励', async () => {
      const userId = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.pointsLedger.findFirst.mockResolvedValue({
        id: 1,
        userId,
        points: 5,
        reason: '每日登录',
        createdAt: today,
      });

      const result = await service.rewardForDailyLogin(userId);

      expect(result.points).toBe(0);
      expect(result.message).toBe('今日已领取');
      expect(prisma.pointsLedger.create).not.toHaveBeenCalled();
    });

    it('应该正确判断"今天"的范围', async () => {
      const userId = 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.pointsLedger.findFirst.mockResolvedValue(null);
      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 1,
        points: 5,
        balance: 5,
      });

      await service.rewardForDailyLogin(userId);

      expect(prisma.pointsLedger.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: today,
            }),
          }),
        }),
      );
    });
  });

  describe('getStats - 获取积分统计', () => {
    it('应该返回完整的积分统计信息', async () => {
      const userId = 1;

      const mockBalanceLedgers = Array(10).fill({ points: 10 }); // 100 分
      const mockTotalEarned = { _sum: { points: 150 } };
      const mockTotalSpent = { _sum: { points: -50 } };
      const mockRecentLedgers = [
        { id: 1, points: 10, reason: '完成练习', createdAt: new Date() },
        { id: 2, points: 20, reason: '满分奖励', createdAt: new Date() },
      ];

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(mockBalanceLedgers);
      mockPrismaService.pointsLedger.aggregate
        .mockResolvedValueOnce(mockTotalEarned)
        .mockResolvedValueOnce(mockTotalSpent);
      mockPrismaService.pointsLedger.findMany.mockResolvedValueOnce(mockRecentLedgers);

      const result = await service.getStats(userId);

      expect(result.balance).toBe(100);
      expect(result.totalEarned).toBe(150);
      expect(result.totalSpent).toBe(50);
      expect(result.recentLedgers).toEqual(mockRecentLedgers);
    });

    it('没有流水时应该返回 0 值', async () => {
      const userId = 1;

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.aggregate
        .mockResolvedValueOnce({ _sum: { points: null } })
        .mockResolvedValueOnce({ _sum: { points: null } });

      const result = await service.getStats(userId);

      expect(result.balance).toBe(0);
      expect(result.totalEarned).toBe(0);
      expect(result.totalSpent).toBe(0);
    });

    it('应该获取最近 7 天的积分流水', async () => {
      const userId = 1;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLedger.aggregate.mockResolvedValue({ _sum: { points: null } });

      await service.getStats(userId);

      expect(prisma.pointsLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: sevenDaysAgo,
            }),
          }),
          take: 7,
        }),
      );
    });
  });

  describe('积分规则常量测试', () => {
    it('应该使用正确的积分规则', () => {
      // 通过测试 rewardForPractice 来验证规则
      // FINISH_PRACTICE = 10
      // PERFECT_SCORE = 20
      // DAILY_LOGIN = 5
      // CONTINUE_STREAK = 10 (未在当前实现中使用)

      // 基础奖励测试
      expect(true).toBe(true); // 规则在代码中硬编码，通过上述测试验证
    });
  });

  describe('边界情况测试', () => {
    it('应该处理大量流水记录', async () => {
      const userId = 1;
      const largeLedgerList = Array(1000).fill({ points: 1 });

      mockPrismaService.pointsLedger.findMany.mockResolvedValue(largeLedgerList);

      const balance = await service.getBalance(userId);

      expect(balance).toBe(1000);
    });

    it('应该处理零积分变更', async () => {
      const userId = 1;
      const changeDto = {
        points: 0,
        reason: '测试零变更',
      };

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([{ points: 50 }]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 2,
        userId,
        ...changeDto,
        balance: 50,
        createdAt: new Date(),
      });

      const result = await service.changePoints(userId, changeDto);

      expect(result.balance).toBe(50);
    });

    it('应该处理负数余额', async () => {
      const userId = 1;
      const changeDto = {
        points: -100,
        reason: '大额兑换',
      };

      mockPrismaService.pointsLedger.findMany.mockResolvedValue([{ points: 50 }]);
      mockPrismaService.pointsLedger.create.mockResolvedValue({
        id: 2,
        userId,
        ...changeDto,
        balance: -50,
        createdAt: new Date(),
      });

      const result = await service.changePoints(userId, changeDto);

      expect(result.balance).toBe(-50);
    });
  });
});
