/**
 * Textbook Parser Routes
 * ISSUE-P1-002: 课本解析功能
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const TextbookParserWorker = require('../modules/textbook-parser/TextbookParserWorker');
const TextbookModel = require('../modules/textbook-parser/TextbookModel');
const { textbookParseLimiter } = require('../modules');

// 配置 multer 处理文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/textbooks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'textbook-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF 格式文件'), false);
    }
  }
});

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 上传课本 PDF
 * POST /api/textbooks/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传文件'
      });
    }

    const { title } = req.body;
    const filePath = req.file.path;
    const fileUrl = `/uploads/textbooks/${path.basename(filePath)}`;

    // 创建课本记录
    const textbook = await TextbookModel.create({
      user_id: req.user.id,
      title: title || req.file.originalname.replace('.pdf', ''),
      file_path: filePath,
      file_url: fileUrl,
      file_size: req.file.size,
      status: 'pending'
    });

    // 异步启动解析任务
    TextbookParserWorker.addTask({
      userId: req.user.id,
      filePath,
      textbookId: textbook.id
    }).catch(err => console.error('解析任务启动失败:', err));

    res.json({
      success: true,
      message: '上传成功',
      data: textbook
    });
  } catch (error) {
    console.error('上传课本错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '上传失败'
    });
  }
});

/**
 * 上传并解析课本（旧接口，保留兼容）
 * POST /api/textbooks/parse
 */
router.post('/parse', textbookParseLimiter, async (req, res) => {
  try {
    const { filePath, grade, subject } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: '文件路径不能为空'
      });
    }

    const taskId = await TextbookParserWorker.addTask({
      userId: req.user.id,
      filePath,
      grade,
      subject
    });

    res.json({
      success: true,
      message: '解析任务已创建',
      data: {
        taskId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('创建解析任务错误:', error);
    res.status(500).json({
      success: false,
      error: '创建任务失败'
    });
  }
});

/**
 * 获取解析任务状态
 * GET /api/textbooks/tasks/:taskId
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await TextbookParserWorker.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    if (task.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权访问'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取任务状态错误:', error);
    res.status(500).json({
      success: false,
      error: '获取状态失败'
    });
  }
});

/**
 * 获取用户的任务列表
 * GET /api/textbooks/tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    
    const tasks = await TextbookParserWorker.getUserTasks(req.user.id, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status
    });

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取任务列表失败'
    });
  }
});

/**
 * 获取课本文本列表
 * GET /api/textbooks
 */
router.get('/', async (req, res) => {
  try {
    const textbooks = await TextbookModel.getByUserId(req.user.id);

    res.json({
      success: true,
      data: textbooks || []
    });
  } catch (error) {
    console.error('获取课本文本错误:', error);
    res.status(500).json({
      success: false,
      error: '获取课本失败'
    });
  }
});

/**
 * 获取课本单元列表
 * GET /api/textbooks/:id/units
 */
router.get('/:id/units', async (req, res) => {
  try {
    const { id } = req.params;
    const textbook = await TextbookModel.getById(id);

    if (!textbook) {
      return res.status(404).json({
        success: false,
        error: '课本不存在'
      });
    }

    if (textbook.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权访问'
      });
    }

    // 获取单元数据（从解析结果中获取）
    const units = textbook.units || [];

    res.json({
      success: true,
      data: units
    });
  } catch (error) {
    console.error('获取单元列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取单元失败'
    });
  }
});

/**
 * 删除课本
 * DELETE /api/textbooks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const textbook = await TextbookModel.getById(id);

    if (!textbook) {
      return res.status(404).json({
        success: false,
        error: '课本不存在'
      });
    }

    if (textbook.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权访问'
      });
    }

    // 删除文件
    if (textbook.file_path && fs.existsSync(textbook.file_path)) {
      fs.unlinkSync(textbook.file_path);
    }

    // 删除记录
    await TextbookModel.delete(id);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除课本错误:', error);
    res.status(500).json({
      success: false,
      error: '删除失败'
    });
  }
});

/**
 * 获取单个课本文本详情
 * GET /api/textbooks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const textbook = TextbookModel.getById(id);

    if (!textbook) {
      return res.status(404).json({
        success: false,
        error: '课本文本不存在'
      });
    }

    if (textbook.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '无权访问'
      });
    }

    res.json({
      success: true,
      data: textbook
    });
  } catch (error) {
    console.error('获取课本详情错误:', error);
    res.status(500).json({
      success: false,
      error: '获取课本失败'
    });
  }
});

module.exports = router;
