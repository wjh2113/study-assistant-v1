/**
 * Rate Limiter Configuration - 速率限制配置
 * ISSUE-P1-007: 速率限制
 * 修复 BUG-004：使用 ipKeyGenerator 处理 IPv6 地址
 */

const rateLimit = require('express-rate-limit');

// IPv6 兼容的 IP 提取函数 - 修复 BUG-004
function getIpKey(req) {
  // 使用 express-rate-limit 内置的 ipKeyGenerator 处理 IPv6
  // 或者手动处理：将 IPv6 映射地址转换为 IPv4
  const ip = req.ip;
  if (!ip) return 'unknown';
  
  // 处理 IPv6 映射的 IPv4 地址 (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  // 本地 IPv6 地址统一处理
  if (ip === '::1' || ip === 'localhost') {
    return '127.0.0.1';
  }
  
  return ip;
}

// 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 优先使用用户 ID，其次使用 IP（IPv6 兼容）
    return req.user?.id?.toString() || getIpKey(req);
  }
});

// 敏感接口速率限制（如发送验证码）
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 5, // 每分钟最多 5 次
  message: {
    success: false,
    error: '操作过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id?.toString() || getIpKey(req);
  }
});

// 验证码接口速率限制（最严格）
const sendCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 3, // 每小时最多 3 次
  message: {
    success: false,
    error: '验证码发送过于频繁，请 1 小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 使用手机号作为 key
    return req.body?.phone || getIpKey(req);
  }
});

// AI 出题接口速率限制
const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 20, // 每小时最多 20 次
  message: {
    success: false,
    error: '题目生成次数已达上限，请 1 小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id?.toString() || getIpKey(req);
  }
});

// 课本解析接口速率限制
const textbookParseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 每小时最多 10 次
  message: {
    success: false,
    error: '课本解析次数已达上限，请 1 小时后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id?.toString() || getIpKey(req);
  }
});

module.exports = {
  globalLimiter,
  strictLimiter,
  sendCodeLimiter,
  aiGenerateLimiter,
  textbookParseLimiter
};
