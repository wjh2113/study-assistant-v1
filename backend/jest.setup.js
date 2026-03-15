/**
 * Jest 测试环境配置
 * BUG-API-001 修复：设置测试模式环境变量
 * BUG-API-003 修复：使用 SQLite 数据库进行测试
 */

const path = require('path');
const fs = require('fs');

// 启用测试模式 - 允许使用通用验证码
process.env.TEST_MODE = 'true';

// 使用 SQLite 数据库（避免 MySQL/PostgreSQL 依赖）
delete process.env.DATABASE_URL;

// 使用临时数据库文件
const tempDbPath = path.join(__dirname, 'test-temp-' + process.pid + '.db');
process.env.DATABASE_PATH = tempDbPath;

// 禁用生产环境功能
process.env.NODE_ENV = 'test';

// 测试完成后清理临时数据库
process.on('exit', () => {
  try {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  } catch (e) {
    // 忽略清理错误
  }
});

console.log(`🧪 测试环境已配置：TEST_MODE=true, DATABASE_PATH=${tempDbPath}`);
