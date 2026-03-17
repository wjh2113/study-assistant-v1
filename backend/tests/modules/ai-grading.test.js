/**
 * AI Grading Module - Comprehensive Unit Tests
 * Coverage Target: 60%+
 */

const AIGradingService = require('../../src/modules/ai-grading/AIGradingService');
const AiGatewayService = require('../../src/modules/ai-gateway/AiGatewayService');

// Mock dependencies
jest.mock('../../src/modules/ai-gateway/AiGatewayService');
jest.mock('../../src/config/database', () => {
  const actualDb = jest.requireActual('../../src/config/database');
  return {
    ...actualDb,
    db: {
      prepare: jest.fn(() => ({
        run: jest.fn(() => ({ lastInsertRowid: 1 })),
        all: jest.fn(() => []),
        get: jest.fn(() => null)
      }))
    }
  };
});

describe('AIGradingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('gradeSubjectiveQuestion', () => {
    const baseParams = {
      questionId: 'q1',
      question: '请解释牛顿第一定律',
      userAnswer: '牛顿第一定律指出，物体在不受外力作用时保持静止或匀速直线运动状态',
      rubric: {
        maxScore: 10,
        keyPoints: ['不受外力', '保持静止或匀速直线运动', '惯性定律'],
        additionalCriteria: '表述清晰准确'
      }
    };

    it('应该成功批改主观题', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          score: 8,
          feedback: {
            strengths: ['答案完整'],
            improvements: ['可以更详细'],
            suggestions: '建议补充实例'
          },
          detailedScoring: {
            completeness: 80,
            accuracy: 85,
            clarity: 75
          },
          keyPointsCovered: ['不受外力', '保持静止或匀速直线运动'],
          keyPointsMissing: ['惯性定律']
        }),
        model: 'qwen-plus',
        usage: { total_tokens: 150 }
      });

      const result = await AIGradingService.gradeSubjectiveQuestion(baseParams);

      expect(result.success).toBe(true);
      expect(result.questionId).toBe('q1');
      expect(result.score).toBe(8);
      expect(result.maxScore).toBe(10);
      expect(result.percentage).toBe('80.0');
      expect(result.feedback).toBeDefined();
      expect(result.model).toBe('qwen-plus');
    });

    it('应该在 AI 调用失败时抛出错误', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: false,
        error: 'API 错误'
      });

      await expect(AIGradingService.gradeSubjectiveQuestion(baseParams))
        .rejects.toThrow('批改失败');
    });

    it('应该处理分数超出范围的情况', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          score: 15, // 超出满分
          feedback: { strengths: [], improvements: [], suggestions: '' },
          detailedScoring: { completeness: 100, accuracy: 100, clarity: 100 }
        })
      });

      const result = await AIGradingService.gradeSubjectiveQuestion(baseParams);
      
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('应该处理负分数的情况', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          score: -5,
          feedback: { strengths: [], improvements: [], suggestions: '' },
          detailedScoring: { completeness: 0, accuracy: 0, clarity: 0 }
        })
      });

      const result = await AIGradingService.gradeSubjectiveQuestion(baseParams);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('应该处理 JSON 解析失败的情况', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: '这是无效的 JSON 响应'
      });

      const result = await AIGradingService.gradeSubjectiveQuestion(baseParams);
      
      expect(result.success).toBe(true);
      expect(result.score).toBe(6); // 降级方案分数
    });

    it('应该处理缺失字段的情况', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          score: 7
          // 缺少其他字段
        })
      });

      const result = await AIGradingService.gradeSubjectiveQuestion(baseParams);
      
      expect(result.success).toBe(true);
      expect(result.feedback.strengths).toEqual([]);
      expect(result.feedback.improvements).toEqual([]);
    });
  });

  describe('buildSubjectiveGradingPrompt', () => {
    const question = '请解释光合作用的过程';
    const userAnswer = '光合作用是植物利用光能将二氧化碳和水转化为有机物';
    const rubric = {
      maxScore: 10,
      keyPoints: ['光能转化', '二氧化碳和水', '有机物生成', '氧气释放'],
      additionalCriteria: '需要说明能量转换过程'
    };

    it('应该生成包含所有信息的提示词', () => {
      const prompt = AIGradingService.buildSubjectiveGradingPrompt(question, userAnswer, rubric);

      expect(prompt).toContain(question);
      expect(prompt).toContain(userAnswer);
      expect(prompt).toContain('满分：10 分');
      expect(prompt).toContain('光能转化');
      expect(prompt).toContain('需要说明能量转换过程');
    });

    it('应该处理没有关键点的情况', () => {
      const rubricNoPoints = {
        maxScore: 5,
        keyPoints: []
      };

      const prompt = AIGradingService.buildSubjectiveGradingPrompt(question, userAnswer, rubricNoPoints);
      
      expect(prompt).toContain('关键得分点:\n无');
    });

    it('应该处理没有额外标准的情况', () => {
      const rubricNoCriteria = {
        maxScore: 5,
        keyPoints: ['点 1']
      };

      const prompt = AIGradingService.buildSubjectiveGradingPrompt(question, userAnswer, rubricNoCriteria);
      
      expect(prompt).not.toContain('其他要求');
    });
  });

  describe('parseSubjectiveGrading', () => {
    const maxScore = 10;

    it('应该解析完整的评分结果', () => {
      const responseText = JSON.stringify({
        score: 8,
        feedback: {
          strengths: ['完整', '准确'],
          improvements: ['可以更详细'],
          suggestions: '多练习'
        },
        detailedScoring: {
          completeness: 80,
          accuracy: 90,
          clarity: 70
        },
        keyPointsCovered: ['点 1', '点 2'],
        keyPointsMissing: ['点 3']
      });

      const result = AIGradingService.parseSubjectiveGrading(responseText, maxScore);

      expect(result.score).toBe(8);
      expect(result.feedback.strengths).toHaveLength(2);
      expect(result.detailedScoring.completeness).toBe(80);
    });

    it('应该处理无效 JSON', () => {
      const responseText = '无效的 JSON';
      const result = AIGradingService.parseSubjectiveGrading(responseText, maxScore);

      expect(result.score).toBe(6);
      expect(result.feedback.strengths).toEqual(['答案基本完整']);
    });

    it('应该处理分数为 NaN 的情况', () => {
      const responseText = JSON.stringify({
        score: 'invalid',
        feedback: { strengths: [], improvements: [], suggestions: '' },
        detailedScoring: { completeness: 0, accuracy: 0, clarity: 0 }
      });

      const result = AIGradingService.parseSubjectiveGrading(responseText, maxScore);
      expect(result.score).toBe(0);
    });

    it('应该截断超出满分的分数', () => {
      const responseText = JSON.stringify({
        score: 15,
        feedback: { strengths: [], improvements: [], suggestions: '' },
        detailedScoring: { completeness: 100, accuracy: 100, clarity: 100 }
      });

      const result = AIGradingService.parseSubjectiveGrading(responseText, maxScore);
      expect(result.score).toBe(10);
    });

    it('应该处理缺失的 detailedScoring 字段', () => {
      const responseText = JSON.stringify({
        score: 7,
        feedback: { strengths: [], improvements: [], suggestions: '' }
      });

      const result = AIGradingService.parseSubjectiveGrading(responseText, maxScore);
      
      expect(result.detailedScoring.completeness).toBe(0);
      expect(result.detailedScoring.accuracy).toBe(0);
      expect(result.detailedScoring.clarity).toBe(0);
    });
  });

  describe('gradeEssay', () => {
    const essayParams = {
      essay: '这是一篇关于环境保护的作文。环境保护非常重要，我们应该...',
      subject: 'chinese',
      grade: '八年级',
      topic: '环境保护',
      wordLimit: { min: 400, max: 600 },
      criteria: {
        content: { weight: 0.30, aspects: ['主题明确', '内容充实'] },
        structure: { weight: 0.25, aspects: ['段落清晰', '逻辑连贯'] },
        language: { weight: 0.25, aspects: ['语法正确', '词汇丰富'] },
        creativity: { weight: 0.20, aspects: ['观点新颖', '表达独特'] }
      }
    };

    it('应该成功批改作文', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          totalScore: 85,
          scores: {
            content: 80,
            structure: 85,
            language: 90,
            creativity: 85
          },
          feedback: {
            content: '内容充实',
            structure: '结构清晰',
            language: '语言流畅',
            creativity: '有创意'
          },
          overallFeedback: '很好的作文，继续保持！',
          suggestions: ['增加事例', '注意标点'],
          wordCount: 450,
          errors: []
        }),
        model: 'qwen-max',
        usage: { total_tokens: 300 }
      });

      const result = await AIGradingService.gradeEssay(essayParams);

      expect(result.success).toBe(true);
      expect(result.totalScore).toBe(85);
      expect(result.scores).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.overallFeedback).toBeDefined();
    });

    it('应该在 AI 调用失败时抛出错误', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: false,
        error: 'API 错误'
      });

      await expect(AIGradingService.gradeEssay(essayParams))
        .rejects.toThrow('作文批改失败');
    });

    it('应该使用默认评分标准', async () => {
      const paramsWithoutCriteria = {
        ...essayParams,
        criteria: undefined
      };

      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          totalScore: 75,
          scores: { content: 75, structure: 75, language: 75, creativity: 75 },
          feedback: {},
          overallFeedback: '不错',
          suggestions: [],
          wordCount: 400,
          errors: []
        })
      });

      const result = await AIGradingService.gradeEssay(paramsWithoutCriteria);
      expect(result.success).toBe(true);
    });

    it('应该处理英语作文', async () => {
      const englishEssay = {
        ...essayParams,
        subject: 'english',
        essay: 'This is an English essay about environmental protection...'
      };

      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          totalScore: 80,
          scores: { content: 80, structure: 80, language: 80, creativity: 80 },
          feedback: {},
          overallFeedback: 'Good job!',
          suggestions: [],
          wordCount: 100,
          errors: []
        })
      });

      const result = await AIGradingService.gradeEssay(englishEssay);
      expect(result.success).toBe(true);
    });
  });

  describe('buildEssayGradingPrompt', () => {
    const essay = '这是一篇作文';
    const subject = 'chinese';
    const grade = '八年级';
    const topic = '我的梦想';
    const wordLimit = { min: 400, max: 600 };
    const criteria = {
      content: { weight: 0.30, aspects: ['主题明确', '内容充实'] },
      structure: { weight: 0.25, aspects: ['段落清晰'] }
    };

    it('应该生成包含所有信息的作文评分提示词', () => {
      const prompt = AIGradingService.buildEssayGradingPrompt(
        essay, subject, grade, topic, wordLimit, criteria
      );

      expect(prompt).toContain('八年级');
      expect(prompt).toContain('我的梦想');
      expect(prompt).toContain('字数要求：400-600 字');
      expect(prompt).toContain('content: 30%');
      expect(prompt).toContain('structure: 25%');
    });

    it('应该处理没有字数限制的情况', () => {
      const prompt = AIGradingService.buildEssayGradingPrompt(
        essay, subject, grade, topic, null, criteria
      );

      expect(prompt).not.toContain('字数要求');
    });

    it('应该为英语作文生成正确的提示词', () => {
      const prompt = AIGradingService.buildEssayGradingPrompt(
        essay, 'english', grade, topic, wordLimit, criteria
      );

      expect(prompt).toContain('英语作文');
    });
  });

  describe('parseEssayGrading', () => {
    const essay = 'This is a test essay with fifty words';
    const wordLimit = { min: 40, max: 60 };

    it('应该解析完整的作文评分结果', () => {
      const responseText = JSON.stringify({
        totalScore: 85,
        scores: {
          content: 80,
          structure: 85,
          language: 90,
          creativity: 85
        },
        feedback: {
          content: 'Good content',
          structure: 'Clear structure'
        },
        overallFeedback: 'Great job!',
        suggestions: ['Improve grammar'],
        wordCount: 50,
        errors: [
          { type: 'grammar', original: 'is', suggestion: 'are', position: 10 }
        ]
      });

      const result = AIGradingService.parseEssayGrading(responseText, essay, wordLimit);

      expect(result.totalScore).toBe(85);
      expect(result.scores.content).toBe(80);
      expect(result.errors).toHaveLength(1);
    });

    it('应该处理无效 JSON', () => {
      const responseText = '无效 JSON';
      const result = AIGradingService.parseEssayGrading(responseText, essay, wordLimit);

      expect(result.totalScore).toBe(70);
      expect(result.scores.content).toBe(70);
    });

    it('应该校验分数范围', () => {
      const responseText = JSON.stringify({
        totalScore: 150,
        scores: {
          content: 120,
          structure: -10,
          language: 90,
          creativity: 85
        },
        feedback: {},
        overallFeedback: 'OK',
        suggestions: [],
        wordCount: 50,
        errors: []
      });

      const result = AIGradingService.parseEssayGrading(responseText, essay, wordLimit);

      expect(result.scores.content).toBe(100);
      expect(result.scores.structure).toBe(0);
    });

    it('应该计算加权总分', () => {
      const responseText = JSON.stringify({
        totalScore: 85,
        scores: {
          content: 80,
          structure: 80,
          language: 80,
          creativity: 80
        },
        feedback: {},
        overallFeedback: 'OK',
        suggestions: [],
        wordCount: 50,
        errors: []
      });

      const result = AIGradingService.parseEssayGrading(responseText, essay, wordLimit);
      
      // 80 * 0.30 + 80 * 0.25 + 80 * 0.25 + 80 * 0.20 = 80
      expect(result.totalScore).toBe(80);
    });
  });

  describe('batchGrade', () => {
    const submissions = [
      {
        id: 's1',
        type: 'subjective',
        questionId: 'q1',
        question: '问题 1',
        userAnswer: '答案 1',
        rubric: { maxScore: 10, keyPoints: ['点 1'] }
      },
      {
        id: 's2',
        type: 'essay',
        essay: '作文内容',
        subject: 'chinese',
        grade: '八年级',
        topic: '题目'
      }
    ];

    it('应该批量批改多个提交', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          score: 8,
          feedback: { strengths: [], improvements: [], suggestions: '' },
          detailedScoring: { completeness: 80, accuracy: 80, clarity: 80 }
        })
      });

      const results = await AIGradingService.batchGrade(submissions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('应该处理批改失败的情况', async () => {
      AiGatewayService.callModel.mockResolvedValue({
        success: false,
        error: 'API 错误'
      });

      const results = await AIGradingService.batchGrade(submissions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('应该分批处理以避免并发过高', async () => {
      // 创建超过批次大小的提交
      const manySubmissions = Array(10).fill(null).map((_, i) => ({
        id: `s${i}`,
        type: 'subjective',
        questionId: `q${i}`,
        question: `问题${i}`,
        userAnswer: `答案${i}`,
        rubric: { maxScore: 10, keyPoints: ['点 1'] }
      }));

      AiGatewayService.callModel.mockResolvedValue({
        success: true,
        data: JSON.stringify({
          score: 8,
          feedback: { strengths: [], improvements: [], suggestions: '' },
          detailedScoring: { completeness: 80, accuracy: 80, clarity: 80 }
        })
      });

      const startTime = Date.now();
      const results = await AIGradingService.batchGrade(manySubmissions);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      // 应该有延迟（batchSize=5，所以至少有 1 次延迟）
      expect(duration).toBeGreaterThanOrEqual(900);
    });
  });

  describe('saveGradingRecord', () => {
    it('应该保存批改记录', () => {
      const recordData = {
        userId: 'user123',
        submissionType: 'subjective',
        submissionId: 'sub1',
        score: 8,
        maxScore: 10,
        feedback: { strengths: ['good'] },
        detailedScores: { completeness: 80 },
        modelUsed: 'qwen-plus',
        tokensUsed: 150
      };

      const result = AIGradingService.saveGradingRecord(recordData);
      
      expect(result).toBeDefined();
    });
  });

  describe('getGradingHistory', () => {
    it('应该获取用户的批改历史', () => {
      const history = AIGradingService.getGradingHistory('user123', {
        page: 1,
        pageSize: 20
      });

      expect(Array.isArray(history)).toBe(true);
    });

    it('应该支持按提交类型筛选', () => {
      const history = AIGradingService.getGradingHistory('user123', {
        page: 1,
        pageSize: 20,
        submissionType: 'essay'
      });

      expect(Array.isArray(history)).toBe(true);
    });
  });
});
