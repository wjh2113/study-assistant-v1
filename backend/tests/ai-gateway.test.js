/**
 * AI Gateway 模块单元测试
 * ISSUE-P0-003: AI 出题功能
 */

const AiGatewayService = require('../src/modules/ai-gateway/AiGatewayService');

describe('AiGatewayService', () => {
  describe('selectModel', () => {
    test('应该为简单任务选择 qwen-flash', () => {
      expect(AiGatewayService.selectModel('simple-question')).toBe('qwen-flash');
    });

    test('应该为课本分析选择 qwen-plus', () => {
      expect(AiGatewayService.selectModel('textbook-analysis')).toBe('qwen-plus');
      expect(AiGatewayService.selectModel('weakness-analysis')).toBe('qwen-plus');
    });

    test('应该为复杂任务选择 qwen-max', () => {
      expect(AiGatewayService.selectModel('complex-question')).toBe('qwen-max');
      expect(AiGatewayService.selectModel('multi-step-reasoning')).toBe('qwen-max');
    });

    test('应该为未知任务类型默认选择 qwen-plus', () => {
      expect(AiGatewayService.selectModel('unknown')).toBe('qwen-plus');
    });
  });

  describe('validateQuestion', () => {
    test('应该验证完整的题目对象', () => {
      const question = {
        id: 1,
        type: 'choice',
        difficulty: 'medium',
        question: '什么是重力？',
        options: ['A. 地球引力', 'B. 磁力', 'C. 电力', 'D. 浮力'],
        answer: 'A',
        explanation: '重力是地球对物体的吸引力',
        knowledgePoint: '物理 - 力学'
      };

      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result).toEqual(question);
    });

    test('应该为缺失字段提供默认值', () => {
      const question = {
        question: '什么是重力？',
        answer: 'A'
      };

      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result.id).toBe(1);
      expect(result.type).toBe('choice');
      expect(result.difficulty).toBe('medium');
      expect(result.options).toEqual([]);
      expect(result.explanation).toBe('');
    });

    test('应该拒绝缺少必需字段的题目', () => {
      const question = {
        id: 1,
        type: 'choice'
        // 缺少 question 和 answer
      };

      const result = AiGatewayService.validateQuestion(question, 1);
      expect(result).toBeNull();
    });
  });

  describe('parseAndValidateQuestions', () => {
    test('应该解析标准 JSON 格式', () => {
      const responseText = JSON.stringify({
        questions: [
          {
            question: '问题 1',
            answer: 'A',
            options: ['A. 选项 1', 'B. 选项 2']
          }
        ]
      });

      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('问题 1');
    });

    test('应该解析 questions 数组', () => {
      const responseText = JSON.stringify([
        {
          question: '问题 1',
          answer: 'A'
        }
      ]);

      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(result).toHaveLength(1);
    });

    test('应该从文本中提取 JSON', () => {
      const responseText = `好的，这是生成的题目：
      ${JSON.stringify({
        questions: [
          { question: '问题 1', answer: 'A' }
        ]
      })}
      希望对你有帮助。`;

      const result = AiGatewayService.parseAndValidateQuestions(responseText);
      expect(result).toHaveLength(1);
    });
  });

  describe('buildQuestionPrompt', () => {
    test('应该生成包含所有参数的提示词', () => {
      const params = {
        textbookContent: '这是课本内容',
        grade: '三年级',
        subject: '数学',
        unit: '第一单元',
        questionCount: 5,
        difficulty: 'medium',
        questionType: 'choice'
      };

      const prompt = AiGatewayService.buildQuestionPrompt(params);

      expect(prompt).toContain('三年级');
      expect(prompt).toContain('数学');
      expect(prompt).toContain('第一单元');
      expect(prompt).toContain('5 道');
      expect(prompt).toContain('这是课本内容');
    });
  });
});
