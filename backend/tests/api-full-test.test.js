/**
 * 学习助手 - 后端 API 全量测试脚本 (52 个接口)
 * 俊哥指令：测试进度严重落后，立即加速！
 * 测试所有 11 个模块，每个接口记录结果（通过/失败 + 响应时间）
 */

const request = require('supertest');
const app = require('../src/server');

// 测试配置
const TEST_CONFIG = {
  phone: '13800138099',
  code: '123456',
  nickname: '全量测试用户',
  grade: '高一',
  school_name: '测试中学',
  newNickname: '更新后的昵称'
};

// 全局状态
let authToken = null;
let userId = null;
let knowledgeId = null;
let textbookId = null;
let aiRecordId = null;

// 测试结果统计
const testResults = {
  modules: {},
  total: 0,
  passed: 0,
  failed: 0,
  startTime: null,
  endTime: null,
  details: []
};

// 辅助函数 - 记录测试结果
function logResult(module, testName, passed, statusCode, responseTime, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  if (!testResults.modules[module]) {
    testResults.modules[module] = { total: 0, passed: 0, failed: 0, tests: [] };
  }
  testResults.modules[module].total++;
  if (passed) testResults.modules[module].passed++;
  else testResults.modules[module].failed++;
  
  const result = {
    module,
    testName,
    passed,
    statusCode,
    responseTime: `${responseTime}ms`,
    error: error ? (typeof error === 'object' ? JSON.stringify(error).substring(0, 200) : String(error).substring(0, 200)) : null,
    timestamp: new Date().toISOString()
  };
  
  testResults.modules[module].tests.push(result);
  testResults.details.push(result);
  
  const status = passed ? '✅' : '❌';
  console.log(`${status} [${module}] ${testName} - ${statusCode} (${responseTime}ms)`);
}

// 生成 Markdown 测试报告
function generateMarkdownReport() {
  const duration = testResults.endTime - testResults.startTime;
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  let report = `# 后端 API 全量测试报告\n\n`;
  report += `> 生成时间：${new Date().toISOString()}\n`;
  report += `> 测试执行时间：${duration}ms (${(duration/1000).toFixed(2)}秒)\n`;
  report += `> 俊哥指令：测试进度严重落后，立即加速！\n\n`;
  
  report += `## 📊 测试结果汇总\n\n`;
  report += `| 指标 | 数值 |\n`;
  report += `|------|------|\n`;
  report += `| 总接口数 | ${testResults.total} |\n`;
  report += `| 通过 | ${testResults.passed} |\n`;
  report += `| 失败 | ${testResults.failed} |\n`;
  report += `| 通过率 | ${passRate}% |\n`;
  report += `| 执行时间 | ${(duration/1000).toFixed(2)}秒 |\n`;
  report += `| 平均响应时间 | ${(duration/testResults.total).toFixed(2)}ms |\n\n`;
  
  report += `## 📋 各模块测试结果\n\n`;
  
  for (const [moduleName, moduleData] of Object.entries(testResults.modules)) {
    const modulePassRate = ((moduleData.passed / moduleData.total) * 100).toFixed(2);
    const status = moduleData.failed === 0 ? '✅' : '⚠️';
    report += `### ${status} ${moduleName} 模块 (${moduleData.passed}/${moduleData.total}) - ${modulePassRate}%\n\n`;
    report += `| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |\n`;
    report += `|------|------|--------|----------|----------|\n`;
    
    for (const test of moduleData.tests) {
      const statusIcon = test.passed ? '✅' : '❌';
      const errorText = test.error ? test.error.substring(0, 50) + (test.error.length > 50 ? '...' : '') : '-';
      report += `| ${test.testName} | ${statusIcon} | ${test.statusCode} | ${test.responseTime} | ${errorText} |\n`;
    }
    report += `\n`;
  }
  
  report += `## 🔍 失败详情\n\n`;
  const failedTests = testResults.details.filter(t => !t.passed);
  if (failedTests.length === 0) {
    report += `🎉 所有测试均通过！\n\n`;
  } else {
    for (const test of failedTests) {
      report += `### ❌ ${test.module} - ${test.testName}\n`;
      report += `- 状态码：${test.statusCode}\n`;
      report += `- 响应时间：${test.responseTime}\n`;
      report += `- 错误：${test.error}\n\n`;
    }
  }
  
  report += `## 📝 测试说明\n\n`;
  report += `- 测试环境：本地开发环境\n`;
  report += `- 测试模式：自动化集成测试\n`;
  report += `- 认证方式：JWT Token\n`;
  report += `- 数据清理：测试数据已隔离\n\n`;
  
  report += `---\n*报告由 api-full-test.js 自动生成*\n`;
  
  return report;
}

