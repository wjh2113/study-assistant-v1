const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const verificationService = require('../services/verificationService');

/**
 * 发送验证码
 * 使用安全的随机验证码，不再使用硬编码的 '123456'
 * 修复 BUG-002：支持指定验证码用途（login/register）
 * P0 安全修复：添加速率限制（5 次/分钟）
 */
exports.sendCode = async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.body;

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '手机号格式无效' });
    }

    // 验证用途
    if (!['login', 'register'].includes(purpose)) {
      return res.status(400).json({ error: '验证码用途无效' });
    }

    // 生成安全的随机验证码（包含速率限制检查）
    const code = await verificationService.generateAndSaveCode(phone, purpose, 5);

    // 安全修复：不再输出验证码明文
    // console.log(`📱 发送验证码到 ${phone} (${purpose})`);

    // TODO: 集成短信服务商发送验证码
    // 例如：await smsService.send(phone, code);

    res.json({
      message: '验证码已发送',
      hint: '验证码 5 分钟内有效'
    });
  } catch (error) {
    // 处理速率限制错误
    if (error.message.includes('发送过于频繁')) {
      return res.status(429).json({ 
        error: error.message,
        hint: '为防止滥用，每分钟最多发送 5 次验证码'
      });
    }
    console.error('发送验证码错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 手机号验证码登录
 */
exports.login = (req, res) => {
  try {
    const { phone, code } = req.body;

    // 验证输入
    if (!phone || !code) {
      return res.status(400).json({ error: '手机号和验证码不能为空' });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '手机号格式无效' });
    }

    // 验证验证码（使用安全服务）
    if (!verificationService.verifyCode(phone, code, 'login')) {
      return res.status(401).json({ error: '验证码错误或已过期' });
    }

    // 查找用户
    let user = UserModel.getByPhone(phone);
    
    // 如果用户不存在，自动创建
    if (!user) {
      user = UserModel.create(phone, 'STUDENT');
      // 创建默认学生资料
      UserModel.createStudentProfile(user.id, null, null);
    }

    // 删除已使用的验证码
    verificationService.removeCode(phone, 'login');

    // 生成 token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 获取用户完整信息
    const userWithProfile = UserModel.getUserWithProfile(user.id);

    res.json({
      message: '登录成功',
      user: {
        id: userWithProfile.id,
        role: userWithProfile.role,
        phone: userWithProfile.phone,
        nickname: userWithProfile.nickname,
        avatar_url: userWithProfile.avatar_url,
        profile: userWithProfile.profile
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 刷新 Token
 */
exports.refreshToken = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 生成新 token
    const newToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Token 刷新成功',
      token: newToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token 已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的令牌' });
  }
};

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = (req, res) => {
  try {
    const userWithProfile = UserModel.getUserWithProfile(req.user.id);
    
    res.json({
      user: {
        id: userWithProfile.id,
        role: userWithProfile.role,
        phone: userWithProfile.phone,
        nickname: userWithProfile.nickname,
        avatar_url: userWithProfile.avatar_url,
        profile: userWithProfile.profile,
        created_at: userWithProfile.created_at,
        updated_at: userWithProfile.updated_at
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 更新用户信息
 */
exports.updateUser = (req, res) => {
  try {
    const { nickname, avatar_url } = req.body;
    const user = UserModel.update(req.user.id, { nickname, avatar_url });
    
    res.json({
      message: '更新成功',
      user: {
        id: user.id,
        role: user.role,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

/**
 * 注册（安全修复：移除 role 参数，默认所有新用户为 student 角色）
 * ADMIN/TEACHER 角色只能通过后台创建
 */
exports.register = (req, res) => {
  try {
    const { phone, code, nickname, grade, school_name, real_name } = req.body;

    // 验证输入
    if (!phone || !code) {
      return res.status(400).json({ error: '手机号和验证码不能为空' });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '手机号格式无效' });
    }

    // 验证验证码（使用安全服务）
    if (!verificationService.verifyCode(phone, code, 'register')) {
      return res.status(401).json({ error: '验证码错误或已过期' });
    }

    // 检查用户是否已存在
    const existingUser = UserModel.getByPhone(phone);
    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }

    // 安全修复：默认所有新用户为 STUDENT 角色
    // ADMIN/TEACHER 角色只能通过后台创建，防止注册时权限提升
    const defaultRole = 'STUDENT';
    const user = UserModel.create(phone, defaultRole, nickname);

    // 创建默认学生资料
    UserModel.createStudentProfile(user.id, grade, school_name);

    // 删除已使用的验证码
    verificationService.removeCode(phone, 'register');

    // 生成 token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 获取用户完整信息
    const userWithProfile = UserModel.getUserWithProfile(user.id);

    res.status(201).json({
      message: '注册成功',
      user: {
        id: userWithProfile.id,
        role: userWithProfile.role,
        phone: userWithProfile.phone,
        nickname: userWithProfile.nickname,
        avatar_url: userWithProfile.avatar_url,
        profile: userWithProfile.profile
      },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
