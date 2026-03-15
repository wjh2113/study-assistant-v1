/**
 * 统一数据库迁移脚本
 * 按顺序执行所有模块的数据库迁移
 */

const { migrate: migrateAiGateway } = require('../src/modules/ai-gateway/migration');
const { migrate: migrateTextbookParser } = require('../src/modules/textbook-parser/migration');
const { migrate: migrateWeaknessAnalysis } = require('../src/modules/weakness-analysis/migration');
const { migrate: migratePointsSystem } = require('../src/modules/points-system/migration');
const { migrate: migrateLeaderboard } = require('../src/modules/leaderboard/migration');
const { migrate: migrateLogger } = require('../src/modules/logger/migration');

console.log('🚀 开始执行全部数据库迁移...\n');

try {
  console.log('1️⃣  AI Gateway 迁移');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  migrateAiGateway();
  console.log('');

  console.log('2️⃣  Textbook Parser 迁移');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  migrateTextbookParser();
  console.log('');

  console.log('3️⃣  Weakness Analysis 迁移');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  migrateWeaknessAnalysis();
  console.log('');

  console.log('4️⃣  Points System 迁移');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  migratePointsSystem();
  console.log('');

  console.log('5️⃣  Leaderboard 迁移');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  migrateLeaderboard();
  console.log('');

  console.log('6️⃣  Logger 迁移');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  migrateLogger();
  console.log('');

  console.log('✅✅✅ 所有数据库迁移完成！ ✅✅✅');
} catch (error) {
  console.error('\n❌ 迁移过程中断:', error.message);
  process.exit(1);
}
