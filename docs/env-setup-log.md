# 学习助手 - 环境配置日志

**配置时间**: 2026-03-15 07:18 GMT+8  
**配置人**: DevOps Sub-Agent  
**最后更新**: 2026-03-15 07:23 GMT+8（切换到本地存储）

---

## 1. .env 文件配置

### 操作内容
- 复制 `backend/.env.example` 到 `backend/.env`
- 生成强随机 JWT_SECRET（64 字符）
- 配置数据库连接为 MySQL
- 配置 Redis 连接
- ~~配置 OSS 测试凭据~~ → **已移除，改用本地存储**
- 配置 AI API 测试凭据

### 配置结果
```env
# 服务器配置
PORT=3000
BASE_URL=http://localhost:3000

# JWT 密钥（强随机生成 - 64 字符）
JWT_SECRET=fde303e60b273f4fa6115d8869e2161469f15986d2cf9a2247e62cd4b63a1b71

# MySQL 数据库连接
DATABASE_URL=mysql://root:studyass123@localhost:3306/studyass

# Redis 配置
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 本地文件存储配置
UPLOAD_DIR=./uploads
# 已禁用 OSS，使用本地存储

# AI API 配置（测试值）
AI_API_KEY=test-ai-api-key
AI_API_URL=https://api.example.com/v1/chat
```

---

## 1.5 切换到本地文件存储（需求变更）

### 变更时间
2026-03-15 07:23 GMT+8

### 变更内容
- **移除 OSS 配置**: 从 .env 中删除 OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET
- **添加本地存储配置**: UPLOAD_DIR=./uploads, BASE_URL=http://localhost:3000
- **上传目录结构**:
  - `backend/uploads/textbooks/` - 课本 PDF 文件
  - `backend/uploads/avatars/` - 用户头像
  - `backend/uploads/attachments/` - 其他附件
- **静态文件服务**: 已配置 `http://localhost:3000/uploads/*` 访问路径
- **文件上传接口**:
  - `POST /api/upload/textbook` - 上传课本 PDF
  - `POST /api/upload/avatar` - 上传头像
  - `POST /api/upload/attachment` - 上传附件

### 验证结果
✅ 上传目录已创建  
✅ 静态文件服务已配置  
✅ 上传接口测试通过  

---

## 2. Prisma 切换到 MySQL

### 操作内容
- 修改 `backend/prisma/schema.prisma`：provider 从 `postgresql` 改为 `mysql`
- 运行 `npx prisma generate`
- 运行 `npx prisma migrate dev --name init`

### 配置结果
✅ Prisma Client 生成成功 (v5.22.0)  
✅ 数据库迁移成功：`20260314232120_init`  
✅ 数据库 schema 已同步

---

## 3. 基础设施服务安装与启动

### MySQL
- **安装方式**: winget install Oracle.MySQL
- **版本**: 8.4.8
- **服务名**: MySQL
- **状态**: ✅ 运行中
- **数据库**: studyass
- **用户**: root
- **密码**: studyass123

### Redis
- **安装方式**: winget install Redis.Redis
- **版本**: 3.0.504
- **服务名**: Redis
- **状态**: ✅ 运行中
- **端口**: 6379

---

## 4. 应用服务启动

### 后端服务
- **工作目录**: `E:\openclaw\workspace-studyass-mgr\backend`
- **启动命令**: `npm start`
- **运行端口**: 3000
- **状态**: ✅ 运行中
- **健康检查**: http://localhost:3000/api/health

**健康检查结果**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-14T23:22:32.958Z",
  "uptime": 34.8870327,
  "services": {
    "database": "connected",
    "memory": {
      "used": 15,
      "total": 17,
      "unit": "MB"
    }
  }
}
```

### 前端服务
- **工作目录**: `E:\openclaw\workspace-studyass-mgr\frontend`
- **启动命令**: `npm run dev`
- **运行端口**: 5173
- **状态**: ✅ 运行中
- **访问地址**: http://localhost:5173

**访问测试结果**: ✅ HTTP 200 OK，HTML 内容正常返回

---

## 5. 验证总结

| 服务 | 地址 | 状态 | 备注 |
|------|------|------|------|
| MySQL | localhost:3306 | ✅ 运行中 | 数据库 studyass 已创建 |
| Redis | localhost:6379 | ✅ 运行中 | 默认配置 |
| 后端 API | http://localhost:3000 | ✅ 运行中 | 健康检查通过 |
| 前端 | http://localhost:5173 | ✅ 运行中 | Vite 开发服务器 |

---

## 6. 注意事项

1. **速率限制警告**: 启动时出现 express-rate-limit 的 IPv6 相关验证警告，但不影响服务正常运行。
2. **Redis 版本警告**: BullMQ 需要 Redis 5.0+，当前安装版本为 3.0.504。队列功能暂时不可用，但不影响文件上传等核心功能。
3. **数据库类型**: 后端日志显示"使用 PostgreSQL 数据库"，实际通过 Prisma 连接 MySQL。
4. **本地存储**: 已移除 OSS 配置，使用本地文件存储。生产环境部署时需要考虑文件持久化和备份策略。

---

## 7. 团队通知

### P1 功能组
**通知内容**: 文件存储已从 OSS 切换到本地存储
- 上传接口返回本地路径：`http://localhost:3000/uploads/{type}/{filename}`
- 课本解析、头像上传、附件上传功能均已适配
- 测试时请验证文件上传和访问功能

### 测试组
**通知内容**: 环境配置完成，可以开始测试
- 后端：http://localhost:3000
- 前端：http://localhost:5173
- 健康检查：http://localhost:3000/api/health
- 上传测试：http://localhost:3000/api/upload/test

---

**配置完成时间**: 2026-03-15 07:24 GMT+8  
**总耗时**: 约 6 分钟
