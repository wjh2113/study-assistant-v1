/**
 * Workers 层单元测试
 * 覆盖率目标：70%+
 */

let mockPrisma;
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
  mockPrisma = { textbook: { update: jest.fn(), findUnique: jest.fn() }, user: { findUnique: jest.fn() }, practiceSession: { findMany: jest.fn() }, question: { create: jest.fn() }, $disconnect: jest.fn() };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, promises: { ...actual.promises, access: jest.fn() } };
});
jest.mock('../../src/modules/textbook-parser/TextbookParserService', () => ({ parseComplete: jest.fn() }));
jest.mock('axios');

const { PrismaClient } = require('@prisma/client');
const TextbookParserService = require('../../src/modules/textbook-parser/TextbookParserService');
const axios = require('axios');
const fs = require('fs');
const { parseTextbookPDF, createTextbookParserWorker } = require('../../src/workers/textbookParser');
const { generateQuestions, createAIGeneratorWorker } = require('../../src/workers/aiQuestionGenerator');
const { generateReport, createReportGeneratorWorker } = require('../../src/workers/reportGenerator');

describe('textbookParser', () => {
  let mockJob;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { data: { textbookId: 't1', filePath: '/file.pdf' }, updateProgress: jest.fn() };
  });

  test('成功解析', async () => {
    const result = { success: true, parseResult: {}, stages: { extract: { pageCount: 100 }, structure: { unitsCount: 5, chaptersCount: 10 }, knowledge: { knowledgePointsCount: 50 } } };
    TextbookParserService.parseComplete.mockResolvedValue(result);
    fs.promises.access.mockResolvedValue();
    mockPrisma.textbook.update.mockResolvedValue({});
    const res = await parseTextbookPDF(mockJob);
    expect(res.success).toBe(true);
    expect(res.pageCount).toBe(100);
  });

  test('更新进度', async () => {
    TextbookParserService.parseComplete.mockImplementation((fp, id, cb) => { cb({ progress: 0.5 }); return Promise.resolve({ success: true, parseResult: {}, stages: {} }); });
    fs.promises.access.mockResolvedValue();
    mockPrisma.textbook.update.mockResolvedValue({});
    await parseTextbookPDF(mockJob);
    expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
  });

  test('缺少 filePath 抛出错误', async () => {
    mockJob.data.filePath = null;
    await expect(parseTextbookPDF(mockJob)).rejects.toThrow('缺少 filePath 参数');
  });

  test('文件不存在抛出错误', async () => {
    fs.promises.access.mockRejectedValue(new Error('ENOENT'));
    await expect(parseTextbookPDF(mockJob)).rejects.toThrow('ENOENT');
  });

  test('解析失败抛出错误', async () => {
    TextbookParserService.parseComplete.mockResolvedValue({ success: false, error: '解析错误' });
    fs.promises.access.mockResolvedValue();
    await expect(parseTextbookPDF(mockJob)).rejects.toThrow('解析错误');
  });

  test('处理缺失 stages', async () => {
    TextbookParserService.parseComplete.mockResolvedValue({ success: true, parseResult: {}, stages: {} });
    fs.promises.access.mockResolvedValue();
    mockPrisma.textbook.update.mockResolvedValue({});
    const res = await parseTextbookPDF(mockJob);
    expect(res.pageCount).toBe(0);
  });

  test.skip('创建 Worker', () => {
    const { Worker } = require('bullmq');
    createTextbookParserWorker();
    expect(Worker).toHaveBeenCalledWith('textbook-parse', expect.any(Function), expect.objectContaining({ concurrency: 2 }));
  });
});

