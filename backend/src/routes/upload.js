/**
 * 文件上传路由
 * 使用本地文件存储（不使用 OSS）
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { addTextbookParseJob } = require('../config/queue');

const prisma = new PrismaClient();

// 获取上传目录配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 确保上传目录存在
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 配置 multer 存储
const createStorage = (subDir) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../', UPLOAD_DIR, subDir);
      ensureDirExists(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const safeName = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      cb(null, `${uniqueSuffix}-${safeName}${ext}`);
    },
  });
};

// 文件过滤
const createFileFilter = (allowedMimeTypes) => {
  return (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型：${file.mimetype}`), false);
    }
  };
};

// 创建不同用途的上传中间件
const uploadTextbook = multer({
  storage: createStorage('textbooks'),
  fileFilter: createFileFilter(['application/pdf']),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter: createFileFilter(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadAttachment = multer({
  storage: createStorage('attachments'),
  fileFilter: createFileFilter(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/**
 * 生成文件访问 URL
 */
const getFileUrl = (subDir, filename) => {
  return `${BASE_URL}/uploads/${subDir}/${filename}`;
};

/**
 * 上传课本 PDF
 * POST /api/upload/textbook
 * 
 * 请求参数：
 * - file: PDF 文件（multipart/form-data）
 * - title: 课本标题
 * - subject: 科目
 * - grade: 年级
 * - version: 版本（可选）
 */
router.post('/textbook', uploadTextbook.single('file'), async (req, res) => {
  const { title, subject, grade, version } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: '请上传 PDF 文件' });
  }
  
  if (!title || !subject || !grade) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  try {
    // 1. 创建课本记录
    const textbook = await prisma.textbook.create({
      data: {
        title,
        subject,
        grade: parseInt(grade),
        version: version || null,
        parse_status: 'pending',
      },
    });
    
    console.log(`📚 创建课本记录：${textbook.id}`);
    
    // 2. 生成文件访问 URL
    const fileUrl = getFileUrl('textbooks', req.file.filename);
    
    // 3. 更新课本记录（添加本地文件 URL）
    await prisma.textbook.update({
      where: { id: textbook.id },
      data: {
        parse_result: {
          local_url: fileUrl,
          local_path: req.file.path,
          file_size: req.file.size,
          original_name: req.file.originalname,
        },
      },
    });
    
    // 4. 加入解析队列
    await addTextbookParseJob({
      textbookId: textbook.id,
      filePath: req.file.path,
    });
    
    res.json({
      success: true,
      textbook: {
        id: textbook.id,
        title: textbook.title,
        subject: textbook.subject,
        grade: textbook.grade,
        parse_status: textbook.parse_status,
        file_url: fileUrl,
        file_size: req.file.size,
      },
    });
    
  } catch (error) {
    console.error('❌ 上传失败:', error);
    
    // 清理上传的文件
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (e) {
        // 忽略清理错误
      }
    }
    
    res.status(500).json({
      error: '上传失败',
      message: error.message,
    });
  }
});

/**
 * 上传头像
 * POST /api/upload/avatar
 * 
 * 请求参数：
 * - file: 图片文件（multipart/form-data）
 * - userId: 用户 ID
 */
router.post('/avatar', uploadAvatar.single('file'), async (req, res) => {
  const { userId } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: '请上传图片文件' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: '缺少用户 ID' });
  }
  
  try {
    const fileUrl = getFileUrl('avatars', req.file.filename);
    
    // 更新用户头像
    await prisma.user.update({
      where: { id: userId },
      data: { avatar_url: fileUrl },
    });
    
    res.json({
      success: true,
      avatar_url: fileUrl,
      file_size: req.file.size,
    });
    
  } catch (error) {
    console.error('❌ 头像上传失败:', error);
    
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (e) {}
    }
    
    res.status(500).json({
      error: '上传失败',
      message: error.message,
    });
  }
});

/**
 * 上传附件
 * POST /api/upload/attachment
 * 
 * 请求参数：
 * - file: 附件文件（multipart/form-data）
 * - entityType: 实体类型（如：knowledge, question 等）
 * - entityId: 实体 ID
 */
router.post('/attachment', uploadAttachment.single('file'), async (req, res) => {
  const { entityType, entityId } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }
  
  if (!entityType || !entityId) {
    return res.status(400).json({ error: '缺少实体类型或 ID' });
  }
  
  try {
    const fileUrl = getFileUrl('attachments', req.file.filename);
    
    // 创建附件记录
    const attachment = await prisma.attachment.create({
      data: {
        entity_type: entityType,
        entity_id: entityId,
        file_url: fileUrl,
        file_path: req.file.path,
        original_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
    });
    
    res.json({
      success: true,
      attachment: {
        id: attachment.id,
        file_url: fileUrl,
        original_name: attachment.original_name,
        file_size: attachment.file_size,
      },
    });
    
  } catch (error) {
    console.error('❌ 附件上传失败:', error);
    
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (e) {}
    }
    
    res.status(500).json({
      error: '上传失败',
      message: error.message,
    });
  }
});

/**
 * 测试上传功能
 * GET /api/upload/test
 */
router.get('/test', (req, res) => {
  const uploadDir = path.join(__dirname, '../../', UPLOAD_DIR);
  const exists = fs.existsSync(uploadDir);
  
  res.json({
    success: true,
    message: '本地文件存储配置正常',
    upload_dir: uploadDir,
    dir_exists: exists,
    base_url: BASE_URL,
  });
});

// 优雅关闭
process.on('SIGINT', async () => {
  await prisma.$disconnect();
});

module.exports = router;
