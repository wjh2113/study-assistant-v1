/**
 * AI Gateway Module - Comprehensive Unit Tests
 * Coverage Target: 60%+
 */

const AiGatewayService = require('../../src/modules/ai-gateway/AiGatewayService');
const AiGatewayServiceV2 = require('../../src/modules/ai-gateway/AiGatewayServiceV2');
const AiGatewayController = require('../../src/modules/ai-gateway/AiGatewayController');
const AiGatewayControllerV2 = require('../../src/modules/ai-gateway/AiGatewayControllerV2');
const AiTaskLogModel = require('../../src/modules/ai-gateway/AiTaskLogModel');
const BatchUpdateService = require('../../src/modules/ai-gateway/BatchUpdateService');
const ResponseCacheService = require('../../src/modules/ai-gateway/ResponseCacheService');

// Mock axios for API calls
jest.mock('axios');
const axios = require('axios');

describe('AiGatewayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.QWEN_FLASH_KEY;
    delete process.env.QWEN_PLUS_KEY;
    delete process.env.QWEN_MAX_KEY;
    delete process.env.AI_API_KEY;
  });

  describe('MODEL_CONFIGS', () => {
    it('应该正确配置所有模型', () => {
      expect(AiGatewayService.MODEL_CONFIGS['qwen-flash']).toBeDefined();
      expect(AiGatewayService.MODEL_CONFIGS['qwen-plus']).toBeDefined();
      expect(AiGatewayService.MODEL_CONFIGS['qwen-max']).toBeDefined();
    });

    it('应该使用环境变量配置', () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      process.env.QWEN_FLASH_URL = 'https://test.url';
      
      expect(AiGatewayService.MODEL_CONFIGS['qwen-flash'].apiKey).toBe('test-key');
      expect(AiGatewayService.MODEL_CONFIGS['qwen-flash'].url).toBe('https://test.url');
    });
  });

  describe('selectModel', () => {
    const testCases = [
      ['simple-question', 'qwen-flash'],
      ['textbook-analysis', 'qwen-plus'],
      ['weakness-analysis', 'qwen-plus'],
      ['complex-question', 'qwen-max'],
      ['multi-step-reasoning', 'qwen-max'],
      ['unknown-type', 'qwen-plus']
    ];

    it.each(testCases)('应该为 %s 选择 %s', (taskType, expectedModel) => {
      expect(AiGatewayService.selectModel(taskType)).toBe(expectedModel);
    });
  });

  describe('callModel', () => {
    it('应该在不支持模型时抛出错误', async () => {
      await expect(AiGatewayService.callModel('invalid-model', 'prompt'))
        .rejects.toThrow('不支持的模型');
    });

    it('应该在 API Key 未配置时返回错误', async () => {
      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('API Key 未配置');
    });

    it('应该成功调用 API 并返回结果', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {
          output: {
            choices: [{
              message: { content: 'Test response' }
            }]
          },
          usage: { total_tokens: 100 }
        }
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Test response');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('应该在 API 返回错误格式时处理错误', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {}
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API 返回数据格式不正确');
    });

    it('应该在 AI 返回内容为空时处理错误', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {
          output: {
            choices: [{
              message: { content: '' }
            }]
          }
        }
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI 返回内容为空');
    });

    it('应该在网络错误时重试', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue({
          data: {
            output: {
              choices: [{ message: { content: 'Success after retry' } }]
            }
          }
        });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    it('应该在超过最大重试次数后失败', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockRejectedValue({ code: 'ECONNRESET' });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(axios.post).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('应该处理 HTTP 错误响应', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('429');
    });
  });

  describe('buildQuestionPrompt', () => {
    const baseParams = {
      textbookContent: 'Newton 第一定律',
      grade: '八年级',
      subject: '物理',
      unit: '力学',
      questionCount: 3,
      difficulty: 'medium',
      questionType: 'choice'
    };

    it('应该生成包含所有参数的提示词', () => {
      const prompt = AiGatewayService.buildQuestionPrompt(baseParams);
      
      expect(prompt).toContain('Newton 第一定律');
      expect(prompt).toContain('八年级');
      expect(prompt).toContain('物理');
      expect(prompt).toContain('力学');
      expect(prompt).toContain('3 道');
    });

    it('应该为不同难度生成正确的描述', () => {
      const difficulties = {
        easy: '基础题',
        medium: '中等难度',
        hard: '较难题'
      };

      for (const [difficulty, expectedText] of Object.entries(difficulties)) {
        const prompt = AiGatewayService.buildQuestionPrompt({
          ...baseParams,
          difficulty
        });
        expect(prompt).toContain(expectedText);
      }
    });

    it('应该为不同题型生成正确的描述', () => {
      const types = {
        choice: '选择题',
        fill: '填空题',
        short: '简答题'
      };

      for (const [type, expectedText] of Object.entries(types)) {
        const prompt = AiGatewayService.buildQuestionPrompt({
          ...baseParams,
          questionType: type
        });
        expect(prompt).toContain(expectedText);
      }
    });
  });

  describe('validateQuestion', () => {
    it('应该验证完整的题目对象', () => {
      const question = {
        id: 1,
        type: 'choice',
        difficulty: 'medium',
        question: '什么是重力？',
        options: ['A. 选项 1'],
        answer: 'A',
        explanation: '解析',
        knowledgePoint: '物理'
      };

      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result).toEqual(expect.objectContaining(question));
    });

    it('应该为缺失字段提供默认值', () => {
      const question = {
        question: '问题',
        answer: 'A'
      };

      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        type: 'choice',
        difficulty: 'medium',
        options: [],
        explanation: '',
        knowledgePoint: ''
      }));
    });

    it('应该拒绝缺少 question 字段的题目', () => {
      const question = { answer: 'A' };
      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result).toBeNull();
    });

    it('应该拒绝缺少 answer 字段的题目', () => {
      const question = { question: '问题' };
      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result).toBeNull();
    });
  });

  describe('parseAndValidateQuestions', () => {
    it('应该解析标准 JSON 格式', () => {
      const responseText = JSON.stringify({
        questions: [
          { question: '问题 1', answer: 'A' }
        ]
      });

      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('问题 1');
    });

    it('应该解析 questions 数组', () => {
      const responseText = JSON.stringify([
        { question: '问题 1', answer: 'A' }
      ]);

      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(result).toHaveLength(1);
    });

    it('应该从文本中提取 JSON', () => {
      const responseText = `好的，${JSON.stringify({
        questions: [{ question: '问题 1', answer: 'A' }]
      })} 希望有帮助。`;

      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(result).toHaveLength(1);
    });

    it('应该处理格式错误的 JSON', () => {
      const responseText = '这是损坏的 JSON {';
      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('repairAndParse', () => {
    it('应该从格式化文本中提取题目', () => {
      const text = `
        1. 第一题题目
        A. 选项 1
        B. 选项 2
        答案：A
        解析：这是解析
      `;

      const result = AiGatewayService.repairAndParse(text);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].question).toContain('第一题题目');
    });

    it('应该处理多道题目', () => {
      const text = `
        1. 题目一
        答案：A
        
        2. 题目二
        答案：B
      `;

      const result = AiGatewayService.repairAndParse(text);
      expect(result.length).toBe(2);
    });
  });

  describe('generateQuestions', () => {
    beforeEach(() => {
      process.env.QWEN_MAX_KEY = 'test-key';
    });

    it('应该成功生成题目', async () => {
      axios.post.mockResolvedValue({
        data: {
          output: {
            choices: [{
              message: {
                content: JSON.stringify({
                  questions: [
                    { question: '问题 1', answer: 'A', type: 'choice' }
                  ]
                })
              }
            }]
          },
          usage: { total_tokens: 100 }
        }
      });

      const result = await AiGatewayService.generateQuestions({
        textbookContent: '内容',
        grade: '八年级',
        subject: '物理',
        unit: '力学',
        questionCount: 1,
        difficulty: 'medium',
        questionType: 'choice'
      });

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
      expect(result.model).toBe('qwen-max');
    });

    it('应该在 AI 调用失败时抛出错误', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      await expect(AiGatewayService.generateQuestions({
        textbookContent: '内容',
        grade: '八年级',
        subject: '物理',
        unit: '力学'
      })).rejects.toThrow('题目生成失败');
    });
  });
});

