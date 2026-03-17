/**
 * TextbooksController 单元测试
 * 测试覆盖率目标：80%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TextbooksController } from './textbooks.controller';
import { TextbooksService } from './textbooks.service';
import { CreateTextbookDto, UpdateTextbookDto, CreateUnitDto, UpdateUnitDto, TextbookStatus } from './textbooks.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock PrismaService
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
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// Mock TextbooksService
const mockTextbooksService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  parsePdf: jest.fn(),
  getUnits: jest.fn(),
  createUnit: jest.fn(),
  updateUnit: jest.fn(),
  removeUnit: jest.fn(),
};

describe('TextbooksController', () => {
  let controller: TextbooksController;
  let service: TextbooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbooksController],
      providers: [
        {
          provide: TextbooksService,
          useValue: mockTextbooksService,
        },
      ],
    }).compile();

    controller = module.get<TextbooksController>(TextbooksController);
    service = module.get<TextbooksService>(TextbooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建课本', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const createDto: CreateTextbookDto = {
        title: '三年级英语上册',
        subject: '英语',
        grade: 3,
        version: '人教版',
        pdfUrl: 'https://example.com/pdf.pdf',
        pdfPath: '/path/to/pdf.pdf',
      };
      const expectedResult = { id: 1, ...createDto, status: TextbookStatus.PENDING };

      mockTextbooksService.create.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.create(req as any, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(mockUser.sub, createDto);
    });
  });

  describe('findAll', () => {
    it('应该成功查询课本列表', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const queryDto = { subject: '英语', grade: 3 };
      const expectedResult = [
        { id: 1, title: '三年级英语上册', subject: '英语', grade: 3 },
      ];

      mockTextbooksService.findAll.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.findAll(req as any, queryDto);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(queryDto, mockUser.sub, mockUser.role);
    });

    it('应该支持管理员查询所有课本', async () => {
      const mockUser = { sub: 1, role: 'ADMIN' };
      const queryDto = { status: TextbookStatus.READY };
      const expectedResult = [{ id: 1, title: '课本 1' }, { id: 2, title: '课本 2' }];

      mockTextbooksService.findAll.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.findAll(req as any, queryDto);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(queryDto, mockUser.sub, mockUser.role);
    });
  });

  describe('findOne', () => {
    it('应该成功查询课本详情', async () => {
      const textbookId = 1;
      const expectedResult = {
        id: textbookId,
        title: '三年级英语上册',
        subject: '英语',
        units: [],
      };

      mockTextbooksService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(textbookId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(textbookId);
    });

    it('应该处理课本不存在的情况', async () => {
      const textbookId = 999;
      const error = new NotFoundException('课本不存在');

      mockTextbooksService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(textbookId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该成功更新课本', async () => {
      const textbookId = 1;
      const updateDto: UpdateTextbookDto = {
        title: 'updated title',
        status: TextbookStatus.READY,
      };
      const expectedResult = { id: textbookId, ...updateDto };

      mockTextbooksService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(textbookId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(textbookId, updateDto);
    });
  });

  describe('remove', () => {
    it('应该成功删除课本', async () => {
      const textbookId = 1;
      const expectedResult = { id: textbookId, deleted: true };

      mockTextbooksService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(textbookId);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(textbookId);
    });
  });

  describe('parsePdf', () => {
    it('应该成功解析 PDF 并生成单元树', async () => {
      const textbookId = 1;
      const expectedResult = { success: true, message: '解析完成' };

      mockTextbooksService.parsePdf.mockResolvedValue(expectedResult);

      const result = await controller.parsePdf(textbookId);

      expect(result).toEqual(expectedResult);
      expect(service.parsePdf).toHaveBeenCalledWith(textbookId);
    });

    it('应该处理 PDF 解析失败', async () => {
      const textbookId = 1;
      const error = new BadRequestException('PDF 解析失败');

      mockTextbooksService.parsePdf.mockRejectedValue(error);

      await expect(controller.parsePdf(textbookId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUnits', () => {
    it('应该成功获取单元树', async () => {
      const textbookId = 1;
      const expectedResult = [
        { id: 1, title: '第一单元', unitNumber: 'Unit 1', sortOrder: 0 },
        { id: 2, title: '第二单元', unitNumber: 'Unit 2', sortOrder: 1 },
      ];

      mockTextbooksService.getUnits.mockResolvedValue(expectedResult);

      const result = await controller.getUnits(textbookId);

      expect(result).toEqual(expectedResult);
      expect(service.getUnits).toHaveBeenCalledWith(textbookId);
    });
  });

  describe('createUnit', () => {
    it('应该成功创建单元', async () => {
      const textbookId = 1;
      const createDto: CreateUnitDto = {
        title: '新单元',
        unitNumber: 'Unit 4',
        pageStart: 31,
        pageEnd: 40,
        sortOrder: 3,
      };
      const expectedResult = { id: 10, textbookId, ...createDto };

      mockTextbooksService.createUnit.mockResolvedValue(expectedResult);

      const result = await controller.createUnit(textbookId, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createUnit).toHaveBeenCalledWith(textbookId, createDto);
    });
  });

  describe('updateUnit', () => {
    it('应该成功更新单元', async () => {
      const unitId = 1;
      const updateDto: UpdateUnitDto = {
        title: 'updated unit title',
        sortOrder: 5,
      };
      const expectedResult = { id: unitId, ...updateDto };

      mockTextbooksService.updateUnit.mockResolvedValue(expectedResult);

      const result = await controller.updateUnit(unitId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updateUnit).toHaveBeenCalledWith(unitId, updateDto);
    });
  });

  describe('removeUnit', () => {
    it('应该成功删除单元', async () => {
      const unitId = 1;
      const expectedResult = { id: unitId, deleted: true };

      mockTextbooksService.removeUnit.mockResolvedValue(expectedResult);

      const result = await controller.removeUnit(unitId);

      expect(result).toEqual(expectedResult);
      expect(service.removeUnit).toHaveBeenCalledWith(unitId);
    });

    it('应该处理有子单元的删除请求', async () => {
      const unitId = 1;
      const error = new BadRequestException('请先删除子单元');

      mockTextbooksService.removeUnit.mockRejectedValue(error);

      await expect(controller.removeUnit(unitId)).rejects.toThrow(BadRequestException);
    });
  });
});