describe('aiQuestionGenerator', () => {
  let mockJob;
  const mockTextbook = { id: 't1', subject: '数学', grade: '三年级', parse_result: { chapters: [{ id: 'u1', title: '单元', sections: [] }] } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { data: { sessionId: 's1', textbookId: 't1', unitId: 'u1', questionCount: 5 } };
    mockPrisma.textbook.findUnique.mockResolvedValue(mockTextbook);
  });

  test('成功生成', async () => {
    const aiContent = JSON.stringify({ questions: [{ type: 'single_choice', question: 'Q', options: ['A'], answer: 'A', explanation: 'E' }] });
    axios.post.mockResolvedValue({ data: { choices: [{ message: { content: aiContent } }] } });
    mockPrisma.question.create.mockResolvedValue({ id: 'q1' });
    const res = await generateQuestions(mockJob);
    expect(res.success).toBe(true);
  });

  test('课本不存在', async () => {
    mockPrisma.textbook.findUnique.mockResolvedValue(null);
    await expect(generateQuestions(mockJob)).rejects.toThrow('课本不存在');
  });

  test('单元不存在', async () => {
    mockPrisma.textbook.findUnique.mockResolvedValue({ id: 't1', parse_result: { chapters: [{ id: 'other' }] } });
    await expect(generateQuestions(mockJob)).rejects.toThrow('单元不存在');
  });

  test('AI 返回非 JSON 使用备用', async () => {
    axios.post.mockResolvedValue({ data: { choices: [{ message: { content: 'invalid' } }] } });
    mockPrisma.question.create.mockResolvedValue({ id: 'q1' });
    const res = await generateQuestions(mockJob);
    expect(res.success).toBe(true);
  });

  test('AI API 失败', async () => {
    axios.post.mockRejectedValue(new Error('AI 错误'));
    await expect(generateQuestions(mockJob)).rejects.toThrow('AI 错误');
  });

  test('parse_result 为 null', async () => {
    mockPrisma.textbook.findUnique.mockResolvedValue({ id: 't1', parse_result: null });
    await expect(generateQuestions(mockJob)).rejects.toThrow('单元不存在');
  });

  test.skip('创建 Worker', () => {
    const { Worker } = require('bullmq');
    createAIGeneratorWorker();
    expect(Worker).toHaveBeenCalledWith('ai-generate', expect.any(Function), expect.objectContaining({ concurrency: 3 }));
  });
});

describe('reportGenerator', () => {
  let mockJob;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJob = { data: { userId: 'u1', reportType: 'weekly' } };
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
  });

  test('成功生成周报', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([{ questions: [{ is_correct: true }, { is_correct: false }] }, { questions: [{ is_correct: true }] }]);
    const res = await generateReport(mockJob);
    expect(res.success).toBe(true);
    expect(res.report.summary.totalQuestions).toBe(3);
    expect(res.report.summary.accuracy).toBe('66.67%');
  });

  test('生成月报', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([]);
    mockJob.data.reportType = 'monthly';
    const res = await generateReport(mockJob);
    expect(res.report.reportType).toBe('monthly');
  });

  test('自定义日期范围', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([]);
    mockJob.data = { userId: 'u1', startDate: '2024-01-01', endDate: '2024-01-31' };
    await generateReport(mockJob);
    expect(mockPrisma.practiceSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ created_at: { gte: expect.any(Date), lte: expect.any(Date) } }) }));
  });

  test('用户不存在', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(generateReport(mockJob)).rejects.toThrow('用户不存在');
  });

  test('没有会话', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([]);
    const res = await generateReport(mockJob);
    expect(res.report.summary.totalSessions).toBe(0);
  });

  test('null questions', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([{ questions: null }]);
    const res = await generateReport(mockJob);
    expect(res.report.summary.totalQuestions).toBe(0);
  });

  test('100% 正确率', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([{ questions: [{ is_correct: true }] }]);
    const res = await generateReport(mockJob);
    expect(res.report.summary.accuracy).toBe('100.00%');
  });

  test('0% 正确率', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([{ questions: [{ is_correct: false }] }]);
    const res = await generateReport(mockJob);
    expect(res.report.summary.accuracy).toBe('0.00%');
  });

  test('数据库失败', async () => {
    mockPrisma.practiceSession.findMany.mockRejectedValue(new Error('DB 错误'));
    await expect(generateReport(mockJob)).rejects.toThrow('DB 错误');
  });

  test.skip('创建 Worker', () => {
    const { Worker } = require('bullmq');
    createReportGeneratorWorker();
    expect(Worker).toHaveBeenCalledWith('report-generate', expect.any(Function), expect.objectContaining({ concurrency: 2 }));
  });

  test('报告包含所有字段', async () => {
    mockPrisma.practiceSession.findMany.mockResolvedValue([{ questions: [{ is_correct: true }] }]);
    const res = await generateReport(mockJob);
    expect(res.report).toHaveProperty('userId');
    expect(res.report).toHaveProperty('period');
    expect(res.report).toHaveProperty('summary');
    expect(res.report).toHaveProperty('generatedAt');
  });
});
