/**
 * Jest 测试配置文件
 * 质量门禁标准：
 * - 测试通过率：>90%
 * - 代码覆盖率：>80%
 */
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  
  // 覆盖率收集配置
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/database/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // 覆盖率阈值（质量门禁）
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
  
  // 单线程执行，避免资源竞争
  maxWorkers: 1,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // 测试设置
  setupFiles: ['./jest.setup.js'],
  
  // 测试结果显示
  testResultsProcessor: undefined,
  
  // 失败时继续运行其他测试
  bail: false,
  
  // 慢测试警告阈值 (ms)
  slowTestThreshold: 5000
};
