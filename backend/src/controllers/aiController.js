const axios = require('axios');
const AIQARecordModel = require('../models/AIQARecord');

// AI 答疑
exports.ask = async (req, res) => {
  try {
    const { question, knowledgePointId } = req.body;

    if (!question) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    // 调用阿里云 DashScope API
    let answer;
    try {
      const response = await axios.post(
        process.env.AI_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: process.env.AI_MODEL || 'qwen-plus',
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一个学习助手，负责解答用户的学习问题。请用清晰、易懂的方式回答。'
              },
              {
                role: 'user',
                content: question
              }
            ]
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AI_API_KEY}`
          }
        }
      );
      // 阿里云 DashScope 响应格式
      answer = response.data.output?.text || response.data.output?.choices?.[0]?.message?.content || '抱歉，暂时无法回答您的问题。';
    } catch (apiError) {
      console.error('AI API 调用失败:', apiError.message);
      answer = 'AI 服务暂时不可用，请稍后重试。';
    }

    // 保存问答记录
    const record = AIQARecordModel.create(
      req.user.id,
      question,
      answer,
      knowledgePointId
    );

    res.json({
      message: '答疑成功',
      data: {
        question,
        answer,
        createdAt: record.created_at
      }
    });
  } catch (error) {
    console.error('AI 答疑错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取问答历史
exports.getHistory = (req, res) => {
  try {
    const { limit, offset } = req.query;
    const records = AIQARecordModel.getByUserId(
      req.user.id,
      parseInt(limit) || 50,
      parseInt(offset) || 0
    );

    res.json({
      data: records,
      total: records.length
    });
  } catch (error) {
    console.error('获取问答历史错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 搜索问答记录
exports.search = (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }

    const records = AIQARecordModel.search(req.user.id, keyword);
    res.json({ data: records, total: records.length });
  } catch (error) {
    console.error('搜索问答记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 删除问答记录
exports.delete = (req, res) => {
  try {
    const { id } = req.params;
    const existing = AIQARecordModel.getById(id);

    if (!existing) {
      return res.status(404).json({ error: '记录不存在' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: '无权访问' });
    }

    AIQARecordModel.delete(id, req.user.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除问答记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
