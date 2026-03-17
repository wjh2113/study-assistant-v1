/**
 * AI Gateway Service - 模型路由和题目生成服务
 * ISSUE-P0-003: AI 出题功能
 */

const axios = require('axios');

class AiGatewayService {
  // 模型配置（支持统一 API Key  fallback）
  static MODEL_CONFIGS = {
    'qwen-flash': {
      url: process.env.QWEN_FLASH_URL || process.env.AI_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: process.env.QWEN_FLASH_KEY || process.env.AI_API_KEY,
      model: 'qwen-turbo',
      timeout: 30000
    },
    'qwen-plus': {
      url: process.env.QWEN_PLUS_URL || process.env.AI_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: process.env.QWEN_PLUS_KEY || process.env.AI_API_KEY,
      model: 'qwen-plus',
      timeout: 60000
    },
    'qwen-max': {
      url: process.env.QWEN_MAX_URL || process.env.AI_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: process.env.QWEN_MAX_KEY || process.env.AI_API_KEY,
      model: 'qwen-max',
      timeout: 90000
    }
  };

  /**
   * 根据任务复杂度选择模型
   * @param {string} taskType - 任务类型
   * @returns {string} 模型名称
   */
  static selectModel(taskType) {
    switch (taskType) {
      case 'simple-question':
        return 'qwen-flash';
      case 'textbook-analysis':
      case 'weakness-analysis':
        return 'qwen-plus';
      case 'complex-question':
      case 'multi-step-reasoning':
        return 'qwen-max';
      default:
        return 'qwen-plus';
    }
  }

  /**
   * 调用 AI 模型（带重试机制）
   * @param {string} model - 模型名称
   * @param {string} prompt - 提示词
   * @param {object} options - 额外选项
   * @param {number} retryCount - 当前重试次数
   * @returns {Promise<object>} AI 响应
   */
  static async callModel(model, prompt, options = {}, retryCount = 0) {
    const config = this.MODEL_CONFIGS[model];
    if (!config) {
      throw new Error(`不支持的模型：${model}`);
    }

    // 检查 API Key 是否配置
    if (!config.apiKey) {
      return {
        success: false,
        error: `模型 ${model} 的 API Key 未配置`,
        model: model
      };
    }

    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1); // 指数退避

