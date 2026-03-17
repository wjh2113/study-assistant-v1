/**
 * Baidu Wenxin AI Provider - 百度文心一言接入
 * Phase 2 可选：更多 AI 服务商
 */

const axios = require('axios');

class BaiduWenxinProvider {
  static config = {
    apiKey: process.env.BAIDU_API_KEY,
    secretKey: process.env.BAIDU_SECRET_KEY,
    baseUrl: 'https://aip.baidubce.com'
  };

  static tokenCache = {
    accessToken: null,
    expiresAt: 0
  };

  // 模型映射
  static MODELS = {
    'ernie-bot-turbo': { endpoint: 'eb-instant', name: 'ERNIE-Bot-turbo' },
    'ernie-bot': { endpoint: 'completions', name: 'ERNIE-Bot' },
    'ernie-bot-4': { endpoint: 'completions_pro', name: 'ERNIE-Bot 4.0' },
    'ernie-bot-8k': { endpoint: 'ernie_bot_8k', name: 'ERNIE-Bot-8k' }
  };

  /**
   * 获取访问令牌
   */
  static async getAccessToken() {
    const now = Date.now();
    
    // 检查缓存
    if (this.tokenCache.accessToken && now < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/oauth/2.0/token`,
        null,
        {
          params: {
            grant_type: 'client_credentials',
            client_id: this.config.apiKey,
            client_secret: this.config.secretKey
          },
          timeout: 10000
        }
      );

      const { access_token, expires_in } = response.data;
      
      // 提前 5 分钟过期
      this.tokenCache = {
        accessToken: access_token,
        expiresAt: now + (expires_in - 300) * 1000
      };

      return access_token;
    } catch (error) {
      console.error('获取百度访问令牌失败:', error.message);
      throw new Error('百度 API 认证失败');
    }
  }

  /**
   * 调用文心一言模型
   */
  static async callModel(modelName, messages, options = {}) {
    const {
      systemPrompt = '你是一个专业的学习助手。',
      temperature = 0.7,
      maxTokens = 2048,
      retryCount = 0
    } = options;

    const modelConfig = this.MODELS[modelName];
    if (!modelConfig) {
      return {
        success: false,
        error: `不支持的百度模型：${modelName}`
      };
    }

    if (!this.config.apiKey || !this.config.secretKey) {
      return {
        success: false,
        error: '百度 API Key 未配置'
      };
    }

    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1);

    try {
      const accessToken = await this.getAccessToken();
      const startTime = Date.now();

      // 构建请求
      const requestBody = {
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature,
        max_output_tokens: maxTokens
      };

      const response = await axios.post(
        `${this.config.baseUrl}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelConfig.endpoint}`,
        requestBody,
        {
          params: { access_token: accessToken },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const latency = Date.now() - startTime;
      const { result, usage } = response.data;

      if (!result) {
        throw new Error('百度 API 返回内容为空');
      }

      return {
        success: true,
        data: result,
        usage: {
          prompt_tokens: usage?.prompt_tokens || 0,
          completion_tokens: usage?.completion_tokens || 0,
          total_tokens: usage?.total_tokens || 0
        },
        model: modelName,
        provider: 'baidu',
        latency
      };
    } catch (error) {
      const isRetryable = error.response?.status === 429 || 
                          error.response?.status >= 500 ||
                          error.code === 'ECONNRESET';

      if (isRetryable && retryCount < maxRetries) {
        console.warn(`百度模型调用失败 [${modelName}]，第 ${retryCount + 1} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.callModel(modelName, messages, { ...options, retryCount: retryCount + 1 });
      }

      console.error(`百度模型调用失败 [${modelName}]:`, error.message);
      
      let errorMessage = error.message;
      if (error.response?.data?.error_msg) {
        errorMessage = `百度 API 错误：${error.response.data.error_msg}`;
      }

      return {
        success: false,
        error: errorMessage,
        model: modelName,
        provider: 'baidu'
      };
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck() {
    if (!this.config.apiKey || !this.config.secretKey) {
      return { healthy: false, error: 'API Key 未配置' };
    }

    try {
      const startTime = Date.now();
      await this.getAccessToken();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        provider: 'baidu'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: 'baidu'
      };
    }
  }

  /**
   * 生成 Embedding
   */
  static async generateEmbedding(text) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.config.baseUrl}/rpc/2.0/ai_custom/v1/wenxinworkshop/embeddings/embedding-v1`,
        { input: [text] },
        {
          params: { access_token: accessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      if (response.data?.data?.[0]?.embedding) {
        return response.data.data[0].embedding;
      }

      throw new Error('百度 Embedding API 返回格式异常');
    } catch (error) {
      console.error('生成百度 Embedding 失败:', error.message);
      throw error;
    }
  }
}

module.exports = BaiduWenxinProvider;
