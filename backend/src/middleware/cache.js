/**
 * API 响应缓存中间件
 * 使用 Redis 缓存 API 响应，减少重复计算和数据库查询
 */

const Redis = require('ioredis');

// Redis 缓存客户端
let cacheClient = null;

function getCacheClient() {
  if (!cacheClient) {
    cacheClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return cacheClient;
}

/**
 * 缓存中间件工厂
 * @param {string} namespace - 缓存命名空间
 * @param {number} ttl - 缓存时间 (秒)
 * @param {function} keyGenerator - 自定义缓存 key 生成函数
 */
function cacheMiddleware(namespace = 'api', ttl = 300, keyGenerator = null) {
  return async (req, res, next) => {
    // 仅缓存 GET 请求
    if (req.method !== 'GET') {
      return next();
    }

    const cache = getCacheClient();
    
    // 生成缓存 key
    let cacheKey;
    if (keyGenerator) {
      cacheKey = `${namespace}:${keyGenerator(req)}`;
    } else {
      // 默认使用 URL 路径和查询参数
      cacheKey = `${namespace}:${req.originalUrl || req.url}`;
    }

    try {
      // 尝试从缓存获取
      const cached = await cache.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', ttl.toString());
        return res.json(data);
      }

      // 缓存未命中，包装 res.json 以缓存响应
      res.set('X-Cache', 'MISS');
      
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // 仅缓存成功响应
        if (res.statusCode === 200) {
          cache.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
            console.error('[Cache] 缓存写入失败:', err.message);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('[Cache] 缓存操作失败:', err.message);
      next(); // 缓存失败不影响正常请求
    }
  };
}

/**
 * 清除缓存
 * @param {string} pattern - 缓存 key 模式 (支持通配符)
 */
async function invalidateCache(pattern) {
  const cache = getCacheClient();
  try {
    const keys = await cache.keys(pattern);
    if (keys.length > 0) {
      await cache.del(...keys);
      console.log(`[Cache] 已清除 ${keys.length} 个缓存项: ${pattern}`);
    }
  } catch (err) {
    console.error('[Cache] 清除缓存失败:', err.message);
  }
}

/**
 * 缓存预热
 * @param {string} key - 缓存 key
 * @param {any} data - 要缓存的数据
 * @param {number} ttl - 缓存时间 (秒)
 */
async function warmCache(key, data, ttl = 3600) {
  const cache = getCacheClient();
  try {
    await cache.setex(key, ttl, JSON.stringify(data));
    console.log(`[Cache] 缓存预热成功: ${key}`);
  } catch (err) {
    console.error('[Cache] 缓存预热失败:', err.message);
  }
}

/**
 * 获取缓存统计信息
 */
async function getCacheStats() {
  const cache = getCacheClient();
  try {
    const info = await cache.info('stats');
    const keysCount = await cache.dbsize();
    
    // 解析 hits/misses
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    
    return {
      keysCount,
      hits: hitsMatch ? parseInt(hitsMatch[1]) : 0,
      misses: missesMatch ? parseInt(missesMatch[1]) : 0,
      hitRate: hitsMatch && missesMatch 
        ? (parseInt(hitsMatch[1]) / (parseInt(hitsMatch[1]) + parseInt(missesMatch[1]) * 100)).toFixed(2) + '%'
        : 'N/A'
    };
  } catch (err) {
    console.error('[Cache] 获取统计失败:', err.message);
    return null;
  }
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  warmCache,
  getCacheStats,
  getCacheClient
};