    try {
      const response = await axios.post(
        config.url,
        {
          model: config.model,
          input: {
            messages: [
              {
                role: 'system',
                content: options.systemPrompt || '你是一个专业的学习助手。'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048,
            result_format: 'message'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
            'X-DashScope-Key': config.apiKey
          },
          timeout: config.timeout
        }
      );

      // 检查响应数据
      if (!response.data || !response.data.output) {
        throw new Error('API 返回数据格式不正确');
      }

      const content = response.data.output?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI 返回内容为空');
      }

      return {
        success: true,
        data: content,
        usage: response.data.usage,
        model: model
      };
    } catch (error) {
      const isRetryable = error.response?.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
      
      if (isRetryable && retryCount < maxRetries) {
        console.warn(`AI 模型调用失败 [${model}]，第 ${retryCount + 1} 次重试，${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.callModel(model, prompt, options, retryCount + 1);
      }

      console.error(`AI 模型调用失败 [${model}]:`, error.message);
      
      // 详细的错误信息
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `API 错误 (${error.response.status}): ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        errorMessage = '网络请求失败，请检查网络连接';
      }

      return {
        success: false,
        error: errorMessage,
        model: model,
        retryCount: retryCount
      };
    }
  }

  /**
   * 生成题目
   * @param {object} params - 生成参数
   * @param {string} params.textbookContent - 课本内容
   * @param {string} params.grade - 年级
   * @param {string} params.subject - 科目
   * @param {string} params.unit - 单元
   * @param {number} params.questionCount - 题目数量
   * @param {string} params.difficulty - 难度 (easy/medium/hard)
   * @param {string} params.questionType - 题型 (choice/fill/short)
   * @returns {Promise<object>} 生成的题目
   */
  static async generateQuestions(params) {
    const {
      textbookContent,
      grade,
      subject,
      unit,
      questionCount = 5,
      difficulty = 'medium',
      questionType = 'choice'
    } = params;

    const model = this.selectModel('complex-question');
    
    const prompt = this.buildQuestionPrompt({
      textbookContent,
      grade,
      subject,
      unit,
      questionCount,
      difficulty,
      questionType
    });

    const result = await this.callModel(model, prompt, {
      systemPrompt: '你是一个专业的教育题目生成专家，擅长根据课本内容生成高质量的练习题。'
    });

    if (!result.success) {
      throw new Error(`题目生成失败：${result.error}`);
    }

    // 解析和校验 JSON 结果
    const questions = this.parseAndValidateQuestions(result.data);
    
    return {
      success: true,
      questions,
      model: model,
      usage: result.usage
    };
  }

  /**
   * 构建题目生成提示词
   */
  static buildQuestionPrompt(params) {
    const {
      textbookContent,
      grade,
      subject,
      unit,
      questionCount,
      difficulty,
      questionType
    } = params;

    const difficultyMap = {
      easy: '基础题，考察基本概念和记忆',
      medium: '中等难度，考察理解和简单应用',
      hard: '较难题，考察综合分析和应用'
    };

    const typeMap = {
      choice: '选择题（4 个选项，单选）',
      fill: '填空题',
      short: '简答题'
    };

    return `请根据以下课本内容生成${questionCount}道${typeMap[questionType] || '选择题'}。

【课本信息】
- 年级：${grade}
- 科目：${subject}
- 单元：${unit}
- 难度要求：${difficultyMap[difficulty] || difficulty}

【课本内容】
${textbookContent}

【输出要求】
请严格按照以下 JSON 格式输出（不要包含任何其他文字）：
{
  "questions": [
    {
      "id": 1,
      "type": "${questionType}",
      "difficulty": "${difficulty}",
      "question": "题目题干",
      "options": ["A. 选项 1", "B. 选项 2", "C. 选项 3", "D. 选项 4"],
      "answer": "A",
      "explanation": "答案解析",
      "knowledgePoint": "考察的知识点",
      "unit": "${unit}"
    }
  ]
}

注意：
1. 选择题的 answer 必须是 A/B/C/D 之一
2. 填空题的 options 可以为空数组，answer 为正确答案
3. 每道题必须有详细的 explanation
4. knowledgePoint 要准确标注考察的知识点`;
  }

  /**
   * 解析和校验题目 JSON
   */
  static parseAndValidateQuestions(responseText) {
    try {
      // 尝试提取 JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      
      let parsed = JSON.parse(jsonString);
      
      // 如果是 questions 数组直接返回，否则找 questions 字段
      if (Array.isArray(parsed)) {
        parsed = { questions: parsed };
      }
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('响应格式不正确，缺少 questions 数组');
      }

      // 校验每道题的结构
      const validatedQuestions = parsed.questions.map((q, index) => {
        return this.validateQuestion(q, index + 1);
      });

      return validatedQuestions.filter(q => q !== null);
    } catch (error) {
      console.error('JSON 解析失败:', error.message);
      // 尝试修复 JSON
      return this.repairAndParse(responseText);
    }
  }

  /**
   * 校验单道题目结构
   */
  static validateQuestion(question, defaultId) {
    if (!question) return null;
    
    const required = ['question', 'answer'];
    for (const field of required) {
      if (!question[field]) {
        console.warn(`题目 ${defaultId} 缺少必需字段：${field}`);
        return null;
      }
    }

    return {
      id: question.id || defaultId,
      type: question.type || 'choice',
      difficulty: question.difficulty || 'medium',
      question: question.question,
      options: question.options || [],
      answer: question.answer,
      explanation: question.explanation || '',
      knowledgePoint: question.knowledgePoint || '',
      unit: question.unit || ''
    };
  }

  /**
   * 尝试修复损坏的 JSON
   */
  static repairAndParse(text) {
    // 简单的修复策略：提取看起来像题目的内容
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 尝试识别题目开始
      if (/^\d+[\.\)]/.test(trimmed) || /^第\d+题/.test(trimmed)) {
        if (currentQuestion) {
          questions.push(this.validateQuestion(currentQuestion, questions.length + 1));
        }
        currentQuestion = { question: trimmed, options: [], answer: '', explanation: '' };
      } else if (currentQuestion) {
        if (/^[A-D][\.\)]/.test(trimmed)) {
          currentQuestion.options.push(trimmed);
        } else if (/答案 [:：]/.test(trimmed)) {
          const match = trimmed.match(/答案 [:：]\s*([A-D])/i);
          if (match) currentQuestion.answer = match[1].toUpperCase();
        } else if (/解析 [:：]/.test(trimmed)) {
          currentQuestion.explanation = trimmed.replace(/解析 [:：]\s*/, '');
        } else {
          currentQuestion.question += '\n' + trimmed;
        }
      }
    }

    if (currentQuestion) {
      questions.push(this.validateQuestion(currentQuestion, questions.length + 1));
    }

    return questions.filter(q => q !== null);
  }
}

module.exports = AiGatewayService;
