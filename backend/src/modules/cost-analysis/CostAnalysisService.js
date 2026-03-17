/**
 * Cost Analysis Service - 成本分析服务
 * Phase 2 成本分析：Token 使用统计和预算告警
 */

const Redis = require('ioredis');
const { db } = require('../../config/database');

class CostAnalysisService {
  static redis = null;
  
  // AI 服务商价格配置（每 1000 tokens 的价格，单位：元）
  static PRICING = {
    aliyun: {
      'qwen-turbo': { prompt: 0.002, completion: 0.006 },
      'qwen-plus': { prompt: 0.004, completion: 0.012 },
      'qwen-max': { prompt: 0.02, completion: 0.06 },
      'qwen-long': { prompt: 0.05, completion: 0.15 }
    },
    openai: {
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 }
    },
    moonshot: {
      'moonshot-v1-8k': { prompt: 0.012, completion: 0.012 },
      'moonshot-v1-32k': { prompt: 0.024, completion: 0.024 },
      'moonshot-v1-128k': { prompt: 0.06, completion: 0.06 }
    },
    baidu: {
      'ernie-bot-turbo': { prompt: 0.001, completion: 0.002 },
      'ernie-bot': { prompt: 0.012, completion: 0.012 },
      'ernie-bot-4': { prompt: 0.03, completion: 0.03 }
    },
    iflytek: {
      'spark-lite': { prompt: 0.001, completion: 0.002 },
      'spark-v2': { prompt: 0.018, completion: 0.018 },
      'spark-pro': { prompt: 0.03, completion: 0.03 }
    }
  };

  // 预算配置（单位：元）
  static BUDGET_CONFIG = {
    daily: parseFloat(process.env.DAILY_BUDGET) || 100,
    weekly: parseFloat(process.env.WEEKLY_BUDGET) || 500,
    monthly: parseFloat(process.env.MONTHLY_BUDGET) || 2000,
    alertThresholds: [0.5, 0.75, 0.9, 1.0] // 50%, 75%, 90%, 100%
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
      db: parseInt(process.env.COST_REDIS_DB) || 2,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('error', (err) => {
      console.error('❌ Cost Redis 连接错误:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('✅ Cost Redis 连接成功');
    });

    return this.redis;
  }

  /**
   * 记录 Token 使用及成本
   * @param {object} params 
   */
  static async recordUsage(params) {
    const {
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      userId,
      taskType
    } = params;

    if (!this.redis) return;

    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const week = this.getWeekNumber(now);
      const month = now.toISOString().slice(0, 7); // YYYY-MM

      // 计算成本
      const cost = this.calculateCost(provider, model, promptTokens, completionTokens);

      // 按日期统计
      const dateKey = `cost:daily:${date}`;
      await this.redis.hincrbyfloat(dateKey, `${provider}:${model}`, cost);
      await this.redis.hincrby(dateKey + ':tokens', `${provider}:${model}`, totalTokens);
      await this.redis.expire(dateKey, 86400 * 35);
      await this.redis.expire(dateKey + ':tokens', 86400 * 35);

      // 按周统计
      const weekKey = `cost:weekly:${now.getFullYear()}:w${week}`;
      await this.redis.hincrbyfloat(weekKey, `${provider}:${model}`, cost);
      await this.redis.expire(weekKey, 86400 * 60);

      // 按月统计
      const monthKey = `cost:monthly:${month}`;
      await this.redis.hincrbyfloat(monthKey, `${provider}:${model}`, cost);
      await this.redis.hincrby(monthKey + ':tokens', `${provider}:${model}`, totalTokens);
      await this.redis.expire(monthKey, 86400 * 365);
      await this.redis.expire(monthKey + ':tokens', 86400 * 365);

      // 按用户统计
      const userKey = `cost:user:${userId}:${date}`;
      await this.redis.hincrbyfloat(userKey, 'total', cost);
      await this.redis.hincrby(userKey + ':tokens', 'total', totalTokens);
      await this.redis.expire(userKey, 86400 * 35);
      await this.redis.expire(userKey + ':tokens', 86400 * 35);

      // 按任务类型统计
      const taskKey = `cost:task:${taskType}:${date}`;
      await this.redis.hincrbyfloat(taskKey, 'total', cost);
      await this.redis.expire(taskKey, 86400 * 35);

      // 检查预算告警
      await this.checkBudgetAlerts(date, week, month);

      return { cost, totalTokens };
    } catch (error) {
      console.error('记录 Token 使用失败:', error.message);
    }
  }

  /**
   * 计算成本
   */
  static calculateCost(provider, model, promptTokens, completionTokens) {
    const pricing = this.PRICING[provider]?.[model];
    if (!pricing) {
      console.warn(`未知定价：${provider}/${model}，使用默认价格`);
      return (promptTokens + completionTokens) * 0.00001; // 默认低价
    }

    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;
    
    return promptCost + completionCost;
  }

  /**
   * 获取周数
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * 检查预算告警
   */
  static async checkBudgetAlerts(date, week, month) {
    const alerts = [];

    // 检查日预算
    const dailyKey = `cost:daily:${date}`;
    const dailyCost = await this.getDailyTotal(date);
    const dailyRatio = dailyCost / this.BUDGET_CONFIG.daily;
    
    if (await this.shouldAlert(dailyRatio, 'daily')) {
      alerts.push({
        type: 'daily',
        budget: this.BUDGET_CONFIG.daily,
        spent: dailyCost,
        ratio: dailyRatio,
        message: `日预算已使用 ${Math.round(dailyRatio * 100)}% (${dailyCost.toFixed(2)}/${this.BUDGET_CONFIG.daily}元)`
      });
    }

    // 检查周预算
    const weeklyCost = await this.getWeeklyTotal(new Date().getFullYear(), week);
    const weeklyRatio = weeklyCost / this.BUDGET_CONFIG.weekly;
    
    if (await this.shouldAlert(weeklyRatio, 'weekly')) {
      alerts.push({
        type: 'weekly',
        budget: this.BUDGET_CONFIG.weekly,
        spent: weeklyCost,
        ratio: weeklyRatio,
        message: `周预算已使用 ${Math.round(weeklyRatio * 100)}% (${weeklyCost.toFixed(2)}/${this.BUDGET_CONFIG.weekly}元)`
      });
    }

    // 检查月预算
    const monthlyCost = await this.getMonthlyTotal(month);
    const monthlyRatio = monthlyCost / this.BUDGET_CONFIG.monthly;
    
    if (await this.shouldAlert(monthlyRatio, 'monthly')) {
      alerts.push({
        type: 'monthly',
        budget: this.BUDGET_CONFIG.monthly,
        spent: monthlyCost,
        ratio: monthlyRatio,
        message: `月预算已使用 ${Math.round(monthlyRatio * 100)}% (${monthlyCost.toFixed(2)}/${this.BUDGET_CONFIG.monthly}元)`
      });
    }

    // 记录告警
    if (alerts.length > 0) {
      await this.recordBudgetAlerts(alerts);
    }

    return alerts;
  }

  /**
   * 判断是否应该触发告警
   */
  static async shouldAlert(ratio, type) {
    const alertKey = `alert:${type}:${new Date().toISOString().split('T')[0]}`;
    
    // 找到当前 ratio 应该触发的阈值
    const threshold = this.BUDGET_CONFIG.alertThresholds
      .filter(t => t <= ratio)
      .pop();

    if (!threshold) return false;

    // 检查是否已发送过该阈值的告警
    const alertedThreshold = this.redis ? 
      parseInt(await this.redis.get(alertKey) || '0') : 0;

    if (threshold > alertedThreshold) {
      if (this.redis) {
        await this.redis.setex(alertKey, 86400, threshold.toString());
      }
      return true;
    }

    return false;
  }

  /**
   * 记录预算告警
   */
  static async recordBudgetAlerts(alerts) {
    if (!this.redis) return;

    const alertData = {
      timestamp: new Date().toISOString(),
      alerts
    };

    await this.redis.lpush('budget_alerts', JSON.stringify(alertData));
    await this.redis.ltrim('budget_alerts', 0, 99); // 保留最近 100 条

    console.warn('⚠️  预算告警:', alerts.map(a => a.message).join('; '));
  }

  /**
   * 获取日总成本
   */
  static async getDailyTotal(date = new Date().toISOString().split('T')[0]) {
    if (!this.redis) return 0;

    const key = `cost:daily:${date}`;
    const costs = await this.redis.hvals(key);
    
    return costs.reduce((sum, val) => sum + parseFloat(val || 0), 0);
  }

  /**
   * 获取周总成本
   */
  static async getWeeklyTotal(year, week) {
    if (!this.redis) return 0;

    const key = `cost:weekly:${year}:w${week}`;
    const costs = await this.redis.hvals(key);
    
    return costs.reduce((sum, val) => sum + parseFloat(val || 0), 0);
  }

  /**
   * 获取月总成本
   */
  static async getMonthlyTotal(month = new Date().toISOString().slice(0, 7)) {
    if (!this.redis) return 0;

    const key = `cost:monthly:${month}`;
    const costs = await this.redis.hvals(key);
    
    return costs.reduce((sum, val) => sum + parseFloat(val || 0), 0);
  }

  /**
   * 获取成本统计
   */
  static async getCostStats(period = 'daily', startDate, endDate) {
    if (!this.redis) return null;

    const stats = {
      totalCost: 0,
      totalTokens: 0,
      byProvider: {},
      byModel: {},
      byTaskType: {},
      trend: []
    };

    try {
      if (period === 'daily') {
        // 获取最近 7 天
        const days = 7;
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const key = `cost:daily:${dateStr}`;
          const costs = await this.redis.hgetall(key);
          const tokens = await this.redis.hgetall(key + ':tokens');
          
          const dayTotal = Object.values(costs).reduce((sum, v) => sum + parseFloat(v || 0), 0);
          const dayTokens = Object.values(tokens).reduce((sum, v) => sum + parseInt(v || 0), 0);
          
          stats.totalCost += dayTotal;
          stats.totalTokens += dayTokens;
          
          stats.trend.unshift({
            date: dateStr,
            cost: dayTotal,
            tokens: dayTokens
          });

          // 聚合提供商和模型
          for (const [modelKey, cost] of Object.entries(costs)) {
            const [provider, model] = modelKey.split(':');
            stats.byProvider[provider] = (stats.byProvider[provider] || 0) + parseFloat(cost);
            stats.byModel[model] = (stats.byModel[model] || 0) + parseFloat(cost);
          }
        }
      } else if (period === 'monthly') {
        // 获取最近 12 个月
        for (let i = 0; i < 12; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStr = date.toISOString().slice(0, 7);
          
          const key = `cost:monthly:${monthStr}`;
          const costs = await this.redis.hgetall(key);
          const tokens = await this.redis.hgetall(key + ':tokens');
          
          const monthTotal = Object.values(costs).reduce((sum, v) => sum + parseFloat(v || 0), 0);
          const monthTokens = Object.values(tokens).reduce((sum, v) => sum + parseInt(v || 0), 0);
          
          stats.totalCost += monthTotal;
          stats.totalTokens += monthTokens;
          
          stats.trend.unshift({
            month: monthStr,
            cost: monthTotal,
            tokens: monthTokens
          });
        }
      }

      return stats;
    } catch (error) {
      console.error('获取成本统计失败:', error.message);
      return null;
    }
  }

  /**
   * 获取用户成本统计
   */
  static async getUserCostStats(userId, days = 7) {
    if (!this.redis) return null;

    const stats = {
      totalCost: 0,
      totalTokens: 0,
      daily: []
    };

    try {
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const key = `cost:user:${userId}:${dateStr}`;
        const costData = await this.redis.hgetall(key);
        const tokenData = await this.redis.hgetall(key + ':tokens');
        
        const cost = parseFloat(costData.total || 0);
        const tokens = parseInt(tokenData.total || 0);
        
        stats.totalCost += cost;
        stats.totalTokens += tokens;
        
        stats.daily.unshift({
          date: dateStr,
          cost,
          tokens
        });
      }

      return stats;
    } catch (error) {
      console.error('获取用户成本统计失败:', error.message);
      return null;
    }
  }

  /**
   * 获取预算使用情况
   */
  static async getBudgetUsage() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const week = this.getWeekNumber(now);
    const month = now.toISOString().slice(0, 7);

    const [dailyCost, weeklyCost, monthlyCost] = await Promise.all([
      this.getDailyTotal(date),
      this.getWeeklyTotal(now.getFullYear(), week),
      this.getMonthlyTotal(month)
    ]);

    return {
      daily: {
        budget: this.BUDGET_CONFIG.daily,
        spent: dailyCost,
        remaining: this.BUDGET_CONFIG.daily - dailyCost,
        usagePercent: Math.round((dailyCost / this.BUDGET_CONFIG.daily) * 100)
      },
      weekly: {
        budget: this.BUDGET_CONFIG.weekly,
        spent: weeklyCost,
        remaining: this.BUDGET_CONFIG.weekly - weeklyCost,
        usagePercent: Math.round((weeklyCost / this.BUDGET_CONFIG.weekly) * 100)
      },
      monthly: {
        budget: this.BUDGET_CONFIG.monthly,
        spent: monthlyCost,
        remaining: this.BUDGET_CONFIG.monthly - monthlyCost,
        usagePercent: Math.round((monthlyCost / this.BUDGET_CONFIG.monthly) * 100)
      }
    };
  }

  /**
   * 获取最近的告警记录
   */
  static async getRecentAlerts(limit = 10) {
    if (!this.redis) return [];

    const alerts = await this.redis.lrange('budget_alerts', 0, limit - 1);
    return alerts.map(a => JSON.parse(a));
  }

  /**
   * 优化建议
   */
  static async getOptimizationSuggestions() {
    const stats = await this.getCostStats('daily');
    if (!stats) return [];

    const suggestions = [];

    // 分析提供商成本分布
    const totalCost = stats.totalCost;
    for (const [provider, cost] of Object.entries(stats.byProvider)) {
      const ratio = cost / totalCost;
      
      if (ratio > 0.5) {
        suggestions.push({
          type: 'provider_concentration',
          severity: 'medium',
          message: `${provider} 占总成本的 ${Math.round(ratio * 100)}%，考虑使用更经济的模型或提供商`,
          potentialSavings: Math.round(cost * 0.3) // 预估可节省 30%
        });
      }
    }

    // 检查是否有高成本模型
    for (const [model, cost] of Object.entries(stats.byModel)) {
      if (cost > 10) { // 单日超过 10 元
        suggestions.push({
          type: 'expensive_model',
          severity: 'high',
          message: `模型 ${model} 7 天成本 ${cost.toFixed(2)} 元，考虑优化提示词或使用更小的模型`,
          potentialSavings: Math.round(cost * 0.2)
        });
      }
    }

    // 检查成本趋势
    if (stats.trend.length >= 7) {
      const recentAvg = (stats.trend[0].cost + stats.trend[1].cost + stats.trend[2].cost) / 3;
      const olderAvg = (stats.trend[4].cost + stats.trend[5].cost + stats.trend[6].cost) / 3;
      
      if (recentAvg > olderAvg * 1.5) {
        suggestions.push({
          type: 'cost_increase',
          severity: 'high',
          message: `最近 3 天平均成本比上周增长 ${Math.round((recentAvg / olderAvg - 1) * 100)}%，请检查是否有异常使用`,
          potentialSavings: Math.round((recentAvg - olderAvg) * 3)
        });
      }
    }

    return suggestions;
  }
}

module.exports = CostAnalysisService;
