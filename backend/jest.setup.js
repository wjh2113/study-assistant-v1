/**
 * Jest 测试环境配置
 * BUG-API-001 修复：设置测试模式环境变量
 * BUG-API-003 修复：使用 SQLite 数据库进行测试
 */

const path = require('path');
const fs = require('fs');

// 启用测试模式 - 允许使用通用验证码
process.env.TEST_MODE = 'true';

// 使用 SQLite 数据库（避免 MySQL/PostgreSQL 依赖）
delete process.env.DATABASE_URL;

// 使用临时数据库文件
const tempDbPath = path.join(__dirname, 'test-temp-' + process.pid + '.db');
process.env.DATABASE_PATH = tempDbPath;

// 禁用生产环境功能
process.env.NODE_ENV = 'test';

// Redis 配置 - 测试模式使用内存模式
process.env.QUEUE_PROVIDER = 'memory';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Mock Redis 连接（避免实际连接）
jest.mock('ioredis', () => {
  class MockRedis {
    constructor() {
      this.connect = jest.fn().mockResolvedValue();
      this.disconnect = jest.fn().mockResolvedValue();
      this.quit = jest.fn().mockResolvedValue();
      this.on = jest.fn(function() { return this; });
      this.once = jest.fn(function() { return this; });
      this.removeListener = jest.fn();
      this.removeAllListeners = jest.fn();
      this.call = jest.fn().mockResolvedValue(null);
      this.send_command = jest.fn().mockResolvedValue(null);
      this.get = jest.fn().mockResolvedValue(null);
      this.set = jest.fn().mockResolvedValue('OK');
      this.del = jest.fn().mockResolvedValue(1);
      this.exists = jest.fn().mockResolvedValue(0);
      this.keys = jest.fn().mockResolvedValue([]);
      this.flushdb = jest.fn().mockResolvedValue('OK');
      this.info = jest.fn().mockResolvedValue('');
      this.ping = jest.fn().mockResolvedValue('PONG');
      this.subscribe = jest.fn().mockResolvedValue();
      this.unsubscribe = jest.fn().mockResolvedValue();
      this.publish = jest.fn().mockResolvedValue(0);
      this.hincrbyfloat = jest.fn().mockResolvedValue(1);
      this.hincrby = jest.fn().mockResolvedValue(1);
      this.expire = jest.fn().mockResolvedValue(1);
      this.hvals = jest.fn().mockResolvedValue([]);
      this.hgetall = jest.fn().mockResolvedValue({});
      this.hget = jest.fn().mockResolvedValue(null);
      this.setex = jest.fn().mockResolvedValue('OK');
      this.lpush = jest.fn().mockResolvedValue(1);
      this.ltrim = jest.fn().mockResolvedValue('OK');
      this.lrange = jest.fn().mockResolvedValue([]);
    }
  }
  return MockRedis;
});

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(),
    getJobs: jest.fn().mockResolvedValue([]),
    remove: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    off: jest.fn()
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    off: jest.fn()
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

// 测试完成后清理临时数据库
process.on('exit', () => {
  try {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  } catch (e) {
    // 忽略清理错误
  }
});

console.log(`🧪 测试环境已配置：TEST_MODE=true, DATABASE_PATH=${tempDbPath}, QUEUE_PROVIDER=memory`);
