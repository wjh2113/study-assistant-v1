# StudyAss Backend

学习助手后端服务 - 基于 Node.js + Express + BullMQ

## 技术栈

- **运行时**: Node.js >= 18.x
- **框架**: Express.js
- **ORM**: Prisma
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **队列**: BullMQ + Redis
- **认证**: JWT

## 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.x | 推荐使用 LTS 版本 |
| npm | >= 9.x | Node.js 包管理器 |
| **Redis** | **>= 7.0** | **BullMQ 队列必需** (2026-03-17 升级) |
| Git | 最新 | 版本控制 |

### Redis 安装说明

**重要**: 本项目使用 BullMQ 进行异步任务处理，需要 Redis 7.0+ 支持。

#### Windows 环境（推荐 WSL2 方案）

由于 Redis 官方已停止 Windows 原生支持（最后版本 3.2.100），推荐使用 WSL2 安装：

```bash
# 1. 安装 WSL2 和 Ubuntu
wsl --install -d Ubuntu

# 2. 在 Ubuntu 中安装 Redis 7.2
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update
sudo apt install -y redis

# 3. 配置 Redis（允许 Windows 连接）
sudo nano /etc/redis/redis.conf
# 修改：bind 0.0.0.0
# 修改：protected-mode no

# 4. 启动 Redis
sudo systemctl start redis
sudo systemctl enable redis
```

详细安装指南请查看项目根目录：`docs/REDIS-UPGRADE-GUIDE.md`

#### 验证 Redis 连接

```bash
# 测试连接
redis-cli ping
# 应返回：PONG

# 检查版本
redis-server --version
# 应显示：Redis server v=7.2.x
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板并修改：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DATABASE_PATH=./database/sqlite.db

# Redis 配置（BullMQ 必需）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=StudyAss2026!Redis  # 如果设置了密码

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI API 配置
AI_API_KEY=your-api-key
AI_API_URL=https://api.example.com/v1/chat

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 测试模式
TEST_MODE=false
```

### 3. 初始化数据库

```bash
npm run db:generate
npm run db:migrate
```

### 4. 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start

# 仅启动队列 Worker
npm run workers
```

服务将在 http://localhost:3001 启动

## 可用命令

```bash
npm run dev           # 开发模式（热重载）
npm start             # 生产模式
npm run workers       # 启动队列 Worker
npm run dev:workers   # 开发模式启动 Worker
npm test              # 运行测试
npm run db:migrate    # 数据库迁移
npm run db:generate   # 生成 Prisma 客户端
npm run db:studio     # 打开 Prisma Studio
```

## 项目结构

```
backend/
├── src/
│   ├── config/
│   │   └── queue.js        # BullMQ 队列配置
│   ├── controllers/        # 控制器
│   ├── middleware/         # 中间件
│   ├── routes/             # 路由
│   ├── services/           # 业务逻辑
│   ├── workers/            # 队列 Worker
│   │   ├── index.js        # Worker 入口
│   │   ├── textbookParser.js
│   │   ├── aiQuestionGenerator.js
│   │   └── leaderboardCalculator.js
│   ├── utils/              # 工具函数
│   └── server.js           # 服务器入口
├── prisma/
│   └── schema.prisma       # 数据库模型
├── uploads/                # 上传文件目录
├── database/               # SQLite 数据库
├── .env                    # 环境变量
├── .env.example            # 环境变量模板
└── package.json
```

## 队列系统

本项目使用 BullMQ 处理异步任务：

### 队列类型

| 队列名称 | 用途 | Worker |
|---------|------|--------|
| `textbook-parse` | 课本 PDF 解析 | `textbookParser.js` |
| `ai-generate` | AI 题目生成 | `aiQuestionGenerator.js` |
| `report-generate` | 学习报告生成 | - |
| `leaderboard-calc` | 排行榜计算 | `leaderboardCalculator.js` |

### 添加任务示例

```javascript
const { addTextbookParseJob } = require('./src/config/queue');

// 添加课本解析任务
await addTextbookParseJob({
  textbookId: '123',
  filePath: '/path/to/file.pdf'
});
```

### 监控队列

使用 Redis 命令行监控队列状态：

```bash
redis-cli
> KEYS bull:*
> LLEN bull:textbook-parse:wait
> HGETALL bull:job:123
```

## API 文档

详细 API 文档请查看项目根目录：`project/v1-prd/docs/API.md`

## 测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

## 故障排查

### Redis 连接问题

```javascript
// 错误：Redis version needs to be greater than 5.0.0
// 解决：升级 Redis 到 7.0+（见上方安装说明）

// 错误：Connection refused
// 解决：检查 Redis 服务是否启动
redis-cli ping
```

### 队列 Worker 不工作

1. 检查 Redis 连接
2. 确认 Worker 进程已启动：`npm run workers`
3. 查看 Worker 日志

## 更新日志

### 2026-03-17
- 🔴 **紧急升级**: Redis 版本要求从 3.x 升级到 7.0+
- 原因：BullMQ 3.x 需要 Redis 5.0+，当前 3.0.504 不兼容
- 详见：`../docs/REDIS-UPGRADE-GUIDE.md`

---

**最后更新**: 2026-03-17
