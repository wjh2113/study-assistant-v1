# AI Phase 2 集成指南

## 📋 目录

1. [快速开始](#快速开始)
2. [模块集成](#模块集成)
3. [配置监控栈](#配置监控栈)
4. [测试验证](#测试验证)
5. [故障排查](#故障排查)

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install prom-client ws
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.phase2.example .env
```

编辑 `.env` 文件，填入你的配置：

```bash
# 至少配置以下内容
REDIS_HOST=localhost
REDIS_PORT=6379

# 阿里云配置（必需）
ALIYUN_API_KEY=your_api_key

# 百度配置（可选）
BAIDU_API_KEY=your_baidu_key
BAIDU_SECRET_KEY=your_baidu_secret

# 讯飞配置（可选）
IFLYTEK_APP_ID=your_app_id
IFLYTEK_API_KEY=your_api_key
IFLYTEK_API_SECRET=your_api_secret

# 预算配置
DAILY_BUDGET=100
WEEKLY_BUDGET=500
MONTHLY_BUDGET=2000
```

### 3. 启动 Redis

```bash
# Windows (使用 Docker)
docker run -d -p 6379:6379 --name redis redis:latest

# 或者安装本地 Redis
# https://github.com/microsoftarchive/redis/releases
```

### 4. 更新 AiGatewayServiceV2.js

在文件顶部添加导入：

```javascript
const ResponseCacheService = require('./ResponseCacheService');
const BatchUpdateService = require('./BatchUpdateService');
const PrometheusExporter = require('../monitoring/PrometheusExporter');
const CostAnalysisService = require('../cost-analysis/CostAnalysisService');
const { BaiduWenxinProvider, IFlytekSparkProvider } = require('./providers');
```

在 `callModel` 方法中集成缓存和监控（详见下文）。

### 5. 启动应用

```bash
npm start
```

访问指标端点验证：

```bash
curl http://localhost:9090/metrics
```

---

## 🔧 模块集成

### 集成响应缓存

在 `AiGatewayServiceV2.js` 的 `callModel` 方法中：

```javascript
static async callModel(modelName, messages, options = {}) {
  const taskType = options.taskType || 'chat';
  
  // 1. 检查缓存（只缓存成功响应）
  if (options.enableCache !== false) {
    const cached = await ResponseCacheService.getCachedAIResponse(taskType, {
      modelName,
      messages: messages.slice(-5) // 只用最近的消息作为缓存键
    });
    
    if (cached) {
      console.log('✅ 缓存命中:', taskType);
      PrometheusExporter.recordCacheHit(taskType);
      return cached;
    }
    
    PrometheusExporter.recordCacheMiss(taskType);
  }
  
  // 2. 调用模型（原有逻辑）
  const startTime = Date.now();
  const result = await this._callModelInternal(modelName, messages, options);
  const duration = (Date.now() - startTime) / 1000;
  
  // 3. 记录指标和成本
  if (result.success) {
    // Prometheus 指标
    PrometheusExporter.recordAIRequest(result.provider, result.model, taskType, 'success');
    PrometheusExporter.recordAIDuration(result.provider, result.model, taskType, duration);
    
    if (result.usage) {
      PrometheusExporter.recordTokenUsage(
        result.provider, 
        result.model, 
        result.usage.prompt_tokens || 0,
        result.usage.completion_tokens || 0,
        result.usage.total_tokens || 0
      );
      
      // 成本分析
      await CostAnalysisService.recordUsage({
        provider: result.provider,
        model: result.model,
        promptTokens: result.usage.prompt_tokens || 0,
        completionTokens: result.usage.completion_tokens || 0,
        totalTokens: result.usage.total_tokens || 0,
        userId: options.userId || 'anonymous',
        taskType
      });
    }
    
    // 4. 缓存响应
    if (options.enableCache !== false) {
      await ResponseCacheService.cacheAIResponse(taskType, {
        modelName,
        messages: messages.slice(-5)
      }, result);
    }
  } else {
    // 记录错误
    PrometheusExporter.recordAIRequest(result.provider, result.model, taskType, 'error');
    PrometheusExporter.recordAIError(result.provider, result.model, taskType, result.error || 'unknown');
  }
  
  return result;
}
```

### 集成批量更新

在控制器或服务中：

```javascript
// 初始化（在应用启动时）
BatchUpdateService.init();

// 使用批量更新
await BatchUpdateService.queueUpdate('ai_task_logs', {
  id: taskId,
  status: 'completed',
  output: result,
  duration_ms: duration
});

// 或者批量插入日志
await BatchUpdateService.batchInsert('ai_task_logs', [
  { userId: '1', taskType: 'chat', input: {...}, status: 'completed' },
  { userId: '2', taskType: 'chat', input: {...}, status: 'completed' }
]);

// 应用关闭时清空队列
process.on('SIGTERM', async () => {
  await BatchUpdateService.clearAll();
  process.exit(0);
});
```

### 集成新 AI 服务商

在 `AiGatewayServiceV2.js` 的 `PROVIDER_CONFIGS` 中添加：

```javascript
static PROVIDER_CONFIGS = {
  // ... 现有配置 ...
  
  'baidu': {
    name: '百度文心一言',
    models: {
      'ernie-bot-turbo': { model: 'ernie-bot-turbo', timeout: 30000, maxTokens: 2048 },
      'ernie-bot': { model: 'ernie-bot', timeout: 60000, maxTokens: 4096 },
      'ernie-bot-4': { model: 'ernie-bot-4', timeout: 90000, maxTokens: 8192 }
    }
  },
  
  'iflytek': {
    name: '讯飞星火',
    models: {
      'spark-lite': { model: 'spark-lite', timeout: 30000, maxTokens: 2048 },
      'spark-v2': { model: 'spark-v2', timeout: 60000, maxTokens: 4096 },
      'spark-pro': { model: 'spark-pro', timeout: 90000, maxTokens: 8192 }
    }
  }
};
```

在 `callModel` 方法中添加对这两个提供商的支持：

```javascript
// 在 getModelConfig 后添加
if (modelConfig.provider === 'baidu') {
  return BaiduWenxinProvider.callModel(modelName, messages, options);
}

if (modelConfig.provider === 'iflytek') {
  return IFlytekSparkProvider.callModel(modelName, messages, options);
}
```

---

## 📊 配置监控栈

### 1. 创建 Docker Compose 配置

在 `backend` 目录创建 `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    restart: unless-stopped
    networks:
      - monitoring
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  monitoring:
    driver: bridge
```

### 2. 启动监控栈

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 3. 访问服务

- **Prometheus**: http://localhost:9091
- **Grafana**: http://localhost:3001 (admin/admin)
- **Alertmanager**: http://localhost:9093

### 4. 配置告警通知

编辑 `monitoring/alertmanager.yml`:

```yaml
global:
  # 企业微信 webhook
  wechat_api_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send'
  wechat_api_corp_id: 'your_corp_id'
  wechat_api_secret: 'your_secret'

receivers:
  - name: 'wechat-notifications'
    wechat_configs:
      - agent_id: 1000001
        corp_id: 'your_corp_id'
        api_secret: 'your_secret'
        to_user: '@all'
        message_type: 'text'
```

---

## ✅ 测试验证

### 1. 测试缓存

```javascript
// 第一次调用（缓存未命中）
const result1 = await AiGatewayServiceV2.callModel('qwen-plus', [
  { role: 'user', content: '你好' }
]);

// 第二次调用（缓存命中）
const result2 = await AiGatewayServiceV2.callModel('qwen-plus', [
  { role: 'user', content: '你好' }
]);

console.log('缓存命中:', result1.data === result2.data);
```

### 2. 测试成本分析

```javascript
// 记录使用
await CostAnalysisService.recordUsage({
  provider: 'aliyun',
  model: 'qwen-plus',
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
  userId: 'test-user',
  taskType: 'chat'
});

// 查询统计
const stats = await CostAnalysisService.getCostStats('daily');
console.log('今日成本:', stats.totalCost);
```

### 3. 测试新 AI 服务商

```javascript
// 百度文心
const baiduResult = await BaiduWenxinProvider.callModel('ernie-bot', [
  { role: 'user', content: '你好' }
]);
console.log('百度响应:', baiduResult.data);

// 讯飞星火
const iflytekResult = await IFlytekSparkProvider.callModel('spark-pro', [
  { role: 'user', content: '你好' }
]);
console.log('讯飞响应:', iflytekResult.data);
```

### 4. 测试监控指标

```bash
# 查看指标
curl http://localhost:9090/metrics | grep ai_

# 预期输出示例：
# ai_requests_total{provider="aliyun",model="qwen-plus",task_type="chat",status="success"} 10
# ai_tokens_total{provider="aliyun",model="qwen-plus",type="total"} 3000
# ai_cache_hits_total{task_type="chat"} 5
```

### 5. 测试预算告警

```javascript
// 模拟超额使用
for (let i = 0; i < 100; i++) {
  await CostAnalysisService.recordUsage({
    provider: 'aliyun',
    model: 'qwen-max',
    promptTokens: 1000,
    completionTokens: 2000,
    totalTokens: 3000,
    userId: 'test-user',
    taskType: 'chat'
  });
}

// 查看预算使用情况
const budget = await CostAnalysisService.getBudgetUsage();
console.log('预算使用率:', budget.daily.usagePercent + '%');
```

---

## 🔍 故障排查

### Redis 连接失败

```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 测试连接
redis-cli ping
# 应返回：PONG

# 查看 Redis 日志
docker logs redis
```

### 指标无法访问

```bash
# 检查应用是否启动
curl http://localhost:9090/metrics

# 检查端口占用
netstat -ano | findstr :9090

# 查看应用日志
npm start 2>&1 | grep -i prometheus
```

### Prometheus 无法抓取数据

```bash
# 检查 Prometheus 配置
docker-compose -f docker-compose.monitoring.yml logs prometheus

# 测试抓取目标
curl http://localhost:9091/api/v1/targets

# 查看抓取错误
curl http://localhost:9091/api/v1/targets/metadata
```

### Grafana 无数据

```bash
# 检查数据源连接
curl http://localhost:3001/api/datasources -u admin:admin

# 检查 Prometheus 查询
# 在 Grafana Explore 中运行：
# ai_requests_total
```

### 缓存不工作

```javascript
// 检查 Redis 连接
const redis = ResponseCacheService.getRedis();
console.log('Redis 状态:', redis.status);

// 查看缓存统计
const stats = await ResponseCacheService.getStats();
console.log('缓存统计:', stats);

// 手动清理缓存
await ResponseCacheService.cleanup();
```

### 成本记录失败

```javascript
// 检查 Redis 连接
const redis = CostAnalysisService.redis;
console.log('Cost Redis 状态:', redis.status);

// 手动测试记录
await CostAnalysisService.recordUsage({
  provider: 'test',
  model: 'test',
  promptTokens: 10,
  completionTokens: 10,
  totalTokens: 20,
  userId: 'test',
  taskType: 'test'
});

// 查看成本数据
const cost = await CostAnalysisService.getDailyTotal();
console.log('今日成本:', cost);
```

---

## 📈 性能调优

### 缓存优化

```javascript
// 调整缓存 TTL
CACHE_DEFAULT_TTL=7200        // 2 小时
CACHE_QUESTION_TTL=172800     // 2 天
CACHE_CHAT_TTL=900            // 15 分钟

// 根据业务调整
if (taskType === 'frequently-changing') {
  options.cacheTTL = 300;     // 5 分钟
}
```

### 批量更新优化

```javascript
// 调整批次大小
BATCH_UPDATE_SIZE=100         // 增大批次
BATCH_FLUSH_INTERVAL=3000     // 缩短间隔

// 高峰期动态调整
if (isPeakHour()) {
  BatchUpdateService.config.batchSize = 200;
}
```

### 监控指标优化

```javascript
// 减少指标基数
// 避免使用高基数标签（如 userId）
PrometheusExporter.recordAIRequest(provider, model, taskType, status);
// ✅ 好：低基数标签
// ❌ 避免：PrometheusExporter.recordAIRequest(provider, model, taskType, userId);
```

---

## 🎯 最佳实践

1. **缓存策略**
   - 只对幂等操作使用缓存
   - 设置合理的 TTL
   - 定期清理过期缓存

2. **批量更新**
   - 在低峰期刷新队列
   - 监控队列大小
   - 设置合理的重试次数

3. **成本控制**
   - 设置预算告警阈值
   - 定期查看成本分析
   - 优化高成本模型的使用

4. **监控告警**
   - 分级告警（info/warning/critical）
   - 设置告警静默期
   - 编写告警处理手册

5. **多服务商**
   - 优先使用性价比高的服务商
   - 实现智能故障转移
   - 定期健康检查

---

## 📞 支持

遇到问题请检查：
1. 日志文件
2. 监控仪表盘
3. 配置文件
4. 网络连接

**文档版本**: 1.0  
**更新时间**: 2026-03-17
