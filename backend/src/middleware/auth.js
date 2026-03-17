const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

/**
 * JWT 验证中间件
 * 统一 JWT token 解析逻辑，确保 req.user.sub 和 req.user.userId 一致
 */
const authMiddleware = (req, res, next) => {
  try {
    // 从 Authorization header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权，请登录后重试' });
    }

    // 处理多个空格的情况，提取 token 并去除首尾空格
    const token = authHeader.split(' ')[1]?.trim();
    
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 统一 JWT 字段：支持 sub 和 userId，优先使用 sub（JWT 标准字段）
    // 确保 req.user.sub 和 req.user.userId 指向同一个用户 ID
    const userId = decoded.sub || decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ error: '无效的令牌：缺少用户标识' });
    }
    
    // 获取用户信息
    const user = UserModel.getById(userId);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 将用户信息附加到 request，统一字段
    req.user = user;
    req.user.sub = userId;      // JWT 标准字段
    req.user.userId = userId;   // 兼容旧代码
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的令牌' });
  }
};

module.exports = authMiddleware;
