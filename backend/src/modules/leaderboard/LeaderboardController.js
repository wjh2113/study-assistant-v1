/**
 * Leaderboard Controller - 排行榜控制器
 * ISSUE-P1-005: 排行榜完善
 */

const LeaderboardModel = require('./LeaderboardModel');
const { getLeaderboardCache } = require('./LeaderboardCache');

const cache = getLeaderboardCache();

class LeaderboardController {
  /**
   * 获取排行榜（带缓存）
   * GET /api/leaderboard/:type
   */
  static async getLeaderboard(req, res) {
    try {
      const { type = 'total', period = 'total', page = 1, pageSize = 20 } = req.query;
      const pageInt = parseInt(page);
      const pageSizeInt = parseInt(pageSize);
      
      // 1. 尝试从缓存获取
      const cached = await cache.get(type, period, pageInt, pageSizeInt);
      if (cached) {
        return res.json({
          success: true,
          data: cached.data,
          pagination: {
            page: pageInt,
            pageSize: pageSizeInt,
            total: cached.total,
            totalPages: Math.ceil(cached.total / pageSizeInt)
          },
          cached: true,
          calculatedAt: cached.calculatedAt
        });
      }
      
      // 2. 从数据库获取
      const result = LeaderboardModel.getPaginated(
        type,
        period,
        pageInt,
        pageSizeInt
      );

      // 3. 写入缓存
      await cache.set(type, period, pageInt, pageSizeInt, {
        data: result.data,
        total: result.total,
        calculatedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: pageInt,
          pageSize: pageSizeInt,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSizeInt)
        },
        cached: false
      });
    } catch (error) {
      console.error('获取排行榜错误:', error);
      res.status(500).json({
        success: false,
        error: '获取排行榜失败'
      });
    }
  }

  /**
   * 获取我的排名（带缓存）
   * GET /api/leaderboard/me/rank
   */
  static async getMyRank(req, res) {
    try {
      const { type = 'total' } = req.query;
      const userId = req.user.id;
      
      // 1. 尝试从缓存获取
      const cached = await cache.getUserRank(userId, type);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true
        });
      }
      
      // 2. 从数据库获取
      const ranking = LeaderboardModel.getUserRanking(userId, type);

      if (!ranking) {
        return res.json({
          success: true,
          data: {
            rank: null,
            score: 0,
            message: '暂无排名'
          },
          cached: false
        });
      }

      // 3. 写入缓存
      await cache.setUserRank(userId, type, ranking);

      res.json({
        success: true,
        data: ranking,
        cached: false
      });
    } catch (error) {
      console.error('获取我的排名错误:', error);
      res.status(500).json({
        success: false,
        error: '获取排名失败'
      });
    }
  }

  /**
   * 获取排行榜快照历史
   * GET /api/leaderboard/history
   */
  static async getHistory(req, res) {
    try {
      const { type = 'total', period = 'total', limit = 10 } = req.query;
      
      const history = LeaderboardModel.getHistory(type, period, parseInt(limit));

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('获取排行榜历史错误:', error);
      res.status(500).json({
        success: false,
        error: '获取历史失败'
      });
    }
  }

  /**
   * 手动刷新排行榜（管理员用）
   * POST /api/leaderboard/refresh
   */
  static async refreshLeaderboard(req, res) {
    try {
      const { type = 'all', period = 'total' } = req.body;

      const types = type === 'all' ? ['total', 'weekly', 'monthly'] : [type];
      const results = {};

      for (const t of types) {
        let data;
        switch (t) {
          case 'weekly':
            data = LeaderboardModel.calculateWeeklyRanking();
            break;
          case 'monthly':
            data = LeaderboardModel.calculateMonthlyRanking();
            break;
          default:
            data = LeaderboardModel.calculateTotalRanking();
        }

        LeaderboardModel.createSnapshot(t, period, data);
        
        // 更新缓存
        await cache.set(t, period, 1, 100, {
          data,
          total: data.length,
          calculatedAt: new Date().toISOString()
        });
        
        results[t] = data.length;
      }

      // 清除所有分页缓存
      await cache.invalidate(type === 'all' ? '*' : type, period);

      res.json({
        success: true,
        message: '排行榜刷新成功',
        data: results,
        cacheInvalidated: true
      });
    } catch (error) {
      console.error('刷新排行榜错误:', error);
      res.status(500).json({
        success: false,
        error: '刷新排行榜失败'
      });
    }
  }
}

module.exports = LeaderboardController;
