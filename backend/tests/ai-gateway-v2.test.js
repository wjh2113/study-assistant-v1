/**
 * AI Gateway V2 单元测试
 */

const AiGatewayServiceV2 = require('../src/modules/ai-gateway/AiGatewayServiceV2');

describe('AiGatewayServiceV2', () => {
  describe('selectModel', () => {
    test('应该为 simple-question 任务选择 qwen-flash', () => {
      const routing = AiGatewayServiceV2.selectModel('simple-question');
      expect(routing.primary).toBe('qwen-flash');
      expect(routing.fallbacks).toContain('moonshot-v1-8k');
    });

    test('应该为 complex-question 任务选择 qwen-max', () => {
      const routing = AiGatewayServiceV2.selectModel('complex-question');
      expect(routing.primary).toBe('qwen-max');
      expect(routing.fallbacks).toContain('gpt-4');
    });

    test('未知任务类型应该默认使用 chat 路由', () => {
      const routing = AiGatewayServiceV2.selectModel('unknown-task');
      expect(routing.primary).toBe('qwen-plus');
    });
  });

  describe('getModelConfig', () => {
    test('应该能获取 qwen-flash 的配置', () => {
      const config = AiGatewayServiceV2.getModelConfig('qwen-flash');
      expect(config).toBeTruthy();
      expect(config.provider).toBe('aliyun');
      expect(config.model).toBe('qwen-turbo');
    });

    test('应该能获取 gpt-4 的配置', () => {
      const config = AiGatewayServiceV2.getModelConfig('gpt-4');
      expect(config).toBeTruthy();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4');
    });

    test('不存在的模型应该返回 null', () => {
      const config = AiGatewayServiceV2.getModelConfig('non-existent-model');
      expect(config).toBeNull();
    });
  });

  describe('validateQuestion', () => {
    test('应该验证完整的题目对象', () => {
      const question = {
        id: 1,
        type: 'choice',
        difficulty: 'medium',
        question: '什么是重力？',
        options: ['A. 地球引力', 'B. 磁力', 'C. 电力', 'D. 摩擦力'],
        answer: 'A',
        explanation: '重力是地球对物体的吸引力',
        knowledgePoint: '物理学基础'
      };

      const validated = AiGatewayServiceV2.validateQuestion(question, 1);
      expect(validated).toBeTruthy();
      expect(validated.id).toBe(1);
      expect(validated.answer).toBe('A');
    });

    test('缺少必需字段应该返回 null', () => {
      const question = {
        id: 1,
        type: 'choice',
        options: ['A. 选项 1']
        // 缺少 question 和 answer
      };

      const validated = AiGatewayServiceV2.validateQuestion(question, 1);
      expect(validated).toBeNull();
    });

    test('应该为缺失字段提供默认值', () => {
      const question = {
        question: '测试题目',
        answer: 'B'
      };

      const validated = AiGatewayServiceV2.validateQuestion(question, 5);
      expect(validated).toBeTruthy();
      expect(validated.id).toBe(5);
      expect(validated.type).toBe('choice');
      expect(validated.difficulty).toBe('medium');
      expect(validated.options).toEqual([]);
      expect(validated.explanation).toBe('');
    });
  });

  describe('parseAndValidateQuestions', () => {
    test('应该解析标准 JSON 格式', () => {
      const responseText = JSON.stringify({
        questions: [
          {
            id: 1,
            question: '题目 1',
            answer: 'A',
            options: ['A. 选项 1', 'B. 选项 2'],
            explanation: '解析 1'
          },
          {
            id: 2,
            question: '题目 2',
            answer: 'B',
            options: ['A. 选项 1', 'B. 选项 2'],
            explanation: '解析 2'
          }
        ]
      });

      const questions = AiGatewayServiceV2.parseAndValidateQuestions(responseText);
      expect(questions).toHaveLength(2);
      expect(questions[0].id).toBe(1);
      expect(questions[1].id).toBe(2);
    });

    test('应该处理数组格式', () => {
      const responseText = JSON.stringify([
        {
          question: '题目 1',
          answer: 'A'
        },
        {
          question: '题目 2',
          answer: 'B'
        }
      ]);

      const questions = AiGatewayServiceV2.parseAndValidateQuestions(responseText);
      expect(questions).toHaveLength(2);
    });
  });

  describe('updateHealthStatus', () => {
    beforeEach(() => {
      // 重置健康状态
      AiGatewayServiceV2.healthStatus = {
        aliyun: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
        openai: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
        azure: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
        moonshot: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 }
      };
    });

    test('成功调用应该减少错误计数', () => {
      AiGatewayServiceV2.healthStatus.aliyun.errorCount = 3;
      
      AiGatewayServiceV2.updateHealthStatus('aliyun', true, 100);
      
      expect(AiGatewayServiceV2.healthStatus.aliyun.errorCount).toBe(2);
      expect(AiGatewayServiceV2.healthStatus.aliyun.healthy).toBe(true);
    });

    test('失败调用应该增加错误计数', () => {
      AiGatewayServiceV2.updateHealthStatus('aliyun', false, 100, 'Error');
      
      expect(AiGatewayServiceV2.healthStatus.aliyun.errorCount).toBe(1);
      expect(AiGatewayServiceV2.healthStatus.aliyun.healthy).toBe(true);
    });

    test('错误计数达到 5 应该标记为不健康', () => {
      for (let i = 0; i < 5; i++) {
        AiGatewayServiceV2.updateHealthStatus('aliyun', false, 100, 'Error');
      }
      
      expect(AiGatewayServiceV2.healthStatus.aliyun.errorCount).toBe(5);
      expect(AiGatewayServiceV2.healthStatus.aliyun.healthy).toBe(false);
    });
  });

  describe('buildQuestionPrompt', () => {
    test('应该生成正确的提示词', () => {
      const params = {
        textbookContent: '牛顿第一定律...',
        grade: '八年级',
        subject: '物理',
        unit: '运动和力',
        questionCount: 5,
        difficulty: 'medium',
        questionType: 'choice'
      };

      const prompt = AiGatewayServiceV2.buildQuestionPrompt(params);
      
      expect(prompt).toContain('牛顿第一定律');
      expect(prompt).toContain('八年级');
      expect(prompt).toContain('物理');
      expect(prompt).toContain('运动和力');
      expect(prompt).toContain('5');
      expect(prompt).toContain('选择');
      expect(prompt).toContain('中等难度');
    });
  });
});

describe('AiGatewayServiceV2 - 集成测试', () => {
  describe('chat', () => {
    test('API Key 未配置时应该返回错误', async () => {
      // 确保 API Key 未配置
      const originalKey = process.env.ALIYUN_API_KEY;
      delete process.env.ALIYUN_API_KEY;

      const result = await AiGatewayServiceV2.callModel('qwen-flash', [
        { role: 'user', content: '测试' }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Key 未配置');

      // 恢复原始配置
      if (originalKey) {
        process.env.ALIYUN_API_KEY = originalKey;
      }
    });
  });
});
