/**
 * LearningController 单元测试
 * 测试覆盖率目标：80%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { CreateLearningRecordDto, QueryLearningRecordsDto } from './learning.dto';

// Mock LearningService
const mockLearningService = {
  createRecord: jest.fn(),
  getRecords: jest.fn(),
  getStats: jest.fn(),
  getRecordsByDay: jest.fn(),
};

describe('LearningController', () => {
  let controller: LearningController;
  let service: LearningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningController],
      providers: [
        {
          provide: LearningService,
          useValue: mockLearningService,
        },
      ],
    }).compile();

    controller = module.get<LearningController>(LearningController);
    service = module.get<LearningService>(LearningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecord', () => {
    it('应该成功创建学习记录', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const createDto: CreateLearningRecordDto = {
        textbookId: 10,
        unitId: 20,
        actionType: 'START_PRACTICE',
        duration: 300,
        score: 85,
      };
      const expectedResult = {
        id: 1,
        userId: mockUser.sub,
        ...createDto,
        createdAt: new Date(),
      };

      mockLearningService.createRecord.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.createRecord(req as any, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createRecord).toHaveBeenCalledWith(mockUser.sub, createDto);
    });

    it('应该创建完成练习的学习记录', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const createDto: CreateLearningRecordDto = {
        textbookId: 10,
        unitId: 20,
        actionType: 'FINISH_PRACTICE',
        duration: 600,
        score: 90,
      };
      const expectedResult = { id: 2, userId: mockUser.sub, ...createDto };

      mockLearningService.createRecord.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.createRecord(req as any, createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createRecord).toHaveBeenCalledWith(mockUser.sub, createDto);
    });
  });

  describe('getRecords', () => {
    it('应该成功查询学习记录列表（默认 limit）', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const queryDto: QueryLearningRecordsDto = {
        textbookId: 10,
        unitId: 20,
        actionType: 'FINISH_PRACTICE',
      };
      const expectedResult = [
        { id: 1, textbookId: 10, unitId: 20, actionType: 'FINISH_PRACTICE', score: 85, duration: 300 },
        { id: 2, textbookId: 10, unitId: 20, actionType: 'FINISH_PRACTICE', score: 90, duration: 450 },
      ];

      mockLearningService.getRecords.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getRecords(req as any, queryDto);

      expect(result).toEqual(expectedResult);
      expect(service.getRecords).toHaveBeenCalledWith(mockUser.sub, queryDto, 50);
    });

    it('应该支持自定义 limit 参数', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const queryDto: QueryLearningRecordsDto = {};
      const limit = 100;
      const expectedResult = [{ id: 1, textbookId: 10, actionType: 'START_PRACTICE' }];

      mockLearningService.getRecords.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getRecords(req as any, queryDto, limit);

      expect(result).toEqual(expectedResult);
      expect(service.getRecords).toHaveBeenCalledWith(mockUser.sub, queryDto, limit);
    });

    it('应该支持按单元 ID 过滤', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const queryDto: QueryLearningRecordsDto = { unitId: 25 };
      const expectedResult = [
        { id: 3, unitId: 25, actionType: 'FINISH_PRACTICE', score: 88 },
      ];

      mockLearningService.getRecords.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getRecords(req as any, queryDto);

      expect(result).toEqual(expectedResult);
      expect(service.getRecords).toHaveBeenCalledWith(mockUser.sub, queryDto, 50);
    });
  });

  describe('getStats', () => {
    it('应该成功获取学习统计', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const expectedResult = {
        totalRecords: 150,
        totalDuration: 45000,
        finishedPractices: 100,
        averageScore: 85,
        recentRecords: 20,
        subjectBreakdown: [
          { subject: '数学', count: 50 },
          { subject: '英语', count: 60 },
          { subject: '语文', count: 40 },
        ],
      };

      mockLearningService.getStats.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getStats(req as any);

      expect(result).toEqual(expectedResult);
      expect(service.getStats).toHaveBeenCalledWith(mockUser.sub);
    });

    it('应该返回新用户的学习统计', async () => {
      const mockUser = { sub: 999, role: 'USER' };
      const expectedResult = {
        totalRecords: 0,
        totalDuration: 0,
        finishedPractices: 0,
        averageScore: 0,
        recentRecords: 0,
        subjectBreakdown: [],
      };

      mockLearningService.getStats.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getStats(req as any);

      expect(result).toEqual(expectedResult);
      expect(service.getStats).toHaveBeenCalledWith(mockUser.sub);
    });
  });

  describe('getRecordsByDay', () => {
    it('应该成功获取按天分组的学习记录（默认 7 天）', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const expectedResult = [
        { date: '2024-01-15', count: 5 },
        { date: '2024-01-16', count: 3 },
        { date: '2024-01-17', count: 7 },
      ];

      mockLearningService.getRecordsByDay.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getRecordsByDay(req as any);

      expect(result).toEqual(expectedResult);
      expect(service.getRecordsByDay).toHaveBeenCalledWith(mockUser.sub, 7);
    });

    it('应该支持自定义天数参数', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const days = 30;
      const expectedResult = [
        { date: '2024-01-01', count: 10 },
        { date: '2024-01-02', count: 8 },
      ];

      mockLearningService.getRecordsByDay.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getRecordsByDay(req as any, days);

      expect(result).toEqual(expectedResult);
      expect(service.getRecordsByDay).toHaveBeenCalledWith(mockUser.sub, days);
    });

    it('应该处理没有学习记录的情况', async () => {
      const mockUser = { sub: 999, role: 'USER' };
      const expectedResult: any[] = [];

      mockLearningService.getRecordsByDay.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getRecordsByDay(req as any, 7);

      expect(result).toEqual(expectedResult);
      expect(service.getRecordsByDay).toHaveBeenCalledWith(mockUser.sub, 7);
    });
  });
});
