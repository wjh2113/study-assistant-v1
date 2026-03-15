const KnowledgePointModel = require('../models/KnowledgePoint');

// HTML 转义函数（XSS 防护）
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 创建知识点
exports.create = (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: '知识点标题不能为空' });
    }

    // XSS 防护：转义 HTML 字符
    const safeTitle = escapeHtml(title);
    const safeContent = content ? escapeHtml(content) : null;
    const safeCategory = category ? escapeHtml(category) : null;
    const safeTags = tags ? tags.map(t => escapeHtml(t)) : null;

    const point = KnowledgePointModel.create(
      req.user.id,
      safeTitle,
      safeContent,
      safeCategory,
      safeTags
    );

    res.status(201).json({
      message: '创建成功',
      data: point
    });
  } catch (error) {
    console.error('创建知识点错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取知识点列表
exports.getList = (req, res) => {
  try {
    const { category, status, limit, offset } = req.query;
    const points = KnowledgePointModel.getByUserId(req.user.id, {
      category,
      status,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });

    res.json({
      data: points,
      total: points.length
    });
  } catch (error) {
    console.error('获取知识点列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取单个知识点
exports.getOne = (req, res) => {
  try {
    const { id } = req.params;
    const point = KnowledgePointModel.getById(id);

    if (!point) {
      return res.status(404).json({ error: '知识点不存在' });
    }

    // 验证所有权
    if (point.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问' });
    }

    res.json({ data: point });
  } catch (error) {
    console.error('获取知识点错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 更新知识点
exports.update = (req, res) => {
  try {
    const { id } = req.params;

    const existing = KnowledgePointModel.getById(id);
    if (!existing) {
      return res.status(404).json({ error: '知识点不存在' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问' });
    }

    // XSS 防护：转义 HTML 字符，只传递 req.body 中实际存在的字段
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = escapeHtml(req.body.title);
    if (req.body.content !== undefined) updateData.content = escapeHtml(req.body.content);
    if (req.body.category !== undefined) updateData.category = escapeHtml(req.body.category);
    if (req.body.tags !== undefined) updateData.tags = req.body.tags.map(t => escapeHtml(t));
    if (req.body.status !== undefined) updateData.status = req.body.status;

    res.json({
      message: '更新成功',
      data: point
    });
  } catch (error) {
    console.error('更新知识点错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 删除知识点
exports.delete = (req, res) => {
  try {
    const { id } = req.params;
    const existing = KnowledgePointModel.getById(id);

    if (!existing) {
      return res.status(404).json({ error: '知识点不存在' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问' });
    }

    KnowledgePointModel.delete(id, req.user.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除知识点错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 搜索知识点
exports.search = (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    const points = KnowledgePointModel.search(req.user.id, keyword);
    res.json({ data: points, total: points.length });
  } catch (error) {
    console.error('搜索知识点错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
