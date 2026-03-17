/**
 * Response Cache Service - AI 响应缓存服务
 * Phase 2 性能优化：减少重复 API 调用，降低延迟和成本
 */

const crypto = require('crypto');
const Redis = require('ioredis');

class ResponseCacheService {
  static redis = null;
  static config = {
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600, // 默认 1 小时
    questionTTL: parseInt(process.env.CACHE_QUESTION_TTL) || 86400, // 题目生成缓存 24 小时
    embeddingTTL: parseInt(process.env.CACHE_EMBEDDING_TTL) || 604800, // Embedding 缓存 7 天
    chatTTL: parseInt(process.env.CACHE_CHAT_TTL) || 1800, // 对话缓存 30 分钟
    maxRetries: 3,
    retryDelay: 100
  };

  /**
   * 初始化 Redis 连接
   */
  static async init() {
    if (this.redis) return this.redis;

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.CACHE_REDIS_DB) || 1, // 使用不同的 DB 区分缓存和计数
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: this.config.maxRetries
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('error', (err) => {
      console.error('❌ Cache Redis 连接错误:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('✅ Cache Redis 连接成功');
    });

    return this.redis;
  }

  /**
   * 获取 Redis 实例
   */
  static getRedis() {
    return this.redis;
  }

  /**
   * 生成缓存键
   * @param {string} type - 缓存类型
   * @param {object} params - 参数对象
   * @returns {string} 缓存键
   */
  static generateCacheKey(type, params) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(params, Object.keys(params).sort()))
      .digest('hex');
    return `ai:cache:${type}:${hash}`;
  }

  /**
   * 从缓存获取数据
   * @param {string} key - 缓存键
   * @returns {Promise<any>} 缓存数据，不存在返回 null
   */
  static async get(key) {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      
      // 检查是否过期（额外的应用层检查）
      if (parsed.expireAt && Date.now() > parsed.expireAt) {
        await this.delete(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.error('缓存读取失败:', error.message);
      return null; // 缓存失败不阻断主流程
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<boolean>} 是否成功
   */
  static async set(key, value, ttl = this.config.defaultTTL) {
    if (!this.redis) return false;

    try {
      const cacheData = {
        value,
        timestamp: Date.now(),
        expireAt: Date.now() + (ttl * 1000)
      };

      await this.redis.setex(key, ttl, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('缓存写入失败:', error.message);
      return false;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>}
   */
  static async delete(key) {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('缓存删除失败:', error.message);
      return false;
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   * @param {string} pattern - 键模式
   * @returns {Promise<number>} 删除的数量
   */
  static async deleteByPattern(pattern) {
    if (!this.redis) return 0;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('批量删除缓存失败:', error.message);
      return 0;
    }
  }

  /**
   * 缓存 AI 响应
   * @param {string} taskType - 任务类型
   * @param {object} params - 请求参数
   * @param {object} response - AI 响应
   * @returns {Promise<boolean>}
   */
  static async cacheAIResponse(taskType, params, response) {
    const ttl = this.getTTLForTaskType(taskType);
    const key = this.generateCacheKey(taskType, params);
    
    return this.set(key, response, ttl);
  }

  /**
   * 获取缓存的 AI 响应
   * @param {string} taskType - 任务类型
   * @param {object} params - 请求参数
   * @returns {Promise<any>}
   */
  static async getCachedAIResponse(taskType, params) {
    const key = this.generateCacheKey(taskType, params);
    return this.get(key);
  }

  /**
   * 根据任务类型获取 TTL
   * @param {string} taskType 
   * @returns {number}
   */
  static getTTLForTaskType(taskType) {
    switch (taskType) {
      case 'simple-question':
      case 'complex-question':
        return this.config.questionTTL;
      case 'embedding':
        return this.config.embeddingTTL;
      case 'chat':
        return this.config.chatTTL;
      case 'textbook-analysis':
      case 'weakness-analysis':
        return this.config.defaultTTL * 2; // 分析类任务缓存更久
      default:
        return this.config.defaultTTL;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<object>}
   */
  static async getStats() {
    if (!this.redis) return null;

    try {
      const dbSize = await this.redis.dbsize();
      const memoryUsage = await this.redis.info('memory');
      
      // 解析内存使用
      const memoryMatch = memoryUsage.match(/used_memory:(\d+)/);
      const usedMemory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        totalKeys: dbSize,
        usedMemoryBytes: usedMemory,
        usedMemoryMB: (usedMemory / 1024 / 1024).toFixed(2),
        connected: true
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error.message);
      return {
        totalKeys: 0,
        usedMemoryBytes: 0,
        usedMemoryMB: '0',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * 清理过期缓存（手动触发）
   * @returns {Promise<number>} 清理的数量
   */
  static async cleanup() {
    if (!this.redis) return 0;

    try {
      const keys = await this.redis.keys('ai:cache:*');
      let cleaned = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.expireAt && Date.now() > parsed.expireAt) {
            await this.redis.del(key);
            cleaned++;
          }
        } catch (e) {
          // 解析失败，删除损坏的缓存
          await this.redis.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 清理了 ${cleaned} 个过期缓存项`);
      }

      return cleaned;
    } catch (error) {
      console.error('缓存清理失败:', error.message);
      return 0;
    }
  }

  /**
   * 预热缓存（批量加载常用数据）
   * @param {array} items - 要预热的数据项
   * @param {string} taskType - 任务类型
   * @returns {Promise<number>} 成功预热的数量
   */
  static async warmup(items, taskType) {
    if (!this.redis || !items.length) return 0;

    const pipeline = this.redis.pipeline();
    const ttl = this.getTTLForTaskType(taskType);
    let successCount = 0;

    for (const item of items) {
      const key = this.generateCacheKey(taskType, item.params);
      const cacheData = {
        value: item.response,
        timestamp: Date.now(),
        expireAt: Date.now() + (ttl * 1000)
      };
      pipeline.setex(key, ttl, JSON.stringify(cacheData));
      successCount++;
    }

    try {
      await pipeline.exec();
      console.log(`🔥 预热了 ${successCount} 个缓存项 [${taskType}]`);
      return successCount;
    } catch (error) {
      console.error('缓存预热失败:', error.message);
      return 0;
    }
  }
}

module.exports = ResponseCacheService;
