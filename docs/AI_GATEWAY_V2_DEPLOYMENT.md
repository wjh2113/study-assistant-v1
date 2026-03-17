# AI Gateway V2 部署指南

## 概述

本文档介绍如何部署 AI Gateway V2，包括环境配置、依赖安装、数据库迁移和启动服务。

---

## 前置要求

- Node.js >= 18.0.0
- Redis >= 6.0 (用于限流和 Token 计数)
- SQLite (默认) 或 PostgreSQL (可选)

---

## 1. 环境配置

### 1.1 复制环境变量文件

```bash
cp .env.example .env
```

### 1.2 配置必要的环境变量

编辑 `.env` 文件，配置以下内容：

```bash
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置 (SQLite 默认)
# DATABASE_PATH=./database/sqlite.db

# 或使用 PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/studyass?schema=public

# Redis 配置 (限流和 Token 计数必需)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=        # 可选
REDIS_DB=0

# AI 服务商配置 (至少配置一个)

# 阿里云通义千问 (推荐)
ALIYUN_API_KEY=your_aliyun_api_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_EMBEDDING_URL=https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding

# OpenAI (可选)
# OPENAI_API_KEY=your_openai_api_key
# OPENAI_BASE_URL=https://api.openai.com/v1

# Azure OpenAI (可选)
# AZURE_API_KEY=your_azure_api_key
# AZURE_BASE_URL=https://your-resource.openai.azure.com
# AZURE_DEPLOYMENT=your-deployment

# 月之暗面 (可选)
# MOONSHOT_API_KEY=your_moonshot_api_key
# MOONSHOT_BASE_URL=https://api.moonshot.cn/v1

# 日志配置
LOG_LEVEL=info
```

---

## 2. 安装依赖

### 2.1 安装 Node.js 依赖

```bash
cd backend
npm install
```

### 2.2 确认依赖已安装

检查 `package.json` 中是否包含以下依赖：

```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "ioredis": "^5.10.0",
    "better-sqlite3": "^12.8.0",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2"
  }
}
```

---

## 3. 数据库迁移

### 3.1 运行 V1 迁移（如果未执行）

```bash
node src/modules/ai-gateway/migration.js
```

预期输出：
```
开始 AI Gateway 数据库迁移...
✅ ai_task_logs 表创建成功
✅ 索引创建成功
🎉 AI Gateway 数据库迁移完成！
```

### 3.2 运行 V2 迁移

```bash
node src/modules/ai-gateway/migration-v2.js
```

预期输出：
```
开始 AI Gateway V2 数据库迁移...

✅ 添加 provider_used 字段成功
✅ 记录 V2 迁移完成

🎉 AI Gateway V2 数据库迁移完成！
```

### 3.3 （可选）运行 AI Chat 模块迁移

```bash
node src/modules/ai-chat/migration.js
```

---

## 4. 启动服务

### 4.1 开发环境

```bash
# 启动后端服务
npm run dev

# 或启动 Worker 进程（如果需要后台任务处理）
npm run dev:workers
```

### 4.2 生产环境

```bash
# 启动后端服务
npm start

# 启动 Worker 进程
npm run workers
```

### 4.3 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/server.js --name studyass-backend

# 启动 Worker
pm2 start src/workers/index.js --name studyass-workers

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all
```

---

## 5. 验证部署

### 5.1 检查服务状态

```bash
curl http://localhost:3000/api/health
```

### 5.2 检查 AI Gateway 健康

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/ai/v2/health
```

### 5.3 测试题目生成

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/ai/v2/generate-questions \
  -d '{
    "grade": "八年级",
    "subject": "物理",
    "unit": "运动和力",
    "textbookContent": "牛顿第一定律...",
    "questionCount": 3,
    "difficulty": "medium",
    "questionType": "choice"
  }'
```

---

## 6. 监控和维护

### 6.1 查看 Token 使用统计

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/ai/v2/token-usage?date=2026-03-17"
```

