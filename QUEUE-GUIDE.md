# 队列使用指南 - Redis 7.0.15

## 🚀 快速开始

### 1. 添加任务到队列

```javascript
const {
  addTextbookParseJob,
  addAIGenerateJob,
  addReportGenerateJob,
} = require('./src/config/queue');

// 添加课本解析任务
await addTextbookParseJob({
  textbookId: 'book-123',
  filePath: '/path/to/file.pdf',
});

// 添加 AI 题目生成任务
await addAIGenerateJob({
  sessionId: 'session-123',
  textbookId: 'book-123',
  unitId: 'unit-1',
  questionCount: 5,
});

// 添加学习报告生成任务
await addReportGenerateJob({
  userId: 'user-123',
  reportType: 'weekly', // 或 'monthly'
});
```

### 2. 启动 Workers

```bash
# 启动所有 Workers
node backend/src/workers/index.js

# 或者单独启动某个 Worker
node backend/src/workers/textbookParser.js
node backend/src/workers/aiQuestionGenerator.js
node backend/src/workers/reportGenerator.js
```

### 3. 运行集成测试

```bash
node backend/test-queue-integration.js
```

---

## 📋 队列说明

| 队列名称 | 用途 | 并发数 | 重试次数 |
|---------|------|--------|---------|
| textbook-parse | 课本 PDF 解析 | 2 | 3 |
| ai-generate | AI 题目生成 | 3 | 3 |
| report-generate | 学习报告生成 | 2 | 2 |

---

## 🔧 配置说明

### 环境变量 (.env)

```bash
# Redis 配置
REDIS_HOST=172.26.168.165  # WSL2 IP
REDIS_PORT=6379
REDIS_PASSWORD=StudyAss2026!Redis

# 测试模式（可选）
TEST_MODE=true  # 跳过某些 Redis 版本检查
```

---

## 📊 监控队列

### Redis CLI

```bash
# 连接 Redis
redis-cli -h 172.26.168.165 -p 6379 -a StudyAss2026!Redis

# 查看所有队列
KEYS *

# 查看队列长度
LLEN bull:textbook-parse:wait
LLEN bull:ai-generate:wait
LLEN bull:report-generate:wait

# 查看活跃任务
KEYS bull:*:active

# 查看失败任务
KEYS bull:*:failed
```

### 查看任务状态

```javascript
const { queues } = require('./src/config/queue');

// 获取等待中的任务数
const waiting = await queues['textbook-parse'].getWaitingCount();

// 获取活跃任务数
const active = await queues['textbook-parse'].getActiveCount();

// 获取失败任务数
const failed = await queues['textbook-parse'].getFailedCount();
```

---

## ⚠️ 常见问题

### 1. Redis 连接失败

**症状**: `Error: connect ECONNREFUSED`

**解决方案**:
- 检查 WSL2 是否运行：`wsl --list --running`
- 检查 Redis 服务：`wsl -e systemctl status redis`
- 验证 IP 地址：`wsl hostname -I`

### 2. 任务一直处于 waiting 状态

**症状**: 任务已添加但未处理

**解决方案**:
- 确认 Worker 已启动
- 检查 Worker 日志是否有错误
- 验证 Redis 连接正常

### 3. 任务失败

**症状**: 任务状态变为 failed

**解决方案**:
- 查看 Worker 日志获取错误详情
- 检查任务数据格式是否正确
- 使用 Redis CLI 查看失败原因：
  ```bash
  redis-cli -h 172.26.168.165 -p 6379
  > LRANGE bull:textbook-parse:failed 0 -1
  ```

---

## 🔐 安全提示

- Redis 密码已配置在 `.env` 文件中，不要提交到版本控制
- WSL2 IP 可能会在重启后变化，注意更新配置
- 生产环境建议使用 Redis ACL 用户而非 default 用户

---

## 📚 相关文档

- [Redis 7.0.15 兼容性修复报告](./REDIS-7-COMPATIBILITY-FIX.md)
- [BullMQ 官方文档](https://docs.bullmq.io/)
- [ioredis 文档](https://github.com/luin/ioredis)

---

**最后更新**: 2026-03-17  
**Redis 版本**: 7.0.15  
**BullMQ 版本**: 5.71.0
