# ⚡ 性能优化快速开始指南

## 🚀 快速启用 (5 分钟)

### 1. 安装依赖 (如需要)

```bash
cd backend
npm install ioredis prom-client
```

### 2. 配置环境变量

复制并编辑 `.env` 文件：

```bash
cd backend
copy .env.example .env
```

编辑 `.env`，添加以下配置：

```ini
# Redis 配置 (必须)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# CDN 配置 (可选)
CDN_ENABLED=false
CDN_URL=https://cdn.example.com

# 性能优化
SLOW_REQUEST_THRESHOLD_MS=1000
```

### 3. 启动服务

```bash
cd backend
npm start
```

查看启动日志，确认性能优化已加载：

```
⚡ 性能优化:
   - ✅ 数据库索引优化 (WAL 模式 + 复合索引)
   - ✅ API 响应缓存 (Redis)
   - ✅ Gzip/Brotli 压缩
   - ✅ 静态资源缓存策略
   - ✅ CDN 配置支持
   - ✅ 性能监控 (Prometheus)
   - ✅ 慢请求日志
```

### 4. 验证优化

#### 检查性能状态
```bash
curl http://localhost:3000/api/performance/status
```

#### 检查 Prometheus 指标
```bash
curl http://localhost:3000/metrics
```

#### 检查缓存状态
```bash
# 第一次请求 (MISS)
curl -i http://localhost:3000/api/health

# 第二次请求 (HIT)
curl -i http://localhost:3000/api/health
```

查看响应头中的 `X-Cache` 字段。

---

## 📊 使用缓存

### 在路由中添加缓存

```javascript
const { cacheMiddleware } = require('./middleware/cache');

// 缓存 5 分钟
app.get('/api/knowledge', 
  cacheMiddleware('knowledge', 300),
  knowledgeController.list
);

// 缓存 1 小时
app.get('/api/leaderboard',
  cacheMiddleware('leaderboard', 3600),
  leaderboardController.get
);

// 自定义缓存 key
app.get('/api/user/:id/profile',
  cacheMiddleware('user', 600, (req) => `profile:${req.params.id}`),
  userController.getProfile
);
```

### 清除缓存

```bash
# API 调用
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"pattern": "api:knowledge:*"}'
```

```javascript
// 代码中清除
const { invalidateCache } = require('./middleware/cache');

// 清除所有知识相关缓存
await invalidateCache('api:knowledge:*');

// 清除特定用户缓存
await invalidateCache('api:user:profile:123');
```

### 缓存预热

```javascript
const { warmCache } = require('./middleware/cache');

// 预热全局配置
await warmCache('api:config:global', configData, 3600);
```

---

## 📦 配置 CDN

### 1. 选择 CDN 服务商

在 `.env` 中配置：

```ini
# 阿里云 OSS
CDN_ENABLED=true
CDN_PROVIDER=aliyun
CDN_URL=https://your-bucket.oss-cn-hangzhou.aliyuncs.com
ALIYUN_OSS_BUCKET=your-bucket
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_ACCESS_KEY_ID=your-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-key-secret

# 或腾讯云 COS
CDN_ENABLED=true
CDN_PROVIDER=tencent
CDN_URL=https://your-bucket.cos.ap-guangzhou.myqcloud.com
TENCENT_COS_BUCKET=your-bucket
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_SECRET_ID=your-secret-id
TENCENT_COS_SECRET_KEY=your-secret-key

# 或七牛云
CDN_ENABLED=true
CDN_PROVIDER=qiniu
CDN_URL=https://your-domain.com
QINIU_BUCKET=your-bucket
QINIU_DOMAIN=your-domain.com
QINIU_ACCESS_KEY=your-access-key
QINIU_SECRET_KEY=your-secret-key

# 或 Cloudflare
CDN_ENABLED=true
CDN_PROVIDER=cloudflare
CDN_URL=https://your-domain.com
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### 2. 前端构建

```bash
cd frontend

