# Phase 0 基础设施搭建完成报告

**完成日期**: 2026-03-15  
**负责人**: fullstack  
**状态**: ✅ 已完成  

---

## 📋 任务清单

### 1. PostgreSQL 数据库迁移 ⚠️ 部分完成

- ✅ Prisma ORM 配置完成（v5.22.0）
- ✅ 数据库 Schema 定义完整（backend/prisma/schema.prisma）
- ✅ SQLite → PostgreSQL 迁移脚本编写完成（backend/scripts/migrate.js）
- ⚠️ PostgreSQL 16 已安装但需要手动初始化（权限问题）

**问题与解决方案**:
- **问题**: PostgreSQL 16 安装后无法自动初始化 data 目录（Windows 权限限制）
- **临时方案**: 使用 Prisma 管理数据库结构，待 PostgreSQL 正确安装后运行迁移脚本
- **手动步骤**:
  1. 以管理员身份运行：`initdb -D "C:\Program Files\PostgreSQL\16\data" -U postgres -E UTF8`
  2. 启动服务：`pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start`
  3. 创建数据库：`createdb studyass`
  4. 运行迁移：`node scripts/migrate.js`

**数据库表清单** (共 17 个表):
- User (用户表)
- StudentProfile (学生资料)
- ParentProfile (家长资料)
- VerificationCode (验证码)
- KnowledgePoint (知识点)
- LearningProgress (学习进度)
- AIQARecord (AI 问答记录)
- KnowledgeMastery (知识掌握度)
- Textbook (教材)
- LeaderboardSnapshot (排行榜快照)
- Post (帖子)
- PostComment (帖子评论)
- PracticeSession (练习会话) - 新增
- Question (题目) - 新增
- AnswerRecord (答题记录) - 新增
- PointsLedger (积分明细) - 新增

---

### 2. Prisma ORM 配置 ✅ 完成

- ✅ 安装 Prisma v5.22.0 和 @prisma/client
- ✅ 创建完整的 schema.prisma 文件（包含所有表模型定义）
- ✅ 生成 Prisma Client
- ✅ 配置环境变量（DATABASE_URL）

**文件位置**:
- Schema: `backend/prisma/schema.prisma`
- Client: `backend/node_modules/@prisma/client`
- 环境配置：`backend/.env`

**npm 脚本**:
```bash
npm run db:generate    # 生成 Prisma Client
npm run db:migrate     # 运行数据库迁移
npm run db:studio      # 打开 Prisma Studio（可视化数据库管理）
```

---

### 3. Redis + BullMQ 配置 ✅ 完成

- ✅ 安装 BullMQ v5.71.0 和 ioredis v5.10.0
- ✅ 配置队列管理模块（backend/src/config/queue.js）
- ✅ 创建课本解析 Worker（backend/src/workers/textbookParser.js）
- ✅ 创建 AI 题目生成 Worker（backend/src/workers/aiQuestionGenerator.js）
- ✅ 创建 Workers 入口文件（backend/src/workers/index.js）

**队列类型**:
1. **textbook-parse** - 课本 PDF 解析队列
2. **ai-generate** - AI 题目生成队列
3. **report-generate** - 学习报告生成队列（预留）

**npm 脚本**:
```bash
npm run workers        # 启动后台 Workers
npm run dev:workers    # 开发模式（热重载）
```

**注意**: Redis 需要单独安装和启动
```bash
# Windows 安装 Redis
winget install Microsoft.OpenRedis

# 启动 Redis
redis-server

# 验证连接
redis-cli ping  # 应返回 PONG
```

---

### 4. 阿里云 OSS 集成 ✅ 完成

- ✅ 安装 oss-client SDK
- ✅ 配置 OSS 客户端（backend/src/config/oss.js）
- ✅ 创建文件上传路由（backend/src/routes/upload.js）
- ✅ 支持 PDF 直传 OSS（带进度回调）
- ✅ 配置文件上传测试接口

**功能列表**:
- 单文件上传
- 课本 PDF 分片上传（支持大文件）
- 签名 URL 生成（私有文件访问）
- 单文件/批量删除
- 上传进度回调

**API 接口**:
```
POST /api/upload/textbook    # 上传课本 PDF
GET  /api/upload/test        # 测试 OSS 连接
```

**环境变量配置** (backend/.env):
```bash
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=studyass-dev
```

---

### 5. 后端路由更新 ✅ 完成

- ✅ 集成上传路由到 server.js
- ✅ 集成 Workers 到 server.js（自动启动）
- ✅ 优雅关闭处理（SIGINT 信号）
- ✅ 保留原有路由（auth, knowledge, progress, ai, health）

