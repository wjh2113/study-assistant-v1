/**
 * Startup Verification Test - 启动验证测试
 * 验证所有核心模块和 API 端点正常工作
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 测试配置
const tests = [
  {
    name: '健康检查',
    path: '/api/health',
    method: 'GET',
    expectStatus: 200
  },
  {
    name: 'AI Gateway V1 路由',
    path: '/api/ai/generate-questions',
    method: 'POST',
    expectStatus: 401, // 需要认证
    body: {}
  },
  {
    name: 'AI Gateway V2 路由',
    path: '/api/ai/v2/generate-questions',
    method: 'POST',
    expectStatus: 401,
    body: {}
  },
  {
    name: 'AI 学习规划路由',
    path: '/api/ai/planning/generate',
    method: 'POST',
    expectStatus: 401,
    body: {}
  },
  {
    name: '课本解析路由',
    path: '/api/textbooks',
    method: 'GET',
    expectStatus: 401
  },
  {
    name: '薄弱点分析路由',
    path: '/api/weakness',
    method: 'GET',
    expectStatus: 401
  },
  {
    name: '积分系统路由',
    path: '/api/points',
    method: 'GET',
    expectStatus: 401
  },
  {
    name: '排行榜路由',
    path: '/api/leaderboard',
    method: 'GET',
    expectStatus: 200 // 公开访问
  },
  {
    name: '认证路由',
    path: '/api/auth/login',
    method: 'POST',
    expectStatus: 200,
    body: { phone: '13800138000', code: '123456' }
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    const url = new URL(test.path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const passed = res.statusCode === test.expectStatus;
        resolve({
          name: test.name,
          path: test.path,
          expected: test.expectStatus,
          actual: res.statusCode,
          passed,
          response: data.substring(0, 200)
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        name: test.name,
        path: test.path,
        expected: test.expectStatus,
        actual: 'ERROR',
        passed: false,
        error: e.message
      });
    });

    if (test.body) {
      req.write(JSON.stringify(test.body));
    }
    req.end();
  });
}

async function main() {
  console.log('🚀 启动验证测试开始\n');
  console.log('=' .repeat(60));
  
  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    console.log(`   ${result.method || 'GET'} ${result.path}`);
    console.log(`   预期：${result.expected}, 实际：${result.actual}`);
    if (!result.passed && result.error) {
      console.log(`   错误：${result.error}`);
    }
    console.log();
  }
  
  console.log('=' .repeat(60));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\n📊 测试结果：${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('✅ 所有核心 API 端点正常工作！\n');
    process.exit(0);
  } else {
    console.log('⚠️  部分端点需要关注\n');
    process.exit(1);
  }
}

main();
