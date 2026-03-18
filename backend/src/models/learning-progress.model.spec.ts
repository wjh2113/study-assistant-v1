import { PrismaClient } from '@prisma/client';

/**
 * LearningProgress 模型测试
 * 测试学习记录相关的所有 CRUD 操作和边界情况
 */
describe('LearningProgress Model Tests', () => {
  let prisma: PrismaClient;
  let user: any;
  let textbook: any;
  let unit: any;
  let session: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestData();

    user = await prisma.user.create({
      data: {
        username: 'learning_test_user',
        email: 'learning@example.com',
        phone: '13890100001',
        password: 'password',
        role: 'STUDENT',
        grade: 5,
      },
    });

    textbook = await prisma.textbook.create({
      data: {
        userId: user.id,
        title: '数学五年级上册',
        subject: '数学',
        grade: 5,
        version: '人教版',
        pdfUrl: 'https://example.com/math.pdf',
        pdfPath: '/ftp/math.pdf',
        status: 'READY',
      },
    });

    unit = await prisma.textbookUnit.create({
      data: {
        textbookId: textbook.id,
        title: '第一单元：小数乘法',
        unitNumber: 'Unit 1',
        pageStart: 1,
        pageEnd: 20,
        sortOrder: 1,
      },
    });

    session = await prisma.practiceSession.create({
      data: {
        userId: user.id,
        textbookId: textbook.id,
        unitId: unit.id,
        status: 'ACTIVE',
        totalQuestions: 10,
        correctAnswers: 0,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  const cleanupTestData = async () => {
    await prisma.exerciseRecord.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.learningRecord.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.practiceSession.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.textbookUnit.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.textbook.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.user.deleteMany({ where: { id: { gte: 9000 } } });
  };

  describe('LearningRecord CRUD Operations', () => {
    let createdRecord: LearningRecord;

    it('应该成功创建学习记录 - 开始练习', async () => {
      createdRecord = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          textbookId: textbook.id,
          unitId: unit.id,
          actionType: 'START_PRACTICE',
          duration: 0,
          score: null,
          metadata: JSON.stringify({ questionCount: 10 }),
        },
      });

      expect(createdRecord.id).toBeGreaterThanOrEqual(9000);
      expect(createdRecord.userId).toBe(user.id);
      expect(createdRecord.sessionId).toBe(session.id);
      expect(createdRecord.textbookId).toBe(textbook.id);
      expect(createdRecord.unitId).toBe(unit.id);
      expect(createdRecord.actionType).toBe('START_PRACTICE');
      expect(createdRecord.duration).toBe(0);
      expect(createdRecord.createdAt).toBeInstanceOf(Date);
    });

    it('应该成功创建学习记录 - 完成练习', async () => {
      const finishRecord = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          textbookId: textbook.id,
          unitId: unit.id,
          actionType: 'FINISH_PRACTICE',
          duration: 600,
          score: 85,
          metadata: JSON.stringify({ correctCount: 8, totalCount: 10 }),
        },
      });

      expect(finishRecord.actionType).toBe('FINISH_PRACTICE');
      expect(finishRecord.duration).toBe(600);
      expect(finishRecord.score).toBe(85);
    });

    it('应该成功创建学习记录 - 查看课本', async () => {
      const viewRecord = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          textbookId: textbook.id,
          unitId: unit.id,
          actionType: 'VIEW_TEXTBOOK',
          duration: 120,
          metadata: JSON.stringify({ page: 5 }),
        },
      });

      expect(viewRecord.actionType).toBe('VIEW_TEXTBOOK');
      expect(viewRecord.duration).toBe(120);
    });

    it('应该成功创建学习记录 - 无会话 ID', async () => {
      const recordNoSession = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          textbookId: textbook.id,
          actionType: 'VIEW_TEXTBOOK',
          duration: 60,
        },
      });

      expect(recordNoSession.sessionId).toBeNull();
      expect(recordNoSession.textbookId).toBe(textbook.id);
    });

    it('应该成功查询学习记录', async () => {
      const record = await prisma.learningRecord.findUnique({
        where: { id: createdRecord.id },
      });

      expect(record).not.toBeNull();
      expect(record?.id).toBe(createdRecord.id);
      expect(record?.actionType).toBe(createdRecord.actionType);
    });

    it('应该成功查询用户的所有学习记录', async () => {
      const records = await prisma.learningRecord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(records.length).toBeGreaterThanOrEqual(3);
    });

    it('应该成功查询包含关联数据的学习记录', async () => {
      const recordWithUser = await prisma.learningRecord.findUnique({
        where: { id: createdRecord.id },
        include: { user: true },
      });

      expect(recordWithUser).not.toBeNull();
      expect(recordWithUser?.user).toBeDefined();
      expect(recordWithUser?.user.username).toBe('learning_test_user');
    });

    it('应该删除学习记录', async () => {
      const testRecord = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'TEST_ACTION',
          duration: 10,
        },
      });

      const deleted = await prisma.learningRecord.delete({
        where: { id: testRecord.id },
      });

      expect(deleted.id).toBe(testRecord.id);

      const found = await prisma.learningRecord.findUnique({
        where: { id: testRecord.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('LearningRecord Action Types', () => {
    const actionTypes = [
      'START_PRACTICE',
      'FINISH_PRACTICE',
      'VIEW_TEXTBOOK',
      'VIEW_EXERCISE',
      'SUBMIT_ANSWER',
      'VIEW_WRONG_QUESTION',
      'REVIEW_KNOWLEDGE_POINT',
      'TAKE_TEST',
      'VIEW_REPORT',
    ];

    it.each(actionTypes)('应该支持动作类型：%s', async (actionType) => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType,
          duration: 30,
        },
      });

      expect(record.actionType).toBe(actionType);
    });
  });

  describe('LearningRecord Metadata', () => {
    it('应该存储复杂的元数据 - 练习详情', async () => {
      const metadata = {
        questionCount: 10,
        correctCount: 8,
        wrongCount: 2,
        timePerQuestion: [5, 10, 15, 8, 12, 20, 7, 9, 11, 6],
        knowledgePoints: [1, 2, 3],
        difficulty: 'MEDIUM',
      };

      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'FINISH_PRACTICE',
          duration: 600,
          score: 80,
          metadata: JSON.stringify(metadata),
        },
      });

      const parsed = JSON.parse(record.metadata || '{}');
      expect(parsed.questionCount).toBe(10);
      expect(parsed.correctCount).toBe(8);
      expect(parsed.wrongCount).toBe(2);
      expect(parsed.timePerQuestion.length).toBe(10);
    });

    it('应该存储复杂的元数据 - 课本浏览', async () => {
      const metadata = {
        unitId: unit.id,
        pages: [1, 2, 3, 4, 5],
        timePerPage: [30, 45, 60, 40, 35],
        scrolled: true,
      };

      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'VIEW_TEXTBOOK',
          duration: 210,
          metadata: JSON.stringify(metadata),
        },
      });

      const parsed = JSON.parse(record.metadata || '{}');
      expect(parsed.pages.length).toBe(5);
      expect(parsed.scrolled).toBe(true);
    });

    it('应该允许 null metadata', async () => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'SIMPLE_ACTION',
          duration: 10,
          metadata: null,
        },
      });

      expect(record.metadata).toBeNull();
    });
  });

  describe('LearningRecord Query Filters', () => {
    it('应该按动作类型筛选', async () => {
      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          actionType: 'FINISH_PRACTICE',
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
      records.forEach(r => {
        expect(r.actionType).toBe('FINISH_PRACTICE');
      });
    });

    it('应该按课本 ID 筛选', async () => {
      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          textbookId: textbook.id,
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(3);
      records.forEach(r => {
        expect(r.textbookId).toBe(textbook.id);
      });
    });

    it('应该按单元 ID 筛选', async () => {
      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          unitId: unit.id,
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(2);
      records.forEach(r => {
        expect(r.unitId).toBe(unit.id);
      });
    });

    it('应该按会话 ID 筛选', async () => {
      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          sessionId: session.id,
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(2);
      records.forEach(r => {
        expect(r.sessionId).toBe(session.id);
      });
    });

    it('应该按时间范围筛选', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: yesterday,
            lte: now,
          },
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(3);
    });

    it('应该按分数范围筛选', async () => {
      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          score: {
            gte: 80,
            lte: 90,
          },
        },
      });

      records.forEach(r => {
        if (r.score !== null) {
          expect(r.score).toBeGreaterThanOrEqual(80);
          expect(r.score).toBeLessThanOrEqual(90);
        }
      });
    });

    it('应该支持排序 - 按创建时间', async () => {
      const records = await prisma.learningRecord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      for (let i = 1; i < records.length; i++) {
        expect(records[i].createdAt.getTime()).toBeLessThanOrEqual(
          records[i - 1].createdAt.getTime()
        );
      }
    });

    it('应该支持排序 - 按分数', async () => {
      const records = await prisma.learningRecord.findMany({
        where: {
          userId: user.id,
          score: { not: null },
        },
        orderBy: { score: 'desc' },
      });

      for (let i = 1; i < records.length; i++) {
        if (records[i].score !== null && records[i - 1].score !== null) {
          expect(records[i].score).toBeLessThanOrEqual(records[i - 1].score);
        }
      }
    });
  });

  describe('ExerciseRecord Tests', () => {
    let exerciseRecord: ExerciseRecord;

    it('应该成功创建练习记录', async () => {
      const exercise = await prisma.exercise.create({
        data: {
          subjectId: 9000, // Will be created in subject test
          questionType: 'SINGLE_CHOICE',
          question: 'Test question',
          answer: 'A',
          difficulty: 'EASY',
          grade: 5,
          tags: 'test',
          isPublic: true,
        },
      });

      exerciseRecord = await prisma.exerciseRecord.create({
        data: {
          userId: user.id,
          exerciseId: exercise.id,
          isCorrect: true,
          userAnswer: 'A',
          timeSpent: 30,
        },
      });

      expect(exerciseRecord.userId).toBe(user.id);
      expect(exerciseRecord.isCorrect).toBe(true);
      expect(exerciseRecord.userAnswer).toBe('A');
      expect(exerciseRecord.timeSpent).toBe(30);
    });

    it('应该查询用户的练习记录统计', async () => {
      const stats = await prisma.exerciseRecord.groupBy({
        by: ['isCorrect'],
        where: { userId: user.id },
        _count: true,
      });

      expect(stats.length).toBeGreaterThanOrEqual(1);
    });

    it('应该计算正确率', async () => {
      const total = await prisma.exerciseRecord.count({
        where: { userId: user.id },
      });

      const correct = await prisma.exerciseRecord.count({
        where: { userId: user.id, isCorrect: true },
      });

      const accuracy = total > 0 ? (correct / total) * 100 : 0;

      expect(total).toBeGreaterThanOrEqual(1);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('LearningProgress Boundary Tests', () => {
    it('应该允许 duration 为 0', async () => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'QUICK_ACTION',
          duration: 0,
        },
      });

      expect(record.duration).toBe(0);
    });

    it('应该允许很大的 duration 值', async () => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'LONG_SESSION',
          duration: 86400, // 24 hours in seconds
        },
      });

      expect(record.duration).toBe(86400);
    });

    it('应该允许 score 为 0', async () => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'FINISH_PRACTICE',
          duration: 100,
          score: 0,
        },
      });

      expect(record.score).toBe(0);
    });

    it('应该允许 score 为 100', async () => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'FINISH_PRACTICE',
          duration: 100,
          score: 100,
        },
      });

      expect(record.score).toBe(100);
    });

    it('应该允许负分（扣分场景）', async () => {
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'PENALTY',
          duration: 0,
          score: -10,
        },
      });

      expect(record.score).toBe(-10);
    });

    it('应该测试时间戳自动创建', async () => {
      const beforeCreate = new Date();
      const record = await prisma.learningRecord.create({
        data: {
          userId: user.id,
          actionType: 'TIMESTAMP_TEST',
          duration: 10,
        },
      });
      const afterCreate = new Date();

      expect(record.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(record.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('LearningProgress Aggregation', () => {
    it('应该统计用户总学习时长', async () => {
      const result = await prisma.learningRecord.aggregate({
        where: { userId: user.id },
        _sum: { duration: true },
      });

      expect(result._sum.duration).toBeGreaterThanOrEqual(0);
    });

    it('应该统计用户平均分数', async () => {
      const result = await prisma.learningRecord.aggregate({
        where: {
          userId: user.id,
          score: { not: null },
        },
        _avg: { score: true },
      });

      if (result._avg.score !== null) {
        expect(result._avg.score).toBeGreaterThanOrEqual(0);
        expect(result._avg.score).toBeLessThanOrEqual(100);
      }
    });

    it('应该统计用户学习记录总数', async () => {
      const count = await prisma.learningRecord.count({
        where: { userId: user.id },
      });

      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('应该按动作类型分组统计', async () => {
      const grouped = await prisma.learningRecord.groupBy({
        by: ['actionType'],
        where: { userId: user.id },
        _count: true,
        _sum: { duration: true },
      });

      expect(grouped.length).toBeGreaterThanOrEqual(1);
      grouped.forEach(g => {
        expect(g._count).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
