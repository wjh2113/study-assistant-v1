/**
 * BaiduWenxinProvider 测试
 * 测试覆盖：API 调用、令牌管理、错误处理、健康检查
 */

const BaiduWenxinProvider = require('../src/modules/ai-gateway/providers/BaiduWenxinProvider');
const axios = require('axios');

jest.mock('axios');

describe('BaiduWenxinProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置环境变量
    delete process.env.BAIDU_API_KEY;
    delete process.env.BAIDU_SECRET_KEY;
    
    // 重置令牌缓存
    BaiduWenxinProvider.tokenCache = {
      accessToken: null,
      expiresAt: 0
    };
  });

  describe('getAccessToken', () => {
    test('应该获取访问令牌', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      axios.post.mockResolvedValue({
        data: {
          access_token: 'mock-access-token',
          expires_in: 2592000
        }
      });

      const token = await BaiduWenxinProvider.getAccessToken();

      expect(token).toBe('mock-access-token');
      expect(axios.post).toHaveBeenCalledWith(
        'https://aip.baidubce.com/oauth/2.0/token',
        null,
        expect.objectContaining({
          params: {
            grant_type: 'client_credentials',
            client_id: 'test-api-key',
            client_secret: 'test-secret-key'
          }
        })
      );
    });

    test('应该缓存访问令牌', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      axios.post.mockResolvedValue({
        data: {
          access_token: 'cached-token',
          expires_in: 2592000
        }
      });

      // 第一次调用
      await BaiduWenxinProvider.getAccessToken();
      
      // 第二次调用应该使用缓存
      await BaiduWenxinProvider.getAccessToken();

      // axios.post 应该只被调用一次
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('应该在令牌过期后重新获取', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      axios.post.mockResolvedValue({
        data: {
          access_token: 'token-1',
          expires_in: 1
        }
      });

      // 第一次调用
      await BaiduWenxinProvider.getAccessToken();

      // 模拟令牌过期
      BaiduWenxinProvider.tokenCache.expiresAt = Date.now() - 1000;
      
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'token-2',
          expires_in: 2592000
        }
      });

      // 第二次调用应该重新获取
      const token = await BaiduWenxinProvider.getAccessToken();

      expect(token).toBe('token-2');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test('应该在获取令牌失败时抛出错误', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      axios.post.mockRejectedValue(new Error('认证失败'));

      await expect(
        BaiduWenxinProvider.getAccessToken()
      ).rejects.toThrow('百度 API 认证失败');
    });
  });

  describe('callModel', () => {
    test('应该在不支持的模型时返回错误', async () => {
      const result = await BaiduWenxinProvider.callModel('invalid-model', []);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的百度模型');
    });

    test('应该在 API Key 未配置时返回错误', async () => {
      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', []);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('百度 API Key 未配置');
    });

    test('应该成功调用文心一言模型', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: {
          result: '这是回答',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '测试问题' }
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toBe('这是回答');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      });
      expect(result.provider).toBe('baidu');
    });

    test('应该包含 system prompt', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: {
          result: '回答',
          usage: {}
        }
      });

      await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ], {
        systemPrompt: '你是学习助手'
      });

      const requestBody = axios.post.mock.calls[0][1];
      expect(requestBody.messages[0]).toEqual({
        role: 'system',
        content: '你是学习助手'
      });
    });

    test('应该在返回空内容时返回错误', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: {
          result: null,
          usage: {}
        }
      });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('百度 API 返回内容为空');
    });

    test('应该在 429 错误时重试', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValue({
          data: {
            result: '成功',
            usage: {}
          }
        });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test('应该在 500 错误时重试', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue({
          data: {
            result: '成功',
            usage: {}
          }
        });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test('应该在网络错误时重试', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockResolvedValue({
          data: {
            result: '成功',
            usage: {}
          }
        });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    test('应该在超过最大重试次数后返回错误', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockRejectedValue({ response: { status: 500 } });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(false);
      expect(axios.post).toHaveBeenCalledTimes(4); // 初始 + 3 次重试
    });

    test('应该在 API 返回错误信息时包含详细信息', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error_msg: '参数错误'
          }
        }
      });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('百度 API 错误：参数错误');
    });
  });

  describe('healthCheck', () => {
    test('应该在 API Key 未配置时返回不健康', async () => {
      const result = await BaiduWenxinProvider.healthCheck();
      
      expect(result.healthy).toBe(false);
      expect(result.error).toContain('API Key 未配置');
    });

    test('应该成功进行健康检查', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      axios.post.mockResolvedValue({
        data: {
          access_token: 'token',
          expires_in: 2592000
        }
      });

      const result = await BaiduWenxinProvider.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.provider).toBe('baidu');
    });

    test('应该在健康检查失败时返回错误', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      axios.post.mockRejectedValue(new Error('网络错误'));

      const result = await BaiduWenxinProvider.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('generateEmbedding', () => {
    test('应该生成 Embedding', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: {
          data: [{
            embedding: [0.1, 0.2, 0.3, 0.4]
          }]
        }
      });

      const embedding = await BaiduWenxinProvider.generateEmbedding('测试文本');

      expect(embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    test('应该在 Embedding API 返回格式异常时抛出错误', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: {
          data: []
        }
      });

      await expect(
        BaiduWenxinProvider.generateEmbedding('测试文本')
      ).rejects.toThrow('百度 Embedding API 返回格式异常');
    });

    test('应该在生成 Embedding 失败时抛出错误', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockRejectedValue(new Error('网络错误'));

      await expect(
        BaiduWenxinProvider.generateEmbedding('测试文本')
      ).rejects.toThrow();
    });
  });

  describe('模型配置', () => {
    test('应该支持 ernie-bot-turbo 模型', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: { result: '回答', usage: {} }
      });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-turbo', []);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('eb-instant'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('应该支持 ernie-bot 模型', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: { result: '回答', usage: {} }
      });

      const result = await BaiduWenxinProvider.callModel('ernie-bot', []);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('completions'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('应该支持 ernie-bot-4 模型', async () => {
      process.env.BAIDU_API_KEY = 'test-api-key';
      process.env.BAIDU_SECRET_KEY = 'test-secret-key';

      BaiduWenxinProvider.tokenCache = {
        accessToken: 'mock-token',
        expiresAt: Date.now() + 1000000
      };

      axios.post.mockResolvedValue({
        data: { result: '回答', usage: {} }
      });

      const result = await BaiduWenxinProvider.callModel('ernie-bot-4', []);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('completions_pro'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});
