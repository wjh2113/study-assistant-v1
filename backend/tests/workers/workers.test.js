/**
 * Workers 层单元测试（完整版）
 * 覆盖率目标：70%+
 * 覆盖：textbookParser, aiQuestionGenerator, reportGenerator, leaderboardCalculator
 */

let mockPrisma;
let mockCache;
let mockLeaderboardModel;

jest.mock('../../src/config/queue', () => ({ connection: {} }));
jest.mock('bullmq', () => {
  return {
    Worker: jest.fn(function() {
      const self = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn(),
      };
      return self;
    })
  };
});
jest.mock('@prisma/client', () => {
  mockPrisma = {
    textbook: { update: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    practiceSession: { findMany: jest.fn() },
    question: { create: jest.fn() },
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, promises: { ...actual.promises, access: jest.fn() } };
});
jest.mock('../../src/modules/textbook-parser/TextbookParserService', () => ({ parseComplete: jest.fn() }));
jest.mock('axios');
jest.mock('node-cron', () => ({
  schedule: jest.fn((pattern, callback, options) => ({
    stop: jest.fn(),
  }))
}));
jest.mock('../../src/modules/leaderboard/LeaderboardModel', () => {
  mockLeaderboardModel = {
    calculateTotalRanking: jest.fn(),
    calculateWeeklyRanking: jest.fn(),
    calculateMonthlyRanking: jest.fn(),
    createSnapshot: jest.fn(),
  };
  return mockLeaderboardModel;
});
jest.mock('../../src/modules/leaderboard/LeaderboardCache', () => ({
  getLeaderboardCache: () => {
    mockCache = {
      set: jest.fn(),
      invalidateAll: jest.fn(),
      close: jest.fn(),
    };
    return mockCache;
  }
}));

const { PrismaClient } = require('@prisma/client');
const TextbookParserService = require('../../src/modules/textbook-parser/TextbookParserService');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const { parseTextbookPDF, createTextbookParserWorker } = require('../../src/workers/textbookParser');
const { generateQuestions, createAIGeneratorWorker, generateFallbackQuestions } = require('../../src/workers/aiQuestionGenerator');
const { generateReport, createReportGeneratorWorker } = require('../../src/workers/reportGenerator');
const { calculateAllLeaderboards, cleanupExpiredCache, startLeaderboardScheduler } = require('../../src/workers/leaderboardCalculator');
const { startAllWorkers, stopAllWorkers } = require('../../src/workers/index');

// ==================== textbookParser Worker 测试 ====================

describe('textbookParser Worker', () => {
  let mockJob;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { data: { textbookId: 't1', filePath: '/file.pdf' }, updateProgress: jest.fn() };
  });

  describe('parseTextbookPDF', () => {
    test('成功解析课本 PDF', async () => {
      const result = {
        success: true,
        parseResult: { bookInfo: { title: '数学三年级' } },
        stages: {
          extract: { pageCount: 100 },
          structure: { unitsCount: 5, chaptersCount: 10 },
          knowledge: { knowledgePointsCount: 50 }
        }
      };
      TextbookParserService.parseComplete.mockResolvedValue(result);
      fs.promises.access.mockResolvedValue();
      mockPrisma.textbook.update.mockResolvedValue({});

      const res = await parseTextbookPDF(mockJob);

      expect(res.success).toBe(true);
      expect(res.pageCount).toBe(100);
      expect(res.unitsCount).toBe(5);
      expect(res.chaptersCount).toBe(10);
      expect(res.knowledgePointsCount).toBe(50);
      expect(res.bookInfo).toEqual({ title: '数学三年级' });
      expect(mockPrisma.textbook.update).toHaveBeenCalledTimes(2);
    });

    test('更新任务进度', async () => {
      TextbookParserService.parseComplete.mockImplementation((fp, id, cb) => {
        cb({ progress: 0.25, stage: 'extracting' });
        cb({ progress: 0.5, stage: 'structuring' });
        cb({ progress: 0.75, stage: 'knowledge' });
        return Promise.resolve({ success: true, parseResult: {}, stages: {} });
      });
      fs.promises.access.mockResolvedValue();
      mockPrisma.textbook.update.mockResolvedValue({});

      await parseTextbookPDF(mockJob);

      expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(75);
    });

    test('缺少 filePath 参数抛出错误', async () => {
      mockJob.data.filePath = null;
      await expect(parseTextbookPDF(mockJob)).rejects.toThrow('缺少 filePath 参数');
      expect(mockPrisma.textbook.update).toHaveBeenCalled();
    });

    test('文件不存在抛出错误', async () => {
      fs.promises.access.mockRejectedValue(new Error('ENOENT: no such file'));
      await expect(parseTextbookPDF(mockJob)).rejects.toThrow('ENOENT');
    });

    test('解析服务返回失败', async () => {
      TextbookParserService.parseComplete.mockResolvedValue({
        success: false,
        error: 'PDF 格式错误'
      });
      fs.promises.access.mockResolvedValue();
      await expect(parseTextbookPDF(mockJob)).rejects.toThrow('PDF 格式错误');
    });

    test('处理 stages 字段缺失的情况', async () => {
      TextbookParserService.parseComplete.mockResolvedValue({
        success: true,
        parseResult: {},
        stages: {}
      });
      fs.promises.access.mockResolvedValue();
      mockPrisma.textbook.update.mockResolvedValue({});

      const res = await parseTextbookPDF(mockJob);

      expect(res.pageCount).toBe(0);
      expect(res.unitsCount).toBe(0);
      expect(res.chaptersCount).toBe(0);
      expect(res.knowledgePointsCount).toBe(0);
    });

    test('解析异常时更新状态为 failed', async () => {
      fs.promises.access.mockRejectedValue(new Error('文件访问错误'));
      await expect(parseTextbookPDF(mockJob)).rejects.toThrow('文件访问错误');
      expect(mockPrisma.textbook.update).toHaveBeenCalled();
    });

    test('返回包含耗时信息', async () => {
      const result = {
        success: true,
        parseResult: {},
        stages: { extract: { pageCount: 50 }, structure: {}, knowledge: {} }
      };
      TextbookParserService.parseComplete.mockResolvedValue(result);
      fs.promises.access.mockResolvedValue();
      mockPrisma.textbook.update.mockResolvedValue({});

      const res = await parseTextbookPDF(mockJob);

      expect(res.durationMs).toBeDefined();
      expect(typeof res.durationMs).toBe('number');
    });
  });

  describe('createTextbookParserWorker', () => {
    test('创建 Worker 实例', () => {
      jest.clearAllMocks();
      const worker = createTextbookParserWorker();
      expect(worker).toBeDefined();
      expect(worker.on).toBeDefined();
      expect(worker.close).toBeDefined();
    });
  });
});

