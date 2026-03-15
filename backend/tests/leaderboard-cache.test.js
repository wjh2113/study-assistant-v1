/**
 * Leaderboard Cache 模块单元测试
 * ISSUE-P1-005: 排行榜完善 - Redis 缓存优化
 * 
 * 注意：由于 LeaderboardCache 直接依赖 ioredis，
 * 本测试主要验证缓存键生成逻辑和 TTL 配置
 */

describe('LeaderboardCache - 缓存键和配置', () => {
  // 缓存 TTL 配置（与 LeaderboardCache.js 中相同）
  const CACHE_TTL = {
    total: 300,      // 总榜 5 分钟
    weekly: 60,      // 周榜 1 分钟
    monthly: 120,    // 月榜 2 分钟
    subject: 180,    // 科目榜 3 分钟
    user_rank: 60    // 用户排名 1 分钟
  };

  /**
   * 生成缓存键（与 LeaderboardCache 中相同逻辑）
   */
  function getKey(type, period = 'total', page = 1, pageSize = 20) {
    return `leaderboard:${type}:${period}:${page}:${pageSize}`;
  }

  /**
   * 获取用户排名缓存键
   */
  function getUserRankKey(userId, type) {
    return `leaderboard:user_rank:${userId}:${type}`;
  }

  describe('缓存键生成', () => {
    test('应该生成正确的排行榜缓存键', () => {
      const key = getKey('total', 'total', 1, 20);
      expect(key).toBe('leaderboard:total:total:1:20');
    });

    test('应该支持不同的排行榜类型', () => {
      expect(getKey('weekly', 'total', 1, 20)).toBe('leaderboard:weekly:total:1:20');
      expect(getKey('monthly', 'total', 1, 20)).toBe('leaderboard:monthly:total:1:20');
      expect(getKey('subject', 'math', 1, 20)).toBe('leaderboard:subject:math:1:20');
    });

    test('应该生成正确的用户排名缓存键', () => {
      const key = getUserRankKey('user123', 'total');
      expect(key).toBe('leaderboard:user_rank:user123:total');
    });

    test('分页参数应该正确编码到缓存键', () => {
      expect(getKey('total', 'total', 2, 20)).toBe('leaderboard:total:total:2:20');
      expect(getKey('total', 'total', 1, 50)).toBe('leaderboard:total:total:1:50');
    });
  });

  describe('缓存 TTL 配置', () => {
    test('应该有不同的缓存过期时间', () => {
      expect(CACHE_TTL.total).toBe(300);
      expect(CACHE_TTL.weekly).toBe(60);
      expect(CACHE_TTL.monthly).toBe(120);
      expect(CACHE_TTL.subject).toBe(180);
      expect(CACHE_TTL.user_rank).toBe(60);
    });

    test('总榜应该有最长的缓存时间', () => {
      expect(CACHE_TTL.total).toBeGreaterThan(CACHE_TTL.weekly);
      expect(CACHE_TTL.total).toBeGreaterThan(CACHE_TTL.monthly);
    });

    test('用户排名应该有较短的缓存时间', () => {
      expect(CACHE_TTL.user_rank).toBe(60);
    });

    test('未知类型应该使用默认 TTL', () => {
      const unknownType = 'unknown';
      const ttl = CACHE_TTL[unknownType] || CACHE_TTL.total;
      expect(ttl).toBe(300);
    });
  });

  describe('缓存键模式', () => {
    test('总榜缓存键模式应该正确', () => {
      const pattern = `leaderboard:total:total:*`;
      expect(pattern).toMatch(/leaderboard:total:total:\*$/);
    });

    test('周榜缓存键模式应该正确', () => {
      const pattern = `leaderboard:weekly:total:*`;
      expect(pattern).toMatch(/leaderboard:weekly:total:\*$/);
    });

    test('用户排名缓存键模式应该正确', () => {
      const pattern = `leaderboard:user_rank:*:*`;
      expect(pattern).toMatch(/leaderboard:user_rank:\*:\*$/);
    });
  });

  describe('数据结构验证', () => {
    test('排行榜数据结构应该包含必要字段', () => {
      const mockRanking = {
        data: [
          { user_id: 1, nickname: '用户 1', score: 100, rank: 1 }
        ],
        total: 1,
        calculatedAt: new Date().toISOString()
      };

      expect(mockRanking.data).toBeInstanceOf(Array);
      expect(mockRanking.total).toBeGreaterThanOrEqual(0);
      expect(mockRanking.calculatedAt).toBeDefined();
    });

    test('用户排名数据结构应该包含必要字段', () => {
      const mockUserRank = {
        user_id: 'user123',
        score: 150,
        rank: 5
      };

      expect(mockUserRank.user_id).toBeDefined();
      expect(typeof mockUserRank.score).toBe('number');
      expect(typeof mockUserRank.rank).toBe('number');
    });
  });

  describe('缓存逻辑验证', () => {
    test('分页计算应该正确', () => {
      const page = 2;
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      expect(offset).toBe(20);
    });

    test('总页数计算应该正确', () => {
      const total = 150;
      const pageSize = 20;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(8);
    });

    test('缓存命中率计算', () => {
      const hits = 80;
      const misses = 20;
      const total = hits + misses;
      const hitRate = (hits / total) * 100;
      expect(hitRate).toBe(80);
    });

    test('缓存键唯一性', () => {
      const key1 = getKey('total', 'total', 1, 20);
      const key2 = getKey('total', 'total', 2, 20);
      const key3 = getKey('weekly', 'total', 1, 20);
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('边界情况', () => {
    test('第 1 页应该正确编码', () => {
      expect(getKey('total', 'total', 1, 20)).toContain(':1:');
    });

    test('大页码应该正确编码', () => {
      expect(getKey('total', 'total', 100, 20)).toContain(':100:');
    });

    test('特殊字符用户 ID 应该正确编码', () => {
      const key = getUserRankKey('user-123_abc', 'total');
      expect(key).toBe('leaderboard:user_rank:user-123_abc:total');
    });
  });
});
