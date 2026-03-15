/**
 * Winston Logger Service - 日志服务
 * ISSUE-P1-008: 日志系统
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建 logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'studyass-backend' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 警告日志
    new winston.transports.File({
      filename: path.join(logDir, 'warn.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 5
    }),
    // 所有日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// 开发环境下输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * 审计日志类 - 记录关键操作
 */
class AuditLogger {
  static log(action, userId, details = {}) {
    logger.info('AUDIT', {
      type: 'audit',
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  static login(userId, phone, success, ip) {
    this.log('USER_LOGIN', userId, { phone, success, ip });
  }

  static questionGenerated(userId, count, model) {
    this.log('QUESTION_GENERATED', userId, { count, model });
  }

  static textbookParsed(userId, pageCount, duration) {
    this.log('TEXTBOOK_PARSED', userId, { pageCount, duration });
  }

  static pointsAwarded(userId, points, source) {
    this.log('POINTS_AWARDED', userId, { points, source });
  }

  static weaknessAnalyzed(userId, weakCount) {
    this.log('WEAKNESS_ANALYZED', userId, { weakCount });
  }
}

/**
 * 请求日志中间件
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP_REQUEST', {
      type: 'request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('user-agent')
    });
  });

  next();
}

/**
 * 错误日志中间件
 */
function errorLogger(err, req, res, next) {
  logger.error('ERROR', {
    type: 'error',
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    body: req.body
  });

  next(err);
}

module.exports = {
  logger,
  AuditLogger,
  requestLogger,
  errorLogger
};
