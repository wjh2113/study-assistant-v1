import { PrismaClient } from '@prisma/client';

/**
 * Other Models 综合测试
 * 测试 Subject, Exercise, WrongQuestion, StudyPlan, Textbook, Practice 等模型
 */
describe('Other Models Tests', () => {
  let prisma: PrismaClient;
  let user: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestData();

    user = await prisma.user.create({
      data: {
        username: 'comprehensive_test_user',
        email: 'comprehensive@example.com',
        phone: '13890300001',
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
    await prisma.practiceAnswer.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.practiceQuestion.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.practiceSession.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.textbookUnit.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.textbook.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.studyPlan.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.wrongQuestion.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.exercise.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.subject.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.familyBinding.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.aiChat.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.uploadFile.deleteMany({ where: { userId: { gte: 9000 } } });
    await prisma.user.deleteMany({ where: { id: { gte: 9000 } } });
  };

  // ==================== Subject 模型测试 ====================
  describe('Subject Model Tests', () => {
    let subject: Subject;

    it('应该成功创建学科', async () => {
      subject = await prisma.subject.create({
        data: {
          name: '数学',
          grade: 5,
          icon: '📐',
          sortOrder: 1,
        },
      });

      expect(subject.id).toBeGreaterThanOrEqual(9000);
      expect(subject.name).toBe('数学');
      expect(subject.grade).toBe(5);
      expect(subject.icon).toBe('📐');
      expect(subject.sortOrder).toBe(1);
    });

    it('应该测试不同学科', async () => {
      const subjects = [
        { name: '语文', icon: '📚' },
        { name: '英语', icon: '🔤' },
        { name: '科学', icon: '🔬' },
        { name: '道德与法治', icon: '⚖️' },
      ];

      for (const sub of subjects) {
        const created = await prisma.subject.create({
          data: {
            name: sub.name,
            grade: 5,
            icon: sub.icon,
            sortOrder: 99,
          },
        });
        expect(created.name).toBe(sub.name);
      }
    });

    it('学科名称应该唯一', async () => {
      await expect(
        prisma.subject.create({
          data: {
            name: '数学',
            grade: 5,
            icon: '📐',
            sortOrder: 99,
          },
        }),
      ).rejects.toThrow();
    });

    it('应该允许 null 图标', async () => {
      const sub = await prisma.subject.create({
        data: {
          name: '无图标学科',
          grade: 5,
          icon: null,
          sortOrder: 99,
        },
      });

      expect(sub.icon).toBeNull();
    });
  });

  // ==================== Exercise 模型测试 ====================
  describe('Exercise Model Tests', () => {
    let subject: Subject;
    let exercise: Exercise;

    beforeEach(async () => {
      subject = await prisma.subject.create({
        data: {
          name: '测试学科',
          grade: 5,
          icon: '📖',
          sortOrder: 99,
        },
      });
    });

    it('应该成功创建习题 - 选择题', async () => {
      exercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          questionType: 'SINGLE_CHOICE',
          question: '1 + 1 = ?',
          options: JSON.stringify([
            { key: 'A', value: '1' },
            { key: 'B', value: '2' },
          ]),
          answer: 'B',
          explanation: '1 加 1 等于 2',
          difficulty: 'EASY',
          grade: 5,
          tags: '加法，基础',
          isPublic: true,
        },
      });

      expect(exercise.id).toBeGreaterThanOrEqual(9000);
      expect(exercise.questionType).toBe('SINGLE_CHOICE');
      expect(exercise.difficulty).toBe('EASY');
      expect(exercise.isPublic).toBe(true);
    });

    it('应该成功创建习题 - 填空题', async () => {
      const fillExercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          questionType: 'FILL_BLANK',
          question: '地球是____的形状',
          answer: '球体',
          difficulty: 'MEDIUM',
          grade: 5,
          tags: '地理',
          isPublic: true,
        },
      });

      expect(fillExercise.questionType).toBe('FILL_BLANK');
      expect(fillExercise.options).toBeNull();
    });

    it('应该成功创建习题 - 问答题', async () => {
      const questionExercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          questionType: 'QUESTION',
          question: '请描述水的三态变化',
          answer: '固态、液态、气态',
          explanation: '水在不同温度下呈现不同状态',
          difficulty: 'HARD',
          grade: 5,
          tags: '物理，三态',
          isPublic: false,
        },
      });

      expect(questionExercise.questionType).toBe('QUESTION');
      expect(questionExercise.isPublic).toBe(false);
    });

    it('应该测试不同难度等级', async () => {
      const difficulties = ['EASY', 'MEDIUM', 'HARD'];

      for (const diff of difficulties) {
        const ex = await prisma.exercise.create({
          data: {
            subjectId: subject.id,
            questionType: 'SINGLE_CHOICE',
            question: `难度测试 - ${diff}`,
            answer: 'A',
            difficulty: diff as any,
            grade: 5,
            tags: '测试',
            isPublic: true,
          },
        });
        expect(ex.difficulty).toBe(diff);
      }
    });

    it('应该允许 null 值 - explanation', async () => {
      const ex = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          questionType: 'SINGLE_CHOICE',
          question: '无解释题目',
          answer: 'A',
          difficulty: 'EASY',
          grade: 5,
          tags: '测试',
          isPublic: true,
          explanation: null,
        },
      });

      expect(ex.explanation).toBeNull();
    });

    it('应该允许 null 值 - correctRate', async () => {
      expect(exercise.correctRate).toBeNull();
    });

    it('应该更新正确率', async () => {
      const updated = await prisma.exercise.update({
        where: { id: exercise.id },
        data: { correctRate: 0.75, viewCount: 100 },
      });

      expect(updated.correctRate).toBe(0.75);
      expect(updated.viewCount).toBe(100);
    });

    it('应该测试多媒体资源 URL', async () => {
      const mediaExercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          questionType: 'SINGLE_CHOICE',
          question: '看图答题',
          answer: 'A',
          difficulty: 'EASY',
          grade: 5,
          tags: '多媒体',
          isPublic: true,
          imageUrl: 'https://example.com/image.jpg',
          videoUrl: 'https://example.com/video.mp4',
          audioUrl: 'https://example.com/audio.mp3',
        },
      });

      expect(mediaExercise.imageUrl).toBe('https://example.com/image.jpg');
      expect(mediaExercise.videoUrl).toBe('https://example.com/video.mp4');
      expect(mediaExercise.audioUrl).toBe('https://example.com/audio.mp3');
    });
  });

  // ==================== WrongQuestion 模型测试 ====================
  describe('WrongQuestion Model Tests', () => {
    let wrongQuestion: WrongQuestion;
    let exercise: Exercise;

    beforeEach(async () => {
      const subject = await prisma.subject.create({
        data: {
          name: '错题学科',
          grade: 5,
          icon: '📝',
          sortOrder: 99,
        },
      });

      exercise = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          questionType: 'SINGLE_CHOICE',
          question: '错题测试',
          answer: 'B',
          difficulty: 'MEDIUM',
          grade: 5,
          tags: '测试',
          isPublic: true,
        },
      });
    });

    it('应该成功创建错题记录', async () => {
      wrongQuestion = await prisma.wrongQuestion.create({
        data: {
          userId: user.id,
          exerciseId: exercise.id,
          wrongAnswer: 'A',
          timesWrong: 1,
          isMastered: false,
          notes: '粗心大意',
        },
      });

      expect(wrongQuestion.id).toBeGreaterThanOrEqual(9000);
      expect(wrongQuestion.wrongAnswer).toBe('A');
      expect(wrongQuestion.timesWrong).toBe(1);
      expect(wrongQuestion.isMastered).toBe(false);
    });

    it('应该增加错误次数', async () => {
      const updated = await prisma.wrongQuestion.update({
        where: { id: wrongQuestion.id },
        data: { timesWrong: 3, lastWrongAt: new Date() },
      });

      expect(updated.timesWrong).toBe(3);
    });

    it('应该标记为已掌握', async () => {
      const updated = await prisma.wrongQuestion.update({
        where: { id: wrongQuestion.id },
        data: { isMastered: true },
      });

      expect(updated.isMastered).toBe(true);
    });

    it('应该允许 null 笔记', async () => {
      const wq = await prisma.wrongQuestion.create({
        data: {
          userId: user.id,
          exerciseId: exercise.id,
          wrongAnswer: 'C',
          timesWrong: 1,
          isMastered: false,
          notes: null,
        },
      });

      expect(wq.notes).toBeNull();
    });

    it('应该测试唯一约束 - 同一用户同一习题只能有一条错题记录', async () => {
      await expect(
        prisma.wrongQuestion.create({
          data: {
            userId: user.id,
            exerciseId: exercise.id,
            wrongAnswer: 'D',
            timesWrong: 1,
            isMastered: false,
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ==================== StudyPlan 模型测试 ====================
  describe('StudyPlan Model Tests', () => {
    let studyPlan: StudyPlan;
    let subject: Subject;

    beforeEach(async () => {
      subject = await prisma.subject.create({
        data: {
          name: '计划学科',
          grade: 5,
          icon: '📅',
          sortOrder: 99,
        },
      });
    });

    it('应该成功创建学习计划', async () => {
      studyPlan = await prisma.studyPlan.create({
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

      expect(studyPlan.id).toBeGreaterThanOrEqual(9000);
      expect(studyPlan.title).toBe('期末复习计划');
      expect(studyPlan.status).toBe('ACTIVE');
      expect(studyPlan.dailyGoal).toBe(10);
    });

    it('应该测试不同状态', async () => {
      const statuses = ['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED'];

      for (const status of statuses) {
        const plan = await prisma.studyPlan.create({
          data: {
            userId: user.id,
            title: `状态测试 - ${status}`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            dailyGoal: 5,
            status: status as any,
            progress: 0,
            totalTasks: 50,
          },
        });
        expect(plan.status).toBe(status);
      }
    });

    it('应该更新进度', async () => {
      const updated = await prisma.studyPlan.update({
        where: { id: studyPlan.id },
        data: { progress: 50 },
      });

      expect(updated.progress).toBe(50);
    });

    it('应该允许 null 学科', async () => {
      const plan = await prisma.studyPlan.create({
        data: {
          userId: user.id,
          title: '无学科计划',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          dailyGoal: 5,
          status: 'ACTIVE',
          progress: 0,
          totalTasks: 50,
          subjectId: null,
        },
      });

      expect(plan.subjectId).toBeNull();
    });

    it('应该允许 null 描述', async () => {
      const plan = await prisma.studyPlan.create({
        data: {
          userId: user.id,
          title: '无描述计划',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          dailyGoal: 5,
          status: 'ACTIVE',
          progress: 0,
          totalTasks: 50,
          description: null,
        },
      });

      expect(plan.description).toBeNull();
    });
  });

  // ==================== Textbook & TextbookUnit 模型测试 ====================
  describe('Textbook & TextbookUnit Model Tests', () => {
    let textbook: Textbook;
    let unit1: TextbookUnit;
    let unit2: TextbookUnit;

    it('应该成功创建课本', async () => {
      textbook = await prisma.textbook.create({
        data: {
          userId: user.id,
          title: '数学五年级上册',
          subject: '数学',
          grade: 5,
          version: '人教版',
          coverUrl: 'https://example.com/cover.jpg',
          pdfUrl: 'https://example.com/math.pdf',
          pdfPath: '/ftp/math.pdf',
          status: 'READY',
        },
      });

      expect(textbook.id).toBeGreaterThanOrEqual(9000);
      expect(textbook.title).toBe('数学五年级上册');
      expect(textbook.version).toBe('人教版');
      expect(textbook.status).toBe('READY');
    });

    it('应该测试不同课本状态', async () => {
      const statuses = ['PENDING', 'PROCESSING', 'READY', 'FAILED'];

      for (const status of statuses) {
        const book = await prisma.textbook.create({
          data: {
            userId: user.id,
            title: `状态测试 - ${status}`,
            subject: '测试',
            grade: 5,
            pdfUrl: 'https://example.com/test.pdf',
            pdfPath: '/ftp/test.pdf',
            status: status as any,
          },
        });
        expect(book.status).toBe(status);
      }
    });

    it('应该成功创建单元', async () => {
      unit1 = await prisma.textbookUnit.create({
        data: {
          textbookId: textbook.id,
          title: '第一单元：小数乘法',
          unitNumber: 'Unit 1',
          pageStart: 1,
          pageEnd: 20,
          sortOrder: 1,
        },
      });

      expect(unit1.id).toBeGreaterThanOrEqual(9000);
      expect(unit1.unitNumber).toBe('Unit 1');
      expect(unit1.pageStart).toBe(1);
      expect(unit1.pageEnd).toBe(20);
    });

    it('应该创建层级单元结构', async () => {
      const parentUnit = await prisma.textbookUnit.create({
        data: {
          textbookId: textbook.id,
          title: '第一部分',
          unitNumber: 'Part 1',
          sortOrder: 0,
        },
      });

      const childUnit = await prisma.textbookUnit.create({
        data: {
          textbookId: textbook.id,
          parentId: parentUnit.id,
          title: '第一章',
          unitNumber: 'Chapter 1',
          sortOrder: 1,
        },
      });

      expect(childUnit.parentId).toBe(parentUnit.id);

      const parentWithChildren = await prisma.textbookUnit.findUnique({
        where: { id: parentUnit.id },
        include: { children: true },
      });

      expect(parentWithChildren?.children.length).toBe(1);
    });

    it('应该允许 null 页码', async () => {
      const unit = await prisma.textbookUnit.create({
        data: {
          textbookId: textbook.id,
          title: '无页码单元',
          sortOrder: 99,
          pageStart: null,
          pageEnd: null,
        },
      });

      expect(unit.pageStart).toBeNull();
      expect(unit.pageEnd).toBeNull();
    });

    it('应该允许 null 单元编号', async () => {
      const unit = await prisma.textbookUnit.create({
        data: {
          textbookId: textbook.id,
          title: '无编号单元',
          sortOrder: 98,
          unitNumber: null,
        },
      });

      expect(unit.unitNumber).toBeNull();
    });
  });

  // ==================== PracticeSession 模型测试 ====================
  describe('PracticeSession Model Tests', () => {
    let session: PracticeSession;
    let textbook: Textbook;

    beforeEach(async () => {
      textbook = await prisma.textbook.create({
        data: {
          userId: user.id,
          title: '练习课本',
          subject: '测试',
          grade: 5,
          pdfUrl: 'https://example.com/test.pdf',
          pdfPath: '/ftp/test.pdf',
          status: 'READY',
        },
      });
    });

    it('应该成功创建练习会话', async () => {
      session = await prisma.practiceSession.create({
        data: {
          userId: user.id,
          textbookId: textbook.id,
          status: 'ACTIVE',
          totalQuestions: 10,
          correctAnswers: 0,
        },
      });

      expect(session.id).toBeGreaterThanOrEqual(9000);
      expect(session.status).toBe('ACTIVE');
      expect(session.totalQuestions).toBe(10);
    });

    it('应该测试不同会话状态', async () => {
      const statuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

      for (const status of statuses) {
        const s = await prisma.practiceSession.create({
          data: {
            userId: user.id,
            title: `状态测试 - ${status}`,
            status: status as any,
            totalQuestions: 5,
            correctAnswers: 0,
          },
        });
        expect(s.status).toBe(status);
      }
    });

    it('应该更新会话进度', async () => {
      const updated = await prisma.practiceSession.update({
        where: { id: session.id },
        data: {
          correctAnswers: 8,
          score: 80,
          timeSpent: 600,
          finishedAt: new Date(),
          status: 'COMPLETED',
        },
      });

      expect(updated.correctAnswers).toBe(8);
      expect(updated.score).toBe(80);
      expect(updated.timeSpent).toBe(600);
      expect(updated.status).toBe('COMPLETED');
    });

    it('应该允许 null 课本', async () => {
      const s = await prisma.practiceSession.create({
        data: {
          userId: user.id,
          status: 'ACTIVE',
          totalQuestions: 5,
          correctAnswers: 0,
          textbookId: null,
        },
      });

      expect(s.textbookId).toBeNull();
    });
  });

  // ==================== PracticeQuestion & PracticeAnswer 模型测试 ====================
  describe('PracticeQuestion & PracticeAnswer Model Tests', () => {
    let session: PracticeSession;
    let question: PracticeQuestion;

    beforeEach(async () => {
      session = await prisma.practiceSession.create({
        data: {
          userId: user.id,
          status: 'ACTIVE',
          totalQuestions: 1,
          correctAnswers: 0,
        },
      });
    });

    it('应该成功创建练习题目', async () => {
      question = await prisma.practiceQuestion.create({
        data: {
          sessionId: session.id,
          questionType: 'SINGLE_CHOICE',
          question: '练习题',
          options: JSON.stringify([
            { key: 'A', value: '1' },
            { key: 'B', value: '2' },
          ]),
          answer: 'B',
          explanation: '解析',
        },
      });

      expect(question.id).toBeGreaterThanOrEqual(9000);
      expect(question.sessionId).toBe(session.id);
    });

    it('应该更新用户答案', async () => {
      const updated = await prisma.practiceQuestion.update({
        where: { id: question.id },
        data: {
          userAnswer: 'B',
          isCorrect: true,
          score: 10,
        },
      });

      expect(updated.userAnswer).toBe('B');
      expect(updated.isCorrect).toBe(true);
      expect(updated.score).toBe(10);
    });

    it('应该成功创建练习答案', async () => {
      const answer = await prisma.practiceAnswer.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          answer: 'B',
          isCorrect: true,
        },
      });

      expect(answer.sessionId).toBe(session.id);
      expect(answer.questionId).toBe(question.id);
      expect(answer.isCorrect).toBe(true);
    });
  });

  // ==================== FamilyBinding 模型测试 ====================
  describe('FamilyBinding Model Tests', () => {
    let parent: any;
    let child: any;

    beforeEach(async () => {
      parent = await prisma.user.create({
        data: {
          username: 'parent_user',
          email: 'parent@example.com',
          phone: '13890300010',
          password: 'password',
          role: 'PARENT',
          grade: null,
        },
      });

      child = await prisma.user.create({
        data: {
          username: 'child_user',
          email: 'child@example.com',
          phone: '13890300011',
          password: 'password',
          role: 'STUDENT',
          grade: 5,
        },
      });
    });

    it('应该成功创建家庭绑定', async () => {
      const binding = await prisma.familyBinding.create({
        data: {
          parentId: parent.id,
          childId: child.id,
          status: 'PENDING',
        },
      });

      expect(binding.id).toBeGreaterThanOrEqual(9000);
      expect(binding.status).toBe('PENDING');
    });

    it('应该测试不同绑定状态', async () => {
      const statuses = ['PENDING', 'ACTIVE', 'REJECTED', 'CANCELLED'];

      for (const status of statuses) {
        const p = await prisma.user.create({
          data: {
            username: `parent_${status}`,
            email: `parent_${status}@example.com`,
            phone: `13890301${statuses.indexOf(status)}`,
            password: 'password',
            role: 'PARENT',
          },
        });

        const c = await prisma.user.create({
          data: {
            username: `child_${status}`,
            email: `child_${status}@example.com`,
            phone: `13890311${statuses.indexOf(status)}`,
            password: 'password',
            role: 'STUDENT',
            grade: 5,
          },
        });

        const binding = await prisma.familyBinding.create({
          data: {
            parentId: p.id,
            childId: c.id,
            status: status as any,
          },
        });

        expect(binding.status).toBe(status);
      }
    });

    it('应该测试唯一约束 - 同一对父子只能有一条绑定记录', async () => {
      await expect(
        prisma.familyBinding.create({
          data: {
            parentId: parent.id,
            childId: child.id,
            status: 'PENDING',
          },
        }),
      ).rejects.toThrow();
    });

    it('应该更新绑定状态', async () => {
      const binding = await prisma.familyBinding.create({
        data: {
          parentId: parent.id,
          childId: child.id,
          status: 'PENDING',
        },
      });

      const updated = await prisma.familyBinding.update({
        where: { id: binding.id },
        data: { status: 'ACTIVE' },
      });

      expect(updated.status).toBe('ACTIVE');
    });
  });

  // ==================== AiChat 模型测试 ====================
  describe('AiChat Model Tests', () => {
    it('应该成功创建 AI 对话记录', async () => {
      const chat = await prisma.aiChat.create({
        data: {
          userId: user.id,
          subject: '数学',
          question: '什么是勾股定理？',
          answer: '勾股定理是...',
          tokens: 100,
        },
      });

      expect(chat.id).toBeGreaterThanOrEqual(9000);
      expect(chat.subject).toBe('数学');
      expect(chat.tokens).toBe(100);
    });

    it('应该允许 null 学科', async () => {
      const chat = await prisma.aiChat.create({
        data: {
          userId: user.id,
          question: '通用问题',
          answer: '通用回答',
          subject: null,
        },
      });

      expect(chat.subject).toBeNull();
    });

    it('应该允许 null tokens', async () => {
      const chat = await prisma.aiChat.create({
        data: {
          userId: user.id,
          question: '无 tokens 问题',
          answer: '回答',
          tokens: null,
        },
      });

      expect(chat.tokens).toBeNull();
    });
  });

  // ==================== UploadFile 模型测试 ====================
  describe('UploadFile Model Tests', () => {
    it('应该成功创建文件上传记录', async () => {
      const file = await prisma.uploadFile.create({
        data: {
          userId: user.id,
          filename: 'test_file.pdf',
          originalName: '原始文件.pdf',
          mimetype: 'application/pdf',
          size: 1024000,
          url: 'https://example.com/files/test.pdf',
          ftpPath: '/ftp/files/test.pdf',
        },
      });

      expect(file.id).toBeGreaterThanOrEqual(9000);
      expect(file.filename).toBe('test_file.pdf');
      expect(file.size).toBe(1024000);
    });

    it('应该允许 null 用户 ID', async () => {
      const file = await prisma.uploadFile.create({
        data: {
          userId: null,
          filename: 'anonymous_file.pdf',
          originalName: '匿名文件.pdf',
          mimetype: 'application/pdf',
          size: 512000,
          url: 'https://example.com/files/anon.pdf',
          ftpPath: '/ftp/files/anon.pdf',
        },
      });

      expect(file.userId).toBeNull();
    });

    it('应该测试不同文件类型', async () => {
      const mimetypes = [
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'jpg', mime: 'image/jpeg' },
        { ext: 'png', mime: 'image/png' },
        { ext: 'mp4', mime: 'video/mp4' },
        { ext: 'mp3', mime: 'audio/mpeg' },
      ];

      for (const type of mimetypes) {
        const file = await prisma.uploadFile.create({
          data: {
            userId: user.id,
            filename: `test.${type.ext}`,
            originalName: `测试文件.${type.ext}`,
            mimetype: type.mime,
            size: 1000,
            url: `https://example.com/test.${type.ext}`,
            ftpPath: `/ftp/test.${type.ext}`,
          },
        });
        expect(file.mimetype).toBe(type.mime);
      }
    });
  });
});