### 6.2 查看任务日志

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/ai/v2/task-logs?status=completed&page=1&pageSize=20"
```

### 6.3 监控 Redis

```bash
redis-cli
> KEYS ai:*
> HGETALL ai:token_usage:2026-03-17
> GET ai:rate_limit:user_123
```

---

## 7. 故障排查

### 7.1 Redis 连接失败

**问题**: 日志中出现 "Redis 连接错误"

**解决方案**:
1. 检查 Redis 是否运行：`redis-cli ping`
2. 检查 `.env` 中的 Redis 配置
3. 检查防火墙设置

### 7.2 AI API 调用失败

**问题**: 返回 "API Key 未配置" 或 "API 调用失败"

**解决方案**:
1. 检查 `.env` 中的 API Key 配置
2. 确认 API Key 有效且未过期
3. 检查网络连接
4. 查看 AI 服务商状态页面

### 7.3 数据库迁移失败

**问题**: 迁移脚本报错 "Cannot read properties of null"

**解决方案**:
1. 检查数据库配置是否正确
2. 如果使用 PostgreSQL，确保 Prisma 已正确配置
3. 如果使用 SQLite，确保数据库目录有写权限

### 7.4 限流失效

**问题**: 限流未生效，用户可以无限请求

**解决方案**:
1. 检查 Redis 连接是否正常
2. 检查限流配置是否正确
3. 查看 Redis 中的限流 key：`GET ai:rate_limit:user_xxx`

---

## 8. 性能优化

### 8.1 Redis 优化

```bash
# 配置 Redis 内存限制
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 8.2 数据库优化

```sql
-- 确保索引存在
CREATE INDEX IF NOT EXISTS idx_ai_task_logs_user_id ON ai_task_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_logs_task_type ON ai_task_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_task_logs_status ON ai_task_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_task_logs_created_at ON ai_task_logs(created_at);
```

### 8.3 应用优化

- 启用 Node.js 集群模式
- 使用 PM2 进行进程管理
- 配置日志轮转
- 启用 Gzip 压缩

---

## 9. 安全建议

### 9.1 API Key 保护

- 不要在代码中硬编码 API Key
- 使用环境变量或密钥管理服务
- 定期轮换 API Key

### 9.2 限流配置

根据业务需求调整限流参数：

```javascript
// 在 AiGatewayControllerV2.js 中
const rateLimit = await AiGatewayServiceV2.checkRateLimit(req.user.id, 20, 60);
// 参数：userId, limit(请求次数), window(时间窗口秒)
```

### 9.3 日志审计

定期审查任务日志，检测异常使用模式：

```bash
# 导出失败的任务日志
sqlite3 database/sqlite.db \
  "SELECT * FROM ai_task_logs WHERE status='failed' ORDER BY created_at DESC LIMIT 100;"
```

---

## 10. 升级指南

### 10.1 从 V1 升级到 V2

1. 备份数据库
2. 安装新依赖：`npm install`
3. 运行 V2 迁移：`node src/modules/ai-gateway/migration-v2.js`
4. 更新环境变量配置
5. 重启服务
6. 验证功能

### 10.2 回滚到 V1

1. 停止服务
2. 恢复数据库备份
3. 恢复代码到 V1 版本
4. 重启服务

---

## 11. 联系支持

如遇到问题，请提供以下信息：

- 错误日志
- 环境配置（隐藏敏感信息）
- 复现步骤
- AI Gateway 版本

---

## 附录：Docker 部署（可选）

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - ALIYUN_API_KEY=${ALIYUN_API_KEY}
    depends_on:
      - redis
    volumes:
      - ./backend/database:/app/database

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### 启动 Docker

```bash
docker-compose up -d
```

---

**文档版本**: V2.0.0  
**最后更新**: 2026-03-17  
**维护者**: AI 团队