// ==================== aiQuestionGenerator Worker 测试 ====================

describe('aiQuestionGenerator Worker', () => {
  let mockJob;
  const mockTextbook = {
    id: 't1',
    subject: '数学',
    grade: '三年级',
    parse_result: {
      chapters: [
        { id: 'u1', title: '第一单元', sections: [] },
        { id: 'u2', title: '第二单元', sections: [{ id: 'u1' }] }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { data: { sessionId: 's1', textbookId: 't1', unitId: 'u1', questionCount: 5 } };
    mockPrisma.textbook.findUnique.mockResolvedValue(mockTextbook);
  });

  describe('generateQuestions', () => {
    test('成功生成题目', async () => {
      const aiContent = JSON.stringify({
        questions: [
          {
            type: 'single_choice',
            question: '1+1=?',
            options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
            answer: 'B',
            explanation: '简单加法'
          }
        ]
      });
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: aiContent } }] }
      });
      mockPrisma.question.create.mockResolvedValue({ id: 'q1' });

      const res = await generateQuestions(mockJob);

      expect(res.success).toBe(true);
      expect(res.questionsCount).toBe(1);
      expect(axios.post).toHaveBeenCalled();
    });

    test('课本不存在抛出错误', async () => {
      mockPrisma.textbook.findUnique.mockResolvedValue(null);
      await expect(generateQuestions(mockJob)).rejects.toThrow('课本不存在');
    });

    test('单元不存在抛出错误', async () => {
      mockPrisma.textbook.findUnique.mockResolvedValue({
        id: 't1',
        parse_result: { chapters: [{ id: 'other-unit' }] }
      });
      await expect(generateQuestions(mockJob)).rejects.toThrow('单元不存在');
    });

    test('AI 返回非 JSON 格式时使用备用题目', async () => {
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: 'invalid json' } }] }
      });
      mockPrisma.question.create.mockResolvedValue({ id: 'q1' });

      const res = await generateQuestions(mockJob);

      expect(res.success).toBe(true);
    });

    test('AI API 调用失败', async () => {
      axios.post.mockRejectedValue(new Error('网络错误'));
      await expect(generateQuestions(mockJob)).rejects.toThrow('网络错误');
    });

    test('parse_result 为 null 时处理', async () => {
      mockPrisma.textbook.findUnique.mockResolvedValue({
        id: 't1',
        parse_result: null
      });
      await expect(generateQuestions(mockJob)).rejects.toThrow('单元不存在');
    });

    test('题目数量为 0 时正常处理', async () => {
      const aiContent = JSON.stringify({ questions: [] });
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: aiContent } }] }
      });

      const res = await generateQuestions(mockJob);

      expect(res.success).toBe(true);
      expect(res.questionsCount).toBe(0);
    });

    test('使用环境变量中的 AI API URL', async () => {
      process.env.AI_API_URL = 'https://custom-ai-api.com/v1';
      const aiContent = JSON.stringify({ questions: [] });
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: aiContent } }] }
      });

      await generateQuestions(mockJob);

      expect(axios.post).toHaveBeenCalledWith(
        'https://custom-ai-api.com/v1',
        expect.any(Object),
        expect.any(Object)
      );

      delete process.env.AI_API_URL;
    });
  });

  describe('generateFallbackQuestions', () => {
    test('生成备用题目', () => {
      const unit = { title: '单元测试' };
      const questions = generateFallbackQuestions(3, unit);

      expect(questions).toHaveLength(3);
      expect(questions[0]).toHaveProperty('type', 'single_choice');
      expect(questions[0].question).toContain('单元测试');
      expect(questions[0]).toHaveProperty('options');
      expect(questions[0]).toHaveProperty('answer');
      expect(questions[0]).toHaveProperty('explanation');
    });

    test('生成 0 道题目', () => {
      const questions = generateFallbackQuestions(0, { title: '测试' });
      expect(questions).toHaveLength(0);
    });

    test('生成大量题目', () => {
      const questions = generateFallbackQuestions(100, { title: '测试' });
      expect(questions).toHaveLength(100);
    });
  });

  describe('createAIGeneratorWorker', () => {
    test('创建 Worker 实例', () => {
      jest.clearAllMocks();
      const worker = createAIGeneratorWorker();
      expect(worker).toBeDefined();
      expect(worker.on).toBeDefined();
      expect(worker.close).toBeDefined();
    });
  });
});

