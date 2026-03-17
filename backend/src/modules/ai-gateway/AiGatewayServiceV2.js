/**
 * AI Gateway Service V2 - 多 AI 服务路由与模型抽象层
 * Phase 2 集成：ResponseCacheService、BatchUpdateService、PrometheusExporter、CostAnalysisService
 * 支持多 AI 服务商、健康检查、故障转移、请求限流、Token 计数、缓存和成本分析
 */

const axios = require('axios');
const Redis = require('ioredis');

// Phase 2 集成服务
const ResponseCacheService = require('./ResponseCacheService');
const BatchUpdateService = require('./BatchUpdateService');
const PrometheusExporter = require('../monitoring/PrometheusExporter');
const CostAnalysisService = require('../cost-analysis/CostAnalysisService');

// Phase 2 新增 Provider
const { BaiduWenxinProvider, IFlytekSparkProvider } = require('./providers');

class AiGatewayServiceV2 {
  // Redis 连接（用于限流和计数）
  static redis = null;

  // 服务初始化状态
  static initialized = false;

  // AI 服务商配置
  static PROVIDER_CONFIGS = {
    'aliyun': {
      name: '阿里云通义千问',
      baseUrl: process.env.ALIYUN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.ALIYUN_API_KEY || process.env.AI_API_KEY,
      embeddingUrl: process.env.ALIYUN_EMBEDDING_URL || 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding',
      models: {
        'qwen-flash': { model: 'qwen-turbo', timeout: 30000, maxTokens: 2048 },
        'qwen-plus': { model: 'qwen-plus', timeout: 60000, maxTokens: 4096 },
        'qwen-max': { model: 'qwen-max', timeout: 90000, maxTokens: 8192 },
        'qwen-long': { model: 'qwen-long', timeout: 120000, maxTokens: 32768 }
      }
    },
    'openai': {
      name: 'OpenAI',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      models: {
        'gpt-3.5': { model: 'gpt-3.5-turbo', timeout: 30000, maxTokens: 4096 },
        'gpt-4': { model: 'gpt-4', timeout: 60000, maxTokens: 8192 },
        'gpt-4-turbo': { model: 'gpt-4-turbo-preview', timeout: 90000, maxTokens: 128000 }
      }
    },
    'azure': {
      name: 'Azure OpenAI',
      baseUrl: process.env.AZURE_BASE_URL,
      apiKey: process.env.AZURE_API_KEY,
      deployment: process.env.AZURE_DEPLOYMENT,
      models: {
        'azure-gpt-35': { model: 'gpt-35-turbo', timeout: 30000, maxTokens: 4096 },
        'azure-gpt-4': { model: 'gpt-4', timeout: 60000, maxTokens: 8192 }
      }
    },
    'moonshot': {
      name: '月之暗面',
      baseUrl: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
      apiKey: process.env.MOONSHOT_API_KEY,
      models: {
        'moonshot-v1-8k': { model: 'moonshot-v1-8k', timeout: 30000, maxTokens: 8192 },
        'moonshot-v1-32k': { model: 'moonshot-v1-32k', timeout: 60000, maxTokens: 32768 },
        'moonshot-v1-128k': { model: 'moonshot-v1-128k', timeout: 90000, maxTokens: 128000 }
      }
    },
    // Phase 2 新增：百度文心
    'baidu': {
      name: '百度文心一言',
      apiKey: process.env.BAIDU_API_KEY,
      secretKey: process.env.BAIDU_SECRET_KEY,
      models: {
        'ernie-bot-turbo': { model: 'ernie-bot-turbo', timeout: 30000, maxTokens: 2048 },
        'ernie-bot': { model: 'ernie-bot', timeout: 60000, maxTokens: 4096 },
        'ernie-bot-4': { model: 'ernie-bot-4', timeout: 90000, maxTokens: 8192 }
      },
      provider: BaiduWenxinProvider
    },
    // Phase 2 新增：讯飞星火
    'iflytek': {
      name: '讯飞星火',
      appId: process.env.IFLYTEK_APP_ID,
      apiKey: process.env.IFLYTEK_API_KEY,
      apiSecret: process.env.IFLYTEK_API_SECRET,
      models: {
        'spark-lite': { model: 'spark-lite', timeout: 30000, maxTokens: 2048 },
        'spark-v2': { model: 'spark-v2', timeout: 60000, maxTokens: 4096 },
        'spark-pro': { model: 'spark-pro', timeout: 90000, maxTokens: 8192 },
        'spark-max': { model: 'spark-max', timeout: 120000, maxTokens: 128000 }
      },
      provider: IFlytekSparkProvider
    }
  };

