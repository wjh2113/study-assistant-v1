/**
 * Leaderboard Calculator Worker - 排行榜定时计算任务
 * ISSUE-P1-005: 排行榜完善 - 定时计算任务
 */

const cron = require('node-cron');
const LeaderboardModel = require('../modules/leaderboard/LeaderboardModel');
const { getLeaderboardCache } = require('../modules/leaderboard/LeaderboardCache');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const cache = getLeaderboardCache();

/**
 * 计算并缓存所有排行榜
 */
async function calculateAllLeaderboards() {
  console.log('\n📊 ========== 开始计算排行榜 ==========' );
  const startTime = Date.now();
  
  try {
    // 1. 计算总榜
    console.log('📈 计算总榜...');
    const totalRanking = LeaderboardModel.calculateTotalRanking(100);
    await cache.set('total', 'total', 1, 100, {
      data: totalRanking,
      total: totalRanking.length,
      calculatedAt: new Date().toISOString()
    });
    console.log(`   ✅ 总榜完成：${totalRanking.length}人`);

    // 2. 计算周榜
    console.log('📈 计算周榜...');
    const weeklyRanking = LeaderboardModel.calculateWeeklyRanking(100);
    await cache.set('weekly', 'total', 1, 100, {
      data: weeklyRanking,
      total: weeklyRanking.length,
      calculatedAt: new Date().toISOString()
    });
    console.log(`   ✅ 周榜完成：${weeklyRanking.length}人`);

    // 3. 计算月榜
    console.log('📈 计算月榜...');
    const monthlyRanking = LeaderboardModel.calculateMonthlyRanking(100);
    await cache.set('monthly', 'total', 1, 100, {
      data: monthlyRanking,
      total: monthlyRanking.length,
      calculatedAt: new Date().toISOString()
    });
    console.log(`   ✅ 月榜完成：${monthlyRanking.length}人`);

    // 4. 创建数据库快照
    console.log('💾 创建排行榜快照...');
    LeaderboardModel.createSnapshot('total', 'total', totalRanking);
    LeaderboardModel.createSnapshot('weekly', 'total', weeklyRanking);
    LeaderboardModel.createSnapshot('monthly', 'total', monthlyRanking);
    console.log('   ✅ 快照创建完成');

    const duration = Date.now() - startTime;
    console.log(`\n🎉 排行榜计算完成，耗时：${duration}ms`);
    console.log('=====================================\n');
    
    return {
      success: true,
      duration,
      counts: {
        total: totalRanking.length,
        weekly: weeklyRanking.length,
        monthly: monthlyRanking.length
      }
    };
  } catch (error) {
    console.error('❌ 排行榜计算失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 清理过期缓存
 */
async function cleanupExpiredCache() {
  console.log('🧹 清理过期排行榜缓存...');
  const count = await cache.invalidateAll();
  console.log(`   ✅ 清理了 ${count} 个缓存键`);
}

/**
 * 启动定时任务
 */
function startLeaderboardScheduler() {
  console.log('🕐 启动排行榜定时计算任务...');
  
  // 每小时整点计算一次排行榜
  const hourlyTask = cron.schedule('0 * * * *', async () => {
    console.log('\n⏰ [定时任务] 开始执行排行榜计算...');
    await calculateAllLeaderboards();
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
  
  // 每天凌晨 2 点清理缓存并重新计算
  const dailyTask = cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ [定时任务] 执行每日缓存清理和重算...');
    await cleanupExpiredCache();
    await calculateAllLeaderboards();
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });
  
  console.log('✅ 排行榜定时任务已启动');
  console.log('   - 每小时整点计算排行榜');
  console.log('   - 每天凌晨 2 点清理缓存并重算');
  
  return {
    hourlyTask,
    dailyTask,
    stop: () => {
      hourlyTask.stop();
      dailyTask.stop();
      console.log('🛑 排行榜定时任务已停止');
    }
  };
}

// 如果直接运行此文件，则启动定时任务
if (require.main === module) {
  const scheduler = startLeaderboardScheduler();
  
  // 立即执行一次
  calculateAllLeaderboards();
  
  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭排行榜计算器...');
    scheduler.stop();
    await cache.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = {
  calculateAllLeaderboards,
  cleanupExpiredCache,
  startLeaderboardScheduler
};