// ==================== reportGenerator Worker 测试 ====================

describe('reportGenerator Worker', () => {
  let mockJob;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { data: { userId: 'u1', reportType: 'weekly' } };
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', name: '测试用户' });
  });

  describe('generateReport', () => {
    test('成功生成周报', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([
        { questions: [{ is_correct: true }, { is_correct: false }] },
        { questions: [{ is_correct: true }] }
      ]);

      const res = await generateReport(mockJob);

      expect(res.success).toBe(true);
      expect(res.report.summary.totalSessions).toBe(2);
      expect(res.report.summary.totalQuestions).toBe(3);
      expect(res.report.summary.correctQuestions).toBe(2);
      expect(res.report.summary.accuracy).toBe('66.67%');
    });

    test('生成月报', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([]);
      mockJob.data.reportType = 'monthly';

      const res = await generateReport(mockJob);

      expect(res.report.reportType).toBe('monthly');
    });

    test('使用自定义日期范围', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([]);
      mockJob.data = {
        userId: 'u1',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      await generateReport(mockJob);

      expect(mockPrisma.practiceSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: {
              gte: expect.any(Date),
              lte: expect.any(Date)
            }
          })
        })
      );
    });

    test('用户不存在抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(generateReport(mockJob)).rejects.toThrow('用户不存在');
    });

    test('没有会话记录时生成空报告', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([]);

      const res = await generateReport(mockJob);

      expect(res.report.summary.totalSessions).toBe(0);
      expect(res.report.summary.totalQuestions).toBe(0);
      expect(res.report.summary.accuracy).toBe(0);
    });

    test('处理 questions 为 null 的会话', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([
        { questions: null },
        { questions: undefined }
      ]);

      const res = await generateReport(mockJob);

      expect(res.report.summary.totalQuestions).toBe(0);
    });

    test('100% 正确率', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([
        { questions: [{ is_correct: true }, { is_correct: true }] }
      ]);

      const res = await generateReport(mockJob);

      expect(res.report.summary.accuracy).toBe('100.00%');
    });

    test('0% 正确率', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([
        { questions: [{ is_correct: false }, { is_correct: false }] }
      ]);

      const res = await generateReport(mockJob);

      expect(res.report.summary.accuracy).toBe('0.00%');
    });

    test('数据库查询失败', async () => {
      mockPrisma.practiceSession.findMany.mockRejectedValue(new Error('数据库错误'));
      await expect(generateReport(mockJob)).rejects.toThrow('数据库错误');
    });

    test('报告包含所有必需字段', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([
        { questions: [{ is_correct: true }] }
      ]);

      const res = await generateReport(mockJob);

      expect(res.report).toHaveProperty('userId', 'u1');
      expect(res.report).toHaveProperty('reportType', 'weekly');
      expect(res.report).toHaveProperty('period');
      expect(res.report.period).toHaveProperty('startDate');
      expect(res.report.period).toHaveProperty('endDate');
      expect(res.report).toHaveProperty('summary');
      expect(res.report.summary).toHaveProperty('totalSessions');
      expect(res.report.summary).toHaveProperty('totalQuestions');
      expect(res.report.summary).toHaveProperty('correctQuestions');
      expect(res.report.summary).toHaveProperty('accuracy');
      expect(res.report).toHaveProperty('generatedAt');
    });

    test('默认使用最近 7 天（周报）', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([]);
      await generateReport(mockJob);

      const callArg = mockPrisma.practiceSession.findMany.mock.calls[0][0];
      expect(callArg.where.created_at.gte).toBeInstanceOf(Date);
    });

    test('默认使用最近 30 天（月报）', async () => {
      mockPrisma.practiceSession.findMany.mockResolvedValue([]);
      mockJob.data.reportType = 'monthly';
      await generateReport(mockJob);

      const callArg = mockPrisma.practiceSession.findMany.mock.calls[0][0];
      expect(callArg.where.created_at.gte).toBeInstanceOf(Date);
    });

    test('处理大量会话数据', async () => {
      const sessions = Array(100).fill(null).map((_, i) => ({
        questions: [
          { is_correct: i % 2 === 0 },
          { is_correct: i % 3 === 0 }
        ]
      }));
      mockPrisma.practiceSession.findMany.mockResolvedValue(sessions);

      const res = await generateReport(mockJob);

      expect(res.report.summary.totalSessions).toBe(100);
      expect(res.report.summary.totalQuestions).toBe(200);
    });
  });

  describe('createReportGeneratorWorker', () => {
    test('创建 Worker 实例', () => {
      jest.clearAllMocks();
      const worker = createReportGeneratorWorker();
      expect(worker).toBeDefined();
      expect(worker.on).toBeDefined();
      expect(worker.close).toBeDefined();
    });
  });
});

