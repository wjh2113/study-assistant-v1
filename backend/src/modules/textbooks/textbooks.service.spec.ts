import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TextbooksService } from './textbooks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TextbookStatus } from './textbooks.dto';

describe('TextbooksService - 课本服务测试', () => {
  let service: TextbooksService;
  let prisma: PrismaService;

  const mockPrismaService = {
    textbook: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    textbookUnit: {
      create: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextbooksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TextbooksService>(TextbooksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create - 创建课本', () => {
    it('应该成功创建课本记录', async () => {
      const userId = 1;
      const createDto = {
        title: '人教版五年级数学上册',
        subject: 'MATH',
        grade: 5,
        version: '人教版',
        pdfUrl: 'https://example.com/textbook.pdf',
        pdfPath: '/path/to/textbook.pdf',
      };

      const expectedTextbook = {
        id: 1,
        userId,
        ...createDto,
        status: TextbookStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.textbook.create.mockResolvedValue(expectedTextbook);

      const result = await service.create(userId, createDto);

      expect(prisma.textbook.create).toHaveBeenCalledWith({
        data: {
          userId,
          ...createDto,
          status: TextbookStatus.PENDING,
        },
      });
      expect(result).toEqual(expectedTextbook);
      expect(result.status).toBe(TextbookStatus.PENDING);
    });

    it('创建课本时应该设置默认状态为 PENDING', async () => {
      const userId = 1;
      const createDto = {
        title: '测试课本',
        subject: 'CHINESE',
        grade: 3,
        version: '部编版',
        pdfUrl: 'https://example.com/test.pdf',
        pdfPath: '/path/to/test.pdf',
      };

      mockPrismaService.textbook.create.mockResolvedValue({
        id: 1,
        userId,
        ...createDto,
        status: TextbookStatus.PENDING,
      });

      await service.create(userId, createDto);

      expect(prisma.textbook.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TextbookStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe('findAll - 查询课本列表', () => {
    it('应该返回所有已就绪的课本（非管理员）', async () => {
      const queryDto = {};
      const mockTextbooks = [
        {
          id: 1,
          title: '课本 1',
          subject: 'MATH',
          grade: 5,
          status: TextbookStatus.READY,
          user: { id: 1, username: 'user1' },
          _count: { units: 10 },
        },
        {
          id: 2,
          title: '课本 2',
          subject: 'CHINESE',
          grade: 5,
          status: TextbookStatus.READY,
          user: { id: 2, username: 'user2' },
          _count: { units: 8 },
        },
      ];

      mockPrismaService.textbook.findMany.mockResolvedValue(mockTextbooks);

      const result = await service.findAll(queryDto, 1, 'STUDENT');

      expect(prisma.textbook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TextbookStatus.READY,
            userId: 1,
          }),
        }),
      );
      expect(result).toEqual(mockTextbooks);
    });

    it('管理员应该可以看到所有状态的课本', async () => {
      const queryDto = { status: TextbookStatus.PENDING };
      const mockTextbooks = [
        {
          id: 3,
          title: '待处理课本',
          subject: 'ENGLISH',
          grade: 4,
          status: TextbookStatus.PENDING,
          user: { id: 3, username: 'user3' },
          _count: { units: 0 },
        },
      ];

      mockPrismaService.textbook.findMany.mockResolvedValue(mockTextbooks);

      const result = await service.findAll(queryDto, undefined, 'ADMIN');

      expect(prisma.textbook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TextbookStatus.PENDING,
          }),
        }),
      );
      expect(result).toEqual(mockTextbooks);
    });

    it('应该支持按科目筛选', async () => {
      const queryDto = { subject: 'MATH' };
      const mockTextbooks = [
        {
          id: 1,
          title: '数学课本',
          subject: 'MATH',
          grade: 5,
          status: TextbookStatus.READY,
          user: { id: 1, username: 'user1' },
          _count: { units: 10 },
        },
      ];

      mockPrismaService.textbook.findMany.mockResolvedValue(mockTextbooks);

      await service.findAll(queryDto, 1, 'STUDENT');

      expect(prisma.textbook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subject: 'MATH',
          }),
        }),
      );
    });

    it('应该支持按年级筛选', async () => {
      const queryDto = { grade: 5 };
      const mockTextbooks = [
        {
          id: 1,
          title: '五年级课本',
          subject: 'MATH',
          grade: 5,
          status: TextbookStatus.READY,
          user: { id: 1, username: 'user1' },
          _count: { units: 10 },
        },
      ];

      mockPrismaService.textbook.findMany.mockResolvedValue(mockTextbooks);

      await service.findAll(queryDto, 1, 'STUDENT');

      expect(prisma.textbook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            grade: 5,
          }),
        }),
      );
    });

    it('应该按创建时间倒序返回', async () => {
      const queryDto = {};
      mockPrismaService.textbook.findMany.mockResolvedValue([]);

      await service.findAll(queryDto, 1, 'STUDENT');

      expect(prisma.textbook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        }),
      );
    });
  });

  describe('findOne - 查询课本详情', () => {
    it('应该返回课本详情及单元列表', async () => {
      const textbookId = 1;
      const mockTextbook = {
        id: textbookId,
        title: '测试课本',
        subject: 'MATH',
        grade: 5,
        status: TextbookStatus.READY,
        user: { id: 1, username: 'user1', avatar: 'avatar.png' },
        units: [
          { id: 1, title: '第一单元', sortOrder: 0 },
          { id: 2, title: '第二单元', sortOrder: 1 },
        ],
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(mockTextbook);

      const result = await service.findOne(textbookId);

      expect(prisma.textbook.findUnique).toHaveBeenCalledWith({
        where: { id: textbookId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          units: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });
      expect(result).toEqual(mockTextbook);
    });

    it('课本不存在时应该抛出 NotFoundException', async () => {
      const textbookId = 999;
      mockPrismaService.textbook.findUnique.mockResolvedValue(null);

      await expect(service.findOne(textbookId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(textbookId)).rejects.toThrow('课本不存在');
    });
  });

  describe('update - 更新课本', () => {
    it('应该成功更新课本信息', async () => {
      const textbookId = 1;
      const updateDto = {
        title: '更新后的课本标题',
        version: '新版',
      };

      const existingTextbook = {
        id: textbookId,
        title: '原课本标题',
        subject: 'MATH',
        grade: 5,
        status: TextbookStatus.READY,
      };

      const updatedTextbook = {
        ...existingTextbook,
        ...updateDto,
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbook.update.mockResolvedValue(updatedTextbook);

      const result = await service.update(textbookId, updateDto);

      expect(prisma.textbook.update).toHaveBeenCalledWith({
        where: { id: textbookId },
        data: updateDto,
      });
      expect(result).toEqual(updatedTextbook);
    });

    it('课本不存在时应该抛出 NotFoundException', async () => {
      const textbookId = 999;
      mockPrismaService.textbook.findUnique.mockResolvedValue(null);

      await expect(service.update(textbookId, { title: '新标题' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove - 删除课本', () => {
    it('应该成功删除课本', async () => {
      const textbookId = 1;
      const existingTextbook = {
        id: textbookId,
        title: '要删除的课本',
        subject: 'MATH',
        grade: 5,
        status: TextbookStatus.READY,
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbook.delete.mockResolvedValue(existingTextbook);

      const result = await service.remove(textbookId);

      expect(prisma.textbook.delete).toHaveBeenCalledWith({
        where: { id: textbookId },
      });
      expect(result).toEqual(existingTextbook);
    });

    it('课本不存在时应该抛出 NotFoundException', async () => {
      const textbookId = 999;
      mockPrismaService.textbook.findUnique.mockResolvedValue(null);

      await expect(service.remove(textbookId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('parsePdf - PDF 解析功能', () => {
    it('应该成功解析 PDF 并生成单元树', async () => {
      const textbookId = 1;
      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
        subject: 'MATH',
        grade: 5,
        status: TextbookStatus.PENDING,
        fileUrl: 'https://example.com/test.pdf',
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbook.update.mockResolvedValue({
        ...existingTextbook,
        status: TextbookStatus.READY,
      });
      mockPrismaService.textbookUnit.create.mockResolvedValue({
        id: 1,
        textbookId,
        title: '第一单元',
        unitNumber: 'Unit 1',
        pageStart: 1,
        pageEnd: 10,
        sortOrder: 0,
      });

      const result = await service.parsePdf(textbookId);

      expect(prisma.textbook.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: TextbookStatus.PROCESSING },
        }),
      );
      expect(result).toEqual({ success: true, message: '解析完成' });
    });

    it('应该创建默认单元树', async () => {
      const textbookId = 1;
      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
        subject: 'MATH',
        grade: 5,
        status: TextbookStatus.PENDING,
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbook.update.mockResolvedValue({
        ...existingTextbook,
        status: TextbookStatus.READY,
      });
      mockPrismaService.textbookUnit.create.mockResolvedValue({ id: 1 });

      await service.parsePdf(textbookId);

      expect(prisma.textbookUnit.create).toHaveBeenCalledTimes(3);
      expect(prisma.textbookUnit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            textbookId,
            title: expect.stringContaining('单元'),
            sortOrder: expect.any(Number),
          }),
        }),
      );
    });

    it('课本不存在时应该抛出 NotFoundException', async () => {
      const textbookId = 999;
      mockPrismaService.textbook.findUnique.mockResolvedValue(null);

      await expect(service.parsePdf(textbookId)).rejects.toThrow(NotFoundException);
    });

    it('解析失败时应该更新状态为 FAILED', async () => {
      const textbookId = 1;
      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
        subject: 'MATH',
        grade: 5,
        status: TextbookStatus.PENDING,
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbookUnit.create.mockRejectedValue(new Error('解析错误'));

      await expect(service.parsePdf(textbookId)).rejects.toThrow(BadRequestException);
      await expect(service.parsePdf(textbookId)).rejects.toThrow('PDF 解析失败');
    });
  });

  describe('getUnits - 获取单元树', () => {
    it('应该返回顶级单元列表', async () => {
      const textbookId = 1;
      const mockTextbook = {
        id: textbookId,
        title: '测试课本',
        units: [
          {
            id: 1,
            title: '第一单元',
            sortOrder: 0,
            children: [
              { id: 2, title: '第一小节', sortOrder: 0 },
              { id: 3, title: '第二小节', sortOrder: 1 },
            ],
          },
          {
            id: 4,
            title: '第二单元',
            sortOrder: 1,
            children: [],
          },
        ],
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(mockTextbook);

      const result = await service.getUnits(textbookId);

      expect(prisma.textbook.findUnique).toHaveBeenCalledWith({
        where: { id: textbookId },
        include: {
          units: {
            where: { parentId: null },
            orderBy: { sortOrder: 'asc' },
            include: {
              children: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockTextbook.units);
    });

    it('课本不存在时应该抛出 NotFoundException', async () => {
      const textbookId = 999;
      mockPrismaService.textbook.findUnique.mockResolvedValue(null);

      await expect(service.getUnits(textbookId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUnit - 创建单元', () => {
    it('应该成功创建顶级单元', async () => {
      const textbookId = 1;
      const createDto = {
        title: '新单元',
        unitNumber: 'Unit 1',
        pageStart: 1,
        pageEnd: 10,
        sortOrder: 0,
      };

      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
      };

      const newUnit = {
        id: 1,
        textbookId,
        ...createDto,
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbookUnit.create.mockResolvedValue(newUnit);

      const result = await service.createUnit(textbookId, createDto);

      expect(prisma.textbookUnit.create).toHaveBeenCalledWith({
        data: {
          textbookId,
          ...createDto,
          sortOrder: 0,
        },
      });
      expect(result).toEqual(newUnit);
    });

    it('应该成功创建子单元', async () => {
      const textbookId = 1;
      const createDto = {
        title: '子单元',
        parentId: 1,
        pageStart: 1,
        pageEnd: 5,
        sortOrder: 0,
      };

      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
      };

      const parentUnit = {
        id: 1,
        textbookId,
        title: '父单元',
      };

      const newUnit = {
        id: 2,
        textbookId,
        ...createDto,
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(parentUnit);
      mockPrismaService.textbookUnit.create.mockResolvedValue(newUnit);

      const result = await service.createUnit(textbookId, createDto);

      expect(prisma.textbookUnit.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(newUnit);
    });

    it('课本不存在时应该抛出 NotFoundException', async () => {
      const textbookId = 999;
      mockPrismaService.textbook.findUnique.mockResolvedValue(null);

      await expect(
        service.createUnit(textbookId, {
          title: '新单元',
          pageStart: 1,
          pageEnd: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('父单元不存在时应该抛出 BadRequestException', async () => {
      const textbookId = 1;
      const createDto = {
        title: '子单元',
        parentId: 999,
        pageStart: 1,
        pageEnd: 5,
      };

      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(null);

      await expect(service.createUnit(textbookId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('父单元不属于该课本时应该抛出 BadRequestException', async () => {
      const textbookId = 1;
      const createDto = {
        title: '子单元',
        parentId: 999,
        pageStart: 1,
        pageEnd: 5,
      };

      const existingTextbook = {
        id: textbookId,
        title: '测试课本',
      };

      const otherTextbookUnit = {
        id: 999,
        textbookId: 2, // 属于另一个课本
        title: '其他课本的单元',
      };

      mockPrismaService.textbook.findUnique.mockResolvedValue(existingTextbook);
      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(otherTextbookUnit);

      await expect(service.createUnit(textbookId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateUnit - 更新单元', () => {
    it('应该成功更新单元', async () => {
      const unitId = 1;
      const updateDto = {
        title: '更新后的单元标题',
        pageStart: 5,
      };

      const existingUnit = {
        id: unitId,
        textbookId: 1,
        title: '原单元标题',
        pageStart: 1,
        pageEnd: 10,
      };

      const updatedUnit = {
        ...existingUnit,
        ...updateDto,
      };

      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(existingUnit);
      mockPrismaService.textbookUnit.update.mockResolvedValue(updatedUnit);

      const result = await service.updateUnit(unitId, updateDto);

      expect(prisma.textbookUnit.update).toHaveBeenCalledWith({
        where: { id: unitId },
        data: updateDto,
      });
      expect(result).toEqual(updatedUnit);
    });

    it('单元不存在时应该抛出 NotFoundException', async () => {
      const unitId = 999;
      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(null);

      await expect(service.updateUnit(unitId, { title: '新标题' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeUnit - 删除单元', () => {
    it('应该成功删除没有子单元的单元', async () => {
      const unitId = 1;
      const existingUnit = {
        id: unitId,
        textbookId: 1,
        title: '要删除的单元',
        children: [],
      };

      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(existingUnit);
      mockPrismaService.textbookUnit.delete.mockResolvedValue(existingUnit);

      const result = await service.removeUnit(unitId);

      expect(prisma.textbookUnit.delete).toHaveBeenCalledWith({
        where: { id: unitId },
      });
      expect(result).toEqual(existingUnit);
    });

    it('有子单元时应该拒绝删除', async () => {
      const unitId = 1;
      const existingUnit = {
        id: unitId,
        textbookId: 1,
        title: '父单元',
        children: [{ id: 2, title: '子单元' }],
      };

      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(existingUnit);

      await expect(service.removeUnit(unitId)).rejects.toThrow(BadRequestException);
      await expect(service.removeUnit(unitId)).rejects.toThrow('请先删除子单元');
    });

    it('单元不存在时应该抛出 NotFoundException', async () => {
      const unitId = 999;
      mockPrismaService.textbookUnit.findUnique.mockResolvedValue(null);

      await expect(service.removeUnit(unitId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('TextbookStatus 枚举测试', () => {
    it('应该包含所有预期的状态值', () => {
      expect(TextbookStatus.PENDING).toBe('PENDING');
      expect(TextbookStatus.PROCESSING).toBe('PROCESSING');
      expect(TextbookStatus.READY).toBe('READY');
      expect(TextbookStatus.FAILED).toBe('FAILED');
    });
  });
});
