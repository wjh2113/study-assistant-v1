/**
 * IFlytekSparkProvider 测试
 * 测试覆盖：WebSocket 调用、鉴权、错误处理、健康检查
 */

const IFlytekSparkProvider = require('../src/modules/ai-gateway/providers/IFlytekSparkProvider');
const WebSocket = require('ws');
const crypto = require('crypto');

jest.mock('ws');
jest.mock('crypto');

describe('IFlytekSparkProvider', () => {
  let mockWebSocket;
  let mockWsInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置环境变量
    delete process.env.IFLYTEK_APP_ID;
    delete process.env.IFLYTEK_API_KEY;
    delete process.env.IFLYTEK_API_SECRET;
    
    // Mock WebSocket
    mockWsInstance = {
      on: jest.fn((event, callback) => {
        // 存储回调以便后续触发
        if (event === 'open') {
          this.onOpen = callback;
        } else if (event === 'message') {
          this.onMessage = callback;
        } else if (event === 'error') {
          this.onError = callback;
        } else if (event === 'close') {
          this.onClose = callback;
        }
      }),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    mockWebSocket = jest.fn().mockImplementation(() => mockWsInstance);
    WebSocket.mockImplementation(mockWebSocket);
  });

  describe('getAuthUrl', () => {
    test('应该生成鉴权 URL', () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const url = 'wss://spark-api.xf-yun.com/v1.1/chat';
      
      // Mock crypto
      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('signature')
      };
      crypto.createHmac.mockReturnValue(mockHmac);

      const authUrl = IFlytekSparkProvider.getAuthUrl(url);

      expect(authUrl).toContain('authorization=');
      expect(authUrl).toContain('date=');
      expect(authUrl).toContain('host=');
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'test-api-secret');
    });

    test('应该使用当前时间生成签名', () => {
      process.env.IFLYTEK_API_KEY = 'test-key';
      process.env.IFLYTEK_API_SECRET = 'test-secret';

      const mockHmac = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('signature')
      };
      crypto.createHmac.mockReturnValue(mockHmac);

      const url = 'wss://spark-api.xf-yun.com/v1.1/chat';
      IFlytekSparkProvider.getAuthUrl(url);

      expect(mockHmac.update).toHaveBeenCalledWith(
        expect.stringContaining('host:')
      );
      expect(mockHmac.update).toHaveBeenCalledWith(
        expect.stringContaining('date:')
      );
    });
  });

  describe('callModel', () => {
    test('应该在不支持的模型时返回错误', async () => {
      const result = await IFlytekSparkProvider.callModel('invalid-model', []);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的讯飞模型');
    });

    test('应该在 API Key 未配置时返回错误', async () => {
      const result = await IFlytekSparkProvider.callModel('spark-lite', []);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('讯飞 API Key 未配置');
    });

    test('应该成功调用讯飞星火模型', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '测试问题' }
      ]);

      // 模拟 WebSocket 连接成功
      setTimeout(() => {
        mockWsInstance.on('open', mockWsInstance.onOpen);
      }, 0);

      // 模拟收到响应
      setTimeout(() => {
        mockWsInstance.on('message', JSON.stringify({
          payload: {
            choices: {
              text: [{ content: '这是回答' }]
            },
            usage: {
              text: {
                question_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30
              }
            }
          },
          header: {
            status: 2
          }
        }));
      }, 10);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('这是回答');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      });
      expect(result.provider).toBe('iflytek');
    });

    test('应该支持流式响应', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '问题' }
      ]);

      // 模拟连接
      mockWsInstance.on('open', mockWsInstance.onOpen);

      // 模拟多个响应片段
      mockWsInstance.on('message', JSON.stringify({
        payload: {
          choices: { text: [{ content: '第' }] }
        },
        header: { status: 0 }
      }));

      mockWsInstance.on('message', JSON.stringify({
        payload: {
          choices: { text: [{ content: '一' }] }
        },
        header: { status: 0 }
      }));

      mockWsInstance.on('message', JSON.stringify({
        payload: {
          choices: { text: [{ content: '段' }] },
          usage: { text: { total_tokens: 10 } }
        },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.data).toBe('第一段');
    });

    test('应该包含 system prompt', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '问题' }
      ], {
        systemPrompt: '你是学习助手'
      });

      mockWsInstance.on('open', mockWsInstance.onOpen);

      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      
      expect(sentPayload.payload.message.text[0]).toEqual({
        role: 'system',
        content: '你是学习助手'
      });
    });

    test('应该在 WebSocket 错误时重试', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      let callCount = 0;
      
      mockWebSocket.mockImplementation(() => {
        callCount++;
        const instance = {
          on: jest.fn((event, callback) => {
            if (event === 'error' && callCount <= 2) {
              setTimeout(() => callback(new Error('连接错误')), 10);
            } else if (event === 'open' && callCount > 2) {
              setTimeout(callback, 10);
            } else if (event === 'message' && callCount > 2) {
              setTimeout(() => {
                callback(JSON.stringify({
                  payload: { choices: { text: [{ content: '成功' }] } },
                  header: { status: 2 }
                }));
              }, 20);
            }
          }),
          send: jest.fn(),
          close: jest.fn(),
          readyState: WebSocket.OPEN
        };
        return instance;
      });

      const result = await IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 初始 + 2 次重试
    });

    test('应该在超过最大重试次数后返回错误', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      mockWebSocket.mockImplementation(() => ({
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('连接失败')), 10);
          }
        }),
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN
      }));

      const result = await IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '问题' }
      ]);

      expect(result.success).toBe(false);
    });

    test('应该在超时时返回错误', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '问题' }
      ]);

      // 模拟连接但不返回任何数据
      mockWsInstance.on('open', mockWsInstance.onOpen);
      
      // 不触发 message 事件，等待超时

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('请求超时');
    });

    test('应该在解析响应失败时继续处理', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [
        { role: 'user', content: '问题' }
      ]);

      mockWsInstance.on('open', mockWsInstance.onOpen);

      // 发送无效的 JSON
      mockWsInstance.on('message', 'invalid-json');

      // 然后发送有效响应
      mockWsInstance.on('message', JSON.stringify({
        payload: {
          choices: { text: [{ content: '回答' }] }
        },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    test('应该在 API Key 未配置时返回不健康', async () => {
      const result = await IFlytekSparkProvider.healthCheck();
      
      expect(result.healthy).toBe(false);
      expect(result.error).toContain('API Key 未配置');
    });

    test('应该成功进行健康检查', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.healthCheck();

      // 模拟连接成功
      mockWsInstance.on('open', mockWsInstance.onOpen);

      // 模拟响应
      mockWsInstance.on('message', JSON.stringify({
        payload: {
          choices: { text: [{ content: 'pong' }] }
        },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.provider).toBe('iflytek');
    });

    test('应该在健康检查失败时返回错误', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.healthCheck();

      // 模拟连接错误
      mockWsInstance.on('error', mockWsInstance.onError);

      const result = await resultPromise;

      expect(result.healthy).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('模型配置', () => {
    test('应该支持 spark-lite 模型', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', []);

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.success).toBe(true);
      
      // 验证使用了正确的 domain
      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.parameter.chat.domain).toBe('general');
    });

    test('应该支持 spark-v2 模型', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-v2', []);

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.success).toBe(true);
      
      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.parameter.chat.domain).toBe('generalv2');
    });

    test('应该支持 spark-pro 模型', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-pro', []);

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.success).toBe(true);
      
      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.parameter.chat.domain).toBe('generalv3');
    });

    test('应该支持 spark-max 模型', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-max', []);

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      const result = await resultPromise;

      expect(result.success).toBe(true);
      
      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.parameter.chat.domain).toBe('generalv3.5');
    });
  });

  describe('请求参数', () => {
    test('应该支持自定义 temperature', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [], {
        temperature: 0.9
      });

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      await resultPromise;

      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.parameter.chat.temperature).toBe(0.9);
    });

    test('应该支持自定义 maxTokens', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', [], {
        maxTokens: 4096
      });

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      await resultPromise;

      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.parameter.chat.max_tokens).toBe(4096);
    });

    test('应该包含 app_id 和 uid', async () => {
      process.env.IFLYTEK_APP_ID = 'test-app-id';
      process.env.IFLYTEK_API_KEY = 'test-api-key';
      process.env.IFLYTEK_API_SECRET = 'test-api-secret';

      const resultPromise = IFlytekSparkProvider.callModel('spark-lite', []);

      mockWsInstance.on('open', mockWsInstance.onOpen);
      mockWsInstance.on('message', JSON.stringify({
        payload: { choices: { text: [{ content: '回答' }] } },
        header: { status: 2 }
      }));

      await resultPromise;

      const sentPayload = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentPayload.header.app_id).toBe('test-app-id');
      expect(sentPayload.header.uid).toBe('studyass-user');
    });
  });
});
