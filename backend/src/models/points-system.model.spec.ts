import { PrismaClient } from '@prisma/client';

/**
 * PointsSystem 模型测试
 * 测试积分系统相关的所有 CRUD 操作、积分计算和边界情况
 */
describe('PointsSystem Model Tests', () => {
  let prisma: PrismaClient;
  let user: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestData();

    user = await prisma.user.create({
      data: {
        username: 'points_test_user',
        email: 'points@example.com',
        phone: '13890200001',
        password: 'password',
        role: 'STUDENT',
        grade: 5,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  const cleanupTestData = async () => {
    await prisma.pointsLedger.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.user.deleteMany({ where: { id: { gte: 9000 } } });
  };

  describe('PointsLedger CRUD Operations', () => {
    let initialRecord: PointsLedger;

    it('应该成功创建积分记录 - 初始积分', async () => {
      initialRecord = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 100,
          balance: 100,
          reason: 'INITIAL_BONUS',
          referenceId: null,
        },
      });

      expect(initialRecord.id).toBeGreaterThanOrEqual(9000);
      expect(initialRecord.userId).toBe(user.id);
      expect(initialRecord.points).toBe(100);
      expect(initialRecord.balance).toBe(100);
      expect(initialRecord.reason).toBe('INITIAL_BONUS');
      expect(initialRecord.createdAt).toBeInstanceOf(Date);
    });

    it('应该成功创建积分记录 - 完成任务奖励', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 10,
          balance: 110,
          reason: 'COMPLETE_EXERCISE',
          referenceId: 1,
        },
      });

      expect(record.points).toBe(10);
      expect(record.balance).toBe(110);
      expect(record.reason).toBe('COMPLETE_EXERCISE');
      expect(record.referenceId).toBe(1);
    });

    it('应该成功创建积分记录 - 连续打卡奖励', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 50,
          balance: 160,
          reason: 'DAILY_CHECKIN_STREAK',
          referenceId: null,
        },
      });

      expect(record.points).toBe(50);
      expect(record.balance).toBe(160);
      expect(record.reason).toBe('DAILY_CHECKIN_STREAK');
    });

    it('应该成功创建积分记录 - 扣分（负积分）', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: -5,
          balance: 155,
          reason: 'PENALTY',
          referenceId: null,
        },
      });

      expect(record.points).toBe(-5);
      expect(record.balance).toBe(155);
      expect(record.reason).toBe('PENALTY');
    });

    it('应该成功查询积分记录', async () => {
      const record = await prisma.pointsLedger.findUnique({
        where: { id: initialRecord.id },
      });

      expect(record).not.toBeNull();
      expect(record?.id).toBe(initialRecord.id);
      expect(record?.balance).toBe(initialRecord.balance);
    });

    it('应该成功查询用户的所有积分记录', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(records.length).toBeGreaterThanOrEqual(4);
    });

    it('应该查询包含用户信息的积分记录', async () => {
      const recordWithUser = await prisma.pointsLedger.findUnique({
        where: { id: initialRecord.id },
        include: { user: true },
      });

      expect(recordWithUser).not.toBeNull();
      expect(recordWithUser?.user).toBeDefined();
      expect(recordWithUser?.user.username).toBe('points_test_user');
    });

    it('应该删除积分记录', async () => {
      const testRecord = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 1,
          balance: 156,
          reason: 'TEST',
        },
      });

      const deleted = await prisma.pointsLedger.delete({
        where: { id: testRecord.id },
      });

      expect(deleted.id).toBe(testRecord.id);

      const found = await prisma.pointsLedger.findUnique({
        where: { id: testRecord.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Points Reason Types', () => {
    const reasons = [
      'INITIAL_BONUS',
      'DAILY_CHECKIN',
      'DAILY_CHECKIN_STREAK',
      'COMPLETE_EXERCISE',
      'CORRECT_ANSWER',
      'PERFECT_SCORE',
      'FIRST_BLOOD',
      'CONTINUOUS_PRACTICE',
      'LEVEL_UP',
      'ACHIEVEMENT_UNLOCK',
      'INVITE_FRIEND',
      'COMPLETE_STUDY_PLAN',
      'MASTER_KNOWLEDGE_POINT',
      'PENALTY',
      'ADMIN_ADJUSTMENT',
      'REFUND',
    ];

    it.each(reasons)('应该支持积分原因：%s', async (reason) => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: reason === 'PENALTY' ? -10 : 10,
          balance: 200,
          reason,
        },
      });

      expect(record.reason).toBe(reason);
    });
  });

  describe('Points Calculation', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          username: 'points_calc_user',
          email: 'pointscalc@example.com',
          phone: '13890200002',
          password: 'password',
          role: 'STUDENT',
          grade: 5,
        },
      });
    });

    it('应该计算用户总积分收入', async () => {
      // 创建多条积分记录
      await prisma.pointsLedger.create({
        data: {
          userId: testUser.id,
          points: 100,
          balance: 100,
          reason: 'INITIAL',
        },
      });

      await prisma.pointsLedger.create({
        data: {
          userId: testUser.id,
          points: 20,
          balance: 120,
          reason: 'EXERCISE',
        },
      });

      await prisma.pointsLedger.create({
        data: {
          userId: testUser.id,
          points: 30,
          balance: 150,
          reason: 'ACHIEVEMENT',
        },
      });

      const totalIncome = await prisma.pointsLedger.aggregate({
        where: {
          userId: testUser.id,
          points: { gt: 0 },
        },
        _sum: { points: true },
      });

      expect(totalIncome._sum.points).toBe(150);
    });

    it('应该计算用户总积分支出', async () => {
      await prisma.pointsLedger.create({
        data: {
          userId: testUser.id,
          points: -10,
          balance: 140,
          reason: 'PENALTY',
        },
      });

      const totalExpense = await prisma.pointsLedger.aggregate({
        where: {
          userId: testUser.id,
          points: { lt: 0 },
        },
        _sum: { points: true },
      });

      expect(totalExpense._sum.points).toBe(-10);
    });

    it('应该获取用户当前余额（最新记录）', async () => {
      const latestRecord = await prisma.pointsLedger.findFirst({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(latestRecord).not.toBeNull();
      expect(latestRecord?.balance).toBe(140);
    });

    it('应该验证余额计算正确性', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'asc' },
      });

      let calculatedBalance = 0;
      for (const record of records) {
        calculatedBalance += record.points;
        expect(record.balance).toBe(calculatedBalance);
      }
    });
  });

  describe('Points Boundary Tests', () => {
    it('应该允许积分值为 0', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 0,
          balance: 155,
          reason: 'ZERO_TEST',
        },
      });

      expect(record.points).toBe(0);
      expect(record.balance).toBe(155);
    });

    it('应该允许很大的积分值', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 10000,
          balance: 10155,
          reason: 'BIG_BONUS',
        },
      });

      expect(record.points).toBe(10000);
      expect(record.balance).toBe(10155);
    });

    it('应该允许很大的负积分值', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: -1000,
          balance: 9155,
          reason: 'BIG_PENALTY',
        },
      });

      expect(record.points).toBe(-1000);
      expect(record.balance).toBe(9155);
    });

    it('应该允许余额为 0', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: -9155,
          balance: 0,
          reason: 'CLEAR_ALL',
        },
      });

      expect(record.balance).toBe(0);
    });

    it('应该允许负余额（透支场景）', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: -100,
          balance: -100,
          reason: 'OVERDRAFT',
        },
      });

      expect(record.balance).toBe(-100);
    });

    it('应该允许 referenceId 为 null', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 10,
          balance: 10,
          reason: 'NO_REFERENCE',
          referenceId: null,
        },
      });

      expect(record.referenceId).toBeNull();
    });

    it('应该允许 referenceId 有值', async () => {
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 10,
          balance: 20,
          reason: 'WITH_REFERENCE',
          referenceId: 999,
        },
      });

      expect(record.referenceId).toBe(999);
    });
  });

  describe('Points Query Filters', () => {
    it('应该按积分原因筛选', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: {
          userId: user.id,
          reason: 'PENALTY',
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
      records.forEach(r => {
        expect(r.reason).toBe('PENALTY');
      });
    });

    it('应该按正负积分筛选 - 收入', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: {
          userId: user.id,
          points: { gt: 0 },
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
      records.forEach(r => {
        expect(r.points).toBeGreaterThan(0);
      });
    });

    it('应该按正负积分筛选 - 支出', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: {
          userId: user.id,
          points: { lt: 0 },
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
      records.forEach(r => {
        expect(r.points).toBeLessThan(0);
      });
    });

    it('应该按时间范围筛选', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const records = await prisma.pointsLedger.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: yesterday,
            lte: now,
          },
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('应该按余额范围筛选', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: {
          userId: user.id,
          balance: {
            gte: 0,
            lte: 1000,
          },
        },
      });

      records.forEach(r => {
        expect(r.balance).toBeGreaterThanOrEqual(0);
        expect(r.balance).toBeLessThanOrEqual(1000);
      });
    });

    it('应该支持排序 - 按创建时间', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      for (let i = 1; i < records.length; i++) {
        expect(records[i].createdAt.getTime()).toBeLessThanOrEqual(
          records[i - 1].createdAt.getTime()
        );
      }
    });

    it('应该支持排序 - 按积分值', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: { userId: user.id },
        orderBy: { points: 'desc' },
      });

      for (let i = 1; i < records.length; i++) {
        expect(records[i].points).toBeLessThanOrEqual(records[i - 1].points);
      }
    });
  });

  describe('Points Multiple Users', () => {
    let user1: User;
    let user2: User;

    beforeEach(async () => {
      user1 = await prisma.user.create({
        data: {
          username: 'points_user1',
          email: 'points1@example.com',
          phone: '13890200011',
          password: 'password',
          role: 'STUDENT',
          grade: 5,
        },
      });

      user2 = await prisma.user.create({
        data: {
          username: 'points_user2',
          email: 'points2@example.com',
          phone: '13890200012',
          password: 'password',
          role: 'STUDENT',
          grade: 5,
        },
      });

      await prisma.pointsLedger.create({
        data: {
          userId: user1.id,
          points: 100,
          balance: 100,
          reason: 'INITIAL',
        },
      });

      await prisma.pointsLedger.create({
        data: {
          userId: user2.id,
          points: 200,
          balance: 200,
          reason: 'INITIAL',
        },
      });
    });

    it('应该查询每个用户的积分记录', async () => {
      const user1Records = await prisma.pointsLedger.findMany({
        where: { userId: user1.id },
      });

      const user2Records = await prisma.pointsLedger.findMany({
        where: { userId: user2.id },
      });

      expect(user1Records.length).toBe(1);
      expect(user2Records.length).toBe(1);
      expect(user1Records[0].balance).toBe(100);
      expect(user2Records[0].balance).toBe(200);
    });

    it('应该统计所有用户的总积分', async () => {
      const result = await prisma.pointsLedger.aggregate({
        _sum: { points: true },
      });

      expect(result._sum.points).toBeGreaterThan(0);
    });

    it('应该按用户分组统计积分', async () => {
      const grouped = await prisma.pointsLedger.groupBy({
        by: ['userId'],
        _sum: { points: true },
        _count: true,
      });

      expect(grouped.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Points Timestamp Tests', () => {
    it('createdAt 应该在创建时自动设置', async () => {
      const beforeCreate = new Date();
      const record = await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: 1,
          balance: 1,
          reason: 'TIMESTAMP_TEST',
        },
      });
      const afterCreate = new Date();

      expect(record.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(record.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Points Ledger Integrity', () => {
    it('应该保证余额计算连续性', async () => {
      const records = await prisma.pointsLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (records.length === 0) return;

      let expectedBalance = 0;
      for (const record of records) {
        expectedBalance += record.points;
        expect(record.balance).toBe(expectedBalance);
      }
    });

    it('应该支持查询第一条记录', async () => {
      const firstRecord = await prisma.pointsLedger.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(firstRecord).not.toBeNull();
    });

    it('应该支持查询最后一条记录', async () => {
      const lastRecord = await prisma.pointsLedger.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(lastRecord).not.toBeNull();
    });
  });
});