// ==================== leaderboardCalculator Worker 测试 ====================

describe('leaderboardCalculator Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAllLeaderboards', () => {
    test('成功计算所有排行榜', async () => {
      mockLeaderboardModel.calculateTotalRanking.mockReturnValue([
        { userId: 'u1', score: 100 },
        { userId: 'u2', score: 90 }
      ]);
      mockLeaderboardModel.calculateWeeklyRanking.mockReturnValue([
        { userId: 'u1', score: 50 }
      ]);
      mockLeaderboardModel.calculateMonthlyRanking.mockReturnValue([
        { userId: 'u2', score: 80 }
      ]);
      mockCache.set.mockResolvedValue();
      mockLeaderboardModel.createSnapshot.mockReturnValue();

      const res = await calculateAllLeaderboards();

      expect(res.success).toBe(true);
      expect(res.counts.total).toBe(2);
      expect(res.counts.weekly).toBe(1);
      expect(res.counts.monthly).toBe(1);
      expect(mockCache.set).toHaveBeenCalledTimes(3);
      expect(mockLeaderboardModel.createSnapshot).toHaveBeenCalledTimes(3);
    });

    test('计算失败时返回错误信息', async () => {
      mockLeaderboardModel.calculateTotalRanking.mockImplementation(() => {
        throw new Error('计算错误');
      });

      const res = await calculateAllLeaderboards();

      expect(res.success).toBe(false);
      expect(res.error).toBe('计算错误');
    });

    test('返回计算耗时', async () => {
      mockLeaderboardModel.calculateTotalRanking.mockReturnValue([]);
      mockLeaderboardModel.calculateWeeklyRanking.mockReturnValue([]);
      mockLeaderboardModel.calculateMonthlyRanking.mockReturnValue([]);
      mockCache.set.mockResolvedValue();

      const res = await calculateAllLeaderboards();

      expect(res.duration).toBeDefined();
      expect(typeof res.duration).toBe('number');
    });

    test('空排行榜处理', async () => {
      mockLeaderboardModel.calculateTotalRanking.mockReturnValue([]);
      mockLeaderboardModel.calculateWeeklyRanking.mockReturnValue([]);
      mockLeaderboardModel.calculateMonthlyRanking.mockReturnValue([]);
      mockCache.set.mockResolvedValue();

      const res = await calculateAllLeaderboards();

      expect(res.success).toBe(true);
      expect(res.counts.total).toBe(0);
      expect(res.counts.weekly).toBe(0);
      expect(res.counts.monthly).toBe(0);
    });
  });

  describe('cleanupExpiredCache', () => {
    test('清理过期缓存', async () => {
      mockCache.invalidateAll.mockResolvedValue(5);

      await cleanupExpiredCache();

      expect(mockCache.invalidateAll).toHaveBeenCalled();
      expect(mockCache.invalidateAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('startLeaderboardScheduler', () => {
    test('启动定时任务', () => {
      const scheduler = startLeaderboardScheduler();

      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'Asia/Shanghai' })
      );
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'Asia/Shanghai' })
      );
      expect(scheduler).toHaveProperty('hourlyTask');
      expect(scheduler).toHaveProperty('dailyTask');
      expect(scheduler).toHaveProperty('stop');
    });

    test('停止定时任务', () => {
      const scheduler = startLeaderboardScheduler();
      scheduler.stop();

      expect(scheduler.hourlyTask.stop).toHaveBeenCalled();
      expect(scheduler.dailyTask.stop).toHaveBeenCalled();
    });
  });
});

