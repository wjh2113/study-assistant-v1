/**
 * iFlytek Spark AI Provider - 讯飞星火接入
 * Phase 2 可选：更多 AI 服务商
 */

const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const { URL } = require('url');

class iFlytekSparkProvider {
  static config = {
    appId: process.env.IFLYTEK_APP_ID,
    apiKey: process.env.IFLYTEK_API_KEY,
    apiSecret: process.env.IFLYTEK_API_SECRET
  };

  // 模型配置
  static MODELS = {
    'spark-lite': { 
      domain: 'general', 
      url: 'wss://spark-api.xf-yun.com/v1.1/chat',
      name: 'Spark Lite'
    },
    'spark-v2': { 
      domain: 'generalv2', 
      url: 'wss://spark-api.xf-yun.com/v2.1/chat',
      name: 'Spark V2'
    },
    'spark-pro': { 
      domain: 'generalv3', 
      url: 'wss://spark-api.xf-yun.com/v3.1/chat',
      name: 'Spark Pro'
    },
    'spark-max': { 
      domain: 'generalv3.5', 
      url: 'wss://spark-api.xf-yun.com/v3.5/chat',
      name: 'Spark Max'
    }
  };

  /**
   * 生成鉴权 URL
   */
  static getAuthUrl(url) {
    const date = new Date().toUTCString();
    const host = new URL(url).host;
    
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /chat HTTP/1.1`;
    const signatureSha = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(signatureOrigin)
      .digest('base64');
    
    const authorizationOrigin = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
  }

  /**
   * 调用讯飞星火模型（WebSocket）
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
        error: `不支持的讯飞模型：${modelName}`
      };
    }

    if (!this.config.appId || !this.config.apiKey || !this.config.apiSecret) {
      return {
        success: false,
        error: '讯飞 API Key 未配置'
      };
    }

    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1);

    try {
      const startTime = Date.now();
      const authUrl = this.getAuthUrl(modelConfig.url);
      
      return new Promise((resolve) => {
        const ws = new WebSocket(authUrl);
        let fullContent = '';
        let usage = null;

        ws.on('open', () => {
          const payload = {
            header: {
              app_id: this.config.appId,
              uid: 'studyass-user'
            },
            parameter: {
              chat: {
                domain: modelConfig.domain,
                temperature,
                max_tokens: maxTokens,
                auditing: 'default'
              }
            },
            payload: {
              message: {
                text: [
                  { role: 'system', content: systemPrompt },
                  ...messages
                ]
              }
            }
          };

          ws.send(JSON.stringify(payload));
        });

        ws.on('message', (data) => {
          try {
            const response = JSON.parse(data.toString());
            
            if (response.payload?.choices?.text) {
              const content = response.payload.choices.text[0].content;
              fullContent += content;
            }

            if (response.payload?.usage?.text) {
              usage = {
                prompt_tokens: response.payload.usage.text?.question_tokens || 0,
                completion_tokens: response.payload.usage.text?.completion_tokens || 0,
                total_tokens: response.payload.usage.text?.total_tokens || 0
              };
            }

            // 最后一个片段
            if (response.header?.status === 2) {
              ws.close();
              const latency = Date.now() - startTime;

              resolve({
                success: true,
                data: fullContent,
                usage,
                model: modelName,
                provider: 'iflytek',
                latency
              });
            }
          } catch (error) {
            console.error('解析讯飞响应失败:', error.message);
          }
        });

        ws.on('error', (error) => {
          console.error('讯飞 WebSocket 错误:', error.message);
          
          if (retryCount < maxRetries) {
            setTimeout(async () => {
              const result = await this.callModel(modelName, messages, {
                ...options,
                retryCount: retryCount + 1
              });
              resolve(result);
            }, retryDelay);
          } else {
            resolve({
              success: false,
              error: error.message,
              model: modelName,
              provider: 'iflytek'
            });
          }
        });

        ws.on('close', () => {
          // 正常关闭，已在 message 中处理
        });

        // 超时处理
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            resolve({
              success: false,
              error: '请求超时',
              model: modelName,
              provider: 'iflytek'
            });
          }
        }, 60000);
      });
    } catch (error) {
      console.error(`讯飞模型调用失败 [${modelName}]:`, error.message);
      
      return {
        success: false,
        error: error.message,
        model: modelName,
        provider: 'iflytek'
      };
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck() {
    if (!this.config.appId || !this.config.apiKey || !this.config.apiSecret) {
      return { healthy: false, error: 'API Key 未配置' };
    }

    try {
      const startTime = Date.now();
      const modelConfig = this.MODELS['spark-lite'];
      const authUrl = this.getAuthUrl(modelConfig.url);

      const result = await this.callModel('spark-lite', [
        { role: 'user', content: 'ping' }
      ], { maxTokens: 1 });

      const latency = Date.now() - startTime;

      if (result.success) {
        return {
          healthy: true,
          latency,
          provider: 'iflytek'
        };
      } else {
        return {
          healthy: false,
          error: result.error,
          provider: 'iflytek'
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        provider: 'iflytek'
      };
    }
  }
}

module.exports = iFlytekSparkProvider;
