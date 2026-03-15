/**
 * Leaderboard Cache - 排行榜 Redis 缓存
 * ISSUE-P1-005: 排行榜完善 - Redis 缓存优化
 */

const Redis = require('ioredis');

class LeaderboardCache {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryDelayOnFailures: 100,
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis 连接错误:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis 排行榜缓存已连接');
    });

    // 缓存过期时间（秒）
    this.CACHE_TTL = {
      total: 300,      // 总榜 5 分钟
      weekly: 60,      // 周榜 1 分钟
      monthly: 120,    // 月榜 2 分钟
      subject: 180,    // 科目榜 3 分钟
      user_rank: 60    // 用户排名 1 分钟
    };
  }

  /**
   * 生成缓存键
   */
  getKey(type, period = 'total', page = 1, pageSize = 20) {
    return `leaderboard:${type}:${period}:${page}:${pageSize}`;
  }

  /**
   * 获取用户排名缓存键
   */
  getUserRankKey(userId, type) {
    return `leaderboard:user_rank:${userId}:${type}`;
  }

  /**
   * 从缓存获取排行榜
   */
  async get(type, period = 'total', page = 1, pageSize = 20) {
    try {
      const key = this.getKey(type, period, page, pageSize);
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📦 [Cache HIT] ${key}`);
        return JSON.parse(cached);
      }
      
      console.log(`📦 [Cache MISS] ${key}`);
      return null;
    } catch (error) {
      console.error('获取排行榜缓存失败:', error.message);
      return null;
    }
  }

  /**
   * 设置排行榜缓存
   */
  async set(type, period, page, pageSize, data) {
    try {
      const key = this.getKey(type, period, page, pageSize);
      const ttl = this.CACHE_TTL[type] || this.CACHE_TTL.total;
      
      await this.redis.setex(key, ttl, JSON.stringify(data));
      console.log(`💾 [Cache SET] ${key} (TTL: ${ttl}s)`);
      
      return true;
    } catch (error) {
      console.error('设置排行榜缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 获取用户排名缓存
   */
  async getUserRank(userId, type) {
    try {
      const key = this.getUserRankKey(userId, type);
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`📦 [Cache HIT] ${key}`);
        return JSON.parse(cached);
      }
      
      console.log(`📦 [Cache MISS] ${key}`);
      return null;
    } catch (error) {
      console.error('获取用户排名缓存失败:', error.message);
      return null;
    }
  }

  /**
   * 设置用户排名缓存
   */
  async setUserRank(userId, type, data) {
    try {
      const key = this.getUserRankKey(userId, type);
      const ttl = this.CACHE_TTL.user_rank;
      
      await this.redis.setex(key, ttl, JSON.stringify(data));
      console.log(`💾 [Cache SET] ${key} (TTL: ${ttl}s)`);
      
      return true;
    } catch (error) {
      console.error('设置用户排名缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 清除排行榜缓存
   */
  async invalidate(type, period = 'total') {
    try {
      const pattern = `leaderboard:${type}:${period}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ [Cache INVALIDATED] ${keys.length} keys for ${type}:${period}`);
      }
      
      return keys.length;
    } catch (error) {
      console.error('清除排行榜缓存失败:', error.message);
      return 0;
    }
  }

  /**
   * 清除所有排行榜缓存
   */
  async invalidateAll() {
    try {
      const keys = await this.redis.keys('leaderboard:*');
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ [Cache INVALIDATED ALL] ${keys.length} keys`);
      }
      
      return keys.length;
    } catch (error) {
      console.error('清除所有排行榜缓存失败:', error.message);
      return 0;
    }
  }

  /**
   * 使用 Redis ZSET 实现实时排行榜（可选）
   */
  async updateRealtimeRanking(userId, score) {
    try {
      await this.redis.zadd('leaderboard:realtime', score, userId);
      return true;
    } catch (error) {
      console.error('更新实时排行榜失败:', error.message);
      return false;
    }
  }

  /**
   * 获取实时排行榜前 N 名
   */
  async getRealtimeTopN(limit = 20) {
    try {
      const results = await this.redis.zrevrange('leaderboard:realtime', 0, limit - 1, 'WITHSCORES');
      
      const ranking = [];
      for (let i = 0; i < results.length; i += 2) {
        ranking.push({
          user_id: results[i],
          score: parseInt(results[i + 1]),
          rank: i / 2 + 1
        });
      }
      
      return ranking;
    } catch (error) {
      console.error('获取实时排行榜失败:', error.message);
      return [];
    }
  }

  /**
   * 获取用户实时排名
   */
  async getRealtimeUserRank(userId) {
    try {
      const rank = await this.redis.zrevrank('leaderboard:realtime', userId);
      const score = await this.redis.zscore('leaderboard:realtime', userId);
      
      if (rank === null) {
        return null;
      }
      
      return {
        user_id: userId,
        score: parseInt(score),
        rank: rank + 1
      };
    } catch (error) {
      console.error('获取用户实时排名失败:', error.message);
      return null;
    }
  }

  /**
   * 关闭 Redis 连接
   */
  async close() {
    await this.redis.quit();
    console.log('👋 Redis 连接已关闭');
  }
}

// 单例模式
let instance = null;

function getLeaderboardCache() {
  if (!instance) {
    instance = new LeaderboardCache();
  }
  return instance;
}

module.exports = {
  LeaderboardCache,
  getLeaderboardCache
};