// ==================== Workers Index 测试 ====================

describe('Workers Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startAllWorkers', () => {
    test('启动所有 Worker', () => {
      jest.clearAllMocks();
      const workers = startAllWorkers();

      expect(workers).toHaveLength(3);
    });
  });

  describe('stopAllWorkers', () => {
    test('优雅关闭所有 Worker', async () => {
      jest.clearAllMocks();
      const mockWorkers = [
        { close: jest.fn().mockResolvedValue() },
        { close: jest.fn().mockResolvedValue() },
        { close: jest.fn().mockResolvedValue() }
      ];

      await stopAllWorkers(mockWorkers);

      expect(mockWorkers[0].close).toHaveBeenCalled();
      expect(mockWorkers[1].close).toHaveBeenCalled();
      expect(mockWorkers[2].close).toHaveBeenCalled();
    });
  });
});

// ==================== 边界条件测试 ====================

describe('边界条件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('textbookParser: 超大页码数处理', async () => {
    const mockJob = {
      data: { textbookId: 't1', filePath: '/large.pdf' },
      updateProgress: jest.fn()
    };

    const result = {
      success: true,
      parseResult: {},
      stages: {
        extract: { pageCount: 9999 },
        structure: { unitsCount: 100, chaptersCount: 500 },
        knowledge: { knowledgePointsCount: 5000 }
      }
    };

    TextbookParserService.parseComplete.mockResolvedValue(result);
    fs.promises.access.mockResolvedValue();
    mockPrisma.textbook.update.mockResolvedValue({});

    const res = await parseTextbookPDF(mockJob);

    expect(res.pageCount).toBe(9999);
    expect(res.unitsCount).toBe(100);
    expect(res.chaptersCount).toBe(500);
  });

  test('reportGenerator: 除零错误处理', async () => {
    const mockJob = { data: { userId: 'u1', reportType: 'weekly' } };
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrisma.practiceSession.findMany.mockResolvedValue([]);

    const res = await generateReport(mockJob);

    expect(res.report.summary.accuracy).toBe(0);
  });
});
