/**
 * 压力测试脚本
 * 使用 autocannon 或原生 HTTP 进行压力测试
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 测试配置
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  concurrency: 10, // 并发数
  duration: 30, // 测试持续时间 (秒)
  pipelining: 1,
  endpoints: [
    { path: '/api/health', method: 'GET', name: '健康检查' },
    { path: '/api/auth/profile', method: 'GET', name: '用户资料', auth: true },
    { path: '/api/knowledge', method: 'GET', name: '知识点列表', auth: true },
    { path: '/api/progress', method: 'GET', name: '学习进度', auth: true },
    { path: '/api/ai/question', method: 'POST', name: 'AI 出题', auth: true },
  ]
};

// 统计信息
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  latencies: [],
  errors: {}
};

/**
 * 发送单个请求
 */
function makeRequest(endpoint, authToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StudyAss-Stress-Test/1.0'
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const startTime = Date.now();
    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      const latency = Date.now() - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          latency,
          data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // POST 请求发送数据
    if (endpoint.method === 'POST' && endpoint.body) {
      req.write(JSON.stringify(endpoint.body));
    }

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

/**
 * 运行压力测试
 */
async function runStressTest() {
  console.log('🚀 开始压力测试');
  console.log(`📍 目标地址：${config.baseUrl}`);
  console.log(`🔀 并发数：${config.concurrency}`);
  console.log(`⏱️  持续时间：${config.duration}秒`);
  console.log(`📋 测试端点：${config.endpoints.length}个`);
  console.log('');

  const startTime = Date.now();
  const endTime = startTime + (config.duration * 1000);
  const requestsPerEndpoint = Math.floor((config.concurrency * config.duration) / config.endpoints.length);

  // 为每个端点创建并发请求
  const promises = [];
  
  for (const endpoint of config.endpoints) {
    console.log(`📊 测试端点：${endpoint.name} (${endpoint.path})`);
    
    for (let i = 0; i < requestsPerEndpoint; i++) {
      const promise = makeRequest(endpoint)
        .then(result => {
          stats.totalRequests++;
          stats.latencies.push(result.latency);
          
          if (result.statusCode >= 200 && result.statusCode < 300) {
            stats.successfulRequests++;
          } else {
            stats.failedRequests++;
            const errorKey = `${endpoint.name}: ${result.statusCode}`;
            stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
          }
        })
        .catch(err => {
          stats.totalRequests++;
          stats.failedRequests++;
          const errorKey = `${endpoint.name}: ${err.message}`;
          stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
        });
      
      promises.push(promise);

      // 控制并发
      if (promises.length >= config.concurrency) {
        await Promise.race(promises);
        // 移除已完成的 promise
        const completed = [];
        for (let i = 0; i < promises.length; i++) {
          try {
            await Promise.race([promises[i], Promise.resolve('done')]);
            completed.push(i);
          } catch (e) {}
        }
        // 简化：直接等待一小部分
        if (promises.length > config.concurrency * 2) {
          await Promise.all(promises.slice(0, config.concurrency));
          promises.splice(0, config.concurrency);
        }
      }
    }
  }

  // 等待所有请求完成
  await Promise.all(promises);

  const duration = (Date.now() - startTime) / 1000;

  // 计算统计信息
  const latencies = stats.latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : 0;

  // 输出报告
  console.log('\n========================================');
  console.log('📊 压力测试报告');
  console.log('========================================');
  console.log(`⏱️  测试时长：${duration.toFixed(2)}秒`);
  console.log(`📈 总请求数：${stats.totalRequests}`);
  console.log(`✅ 成功请求：${stats.successfulRequests} (${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%)`);
  console.log(`❌ 失败请求：${stats.failedRequests} (${(stats.failedRequests / stats.totalRequests * 100).toFixed(2)}%)`);
  console.log(`🚀 吞吐量：${(stats.totalRequests / duration).toFixed(2)} req/s`);
  console.log('');
  console.log('📉 延迟分布:');
  console.log(`   平均：${avg.toFixed(2)}ms`);
  console.log(`   P50:  ${p50.toFixed(2)}ms`);
  console.log(`   P90:  ${p90.toFixed(2)}ms`);
  console.log(`   P95:  ${p95.toFixed(2)}ms`);
  console.log(`   P99:  ${p99.toFixed(2)}ms`);
  console.log(`   Min:  ${latencies[0] || 0}ms`);
  console.log(`   Max:  ${latencies[latencies.length - 1] || 0}ms`);
  console.log('');
  
  if (Object.keys(stats.errors).length > 0) {
    console.log('❌ 错误统计:');
    for (const [error, count] of Object.entries(stats.errors)) {
      console.log(`   ${error}: ${count}`);
    }
  }
  
  console.log('========================================');

  // 生成报告文件
  const report = {
    timestamp: new Date().toISOString(),
    config,
    summary: {
      duration,
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      throughput: stats.totalRequests / duration,
      successRate: stats.successfulRequests / stats.totalRequests * 100
    },
    latencies: {
      average: avg,
      p50,
      p90,
      p95,
      p99,
      min: latencies[0] || 0,
      max: latencies[latencies.length - 1] || 0
    },
    errors: stats.errors
  };

  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, `stress-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 详细报告已保存：${reportPath}`);

  return report;
}

// 运行测试
if (require.main === module) {
  runStressTest()
    .then(report => {
      console.log('\n✅ 压力测试完成');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ 压力测试失败:', err);
      process.exit(1);
    });
}

module.exports = { runStressTest, config };