  // 模型路由映射（任务类型 -> 首选模型 -> 备选模型）
  static MODEL_ROUTING = {
    'simple-question': { primary: 'qwen-flash', fallbacks: ['moonshot-v1-8k', 'gpt-3.5', 'ernie-bot-turbo', 'spark-lite'] },
    'textbook-analysis': { primary: 'qwen-plus', fallbacks: ['moonshot-v1-8k', 'gpt-3.5', 'ernie-bot'] },
    'weakness-analysis': { primary: 'qwen-plus', fallbacks: ['gpt-4', 'qwen-max', 'ernie-bot-4', 'spark-pro'] },
    'complex-question': { primary: 'qwen-max', fallbacks: ['gpt-4', 'moonshot-v1-32k', 'ernie-bot-4', 'spark-pro'] },
    'multi-step-reasoning': { primary: 'qwen-max', fallbacks: ['gpt-4-turbo', 'qwen-long', 'spark-max'] },
    'chat': { primary: 'qwen-plus', fallbacks: ['gpt-3.5', 'moonshot-v1-8k', 'ernie-bot-turbo', 'spark-lite'] },
    'embedding': { primary: 'aliyun-embedding', fallbacks: [] }
  };

  // 健康检查状态
  static healthStatus = {
    aliyun: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
    openai: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
    azure: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
    moonshot: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
    baidu: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 },
    iflytek: { healthy: true, lastCheck: null, errorCount: 0, latency: 0 }
  };

  /**
   * 初始化所有 Phase 2 服务
   */
  static async initialize() {
    if (this.initialized) return;

    console.log('🚀 初始化 AI Gateway V2 Phase 2 服务...');

    // 初始化 Redis
    await this.initRedis();

    // 初始化缓存服务
    await ResponseCacheService.init();

    // 初始化批量更新服务
    BatchUpdateService.init();

    // 初始化 Prometheus 监控
    PrometheusExporter.init();
    PrometheusExporter.startServer();

    // 初始化成本分析服务
    await CostAnalysisService.init();

    this.initialized = true;
    console.log('✅ AI Gateway V2 Phase 2 服务初始化完成');
  }

  /**
   * 初始化 Redis 连接
   */
  static async initRedis() {
    if (this.redis) return this.redis;

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('error', (err) => {
      console.error('Redis 连接错误:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis 连接成功');
    });

    return this.redis;
  }

  /**
   * 获取 Redis 实例
   */
  static getRedis() {
    return this.redis;
  }

  /**
   * 根据任务类型选择模型（支持故障转移）
   */
  static selectModel(taskType) {
    const routing = this.MODEL_ROUTING[taskType] || this.MODEL_ROUTING['chat'];
    return routing;
  }

  /**
   * 获取模型配置
   */
  static getModelConfig(modelName) {
    // 查找模型所属的提供商
    for (const [providerKey, provider] of Object.entries(this.PROVIDER_CONFIGS)) {
      if (provider.models[modelName]) {
        return {
          provider: providerKey,
          ...provider.models[modelName],
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
          providerClass: provider.provider
        };
      }
    }
    return null;
  }

  /**
   * 调用 AI 模型（支持故障转移、重试、缓存、监控和成本分析）
   */
  static async callModel(modelName, messages, options = {}) {
    const {
      systemPrompt = '你是一个专业的学习助手。',
      temperature = 0.7,
      maxTokens = 2048,
      retryCount = 0,
      enableFallback = true,
      enableCache = true,
      taskType = 'chat',
      userId = null
    } = options;

    const modelConfig = this.getModelConfig(modelName);
    if (!modelConfig) {
      return {
        success: false,
        error: `不支持的模型：${modelName}`,
        model: modelName
      };
    }

    // Phase 2: 检查缓存
    if (enableCache) {
      const cacheParams = { modelName, messages, systemPrompt, temperature, maxTokens };
      const cachedResponse = await ResponseCacheService.getCachedAIResponse(taskType, cacheParams);
      
      if (cachedResponse) {
        console.log(`✅ 缓存命中 [${modelName}]`);
        PrometheusExporter.recordCacheHit(taskType);
        return {
          ...cachedResponse,
          fromCache: true
        };
      }
      PrometheusExporter.recordCacheMiss(taskType);
    }

    // 检查 API Key（针对原生 provider）
    if (!modelConfig.providerClass && !modelConfig.apiKey) {
      return {
        success: false,
        error: `模型 ${modelName} 的 API Key 未配置`,
        model: modelName
      };
    }

    const startTime = Date.now();
    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1);

    try {
      let result;

      // Phase 2: 使用 Provider 类调用（百度、讯飞）
      if (modelConfig.providerClass) {
        result = await modelConfig.providerClass.callModel(modelName, messages, {
          systemPrompt,
          temperature,
          maxTokens
        });
      } else {
        // 原生调用（阿里云、OpenAI 等）
        result = await this.callNativeModel(modelConfig, messages, {
          systemPrompt,
          temperature,
          maxTokens
        });
      }

      const latency = Date.now() - startTime;

      if (result.success) {
        // Phase 2: 记录 Prometheus 指标
        PrometheusExporter.recordAIRequest(modelConfig.provider, modelName, taskType, 'success');
        PrometheusExporter.recordAIDuration(modelConfig.provider, modelName, taskType, latency / 1000);
        
        if (result.usage) {
          PrometheusExporter.recordTokenUsage(
            modelConfig.provider,
            modelName,
            result.usage.prompt_tokens || 0,
            result.usage.completion_tokens || 0,
            result.usage.total_tokens || 0
          );

          // Phase 2: 记录成本
          await CostAnalysisService.recordUsage({
            provider: modelConfig.provider,
            model: modelName,
            promptTokens: result.usage.prompt_tokens || 0,
            completionTokens: result.usage.completion_tokens || 0,
            totalTokens: result.usage.total_tokens || 0,
            userId,
            taskType
          });

          // Phase 2: 批量记录 Token 使用到 Redis
          await this.recordTokenUsage(modelName, result.usage);
        }

        // Phase 2: 缓存响应
        if (enableCache) {
          const cacheParams = { modelName, messages, systemPrompt, temperature, maxTokens };
          const cacheData = {
            success: true,
            data: result.data,
            usage: result.usage,
            model: modelName,
            provider: modelConfig.provider,
            latency
          };
          await ResponseCacheService.cacheAIResponse(taskType, cacheParams, cacheData);
        }

        // 更新健康状态
        this.updateHealthStatus(modelConfig.provider, true, latency);
      } else {
        // 记录错误
        PrometheusExporter.recordAIRequest(modelConfig.provider, modelName, taskType, 'error');
        PrometheusExporter.recordAIError(modelConfig.provider, modelName, taskType, 'api_error');
        
        this.updateHealthStatus(modelConfig.provider, false, latency, result.error);
      }

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      const isRetryable = error.response?.status >= 500 || 
                          error.code === 'ECONNRESET' || 
                          error.code === 'ETIMEDOUT';

      // 记录错误指标
      PrometheusExporter.recordAIRequest(modelConfig.provider, modelName, taskType, 'error');
      PrometheusExporter.recordAIError(modelConfig.provider, modelName, taskType, error.code || 'unknown');

      // 更新健康状态
      this.updateHealthStatus(modelConfig.provider, false, latency, error.message);

      // 重试逻辑
      if (isRetryable && retryCount < maxRetries) {
        console.warn(`AI 模型调用失败 [${modelName}]，第 ${retryCount + 1} 次重试，${retryDelay}ms 后...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.callModel(modelName, messages, { ...options, retryCount: retryCount + 1 });
      }

      // 故障转移
      if (enableFallback && isRetryable) {
        const routing = this.selectModel(taskType);
        const fallbackModels = routing.fallbacks.filter(m => m !== modelName);
        
        for (const fallbackModel of fallbackModels) {
          console.warn(`尝试故障转移到备用模型：${fallbackModel}`);
          const result = await this.callModel(fallbackModel, messages, { 
            ...options, 
            enableFallback: false,
            retryCount: 0
          });
          
          if (result.success) {
            return result;
          }
        }
      }

      console.error(`AI 模型调用失败 [${modelName}]:`, error.message);
      
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `API 错误 (${error.response.status}): ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        errorMessage = '网络请求失败，请检查网络连接';
      }

      return {
        success: false,
        error: errorMessage,
        model: modelName,
        provider: modelConfig.provider,
        retryCount: retryCount
      };
    }
  }

  /**
   * 原生模型调用（阿里云、OpenAI 等）
   */
  static async callNativeModel(modelConfig, messages, options) {
    const { systemPrompt, temperature, maxTokens } = options;

    const response = await axios.post(
      `${modelConfig.baseUrl}/chat/completions`,
      {
        model: modelConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature,
        max_tokens: modelConfig.maxTokens || maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.apiKey}`
        },
        timeout: modelConfig.timeout
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    const usage = response.data.usage;

    if (!content) {
      throw new Error('AI 返回内容为空');
    }

    return {
      success: true,
      data: content,
      usage,
      model: modelConfig.provider,
      provider: modelConfig.provider
    };
  }

  /**
   * 更新健康状态
   */
  static updateHealthStatus(provider, success, latency, error = null) {
    const status = this.healthStatus[provider];
    if (!status) return;

    status.lastCheck = new Date().toISOString();
    status.latency = latency;

    if (success) {
      status.errorCount = Math.max(0, status.errorCount - 1);
      if (status.errorCount < 3) {
        status.healthy = true;
      }
    } else {
      status.errorCount++;
      if (status.errorCount >= 5) {
        status.healthy = false;
        console.error(`⚠️  提供商 ${provider} 标记为不健康，错误计数：${status.errorCount}`);
      }
    }
  }

  /**
   * 记录 Token 使用
   */
  static async recordTokenUsage(model, usage) {
    if (!this.redis || !usage) return;

    try {
      const key = `ai:token_usage:${new Date().toISOString().split('T')[0]}`;
      const totalTokens = usage.total_tokens || 0;
      
      await this.redis.hincrby(key, model, totalTokens);
      await this.redis.expire(key, 86400 * 30); // 保留 30 天
    } catch (error) {
      console.error('记录 Token 使用失败:', error.message);
    }
  }

  /**
   * 获取 Token 使用统计
   */
  static async getTokenUsage(date = new Date().toISOString().split('T')[0]) {
    if (!this.redis) return {};

    try {
      const key = `ai:token_usage:${date}`;
      const usage = await this.redis.hgetall(key);
      
      const result = {};
      for (const [model, count] of Object.entries(usage)) {
        result[model] = parseInt(count);
      }
      return result;
    } catch (error) {
      console.error('获取 Token 使用统计失败:', error.message);
      return {};
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck() {
    const results = {};

    for (const [providerKey, provider] of Object.entries(this.PROVIDER_CONFIGS)) {
      // Phase 2: 使用 Provider 类的健康检查
      if (provider.provider && provider.provider.healthCheck) {
        results[providerKey] = await provider.provider.healthCheck();
        continue;
      }

      // 原生 provider 健康检查
      if (!provider.apiKey) {
        results[providerKey] = {
          healthy: false,
          error: 'API Key 未配置',
          latency: 0
        };
        continue;
      }

      const startTime = Date.now();
      try {
        const testModel = Object.keys(provider.models)[0];
        const response = await axios.post(
          `${provider.baseUrl}/chat/completions`,
          {
            model: provider.models[testModel].model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.apiKey}`
            },
            timeout: 5000
          }
        );

        const latency = Date.now() - startTime;
        results[providerKey] = {
          healthy: true,
          latency,
          lastCheck: new Date().toISOString()
        };

        this.updateHealthStatus(providerKey, true, latency);
      } catch (error) {
        const latency = Date.now() - startTime;
        results[providerKey] = {
          healthy: false,
          error: error.message,
          latency
        };

        this.updateHealthStatus(providerKey, false, latency, error.message);
      }
    }

    return results;
  }

  /**
   * 获取健康状态
   */
  static getHealthStatus() {
    return {
      ...this.healthStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成题目（V2 版本）
   */
  static async generateQuestions(params) {
    const {
      textbookContent,
      grade,
      subject,
      unit,
      questionCount = 5,
      difficulty = 'medium',
      questionType = 'choice',
      userId = null
    } = params;

    const modelRouting = this.selectModel('complex-question');
    const primaryModel = modelRouting.primary;

    const prompt = this.buildQuestionPrompt({
      textbookContent,
      grade,
      subject,
      unit,
      questionCount,
      difficulty,
      questionType
    });

    const messages = [{ role: 'user', content: prompt }];

    const result = await this.callModel(primaryModel, messages, {
      systemPrompt: '你是一个专业的教育题目生成专家，擅长根据课本内容生成高质量的练习题。',
      temperature: 0.7,
      maxTokens: 4096,
      taskType: 'complex-question',
      userId
    });

    if (!result.success) {
      throw new Error(`题目生成失败：${result.error}`);
    }

    const questions = this.parseAndValidateQuestions(result.data);
    
    // Phase 2: 记录生成的题目指标
    questions.forEach(q => {
      PrometheusExporter.recordQuestionGenerated(q.difficulty || difficulty, q.type || questionType);
    });
    
    return {
      success: true,
      questions,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      latency: result.latency,
      fromCache: result.fromCache
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
      // 尝试提取 JSON（支持对象和数组）
      let jsonString = responseText.trim();
      
      // 如果是对象格式，提取 {...}
      if (jsonString.startsWith('{')) {
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        jsonString = jsonMatch ? jsonMatch[0] : jsonString;
      } else if (jsonString.startsWith('[')) {
        // 如果是数组格式，提取 [...]
        const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
        jsonString = jsonMatch ? jsonMatch[0] : jsonString;
      }
      
      let parsed = JSON.parse(jsonString);
      
      if (Array.isArray(parsed)) {
        parsed = { questions: parsed };
      }
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('响应格式不正确，缺少 questions 数组');
      }

      const validatedQuestions = parsed.questions.map((q, index) => {
        return this.validateQuestion(q, index + 1);
      });

      return validatedQuestions.filter(q => q !== null);
    } catch (error) {
      console.error('JSON 解析失败:', error.message);
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
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

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

  /**
   * 智能对话（支持上下文）
   */
  static async chat(messages, options = {}) {
    const {
      taskType = 'chat',
      temperature = 0.7,
      maxTokens = 2048,
      userId = null
    } = options;

    const modelRouting = this.selectModel(taskType);
    const primaryModel = modelRouting.primary;

    return this.callModel(primaryModel, messages, {
      temperature,
      maxTokens,
      taskType,
      userId
    });
  }

  /**
   * 生成 Embedding
   */
  static async generateEmbedding(text) {
    const provider = this.PROVIDER_CONFIGS['aliyun'];
    if (!provider || !provider.apiKey) {
      throw new Error('Embedding API Key 未配置');
    }

    try {
      const response = await axios.post(
        provider.embeddingUrl,
        {
          model: 'text-embedding-v2',
          input: { texts: [text] },
          parameters: { text_type: 'query' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
            'X-DashScope-Key': provider.apiKey
          },
          timeout: 10000
        }
      );

      if (response.data?.output?.embeddings?.[0]?.embedding) {
        return response.data.output.embeddings[0].embedding;
      }

      throw new Error('Embedding API 返回格式异常');
    } catch (error) {
      console.error('生成 Embedding 失败:', error.message);
      throw error;
    }
  }

  /**
   * 限流检查（基于 Redis）
   */
  static async checkRateLimit(userId, limit = 10, window = 60) {
    if (!this.redis) return { allowed: true };

    try {
      const key = `ai:rate_limit:${userId}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, window);
      }

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetAt: Date.now() + window * 1000
      };
    } catch (error) {
      console.error('限流检查失败:', error.message);
      return { allowed: true }; // 失败时放行
    }
  }

  /**
   * Phase 2: 获取缓存统计
   */
  static async getCacheStats() {
    return await ResponseCacheService.getStats();
  }

  /**
   * Phase 2: 获取成本统计
   */
  static async getCostStats(period = 'daily') {
    return await CostAnalysisService.getCostStats(period);
  }

  /**
   * Phase 2: 获取预算使用情况
   */
  static async getBudgetUsage() {
    return await CostAnalysisService.getBudgetUsage();
  }

  /**
   * Phase 2: 获取优化建议
   */
  static async getOptimizationSuggestions() {
    return await CostAnalysisService.getOptimizationSuggestions();
  }

  /**
   * Phase 2: 获取 Prometheus 指标
   */
  static async getPrometheusMetrics() {
    return await PrometheusExporter.getMetrics();
  }

  /**
   * Phase 2: 获取批量更新队列状态
   */
  static getBatchUpdateStatus() {
    return BatchUpdateService.getQueueStatus();
  }
}

module.exports = AiGatewayServiceV2;
