/**
 * 健康检查控制器
 * 提供系统健康状态接口
 */

const { db } = require('../config/database');

/**
 * GET /api/health
 * 返回系统健康状态
 */
exports.getHealth = (req, res) => {
  try {
    // 检查数据库连接
    let databaseStatus = 'connected';
    try {
      db.prepare('SELECT 1').get();
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: databaseStatus,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      }
    });
  } catch (error) {
    console.error('健康检查错误:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};