# 设置环境变量
$env:VITE_CDN_ENABLED="true"
$env:VITE_CDN_URL="https://cdn.yourdomain.com"
$env:VITE_APP_VERSION="1.0.0"

# 生产构建
npm run build
```

### 3. 上传到 CDN

根据服务商文档上传 `frontend/dist` 目录到 CDN。

---

## 🧪 运行压力测试

### 基础测试

```bash
cd backend
node tests/stress-test.js
```

### 自定义测试

编辑 `backend/tests/stress-test.js`：

```javascript
const config = {
  baseUrl: 'http://localhost:3000',
  concurrency: 50,  // 并发数
  duration: 60,     // 测试时长 (秒)
  endpoints: [
    { path: '/api/health', method: 'GET', name: '健康检查' },
    { path: '/api/knowledge', method: 'GET', name: '知识点' },
    // 添加更多端点...
  ]
};
```

### 查看报告

测试完成后会生成 JSON 报告：
```
backend/tests/stress-test-report-1710669600000.json
```

---

## 📈 监控性能

### 实时性能状态

访问：`http://localhost:3000/api/performance/status`

返回内容：
```json
{
  "performance": {
    "slowRequests": 5,
    "recentSlowRequests": [...],
    "concurrentRequests": 10
  },
  "cache": {
    "keysCount": 150,
    "hits": 1000,
    "misses": 200,
    "hitRate": "83.33%"
  },
  "cdn": {
    "enabled": true,
    "provider": "aliyun",
    "baseUrl": "https://..."
  },
  "slowRequests": [...]
}
```

### Prometheus 指标

访问：`http://localhost:3000/metrics`

关键指标：
- `http_request_duration_seconds` - HTTP 请求耗时
- `http_requests_total` - HTTP 请求总数
- `db_query_duration_seconds` - 数据库查询耗时
- `cache_hits_total` - 缓存命中数
- `cache_misses_total` - 缓存未命中数

### Grafana 仪表板

如果已配置 Prometheus + Grafana：

1. 添加 Prometheus 数据源：`http://localhost:9090`
2. 导入仪表板或创建自定义图表
3. 监控关键指标

---

## 🔧 故障排查

### Redis 连接失败

```
错误：[Cache] 缓存操作失败：connect ECONNREFUSED
```

**解决**：
1. 检查 Redis 是否运行：`redis-cli ping`
2. 检查 Redis 配置：`REDIS_URL` 是否正确
3. 检查防火墙设置

### 数据库索引创建失败

```
错误：[DB] 创建索引失败：...
```

**解决**：
1. 检查数据库文件权限
2. 手动创建索引：
```sql
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

### CDN 资源 404

```
错误：GET https://cdn.example.com/static/js/app.js 404
```

**解决**：
1. 检查 CDN 配置是否正确
2. 确认资源已上传到 CDN
3. 检查资源路径映射

---

## 📚 相关文档

- [完整性能优化报告](./PERFORMANCE-OPTIMIZATION-REPORT.md)
- [数据库优化文档](./backend/src/database/optimized-queries.js)
- [缓存中间件文档](./backend/src/middleware/cache.js)
- [CDN 配置文档](./backend/src/config/cdn.js)

---

## 💡 最佳实践

1. **缓存策略**
   - 读多写少的数据使用长 TTL
   - 实时性要求高的数据使用短 TTL 或不缓存
   - 定期清理过期缓存

2. **数据库优化**
   - 为常用查询字段创建索引
   - 使用预编译语句
   - 批量操作使用事务

3. **CDN 使用**
   - 静态资源使用长期缓存 + 版本控制
   - 动态内容使用短期缓存
   - 定期清除过期缓存

4. **监控告警**
   - 设置慢请求阈值告警
   - 监控缓存命中率
   - 跟踪数据库查询性能

---

**最后更新**: 2026-03-17  
**版本**: v1.0.0