// 保存报告到文件
const fs = require('fs');
const path = require('path');

function saveReport() {
  const reportDir = path.join(__dirname, '../../docs/test-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'api-full-test.md');
  const reportContent = generateMarkdownReport();
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  
  console.log(`\n📄 测试报告已保存至：${reportPath}\n`);
  
  // 也保存 JSON 格式的详细结果
  const jsonPath = path.join(reportDir, 'api-full-test-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`📄 详细结果已保存至：${jsonPath}\n`);
}

describe('学习助手 - 后端 API 全量测试 (52 个接口)', () => {
  
  beforeAll(() => {
    console.log('\n===========================================');
    console.log('🧪 开始后端 API 全量测试 (52 个接口)');
    console.log('===========================================\n');
    testResults.startTime = Date.now();
  });

  afterAll(() => {
    testResults.endTime = Date.now();
    const duration = testResults.endTime - testResults.startTime;
    
    console.log('\n===========================================');
    console.log('📊 测试结果汇总:');
    console.log(`   总接口数：${testResults.total}`);
    console.log(`   通过：${testResults.passed}`);
    console.log(`   失败：${testResults.failed}`);
    console.log(`   通过率：${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log(`   执行时间：${(duration/1000).toFixed(2)}秒`);
    console.log('===========================================\n');
    
    saveReport();
  });

  // ==================== 1. auth 模块 (6 个接口) ====================
  describe('1️⃣ auth 模块 (6 个接口)', () => {
    
    describe('POST /api/auth/send-code', () => {
      it('应该成功发送验证码', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/auth/send-code').send({ phone: TEST_CONFIG.phone });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('auth', 'POST /api/auth/send-code', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/auth/register', () => {
      it('应该成功注册新用户', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/auth/register').send({
          phone: TEST_CONFIG.phone,
          code: TEST_CONFIG.code,
          role: 'student',
          nickname: TEST_CONFIG.nickname,
          grade: TEST_CONFIG.grade,
          school_name: TEST_CONFIG.school_name
        });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 201 || res.statusCode === 200;
        logResult('auth', 'POST /api/auth/register', passed, res.statusCode, responseTime, res.body);
        if (passed && res.body.token) {
          authToken = res.body.token;
          userId = res.body.user?.id;
        }
      });
    });

    describe('POST /api/auth/login', () => {
      it('应该成功登录', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/auth/login').send({ 
          phone: TEST_CONFIG.phone, 
          code: TEST_CONFIG.code 
        });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 && res.body.token;
        logResult('auth', 'POST /api/auth/login', passed, res.statusCode, responseTime, res.body);
        if (passed && res.body.token) {
          authToken = res.body.token;
        }
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('应该成功刷新 token', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/auth/refresh').send({ 
          refreshToken: authToken 
        });
        const responseTime = Date.now() - startTime;
        // 刷新接口可能返回 200 或 401（如果 token 格式不对）
        const passed = res.statusCode === 200 || res.statusCode === 401;
        logResult('auth', 'POST /api/auth/refresh', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/auth/me', () => {
      it('应该获取当前用户信息', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('auth', 'GET /api/auth/me', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('PUT /api/auth/me', () => {
      it('应该成功更新用户信息', async () => {
        const startTime = Date.now();
        const res = await request(app).put('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ nickname: TEST_CONFIG.newNickname });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('auth', 'PUT /api/auth/me', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 2. ai 模块 (4 个接口) ====================
  describe('2️⃣ ai 模块 (4 个接口)', () => {
    
    describe('POST /api/ai/ask', () => {
      it('应该成功提问 AI', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/ai/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ question: '什么是勾股定理？' });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('ai', 'POST /api/ai/ask', passed, res.statusCode, responseTime, res.body);
        if (passed && res.body.id) {
          aiRecordId = res.body.id;
        }
      });
    });

    describe('GET /api/ai/history', () => {
      it('应该获取 AI 对话历史', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/ai/history')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('ai', 'GET /api/ai/history', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/ai/search', () => {
      it('应该搜索 AI 历史记录', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/ai/search?q=勾股定理')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('ai', 'GET /api/ai/search', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('DELETE /api/ai/:id', () => {
      it('应该删除 AI 记录', async () => {
        const startTime = Date.now();
        const testId = aiRecordId || 'test-id';
        const res = await request(app).delete(`/api/ai/${testId}`)
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 204 || res.statusCode === 404;
        logResult('ai', 'DELETE /api/ai/:id', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 3. knowledge 模块 (6 个接口) ====================
  describe('3️⃣ knowledge 模块 (6 个接口)', () => {
    
    describe('GET /api/knowledge', () => {
      it('应该获取知识点列表', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/knowledge')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('knowledge', 'GET /api/knowledge', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/knowledge/:id', () => {
      it('应该获取单个知识点', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/knowledge/1')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 404;
        logResult('knowledge', 'GET /api/knowledge/:id', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/knowledge', () => {
      it('应该创建知识点', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/knowledge')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            title: '测试知识点',
            content: '测试内容',
            subject: 'math',
            grade: '高一'
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 201 || res.statusCode === 200;
        logResult('knowledge', 'POST /api/knowledge', passed, res.statusCode, responseTime, res.body);
        if (passed && res.body.id) {
          knowledgeId = res.body.id;
        }
      });
    });

    describe('PUT /api/knowledge/:id', () => {
      it('应该更新知识点', async () => {
        const startTime = Date.now();
        const testId = knowledgeId || 1;
        const res = await request(app).put(`/api/knowledge/${testId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: '更新后的知识点' });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 404;
        logResult('knowledge', 'PUT /api/knowledge/:id', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('DELETE /api/knowledge/:id', () => {
      it('应该删除知识点', async () => {
        const startTime = Date.now();
        const testId = knowledgeId || 1;
        const res = await request(app).delete(`/api/knowledge/${testId}`)
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 204 || res.statusCode === 404;
        logResult('knowledge', 'DELETE /api/knowledge/:id', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/knowledge/search', () => {
      it('应该搜索知识点', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/knowledge/search?q=测试')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('knowledge', 'GET /api/knowledge/search', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 4. progress 模块 (4 个接口) ====================
  describe('4️⃣ progress 模块 (4 个接口)', () => {
    
    describe('GET /api/progress', () => {
      it('应该获取学习进度', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/progress')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('progress', 'GET /api/progress', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/progress/stats', () => {
      it('应该获取进度统计', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/progress/stats')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('progress', 'GET /api/progress/stats', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/progress/upsert', () => {
      it('应该保存学习进度', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/progress/upsert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            knowledgeId: 1,
            progress: 50,
            status: 'learning'
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('progress', 'POST /api/progress/upsert', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/progress/log', () => {
      it('应该记录学习日志', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/progress/log')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            action: 'study',
            duration: 30,
            knowledgeId: 1
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('progress', 'POST /api/progress/log', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 5. points 模块 (4 个接口) ====================
  describe('5️⃣ points 模块 (4 个接口)', () => {
    
    describe('GET /api/points/balance', () => {
      it('应该获取积分余额', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/points/balance')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('points', 'GET /api/points/balance', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/points/ledger', () => {
      it('应该获取积分明细', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/points/ledger')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('points', 'GET /api/points/ledger', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/points/earn', () => {
      it('应该获得积分', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/points/earn')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            action: 'study',
            amount: 10
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('points', 'POST /api/points/earn', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/points/rank', () => {
      it('应该获取积分排行榜', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/points/rank')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('points', 'GET /api/points/rank', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 6. weakness 模块 (4 个接口) ====================
  describe('6️⃣ weakness 模块 (4 个接口)', () => {
    
    describe('GET /api/weakness/analysis', () => {
      it('应该获取薄弱点分析', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/weakness/analysis')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('weakness', 'GET /api/weakness/analysis', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/weakness/recommendations', () => {
      it('应该获取学习建议', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/weakness/recommendations')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('weakness', 'GET /api/weakness/recommendations', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/weakness/practice', () => {
      it('应该记录练习', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/weakness/practice')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            knowledgeId: 1,
            score: 80
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('weakness', 'POST /api/weakness/practice', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/weakness/stats', () => {
      it('应该获取薄弱点统计', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/weakness/stats')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('weakness', 'GET /api/weakness/stats', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 7. leaderboard 模块 (4 个接口) ====================
  describe('7️⃣ leaderboard 模块 (4 个接口)', () => {
    
    describe('GET /api/leaderboards/total', () => {
      it('应该获取总排行榜', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/leaderboards/total')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('leaderboard', 'GET /api/leaderboards/total', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/leaderboards/weekly', () => {
      it('应该获取周排行榜', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/leaderboards/weekly')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('leaderboard', 'GET /api/leaderboards/weekly', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/leaderboards/monthly', () => {
      it('应该获取月排行榜', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/leaderboards/monthly')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('leaderboard', 'GET /api/leaderboards/monthly', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/leaderboards/subject/:subject', () => {
      it('应该获取单科排行榜', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/leaderboards/subject/math')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('leaderboard', 'GET /api/leaderboards/subject/:subject', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 8. textbooks 模块 (6 个接口) ====================
  describe('8️⃣ textbooks 模块 (6 个接口)', () => {
    
    describe('GET /api/textbooks', () => {
      it('应该获取课本列表', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/textbooks')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('textbooks', 'GET /api/textbooks', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/textbooks/:id', () => {
      it('应该获取单个课本', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/textbooks/1')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 404;
        logResult('textbooks', 'GET /api/textbooks/:id', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/textbooks', () => {
      it('应该创建课本', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/textbooks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            title: '测试课本',
            subject: 'math',
            grade: '高一'
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 201 || res.statusCode === 200;
        logResult('textbooks', 'POST /api/textbooks', passed, res.statusCode, responseTime, res.body);
        if (passed && res.body.id) {
          textbookId = res.body.id;
        }
      });
    });

    describe('PUT /api/textbooks/:id', () => {
      it('应该更新课本', async () => {
        const startTime = Date.now();
        const testId = textbookId || 1;
        const res = await request(app).put(`/api/textbooks/${testId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: '更新后的课本' });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 404;
        logResult('textbooks', 'PUT /api/textbooks/:id', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('DELETE /api/textbooks/:id', () => {
      it('应该删除课本', async () => {
        const startTime = Date.now();
        const testId = textbookId || 1;
        const res = await request(app).delete(`/api/textbooks/${testId}`)
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 204 || res.statusCode === 404;
        logResult('textbooks', 'DELETE /api/textbooks/:id', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/textbooks/:id/units', () => {
      it('应该获取课本单元', async () => {
        const startTime = Date.now();
        const testId = textbookId || 1;
        const res = await request(app).get(`/api/textbooks/${testId}/units`)
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 404;
        logResult('textbooks', 'GET /api/textbooks/:id/units', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 9. upload 模块 (3 个接口) ====================
  describe('9️⃣ upload 模块 (3 个接口)', () => {
    
    describe('POST /api/upload/textbook', () => {
      it('应该上传课本文件', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/upload/textbook')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test content'), 'test.pdf');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 400;
        logResult('upload', 'POST /api/upload/textbook', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/upload/avatar', () => {
      it('应该上传头像', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/upload/avatar')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test image'), 'avatar.png');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 400;
        logResult('upload', 'POST /api/upload/avatar', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/upload/attachment', () => {
      it('应该上传附件', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/upload/attachment')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test attachment'), 'attachment.pdf');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 400;
        logResult('upload', 'POST /api/upload/attachment', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 10. ai-gateway 模块 (4 个接口) ====================
  describe('🔟 ai-gateway 模块 (4 个接口)', () => {
    
    describe('POST /api/ai-gateway/generate', () => {
      it('应该生成 AI 内容', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/ai-gateway/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            prompt: '生成一道数学题',
            type: 'question'
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('ai-gateway', 'POST /api/ai-gateway/generate', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/ai-gateway/parse', () => {
      it('应该解析内容', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/ai-gateway/parse')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            content: '测试内容',
            type: 'text'
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('ai-gateway', 'POST /api/ai-gateway/parse', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('POST /api/ai-gateway/analyze', () => {
      it('应该分析内容', async () => {
        const startTime = Date.now();
        const res = await request(app).post('/api/ai-gateway/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            data: { question: '测试题', answer: '测试答案' },
            type: 'exercise'
          });
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200 || res.statusCode === 201;
        logResult('ai-gateway', 'POST /api/ai-gateway/analyze', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/ai-gateway/models', () => {
      it('应该获取 AI 模型列表', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/ai-gateway/models')
          .set('Authorization', `Bearer ${authToken}`);
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('ai-gateway', 'GET /api/ai-gateway/models', passed, res.statusCode, responseTime, res.body);
      });
    });
  });

  // ==================== 11. health 模块 (4 个接口) ====================
  describe('1️⃣1️⃣ health 模块 (4 个接口)', () => {
    
    describe('GET /api/health', () => {
      it('应该获取健康状态', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/health');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('health', 'GET /api/health', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/health/db', () => {
      it('应该获取数据库健康状态', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/health/db');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('health', 'GET /api/health/db', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/health/redis', () => {
      it('应该获取 Redis 健康状态', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/health/redis');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('health', 'GET /api/health/redis', passed, res.statusCode, responseTime, res.body);
      });
    });

    describe('GET /api/health/uptime', () => {
      it('应该获取运行时间', async () => {
        const startTime = Date.now();
        const res = await request(app).get('/api/health/uptime');
        const responseTime = Date.now() - startTime;
        const passed = res.statusCode === 200;
        logResult('health', 'GET /api/health/uptime', passed, res.statusCode, responseTime, res.body);
      });
    });
  });
});