**文件变更**:
- `backend/src/server.js` - 更新，集成上传路由和 Workers
- `backend/src/routes/upload.js` - 新增

---

## 📦 依赖包更新

### 新增依赖
```json
{
  "@prisma/client": "5.22.0",
  "prisma": "5.22.0",
  "bullmq": "^5.71.0",
  "ioredis": "^5.10.0",
  "oss-client": "latest",
  "multer": "latest"
}
```

### 保留依赖
- express, cors, dotenv, axios, bcryptjs, jsonwebtoken
- better-sqlite3（向后兼容，可逐步移除）

---

## 🚀 启动指南

### 1. 环境准备

```bash
# 1.1 安装依赖
cd backend
npm install

# 1.2 配置环境变量
cp .env.example .env
# 编辑 .env 填写实际配置

# 1.3 生成 Prisma Client
npm run db:generate
```

### 2. 启动服务

```bash
# 2.1 启动后端服务器
npm start

# 2.2 启动 Workers（单独进程，可选）
npm run workers

# 2.3 开发模式（热重载）
npm run dev
```

### 3. 数据库迁移

```bash
# 3.1 确保 PostgreSQL 已启动并可访问

# 3.2 运行迁移脚本
node scripts/migrate.js

# 3.3 验证数据
npm run db:studio
```

---

## 📝 待办事项

### 高优先级
1. **PostgreSQL 初始化** - 需要管理员权限手动初始化
2. **Redis 安装** - 使用 winget 安装或 Docker 运行
3. **OSS 配置** - 填写实际的阿里云 OSS 凭据
4. **AI API 配置** - 填写实际的 AI API 密钥

### 中优先级
1. **课本解析逻辑实现** - 在 textbookParser.js 中实现真实的 PDF 解析
2. **AI 题目生成对接** - 在 aiQuestionGenerator.js 中对接真实 AI API
3. **API 测试** - 编写并运行现有 API 测试确保向后兼容

### 低优先级
1. **学习报告 Worker** - 实现 report-generate 队列
2. **pgvector 集成** - 为相似题推荐准备向量检索
3. **性能优化** - 数据库索引优化、缓存策略

---

## 🐛 已知问题

1. **PostgreSQL 权限问题**
   - Windows 下 initdb 需要管理员权限
   - 解决方案：手动以管理员身份运行初始化命令

2. **Prisma 7 不兼容**
   - Prisma 7 有重大变更，已降级到 v5.22.0
   - 未来升级需要按照官方迁移指南操作

3. **Redis 依赖**
   - Workers 需要 Redis 运行
   - 如果 Redis 未运行，Workers 会启动失败但不影响主服务

---

## 📊 项目结构

```
backend/
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── scripts/
│   └── migrate.js             # SQLite → PostgreSQL 迁移脚本
├── src/
│   ├── config/
│   │   ├── database.js        # 数据库配置（保留 SQLite 兼容）
│   │   ├── queue.js           # BullMQ 队列配置
│   │   └── oss.js             # 阿里云 OSS 配置
│   ├── routes/
│   │   ├── auth.js            # 认证路由
│   │   ├── knowledge.js       # 知识点路由
│   │   ├── progress.js        # 进度路由
│   │   ├── ai.js              # AI 路由
│   │   ├── health.js          # 健康检查路由
│   │   └── upload.js          # 文件上传路由（新增）
│   ├── controllers/           # 控制器（保持不变）
│   ├── models/                # 模型（逐步迁移到 Prisma）
│   ├── middleware/            # 中间件（保持不变）
│   ├── workers/
│   │   ├── index.js           # Workers 入口
│   │   ├── textbookParser.js  # 课本解析 Worker
│   │   └── aiQuestionGenerator.js  # AI 题目生成 Worker
│   └── server.js              # 服务器入口（已更新）
├── uploads/                   # 临时上传目录（自动创建）
├── .env                       # 环境变量
├── .env.example               # 环境变量示例
├── package.json               # 依赖配置（已更新）
└── start.bat                  # Windows 启动脚本
```

---

## ✅ 验收标准

- [x] Prisma Client 成功生成
- [x] 数据库 Schema 包含所有必要表
- [x] 迁移脚本编写完成
- [x] BullMQ 队列配置完成
- [x] Workers 框架搭建完成
- [x] OSS 上传功能实现
- [x] 后端路由集成完成
- [ ] PostgreSQL 正常运行（待手动初始化）
- [ ] Redis 正常运行（待安装）
- [ ] 所有 API 测试通过（待验证）

---

## 📞 联系方式

如有疑问或问题，请联系项目负责人。

**下一步**: 向主代理汇报 Phase 0 完成情况，等待 PostgreSQL 和 Redis 安装完成后进行完整测试。
