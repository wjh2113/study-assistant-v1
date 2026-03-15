# 部署指南 (Deployment Guide)

> 版本：v1.0.0  
> 最后更新：2026-03-15

## 目录

- [环境要求](#环境要求)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)
- [数据库迁移](#数据库迁移)
- [环境变量配置](#环境变量配置)
- [常见问题](#常见问题)

---

## 环境要求

### 基础环境

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **Git**: 最新版本

### 数据库（二选一）

- **SQLite**: 开发环境（内置，无需额外安装）
- **PostgreSQL**: >= 14.x（生产环境推荐）

### 可选依赖

- **Redis**: >= 6.x（排行榜缓存，生产环境推荐）
- **PM2**: 进程管理（生产环境推荐）
- **Docker**: >= 20.x（容器化部署）

---

## 开发环境部署

### 1. 克隆项目

```bash
git clone <repo-url>
cd studyass-mgr
```

### 2. 安装后端依赖

```bash
cd backend
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 开发环境配置
NODE_ENV=development
PORT=3000

# SQLite 数据库（开发环境）
DATABASE_PATH=./database/sqlite.db

# JWT 配置
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI API 配置
AI_API_KEY=your-dev-api-key
AI_API_URL=https://api.example.com/v1/chat

# 测试模式（允许使用通用验证码）
TEST_MODE=true
```

### 4. 初始化数据库

```bash
# SQLite 会自动初始化
# PostgreSQL 需要执行：
npx prisma migrate dev
npx prisma generate
```

### 5. 启动后端服务

```bash
npm run dev    # 开发模式（热重载）
# 或
npm start      # 生产模式
```

### 6. 安装前端依赖

```bash
cd ../frontend
npm install
```

### 7. 配置前端环境变量

创建 `.env` 文件：

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=学习助手
```

### 8. 启动前端服务

```bash
npm run dev
```

访问 http://localhost:5173

---

## 生产环境部署

### 1. 环境准备

```bash
# 安装 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 安装 PM2
npm install -g pm2
```

### 2. 克隆项目

```bash
git clone <repo-url>
cd studyass-mgr
```

### 3. 安装依赖

```bash
# 后端
cd backend
npm install --production

# 前端
cd ../frontend
npm install
npm run build
```

### 4. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env`：

```env
# 生产环境配置
NODE_ENV=production
PORT=3000

# PostgreSQL 数据库（生产环境）
DATABASE_URL=postgresql://user:password@localhost:5432/studyass

# JWT 配置（使用强随机密钥）
JWT_SECRET=<生成一个强随机密钥>
JWT_EXPIRES_IN=7d

# AI API 配置
AI_API_KEY=your-production-api-key
AI_API_URL=https://api.example.com/v1/chat

# 文件上传配置
UPLOAD_DIR=/var/www/studyass/uploads
MAX_FILE_SIZE=10485760

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379

# 测试模式（生产环境必须关闭）
TEST_MODE=false
```

### 5. 数据库迁移

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 6. 使用 PM2 启动服务

```bash
cd backend

# 启动后端服务
pm2 start npm --name "studyass-backend" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs studyass-backend
```

### 7. 配置 Nginx（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/studyass-mgr/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件
    location /uploads {
        alias /path/to/studyass-mgr/backend/uploads;
    }
}
```

### 8. 配置 HTTPS（推荐）

```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Docker 部署

### 1. 构建镜像

```bash
# 后端
cd backend
docker build -t studyass-backend .

# 前端
cd ../frontend
docker build -t studyass-frontend .
```

### 2. 使用 Docker Compose

```bash
cd studyass-mgr
docker-compose up -d
```

### 3. 查看服务状态

```bash
docker-compose ps
docker-compose logs -f
```

### 4. 停止服务

```bash
docker-compose down
```

---

## 数据库迁移

### SQLite → PostgreSQL

1. 导出 SQLite 数据：

```bash
cd backend
sqlite3 database/sqlite.db ".dump" > backup.sql
```

2. 修改环境变量：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/studyass
```

3. 执行迁移：

```bash
npx prisma migrate deploy
```

4. 导入数据（手动或使用脚本）

### Prisma 迁移命令

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy

# 生成客户端
npx prisma generate

# 查看数据库
npx prisma studio
```

---

## 环境变量配置

### 后端环境变量 (.env)

```env
# 服务器配置
NODE_ENV=development|production
PORT=3000

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/studyass
DATABASE_PATH=./database/sqlite.db

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI API 配置
AI_API_KEY=your-api-key
AI_API_URL=https://api.example.com/v1/chat
AI_MODEL=qwen-plus

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 速率限制配置
RATE_LIMIT_WINDOW_MS=900000  # 15 分钟
RATE_LIMIT_MAX_REQUESTS=100

# 日志配置
LOG_LEVEL=info|debug|warn|error
LOG_FILE=./logs/app.log

# 测试模式
TEST_MODE=false
```

### 前端环境变量 (.env)

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=学习助手
VITE_APP_VERSION=1.0.0
```

---

## 常见问题

### 1. 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 PORT 环境变量
PORT=3001 npm start
```

### 2. 数据库连接失败

**问题**: `PrismaClientInitializationError`

**解决**:
- 检查 DATABASE_URL 是否正确
- 确保 PostgreSQL 服务已启动
- 检查数据库用户权限

### 3. JWT Token 无效

**问题**: `TokenExpiredError` 或 `JsonWebTokenError`

**解决**:
- 检查 JWT_SECRET 是否一致
- 检查 Token 是否过期
- 重新登录获取新 Token

### 4. 文件上传失败

**问题**: `ENOENT: no such file or directory`

**解决**:
```bash
# 创建上传目录
mkdir -p backend/uploads
chmod 755 backend/uploads
```

### 5. AI API 调用失败

**问题**: `AI API request failed`

**解决**:
- 检查 AI_API_KEY 是否正确
- 检查 AI_API_URL 是否可访问
- 查看 API 配额是否用完

### 6. PM2 进程异常退出

**问题**: 进程状态为 `errored` 或 `stopped`

**解决**:
```bash
# 查看日志
pm2 logs studyass-backend

# 重启进程
pm2 restart studyass-backend

# 删除并重新创建
pm2 delete studyass-backend
pm2 start npm --name "studyass-backend" -- start
```

---

## 监控与维护

### 日志查看

```bash
# PM2 日志
pm2 logs studyass-backend

# 应用日志
tail -f backend/logs/app.log
```

### 性能监控

```bash
# PM2 监控
pm2 monit

# 系统资源
top
htop
```

### 数据库备份

```bash
# PostgreSQL 备份
pg_dump -U user studyass > backup.sql

# SQLite 备份
cp backend/database/sqlite.db backup.db
```

### 定期维护

```bash
# 清理过期数据（自定义脚本）
node backend/scripts/cleanup.js

# 更新依赖
npm update

# 重新生成 Prisma 客户端
npx prisma generate
```

---

## 安全建议

1. **生产环境必须修改 JWT_SECRET**
2. **关闭 TEST_MODE**
3. **配置 HTTPS**
4. **设置防火墙规则**
5. **定期更新依赖**
6. **启用数据库备份**
7. **配置日志轮转**
8. **限制 API 速率**

---

## 联系支持

如有问题，请联系俊哥的学习助手团队。
