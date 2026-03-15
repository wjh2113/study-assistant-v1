/**
 * Textbook Parser Routes
 * ISSUE-P1-002: 课本解析功能
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const TextbookParserWorker = require('../modules/textbook-parser/TextbookParserWorker');
const TextbookModel = require('../modules/textbook-parser/TextbookModel');
const { textbookParseLimiter } = require('../modules');

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 上传并解析课本
 * POST /api/textbooks/parse
 */
router.post('/parse', textbookParseLimiter, async (req, res) => {
  try {
    // 注意：实际使用需要配合 multer 处理文件上传
    // 这里假设文件已保存到临时目录
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
    const { page = 1, pageSize = 20, status } = req.query;
    
    const textbooks = TextbookModel.getByUserId(req.user.id, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status
    });

    res.json({
      success: true,
      data: textbooks,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
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
