import { PrismaClient } from '@prisma/client';

/**
 * KnowledgePoint 模型测试
 * 测试知识点相关的所有 CRUD 操作、层级关系和边界情况
 */
describe('KnowledgePoint Model Tests', () => {
  let prisma: PrismaClient;
  let subject: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestData();

    subject = await prisma.subject.create({
      data: {
        name: '数学',
        grade: 5,
        icon: '📐',
        sortOrder: 1,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.subject.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.$disconnect();
  });

  const cleanupTestData = async () => {
    await prisma.exercise.deleteMany({ where: { id: { gte: 9000 } } });
    await prisma.knowledgePoint.deleteMany({ where: { id: { gte: 9000 } } });
  };

  describe('KnowledgePoint CRUD Operations', () => {
    let createdKnowledgePoint: KnowledgePoint;

    it('应该成功创建知识点 - 基本信息', async () => {
      createdKnowledgePoint = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '加法运算',
          grade: 5,
          description: '基础加法运算',
          sortOrder: 1,
        },
      });

      expect(createdKnowledgePoint.id).toBeGreaterThanOrEqual(9000);
      expect(createdKnowledgePoint.subjectId).toBe(subject.id);
      expect(createdKnowledgePoint.name).toBe('加法运算');
      expect(createdKnowledgePoint.grade).toBe(5);
      expect(createdKnowledgePoint.description).toBe('基础加法运算');
      expect(createdKnowledgePoint.sortOrder).toBe(1);
      expect(createdKnowledgePoint.parentId).toBeNull();
      expect(createdKnowledgePoint.createdAt).toBeInstanceOf(Date);
      expect(createdKnowledgePoint.updatedAt).toBeInstanceOf(Date);
    });

    it('应该成功创建知识点 - 无描述', async () => {
      const kp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '减法运算',
          grade: 5,
          description: null,
          sortOrder: 2,
        },
      });

      expect(kp.name).toBe('减法运算');
      expect(kp.description).toBeNull();
    });

    it('应该成功查询知识点 - findUnique', async () => {
      const kp = await prisma.knowledgePoint.findUnique({
        where: { id: createdKnowledgePoint.id },
      });

      expect(kp).not.toBeNull();
      expect(kp?.id).toBe(createdKnowledgePoint.id);
      expect(kp?.name).toBe(createdKnowledgePoint.name);
    });

    it('应该成功查询知识点 - 包含学科信息', async () => {
      const kp = await prisma.knowledgePoint.findUnique({
        where: { id: createdKnowledgePoint.id },
        include: { subject: true },
      });

      expect(kp).not.toBeNull();
      expect(kp?.subject).toBeDefined();
      expect(kp?.subject.name).toBe('数学');
    });

    it('应该成功更新知识点', async () => {
      const updatedKp = await prisma.knowledgePoint.update({
        where: { id: createdKnowledgePoint.id },
        data: {
          name: '加法运算（更新）',
          description: '更新后的描述',
          sortOrder: 10,
        },
      });

      expect(updatedKp.name).toBe('加法运算（更新）');
      expect(updatedKp.description).toBe('更新后的描述');
      expect(updatedKp.sortOrder).toBe(10);
      expect(updatedKp.updatedAt).not.toEqual(createdKnowledgePoint.updatedAt);
    });

    it('应该成功查询所有知识点', async () => {
      const knowledgePoints = await prisma.knowledgePoint.findMany({
        where: { id: { gte: 9000 } },
      });

      expect(knowledgePoints.length).toBeGreaterThanOrEqual(1);
    });

    it('应该成功删除知识点', async () => {
      const testKp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '待删除知识点',
          grade: 5,
          sortOrder: 99,
        },
      });

      const deletedKp = await prisma.knowledgePoint.delete({
        where: { id: testKp.id },
      });

      expect(deletedKp.id).toBe(testKp.id);

      const found = await prisma.knowledgePoint.findUnique({
        where: { id: testKp.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('KnowledgePoint Hierarchy (Parent-Child)', () => {
    let parentKp: KnowledgePoint;
    let childKp1: KnowledgePoint;
    let childKp2: KnowledgePoint;
    let grandchildKp: KnowledgePoint;

    beforeEach(async () => {
      // 创建父知识点
      parentKp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '四则运算',
          grade: 5,
          description: '加减乘除',
          sortOrder: 1,
        },
      });

      // 创建子知识点
      childKp1 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '加法',
          grade: 5,
          parentId: parentKp.id,
          sortOrder: 1,
        },
      });

      childKp2 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '减法',
          grade: 5,
          parentId: parentKp.id,
          sortOrder: 2,
        },
      });

      // 创建孙知识点
      grandchildKp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '进位加法',
          grade: 5,
          parentId: childKp1.id,
          sortOrder: 1,
        },
      });
    });

    it('应该成功创建层级关系 - 父子', async () => {
      expect(childKp1.parentId).toBe(parentKp.id);
      expect(childKp2.parentId).toBe(parentKp.id);
    });

    it('应该成功创建层级关系 - 祖孙', async () => {
      expect(grandchildKp.parentId).toBe(childKp1.id);
    });

    it('应该查询父知识点的子节点', async () => {
      const parentWithChildren = await prisma.knowledgePoint.findUnique({
        where: { id: parentKp.id },
        include: { children: true },
      });

      expect(parentWithChildren).not.toBeNull();
      expect(parentWithChildren?.children.length).toBe(2);
      expect(parentWithChildren?.children.map(k => k.name)).toContain('加法');
      expect(parentWithChildren?.children.map(k => k.name)).toContain('减法');
    });

    it('应该查询子知识点的父节点', async () => {
      const childWithParent = await prisma.knowledgePoint.findUnique({
        where: { id: childKp1.id },
        include: { parent: true },
      });

      expect(childWithParent).not.toBeNull();
      expect(childWithParent?.parent).toBeDefined();
      expect(childWithParent?.parent?.name).toBe('四则运算');
    });

    it('应该查询多级子节点', async () => {
      const parentWithAllChildren = await prisma.knowledgePoint.findUnique({
        where: { id: parentKp.id },
        include: {
          children: {
            include: {
              children: true,
            },
          },
        },
      });

      expect(parentWithAllChildren).not.toBeNull();
      const allChildren = parentWithAllChildren?.children || [];
      expect(allChildren.length).toBe(2);

      const additionNode = allChildren.find(k => k.name === '加法');
      expect(additionNode).toBeDefined();
      expect(additionNode?.children.length).toBe(1);
      expect(additionNode?.children[0].name).toBe('进位加法');
    });

    it('应该更新知识点的父节点', async () => {
      const newParent = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '新父节点',
          grade: 5,
          sortOrder: 99,
        },
      });

      const updatedKp = await prisma.knowledgePoint.update({
        where: { id: grandchildKp.id },
        data: { parentId: newParent.id },
      });

      expect(updatedKp.parentId).toBe(newParent.id);
    });

    it('应该允许将父节点设置为 null', async () => {
      const updatedKp = await prisma.knowledgePoint.update({
        where: { id: childKp1.id },
        data: { parentId: null },
      });

      expect(updatedKp.parentId).toBeNull();
    });

    it('应该查询顶级知识点（无父节点）', async () => {
      const topLevelKps = await prisma.knowledgePoint.findMany({
        where: {
          subjectId: subject.id,
          parentId: null,
        },
      });

      expect(topLevelKps.length).toBeGreaterThanOrEqual(1);
      expect(topLevelKps.map(k => k.name)).toContain('四则运算');
    });
  });

  describe('KnowledgePoint with Exercises', () => {
    let kp: KnowledgePoint;
    let exercise1: Exercise;
    let exercise2: Exercise;

    beforeEach(async () => {
      kp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '测试知识点',
          grade: 5,
          sortOrder: 1,
        },
      });
    });

    it('应该成功创建关联习题的知识点', async () => {
      exercise1 = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          knowledgePointId: kp.id,
          questionType: 'SINGLE_CHOICE',
          question: '1 + 1 = ?',
          answer: 'B',
          options: JSON.stringify([{ key: 'A', value: '1' }, { key: 'B', value: '2' }]),
          difficulty: 'EASY',
          grade: 5,
          tags: '加法',
          isPublic: true,
        },
      });

      expect(exercise1.knowledgePointId).toBe(kp.id);
    });

    it('应该查询知识点的所有习题', async () => {
      exercise2 = await prisma.exercise.create({
        data: {
          subjectId: subject.id,
          knowledgePointId: kp.id,
          questionType: 'SINGLE_CHOICE',
          question: '2 + 2 = ?',
          answer: 'C',
          options: JSON.stringify([{ key: 'A', value: '3' }, { key: 'B', value: '4' }, { key: 'C', value: '5' }]),
          difficulty: 'MEDIUM',
          grade: 5,
          tags: '加法',
          isPublic: true,
        },
      });

      const kpWithExercises = await prisma.knowledgePoint.findUnique({
        where: { id: kp.id },
        include: { exercises: true },
      });

      expect(kpWithExercises).not.toBeNull();
      expect(kpWithExercises?.exercises.length).toBeGreaterThanOrEqual(2);
    });

    it('应该查询习题的知识点信息', async () => {
      const exerciseWithKp = await prisma.exercise.findUnique({
        where: { id: exercise1.id },
        include: { knowledgePoint: true },
      });

      expect(exerciseWithKp).not.toBeNull();
      expect(exerciseWithKp?.knowledgePoint).toBeDefined();
      expect(exerciseWithKp?.knowledgePoint?.name).toBe('测试知识点');
    });
  });

  describe('KnowledgePoint Boundary Tests', () => {
    it('应该允许知识点名称重复（不同学科）', async () => {
      const subject2 = await prisma.subject.create({
        data: {
          name: '语文',
          grade: 5,
          icon: '📚',
          sortOrder: 2,
        },
      });

      const kp1 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '相同名称',
          grade: 5,
          sortOrder: 1,
        },
      });

      const kp2 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject2.id,
          name: '相同名称',
          grade: 5,
          sortOrder: 1,
        },
      });

      expect(kp1.name).toBe('相同名称');
      expect(kp2.name).toBe('相同名称');
      expect(kp1.subjectId).not.toBe(kp2.subjectId);
    });

    it('应该测试不同年级 (1-6)', async () => {
      for (let grade = 1; grade <= 6; grade++) {
        const kp = await prisma.knowledgePoint.create({
          data: {
            subjectId: subject.id,
            name: `知识点_${grade}年级`,
            grade,
            sortOrder: grade,
          },
        });

        expect(kp.grade).toBe(grade);
      }
    });

    it('应该允许很长的描述', async () => {
      const longDescription = 'A'.repeat(1000);
      const kp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '长描述知识点',
          grade: 5,
          description: longDescription,
          sortOrder: 1,
        },
      });

      expect(kp.description).toBe(longDescription);
      expect(kp.description?.length).toBe(1000);
    });

    it('应该允许特殊字符名称', async () => {
      const kp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '特殊字符：αβγΔΕ 1+1=2',
          grade: 5,
          sortOrder: 1,
        },
      });

      expect(kp.name).toBe('特殊字符：αβγΔΕ 1+1=2');
    });

    it('应该测试 sortOrder 排序', async () => {
      const kp1 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '排序 3',
          grade: 5,
          sortOrder: 3,
        },
      });

      const kp2 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '排序 1',
          grade: 5,
          sortOrder: 1,
        },
      });

      const kp3 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '排序 2',
          grade: 5,
          sortOrder: 2,
        },
      });

      const sortedKps = await prisma.knowledgePoint.findMany({
        where: { subjectId: subject.id, id: { gte: 9000 } },
        orderBy: { sortOrder: 'asc' },
      });

      expect(sortedKps[0].sortOrder).toBeLessThanOrEqual(sortedKps[1].sortOrder);
      expect(sortedKps[1].sortOrder).toBeLessThanOrEqual(sortedKps[2].sortOrder);
    });
  });

  describe('KnowledgePoint Query Tests', () => {
    it('应该按年级筛选知识点', async () => {
      const kp5 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '五年级知识点',
          grade: 5,
          sortOrder: 1,
        },
      });

      const kp6 = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '六年级知识点',
          grade: 6,
          sortOrder: 2,
        },
      });

      const grade5Kps = await prisma.knowledgePoint.findMany({
        where: { grade: 5, id: { gte: 9000 } },
      });

      expect(grade5Kps.length).toBeGreaterThanOrEqual(1);
      expect(grade5Kps.map(k => k.name)).toContain('五年级知识点');
    });

    it('应该按学科筛选知识点', async () => {
      const kps = await prisma.knowledgePoint.findMany({
        where: { subjectId: subject.id },
      });

      expect(kps.length).toBeGreaterThanOrEqual(1);
      kps.forEach(kp => {
        expect(kp.subjectId).toBe(subject.id);
      });
    });

    it('应该支持模糊搜索名称', async () => {
      await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '加法进阶',
          grade: 5,
          sortOrder: 99,
        },
      });

      const kps = await prisma.knowledgePoint.findMany({
        where: {
          subjectId: subject.id,
          name: {
            contains: '加法',
          },
        },
      });

      expect(kps.length).toBeGreaterThanOrEqual(1);
      kps.forEach(kp => {
        expect(kp.name).toContain('加法');
      });
    });

    it('应该支持 startsWith 查询', async () => {
      const kps = await prisma.knowledgePoint.findMany({
        where: {
          subjectId: subject.id,
          name: {
            startsWith: '加法',
          },
        },
      });

      expect(kps.length).toBeGreaterThanOrEqual(1);
      kps.forEach(kp => {
        expect(kp.name.startsWith('加法')).toBe(true);
      });
    });
  });

  describe('KnowledgePoint Timestamp Tests', () => {
    it('createdAt 应该在创建时自动设置', async () => {
      const beforeCreate = new Date();
      const kp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '时间戳测试',
          grade: 5,
          sortOrder: 1,
        },
      });
      const afterCreate = new Date();

      expect(kp.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(kp.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('updatedAt 应该在更新时自动更新', async () => {
      const kp = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '更新时间戳',
          grade: 5,
          sortOrder: 1,
        },
      });

      const beforeUpdate = kp.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedKp = await prisma.knowledgePoint.update({
        where: { id: kp.id },
        data: { name: '更新时间戳（已更新）' },
      });

      expect(updatedKp.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });
  });

  describe('KnowledgePoint Cascade Delete', () => {
    it('删除父知识点不应该自动删除子知识点（需要手动处理）', async () => {
      const parent = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '待删除父节点',
          grade: 5,
          sortOrder: 1,
        },
      });

      const child = await prisma.knowledgePoint.create({
        data: {
          subjectId: subject.id,
          name: '子节点',
          grade: 5,
          parentId: parent.id,
          sortOrder: 1,
        },
      });

      await prisma.knowledgePoint.delete({
        where: { id: parent.id },
      });

      // 子节点仍然存在，但 parentId 指向不存在的记录
      const childAfter = await prisma.knowledgePoint.findUnique({
        where: { id: child.id },
      });

      expect(childAfter).not.toBeNull();
      expect(childAfter?.parentId).toBe(parent.id);
    });
  });
});