describe('AiGatewayController', () => {
  describe('generateQuestions', () => {
    it('应该处理题目生成请求', async () => {
      const mockReq = {
        body: {
          textbookContent: '内容',
          grade: '八年级',
          subject: '物理',
          unit: '力学',
          questionCount: 5
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      jest.spyOn(AiGatewayService, 'generateQuestions').mockResolvedValue({
        success: true,
        questions: [{ id: 1, question: '问题 1', answer: 'A' }]
      });

      await AiGatewayController.generateQuestions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('应该处理错误情况', async () => {
      const mockReq = {
        body: {}
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      jest.spyOn(AiGatewayService, 'generateQuestions')
        .mockRejectedValue(new Error('生成失败'));

      await AiGatewayController.generateQuestions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

describe('ResponseCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('应该基于参数生成一致的缓存键', () => {
      const params1 = { grade: '8', subject: 'math', unit: 'algebra' };
      const params2 = { grade: '8', subject: 'math', unit: 'algebra' };
      
      const key1 = ResponseCacheService.generateCacheKey(params1);
      const key2 = ResponseCacheService.generateCacheKey(params2);
      
      expect(key1).toBe(key2);
    });

    it('应该为不同参数生成不同的缓存键', () => {
      const params1 = { grade: '8', subject: 'math' };
      const params2 = { grade: '9', subject: 'math' };
      
      const key1 = ResponseCacheService.generateCacheKey(params1);
      const key2 = ResponseCacheService.generateCacheKey(params2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('get/set cache', () => {
    it('应该存储和检索缓存数据', () => {
      const key = 'test-cache-key';
      const data = { questions: [{ id: 1 }] };

      ResponseCacheService.set(key, data);
      const retrieved = ResponseCacheService.get(key);

      expect(retrieved).toEqual(data);
    });

    it('应该对不存在的键返回 null', () => {
      const result = ResponseCacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('应该检查缓存是否过期', () => {
      const key = 'test-expiring-key';
      const data = { questions: [{ id: 1 }] };

      // 设置一个立即过期的缓存
      ResponseCacheService.set(key, data, -1);
      const retrieved = ResponseCacheService.get(key);

      expect(retrieved).toBeNull();
    });

    it('应该清除缓存', () => {
      const key = 'test-clear-key';
      ResponseCacheService.set(key, { data: 'test' });
      
      ResponseCacheService.clear(key);
      const retrieved = ResponseCacheService.get(key);
      
      expect(retrieved).toBeNull();
    });

    it('应该清除所有缓存', () => {
      ResponseCacheService.set('key1', 'value1');
      ResponseCacheService.set('key2', 'value2');
      
      ResponseCacheService.clearAll();
      
      expect(ResponseCacheService.get('key1')).toBeNull();
      expect(ResponseCacheService.get('key2')).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('应该在缓存命中时返回缓存数据', async () => {
      const key = 'test-getorset-hit';
      const data = { result: 'cached' };
      
      ResponseCacheService.set(key, data);
      
      const fetchFn = jest.fn();
      const result = await ResponseCacheService.getOrSet(key, fetchFn);
      
      expect(result).toEqual(data);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('应该在缓存未命中时调用 fetch 函数', async () => {
      const key = 'test-getorset-miss';
      const data = { result: 'fetched' };
      
      const fetchFn = jest.fn().mockResolvedValue(data);
      const result = await ResponseCacheService.getOrSet(key, fetchFn);
      
      expect(result).toEqual(data);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('应该返回缓存统计信息', () => {
      ResponseCacheService.set('key1', 'value1');
      ResponseCacheService.set('key2', 'value2');
      
      const stats = ResponseCacheService.getStats();
      
      expect(stats.size).toBeGreaterThanOrEqual(2);
      expect(stats).toHaveProperty('entries');
    });
  });
});

describe('AiTaskLogModel', () => {
  describe('create', () => {
    it('应该创建任务日志记录', () => {
      const logData = {
        userId: 'user123',
        taskType: 'question-generation',
        model: 'qwen-plus',
        promptTokens: 100,
        completionTokens: 200,
        status: 'success'
      };

      const result = AiTaskLogModel.create(logData);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });

  describe('findByUserId', () => {
    it('应该查找用户的任务日志', () => {
      const userId = 'test-user';
      
      // 先创建记录
      AiTaskLogModel.create({
        userId,
        taskType: 'test',
        model: 'qwen-plus',
        promptTokens: 50,
        completionTokens: 50,
        status: 'success'
      });

      const results = AiTaskLogModel.findByUserId(userId);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('countByStatus', () => {
    it('应该按状态统计任务数量', () => {
      AiTaskLogModel.create({
        userId: 'user1',
        taskType: 'test',
        model: 'qwen-plus',
        promptTokens: 50,
        completionTokens: 50,
        status: 'success'
      });

      const count = AiTaskLogModel.countByStatus('success');
      expect(typeof count).toBe('number');
    });
  });

  describe('getRecentLogs', () => {
    it('应该获取最近的日志', () => {
      const logs = AiTaskLogModel.getRecentLogs(10);
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});

describe('BatchUpdateService', () => {
  describe('batchUpdateWeaknessPoints', () => {
    it('应该批量更新薄弱点', async () => {
      const updates = [
        { knowledgePointId: 'kp1', newWeaknessScore: 0.5 },
        { knowledgePointId: 'kp2', newWeaknessScore: 0.7 }
      ];

      const result = await BatchUpdateService.batchUpdateWeaknessPoints(updates);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('batchUpdateMastery', () => {
    it('应该批量更新掌握度', async () => {
      const updates = [
        { knowledgePointId: 'kp1', newMastery: 0.6 },
        { knowledgePointId: 'kp2', newMastery: 0.8 }
      ];

      const result = await BatchUpdateService.batchUpdateMastery(updates);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('batchCreateExerciseRecords', () => {
    it('应该批量创建练习记录', async () => {
      const records = [
        {
          userId: 'user1',
          knowledgePointId: 'kp1',
          isCorrect: true,
          timeSpent: 30
        }
      ];

      const result = await BatchUpdateService.batchCreateExerciseRecords(records);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
