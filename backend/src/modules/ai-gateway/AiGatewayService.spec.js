/**
 * AiGatewayService 测试
 * 测试覆盖：模型选择、API 调用、错误处理、JSON 解析
 */

const AiGatewayService = require('../src/modules/ai-gateway/AiGatewayService');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('AiGatewayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置环境变量
    delete process.env.QWEN_FLASH_KEY;
    delete process.env.QWEN_PLUS_KEY;
    delete process.env.QWEN_MAX_KEY;
    delete process.env.AI_API_KEY;
  });

  describe('selectModel', () => {
    test('应该为 simple-question 选择 qwen-flash', () => {
      expect(AiGatewayService.selectModel('simple-question')).toBe('qwen-flash');
    });

    test('应该为 textbook-analysis 选择 qwen-plus', () => {
      expect(AiGatewayService.selectModel('textbook-analysis')).toBe('qwen-plus');
    });

    test('应该为 weakness-analysis 选择 qwen-plus', () => {
      expect(AiGatewayService.selectModel('weakness-analysis')).toBe('qwen-plus');
    });

    test('应该为 complex-question 选择 qwen-max', () => {
      expect(AiGatewayService.selectModel('complex-question')).toBe('qwen-max');
    });

    test('应该为 multi-step-reasoning 选择 qwen-max', () => {
      expect(AiGatewayService.selectModel('multi-step-reasoning')).toBe('qwen-max');
    });

    test('应该为未知任务类型选择默认的 qwen-plus', () => {
      expect(AiGatewayService.selectModel('unknown-type')).toBe('qwen-plus');
    });
  });

  describe('callModel', () => {
    test('应该在不支持的模型时抛出错误', async () => {
      const result = await AiGatewayService.callModel('invalid-model', 'test prompt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的模型');
    });

    test('应该在 API Key 未配置时返回错误', async () => {
      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('API Key 未配置');
    });

    test('应该在 API 调用成功时返回正确结果', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {
          output: {
            choices: [{
              message: { content: '测试回答' }
            }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30
            }
          }
        }
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('测试回答');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      });
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('应该在 API 返回空内容时返回错误', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {
          output: {
            choices: [{
              message: { content: null }
            }]
          }
        }
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI 返回内容为空');
    });

    test('应该在网络错误时重试', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      // 前两次失败，第三次成功
      axios.post
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue({
          data: {
            output: {
              choices: [{ message: { content: '成功' } }]
            }
          }
        });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test('应该在 500 错误时重试', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue({
          data: {
            output: {
              choices: [{ message: { content: '成功' } }]
            }
          }
        });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test('应该在超过最大重试次数后返回错误', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockRejectedValue({ code: 'ETIMEDOUT' });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(axios.post).toHaveBeenCalledTimes(4); // 初始 + 3 次重试
    });

    test('应该在 400 错误时不重试', async () => {
      process.env.QWEN_FLASH_KEY = 'test-key';
      
      axios.post.mockRejectedValue({ 
        response: { 
          status: 400,
          data: { message: '请求参数错误' }
        } 
      });

      const result = await AiGatewayService.callModel('qwen-flash', 'test prompt');
      
      expect(result.success).toBe(false);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(result.error).toContain('API 错误 (400)');
    });
  });

  describe('buildQuestionPrompt', () => {
    test('应该构建正确的题目生成提示词', () => {
      const params = {
        textbookContent: '课本内容',
        grade: '三年级',
        subject: '数学',
        unit: '第一单元',
        questionCount: 5,
        difficulty: 'medium',
        questionType: 'choice'
      };

      const prompt = AiGatewayService.buildQuestionPrompt(params);
      
      expect(prompt).toContain('课本内容');
      expect(prompt).toContain('三年级');
      expect(prompt).toContain('数学');
      expect(prompt).toContain('第一单元');
      expect(prompt).toContain('5 道');
      expect(prompt).toContain('选择题');
      expect(prompt).toContain('中等难度');
    });

    test('应该支持不同难度', () => {
      const params = {
        textbookContent: '内容',
        grade: '三年级',
        subject: '数学',
        unit: '单元',
        questionCount: 5,
        difficulty: 'hard',
        questionType: 'choice'
      };

      const prompt = AiGatewayService.buildQuestionPrompt(params);
      expect(prompt).toContain('较难题');
    });

    test('应该支持不同题型', () => {
      const params = {
        textbookContent: '内容',
        grade: '三年级',
        subject: '数学',
        unit: '单元',
        questionCount: 5,
        difficulty: 'medium',
        questionType: 'fill'
      };

      const prompt = AiGatewayService.buildQuestionPrompt(params);
      expect(prompt).toContain('填空题');
    });
  });

  describe('validateQuestion', () => {
    test('应该验证完整的题目对象', () => {
      const question = {
        id: 1,
        type: 'choice',
        difficulty: 'medium',
        question: '1+1=?',
        options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
        answer: 'B',
        explanation: '1 加 1 等于 2',
        knowledgePoint: '加法',
        unit: '第一单元'
      };

      const validated = AiGatewayService.validateQuestion(question, 1);
      
      expect(validated).toEqual(question);
    });

    test('应该为缺失字段提供默认值', () => {
      const question = {
        question: '1+1=?',
        answer: '2'
      };

      const validated = AiGatewayService.validateQuestion(question, 1);
      
      expect(validated.id).toBe(1);
      expect(validated.type).toBe('choice');
      expect(validated.difficulty).toBe('medium');
      expect(validated.options).toEqual([]);
      expect(validated.explanation).toBe('');
    });

    test('应该在缺少必需字段时返回 null', () => {
      const question = {
        id: 1,
        type: 'choice'
        // 缺少 question 和 answer
      };

      const validated = AiGatewayService.validateQuestion(question, 1);
      expect(validated).toBeNull();
    });
  });

  describe('parseAndValidateQuestions', () => {
    test('应该解析标准 JSON 格式', () => {
      const responseText = JSON.stringify({
        questions: [
          {
            id: 1,
            question: '1+1=?',
            answer: 'B',
            options: ['A. 1', 'B. 2', 'C. 3', 'D. 4']
          }
        ]
      });

      const questions = AiGatewayService.parseAndValidateQuestions(responseText);
      
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('1+1=?');
      expect(questions[0].answer).toBe('B');
    });

    test('应该解析纯数组格式', () => {
      const responseText = JSON.stringify([
        {
          question: '1+1=?',
          answer: '2'
        }
      ]);

      const questions = AiGatewayService.parseAndValidateQuestions(responseText);
      
      expect(questions).toHaveLength(1);
    });

    test('应该从文本中提取 JSON', () => {
      const responseText = `好的，这是生成的题目：
      {
        "questions": [
          {
            "question": "1+1=?",
            "answer": "2"
          }
        ]
      }
      希望对你有帮助。`;

      const questions = AiGatewayService.parseAndValidateQuestions(responseText);
      
      expect(questions).toHaveLength(1);
    });

    test('应该修复损坏的 JSON', () => {
      const responseText = `1. 1+1=?
A. 1
B. 2
答案：B
解析：1 加 1 等于 2

2. 2+2=?
A. 3
B. 4
答案：B
解析：2 加 2 等于 4`;

      const questions = AiGatewayService.parseAndValidateQuestions(responseText);
      
      expect(questions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('repairAndParse', () => {
    test('应该从非结构化文本中提取题目', () => {
      const text = `第一题：1+1=?
A. 1
B. 2
C. 3
答案：B
解析：简单加法

第二题：2+2=?
A. 3
B. 4
答案：B
解析：简单加法`;

      const questions = AiGatewayService.repairAndParse(text);
      
      expect(questions.length).toBeGreaterThanOrEqual(1);
      expect(questions[0].answer).toBe('B');
    });

    test('应该处理空行和不规则格式', () => {
      const text = `
1. 题目 1
A. 选项 1
B. 选项 2
答案：A

2. 题目 2
答案：B
`;

      const questions = AiGatewayService.repairAndParse(text);
      
      expect(questions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateQuestions', () => {
    test('应该成功生成题目', async () => {
      process.env.QWEN_MAX_KEY = 'test-key';
      
      axios.post.mockResolvedValue({
        data: {
          output: {
            choices: [{
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      id: 1,
                      question: '1+1=?',
                      answer: 'B',
                      options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
                      explanation: '1 加 1 等于 2'
                    }
                  ]
                })
              }
            }],
            usage: { total_tokens: 100 }
          }
        }
      });

      const result = await AiGatewayService.generateQuestions({
        textbookContent: '测试内容',
        grade: '三年级',
        subject: '数学',
        unit: '第一单元',
        questionCount: 1,
        difficulty: 'medium',
        questionType: 'choice'
      });

      expect(result.success).toBe(true);
      expect(result.questions).toHaveLength(1);
      expect(result.model).toBe('qwen-max');
    });

    test('应该在 API 调用失败时抛出错误', async () => {
      axios.post.mockRejectedValue(new Error('网络错误'));

      await expect(
        AiGatewayService.generateQuestions({
          textbookContent: '测试内容',
          grade: '三年级',
          subject: '数学',
          unit: '第一单元'
        })
      ).rejects.toThrow('题目生成失败');
    });
  });
});
