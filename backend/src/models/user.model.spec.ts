import { PrismaClient } from '@prisma/client';

/**
 * User 模型测试
 * 测试用户相关的所有 CRUD 操作和边界情况
 * 
 * 注意：这是集成测试，需要真实的数据库连接
 * 运行前请确保：
 * 1. 数据库已配置（.env 中的 DATABASE_URL）
 * 2. Prisma 已生成（npx prisma generate）
 */
describe('User Model Tests', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const cleanupTestData = async () => {
    try {
      // 按依赖顺序删除数据
      await prisma.exerciseRecord.deleteMany({ where: { userId: { gte: 9000 } } });
      await prisma.wrongQuestion.deleteMany({ where: { userId: { gte: 9000 } } });
      await prisma.studyPlan.deleteMany({ where: { userId: { gte: 9000 } } });
      await prisma.exercise.deleteMany({ where: { studentId: { gte: 9000 } } });
      await prisma.user.deleteMany({ where: { id: { gte: 9000 } } });
      await prisma.subject.deleteMany({ where: { id: { gte: 9000 } } });
      await prisma.knowledgePoint.deleteMany({ where: { id: { gte: 9000 } } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  describe('User CRUD Operations', () => {
    let createdUser: User;

    it('应该成功创建用户 - 基本信息', async () => {
      createdUser = await prisma.user.create({
        data: {
          username: 'test_user_9001',
          email: 'test9001@example.com',
          phone: '13890010001',
          password: 'hashed_password_123',
          role: 'STUDENT',
          grade: 5,
        },
      });

      expect(createdUser.id).toBeGreaterThanOrEqual(9000);
      expect(createdUser.username).toBe('test_user_9001');
      expect(createdUser.email).toBe('test9001@example.com');
      expect(createdUser.phone).toBe('13890010001');
      expect(createdUser.role).toBe('STUDENT');
      expect(createdUser.grade).toBe(5);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);
    });

    it('应该成功创建用户 - 仅手机号（自动注册场景）', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'user_9002',
          phone: '13890020002',
          email: 'user_9002@example.com',
          password: '',
          role: 'STUDENT',
          grade: 1,
        },
      });

      expect(user.id).toBeGreaterThanOrEqual(9000);
      expect(user.phone).toBe('13890020002');
      expect(user.role).toBe('STUDENT');
      expect(user.grade).toBe(1);
    });

    it('应该成功创建用户 - 所有字段', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'test_user_9003',
          email: 'test9003@example.com',
          phone: '13890030003',
          password: 'hashed_password',
          role: 'TEACHER',
          grade: null,
          avatar: 'https://example.com/avatar.jpg',
        },
      });

      expect(user.username).toBe('test_user_9003');
      expect(user.role).toBe('TEACHER');
      expect(user.grade).toBeNull();
      expect(user.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('应该成功查询用户 - findUnique', async () => {
      const user = await prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      expect(user).not.toBeNull();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.username).toBe(createdUser.username);
    });

    it('应该成功查询用户 - findByUsername', async () => {
      const user = await prisma.user.findUnique({
        where: { username: 'test_user_9001' },
      });

      expect(user).not.toBeNull();
      expect(user?.username).toBe('test_user_9001');
    });

    it('应该成功查询用户 - findByEmail', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'test9001@example.com' },
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test9001@example.com');
    });

    it('应该成功查询用户 - findByPhone', async () => {
      const user = await prisma.user.findUnique({
        where: { phone: '13890010001' },
      });

      expect(user).not.toBeNull();
      expect(user?.phone).toBe('13890010001');
    });

    it('应该成功更新用户', async () => {
      const updatedUser = await prisma.user.update({
        where: { id: createdUser.id },
        data: {
          username: 'updated_user_9001',
          grade: 6,
          avatar: 'https://example.com/new-avatar.jpg',
        },
      });

      expect(updatedUser.username).toBe('updated_user_9001');
      expect(updatedUser.grade).toBe(6);
      expect(updatedUser.avatar).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser.updatedAt).not.toEqual(createdUser.updatedAt);
    });

    it('应该成功更新用户 - 部分字段', async () => {
      const updatedUser = await prisma.user.update({
        where: { id: createdUser.id },
        data: {
          grade: 5,
        },
      });

      expect(updatedUser.grade).toBe(5);
      expect(updatedUser.username).toBe('updated_user_9001');
    });

    it('应该成功查询所有用户', async () => {
      const users = await prisma.user.findMany({
        where: { id: { gte: 9000 } },
      });

      expect(users.length).toBeGreaterThanOrEqual(1);
    });

    it('应该成功删除用户', async () => {
      const testUser = await prisma.user.create({
        data: {
          username: 'to_delete_user',
          email: 'todelete@example.com',
          phone: '13899990001',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      const deletedUser = await prisma.user.delete({
        where: { id: testUser.id },
      });

      expect(deletedUser.id).toBe(testUser.id);

      const found = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(found).toBeNull();
    });

    it('查询不存在的用户应该返回 null', async () => {
      const user = await prisma.user.findUnique({
        where: { id: 999999 },
      });

      expect(user).toBeNull();
    });
  });

  describe('User Relationships', () => {
    let user: User;
    let subject: Subject;
    let knowledgePoint: KnowledgePoint;
    let exercise: Exercise;

    beforeEach(async () => {
      // 创建测试用户
      user = await prisma.user.create({
        data: {
          username: 'relation_test_user',
          email: 'relation@example.com',
          phone: '13890050001',
          password: 'password',
          role: 'STUDENT',
          grade: 5,
        },
      });

      // 创建测试学科
      subject = await prisma.subject.create({
        data: {
          name: '数学',
          grade: 5,
          icon: '📐',
          sortOrder: 1,
        },
      });

      // 创建测试知识点
      knowledgePoint = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '加法运算',
          grade: 5,
          description: '基础加法',
          sortOrder: 1,
        },
      });
    });

    it('应该成功创建用户的错题记录', async () => {
      // 先创建习题
      exercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          knowledgePointId: knowledgePoint.id,
          studentId: user.id,
          questionType: 'SINGLE_CHOICE',
          question: '1 + 1 = ?',
          options: JSON.stringify([{ key: 'A', value: '1' }, { key: 'B', value: '2' }]),
          answer: 'B',
          difficulty: 'EASY',
          grade: 5,
          tags: '加法，基础',
          isPublic: true,
        },
      });

      const wrongQuestion = await prisma.wrongQuestion.create({
        data: {
          userId: user.id,
          exerciseId: exercise.id,
          wrongAnswer: 'A',
          timesWrong: 1,
          isMastered: false,
          notes: '粗心大意',
        },
      });

      expect(wrongQuestion.userId).toBe(user.id);
      expect(wrongQuestion.exerciseId).toBe(exercise.id);
      expect(wrongQuestion.wrongAnswer).toBe('A');
      expect(wrongQuestion.timesWrong).toBe(1);
    });

    it('应该成功创建用户的学习计划', async () => {
      const studyPlan = await prisma.studyPlan.create({
        data: {
          userId: user.id,
          subjectId: subject.id,
          title: '期末复习计划',
          description: '复习所有知识点',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          dailyGoal: 10,
          status: 'ACTIVE',
          progress: 0,
          totalTasks: 100,
        },
      });

      expect(studyPlan.userId).toBe(user.id);
      expect(studyPlan.subjectId).toBe(subject.id);
      expect(studyPlan.title).toBe('期末复习计划');
      expect(studyPlan.status).toBe('ACTIVE');
    });

    it('应该成功创建用户的练习记录', async () => {
      exercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          knowledgePointId: knowledgePoint.id,
          studentId: user.id,
          questionType: 'SINGLE_CHOICE',
          question: '2 + 2 = ?',
          options: JSON.stringify([{ key: 'A', value: '3' }, { key: 'B', value: '4' }]),
          answer: 'B',
          difficulty: 'EASY',
          grade: 5,
          tags: '加法',
          isPublic: true,
        },
      });

      const exerciseRecord = await prisma.exerciseRecord.create({
        data: {
          userId: user.id,
          exerciseId: exercise.id,
          isCorrect: true,
          userAnswer: 'B',
          timeSpent: 30,
        },
      });

      expect(exerciseRecord.userId).toBe(user.id);
      expect(exerciseRecord.exerciseId).toBe(exercise.id);
      expect(exerciseRecord.isCorrect).toBe(true);
      expect(exerciseRecord.timeSpent).toBe(30);
    });

    it('应该通过 include 获取用户关联数据', async () => {
      const userWithRelations = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          wrongQuestions: true,
          studyPlans: true,
          exerciseRecords: true,
        },
      });

      expect(userWithRelations).not.toBeNull();
      expect(userWithRelations?.wrongQuestions).toBeDefined();
      expect(userWithRelations?.studyPlans).toBeDefined();
      expect(userWithRelations?.exerciseRecords).toBeDefined();
    });
  });

  describe('User Boundary Tests', () => {
    it('应该拒绝重复的用户名', async () => {
      await prisma.user.create({
        data: {
          username: 'unique_test_user',
          email: 'unique1@example.com',
          phone: '13890060001',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            username: 'unique_test_user',
            email: 'unique2@example.com',
            phone: '13890060002',
            password: 'password',
            role: 'STUDENT',
            grade: 1,
          },
        }),
      ).rejects.toThrow();
    });

    it('应该拒绝重复的邮箱', async () => {
      await prisma.user.create({
        data: {
          username: 'unique_test_user2',
          email: 'duplicate@example.com',
          phone: '13890060003',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            username: 'unique_test_user3',
            email: 'duplicate@example.com',
            phone: '13890060004',
            password: 'password',
            role: 'STUDENT',
            grade: 1,
          },
        }),
      ).rejects.toThrow();
    });

    it('应该拒绝重复的手机号', async () => {
      await prisma.user.create({
        data: {
          username: 'unique_test_user4',
          email: 'unique4@example.com',
          phone: '13890060005',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            username: 'unique_test_user5',
            email: 'unique5@example.com',
            phone: '13890060005',
            password: 'password',
            role: 'STUDENT',
            grade: 1,
          },
        }),
      ).rejects.toThrow();
    });

    it('应该允许 null 值 - username', async () => {
      const user = await prisma.user.create({
        data: {
          username: null,
          email: 'null_username@example.com',
          phone: '13890060006',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      expect(user.username).toBeNull();
    });

    it('应该允许 null 值 - email', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'no_email_user',
          email: null,
          phone: '13890060007',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      expect(user.email).toBeNull();
    });

    it('应该允许 null 值 - phone', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'no_phone_user',
          email: 'no_phone@example.com',
          phone: null,
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      expect(user.phone).toBeNull();
    });

    it('应该允许 null 值 - grade', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'no_grade_user',
          email: 'no_grade@example.com',
          phone: '13890060008',
          password: 'password',
          role: 'TEACHER',
          grade: null,
        },
      });

      expect(user.grade).toBeNull();
    });

    it('应该测试不同角色类型', async () => {
      const roles = ['STUDENT', 'PARENT', 'TEACHER', 'ADMIN'];

      for (const role of roles) {
        const user = await prisma.user.create({
          data: {
            username: `test_user_role_${role}`,
            email: `role_${role}@example.com`,
            phone: `13890061${roles.indexOf(role)}`,
            password: 'password',
            role: role as any,
            grade: role === 'STUDENT' ? 5 : null,
          },
        });

        expect(user.role).toBe(role);
      }
    });

    it('应该测试年级范围 (1-6)', async () => {
      for (let grade = 1; grade <= 6; grade++) {
        const user = await prisma.user.create({
          data: {
            username: `test_user_grade_${grade}`,
            email: `grade_${grade}@example.com`,
            phone: `13890062${grade}`,
            password: 'password',
            role: 'STUDENT',
            grade,
          },
        });

        expect(user.grade).toBe(grade);
      }
    });
  });

  describe('User Timestamp Tests', () => {
    it('createdAt 应该在创建时自动设置', async () => {
      const beforeCreate = new Date();
      const user = await prisma.user.create({
        data: {
          username: 'timestamp_test_user',
          email: 'timestamp@example.com',
          phone: '13890070001',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });
      const afterCreate = new Date();

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('updatedAt 应该在更新时自动更新', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'update_timestamp_user',
          email: 'update_ts@example.com',
          phone: '13890070002',
          password: 'password',
          role: 'STUDENT',
          grade: 1,
        },
      });

      const beforeUpdate = user.updatedAt;

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { username: 'updated_timestamp_user' },
      });

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });
  });
});
