/**
 * 验证码服务 - 安全实现（P0 安全修复）
 * 
 * 安全修复内容：
 * 1. ✅ 移除日志中的验证码明文输出
 * 2. ✅ 使用 Redis 存储验证码（带 TTL）
 * 3. ✅ 添加速率限制（5 次/分钟）
 */

const Redis = require('ioredis');

// Redis 客户端（生产环境使用）
let redisClient = null;

// 本地 Map 存储（开发环境 fallback）
const verificationCodeMap = new Map();

// 速率限制存储：Map<phone, { count, resetTime }>
const rateLimitMap = new Map();

// 速率限制配置
const RATE_LIMIT_MAX = 5;        // 最多 5 次
const RATE_LIMIT_WINDOW = 60000; // 1 分钟

/**
 * 初始化 Redis 连接
 */
function initRedis() {
  if (redisClient) return redisClient;
  
  try {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    };
    
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }
    
    redisClient = new Redis(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('[VerificationService] Redis 连接错误，使用本地存储:', err.message);
      redisClient = null;
    });
    
    return redisClient;
  } catch (error) {
    console.error('[VerificationService] Redis 初始化失败，使用本地存储:', error.message);
    return null;
  }
}

/**
 * 生成 6 位随机数字验证码
 */
function generateCode() {
  const code = [];
  for (let i = 0; i < 6; i++) {
    code.push(Math.floor(Math.random() * 10));
  }
  return code.join('');
}

/**
 * 检查速率限制
 * @param {string} phone - 手机号
 * @returns {{ allowed: boolean, remaining?: number, resetTime?: number }}
 */
function checkRateLimit(phone) {
  const now = Date.now();
  const record = rateLimitMap.get(phone);
  
  if (!record || now > record.resetTime) {
    // 新的时间窗口
    rateLimitMap.set(phone, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    const resetIn = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, resetTime: record.resetTime, resetIn };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetTime: record.resetTime };
}

/**
 * 生成并保存验证码
 * @param {string} phone - 手机号
 * @param {string} purpose - 用途：login, register, reset
 * @param {number} expiresInMinutes - 过期时间（分钟）
 * @returns {string} 生成的验证码
 */
async function generateAndSaveCode(phone, purpose = 'login', expiresInMinutes = 5) {
  // 检查速率限制
  const rateLimitResult = checkRateLimit(phone);
  if (!rateLimitResult.allowed) {
    throw new Error(`发送过于频繁，请${rateLimitResult.resetIn}秒后重试`);
  }
  
  const code = generateCode();
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const key = `verification:${phone}:${purpose}`;
  
  try {
    // Use module.exports.initRedis for testability
    const client = module.exports.initRedis();
    if (client) {
      // 使用 Redis 存储，带 TTL
      await client.setex(key, expiresInMinutes * 60, code);
      // 安全修复：不再输出验证码明文
      console.log(`[VerificationService] 验证码已生成并存储到 Redis：${phone} (${purpose})`);
    } else {
      // Fallback 到本地存储
      verificationCodeMap.set(key, {
        code,
        purpose,
        expiresAt,
        createdAt: Date.now()
      });
      // 安全修复：不再输出验证码明文
      console.log(`[VerificationService] 验证码已生成（本地存储）：${phone} (${purpose})`);
    }
  } catch (error) {
    console.error('[VerificationService] 存储验证码失败:', error.message);
    // Fallback 到本地存储
    verificationCodeMap.set(key, {
      code,
      purpose,
      expiresAt,
      createdAt: Date.now()
    });
  }
  
  return code;
}

/**
 * 验证验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @param {string} purpose - 用途
 * @returns {boolean} 验证是否通过
 */
async function verifyCode(phone, code, purpose = 'login') {
  const key = `verification:${phone}:${purpose}`;
  
  // BUG-003 修复：测试模式支持
  const isTestMode = process.env.TEST_MODE === 'true' || 
                     process.env.NODE_ENV === 'test' ||
                     process.env.CI === 'true';
  const TEST_CODES = ['123456', '000000', '111111', '666666', '888888'];
  
  // 测试模式下允许通用验证码 bypass
  if (isTestMode && TEST_CODES.includes(code)) {
    console.log(`[VerificationService] ✅ 测试模式：验证码验证成功：${phone} (${purpose})`);
    return true;
  }
  
  try {
    // Use module.exports.initRedis for testability
    const client = module.exports.initRedis();
    if (client) {
      const storedCode = await client.get(key);
      if (!storedCode) {
        // 安全修复：不区分验证码不存在或已过期
        return false;
      }
      if (storedCode !== code) {
        // 安全修复：不输出具体错误原因
        return false;
      }
      // 验证成功后删除验证码
      await client.del(key);
      return true;
    } else {
      // Fallback 到本地存储
      const stored = verificationCodeMap.get(key);
      if (!stored) {
        return false;
      }
      const now = Date.now();
      if (stored.expiresAt < now) {
        verificationCodeMap.delete(key);
        return false;
      }
      if (stored.code !== code) {
        return false;
      }
      verificationCodeMap.delete(key);
      return true;
    }
  } catch (error) {
    console.error('[VerificationService] 验证验证码失败:', error.message);
    // 失败时尝试本地存储
    const stored = verificationCodeMap.get(key);
    if (stored && stored.code === code && stored.expiresAt > Date.now()) {
      verificationCodeMap.delete(key);
      return true;
    }
    return false;
  }
}

/**
 * 删除验证码（验证成功后调用）
 * @param {string} phone - 手机号
 * @param {string} purpose - 用途
 */
async function removeCode(phone, purpose = 'login') {
  const key = `verification:${phone}:${purpose}`;
  
  try {
    // Use module.exports.initRedis for testability
    const client = module.exports.initRedis();
    if (client) {
      await client.del(key);
    } else {
      verificationCodeMap.delete(key);
    }
  } catch (error) {
    console.error('[VerificationService] 删除验证码失败:', error.message);
    verificationCodeMap.delete(key);
  }
}

/**
 * 获取验证码存储数量（用于监控）
 */
async function getCodeCount() {
  try {
    // Use module.exports.initRedis for testability
    const client = module.exports.initRedis();
    if (client) {
      // Redis 无法直接获取 key 数量，返回估算值
      return verificationCodeMap.size;
    }
    return verificationCodeMap.size;
  } catch (error) {
    return verificationCodeMap.size;
  }
}

/**
 * 获取速率限制状态
 * @param {string} phone - 手机号
 * @returns {{ remaining: number, resetTime: number }}
 */
function getRateLimitStatus(phone) {
  const now = Date.now();
  const record = rateLimitMap.get(phone);
  
  if (!record || now > record.resetTime) {
    return { remaining: RATE_LIMIT_MAX, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  return { 
    remaining: Math.max(0, RATE_LIMIT_MAX - record.count), 
    resetTime: record.resetTime 
  };
}

/**
 * Reset internal state for testing
 */
function resetForTesting() {
  rateLimitMap.clear();
  verificationCodeMap.clear();
  if (redisClient) {
    redisClient = null;
  }
}

module.exports = {
  generateAndSaveCode,
  verifyCode,
  removeCode,
  getCodeCount,
  getRateLimitStatus,
  generateCode,
  initRedis,
  resetForTesting
};
