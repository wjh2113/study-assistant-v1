const LearningProgressModel = require('../models/LearningProgress');

// 创建或更新学习进度
exports.upsert = (req, res) => {
  try {
    const { knowledgePointId, studyDuration, completionRate } = req.body;

    if (!knowledgePointId) {
      return res.status(400).json({ error: '知识点 ID 不能为空' });
    }

    const progress = LearningProgressModel.upsert(req.user.id, knowledgePointId, {
      studyDuration,
      completionRate
    });

    res.json({
      message: '更新成功',
      data: progress
    });
  } catch (error) {
    console.error('更新学习进度错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取学习进度列表
exports.getList = (req, res) => {
  try {
    const progress = LearningProgressModel.getByUserId(req.user.id);
    res.json({ data: progress });
  } catch (error) {
    console.error('获取学习进度错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取学习统计
exports.getStats = (req, res) => {
  try {
    const stats = LearningProgressModel.getStats(req.user.id);
    res.json({
      data: {
        totalPoints: stats.totalPoints || 0,
        totalDuration: stats.totalDuration || 0,
        avgCompletionRate: stats.avgCompletionRate || 0,
        completedPoints: stats.completedPoints || 0
      }
    });
  } catch (error) {
    console.error('获取学习统计错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 记录学习时长
exports.logStudyTime = (req, res) => {
  try {
    const { knowledgePointId, duration } = req.body;

    if (!knowledgePointId || !duration) {
      return res.status(400).json({ error: '知识点 ID 和学习时长不能为空' });
    }

    const progress = LearningProgressModel.upsert(req.user.id, knowledgePointId, {
      studyDuration: duration,
      completionRate: 0
    });

    res.json({
      message: '学习时长记录成功',
      data: progress
    });
  } catch (error) {
    console.error('记录学习时长错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};
