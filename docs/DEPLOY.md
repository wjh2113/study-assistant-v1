# 🚀 StudyAss 学习助手 - 部署指南

**版本**: 1.0.0  
**最后更新**: 2026-03-17

---

## 📋 目录

1. [环境要求](#环境要求)
2. [部署架构](#部署架构)
3. [本地开发部署](#本地开发部署)
4. [生产环境部署](#生产环境部署)
5. [Docker 部署](#docker-部署)
6. [环境变量配置](#环境变量配置)
7. [数据库初始化](#数据库初始化)
8. [服务启动与验证](#服务启动与验证)
9. [常见问题](#常见问题)

---

## 环境要求

### 基础环境

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Redis | 7.0 | 7.2+ |
| Git | 2.x | 最新稳定版 |

### 服务器要求（生产环境）

| 配置 | 最低 | 推荐 |
|------|------|------|
| CPU | 2 核 | 4 核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 20GB | 50GB+ SSD |
| 带宽 | 5Mbps | 20Mbps+ |

### 操作系统支持

- ✅ Ubuntu 20.04 / 22.04 LTS
- ✅ CentOS 7 / 8
- ✅ Debian 10 / 11
- ✅ Windows Server 2019 / 2022
- ✅ macOS (开发环境)

---

## 部署架构

### 基础架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Node.js App │────▶│   SQLite    │
│  (反向代理)  │     │  (Express)   │     │  (数据库)   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │  (队列缓存)   │
                    └──────────────┘
```

### 高可用架构（生产环境）

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (负载均衡)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │  Node 1  │ │  Node 2  │ │  Node 3  │
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │            │            │
            └────────────┼────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       ┌──────────┐          ┌──────────┐
       │  Redis   │          │PostgreSQL│
       │  Cluster │          │  Cluster │
       └──────────┘          └──────────┘
```

---

## 本地开发部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd studyass-mgr
```

### 2. 安装 Redis（Windows）

```powershell
# 使用 WSL2 安装 Redis
wsl --install
wsl -e bash -c "sudo apt update && sudo apt install -y redis-server"

# 或使用 Docker 运行 Redis
docker run -d -p 6379:6379 --name redis redis:latest
```

### 3. 安装后端依赖

```bash
cd backend
npm install

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，配置必要参数
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
npm run migrate
```

### 5. 启动后端服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动

### 6. 验证服务

```bash
curl http://localhost:3000/api/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "uptime": 10,
  "services": {
    "database": "connected",
    "memory": {"used": 128, "total": 256, "unit": "MB"}
  }
}
```

---

## 生产环境部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Redis
sudo apt install -y redis-server
sudo systemctl enable redis
sudo systemctl start redis

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. 部署代码

```bash
# 创建应用目录
sudo mkdir -p /var/www/studyass
cd /var/www/studyass

# 克隆代码
sudo git clone <repository-url> .
sudo chown -R $USER:$USER .

# 安装依赖
cd backend
npm install --production
```

### 3. 配置环境变量

```bash
cd backend
cp .env.example .env

# 编辑 .env
nano .env
```

### 4. 配置 PM2 进程管理

```bash
# 安装 PM2
sudo npm install -g pm2

# 创建 PM2 配置文件
cd backend
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'studyass-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 5. 配置 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/studyass
```

```nginx
server {
    listen 80;
    server_name api.studyass.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.studyass.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/api.studyass.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.studyass.com/privkey.pem;

    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 上传文件大小限制
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location /uploads {
        proxy_pass http://localhost:3000/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 日志
    access_log /var/log/nginx/studyass-access.log;
    error_log /var/log/nginx/studyass-error.log;
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/studyass /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 6. 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.studyass.com

# 自动续期
sudo crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

---

## Docker 部署

### 1. 创建 Dockerfile

项目根目录已包含 `docker-compose.yml`，如需自定义 Dockerfile：

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "src/server.js"]
```

### 2. Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_PATH=/app/database/sqlite.db
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/database:/app/database
      - ./backend/logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

### 3. 启动服务

```bash
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

---

## 环境变量配置

### 完整环境变量列表

```env
# ==================== 服务器配置 ====================
PORT=3000
NODE_ENV=production

# ==================== 数据库配置 ====================
# SQLite（开发环境）
DATABASE_PATH=./database/sqlite.db

# PostgreSQL（生产环境）
DATABASE_URL=postgresql://user:password@localhost:5432/studyass

# ==================== Redis 配置 ====================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ==================== JWT 配置 ====================
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# ==================== AI API 配置 ====================
AI_API_KEY=your-api-key
AI_API_URL=https://api.example.com/v1/chat
AI_MODEL=gpt-4

# 百度文心一言
BAIDU_API_KEY=your-baidu-api-key
BAIDU_SECRET_KEY=your-baidu-secret-key

# 讯飞星火
IFLYTEK_API_KEY=your-iflytek-api-key
IFLYTEK_API_SECRET=your-iflytek-api-secret

# ==================== 文件上传配置 ====================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
BASE_URL=https://api.studyass.com

# ==================== OSS 配置（可选） ====================
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=studyass
OSS_REGION=cn-shanghai
OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com

# ==================== 速率限制配置 ====================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
SEND_CODE_LIMIT_MAX=5

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=10

# ==================== 监控配置 ====================
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# ==================== 测试模式 ====================
TEST_MODE=false
```

### 环境变量优先级

1. 系统环境变量（最高优先级）
2. `.env` 文件
3. `.env.example` 默认值（最低优先级）

---

## 数据库初始化

### SQLite（开发环境）

```bash
cd backend

# 运行迁移脚本
npm run migrate

# 验证数据库
sqlite3 database/sqlite.db ".tables"
```

### PostgreSQL（生产环境）

```bash
# 安装 Prisma CLI
npm install -g prisma

# 设置数据库连接
export DATABASE_URL="postgresql://user:password@localhost:5432/studyass"

# 运行迁移
npx prisma migrate deploy

# 生成 Prisma 客户端
npx prisma generate
```

### 初始化测试数据（可选）

```bash
node scripts/seed-data.js
```

---

## 服务启动与验证

### 启动服务

```bash
# 使用 PM2（推荐）
pm2 start ecosystem.config.js

# 或直接启动
npm start
```

### 健康检查

```bash
# 基础健康检查
curl https://api.studyass.com/api/health

# 详细检查（包含数据库、Redis）
curl https://api.studyass.com/api/health/verbose
```

### 功能验证

```bash
# 1. 发送验证码
curl -X POST https://api.studyass.com/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","purpose":"login"}'

# 2. 登录
curl -X POST https://api.studyass.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}'

# 3. 获取用户信息（使用返回的 token）
curl https://api.studyass.com/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 监控服务状态

```bash
# PM2 状态
pm2 status

# 查看日志
pm2 logs studyass-backend

# 内存使用
pm2 monit

# 重启服务
pm2 restart studyass-backend

# 停止服务
pm2 stop studyass-backend
```

---

## 常见问题

### 1. Redis 连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决**:
```bash
# 检查 Redis 状态
sudo systemctl status redis

# 启动 Redis
sudo systemctl start redis

# 检查配置
redis-cli ping  # 应返回 PONG
```

### 2. 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 PORT 环境变量
export PORT=3001
```

### 3. 数据库迁移失败

**错误**: `Prisma migrate failed`

**解决**:
```bash
# 检查数据库连接
echo $DATABASE_URL

# 重置迁移（开发环境）
npx prisma migrate reset

# 重新运行迁移
npx prisma migrate deploy
```

### 4. 文件上传失败

**错误**: `Error: ENOENT: no such file or directory`

**解决**:
```bash
# 创建上传目录
mkdir -p uploads/textbooks uploads/avatars uploads/attachments
chmod -R 755 uploads

# 检查磁盘空间
df -h
```

### 5. JWT Token 无效

**错误**: `Error: Invalid token`

**解决**:
- 检查 JWT_SECRET 是否正确配置
- 确保客户端正确携带 Token：`Authorization: Bearer <token>`
- 检查 Token 是否过期

### 6. 内存泄漏

**症状**: 服务运行一段时间后内存持续增长

**解决**:
```bash
# 启用集群模式（PM2）
pm2 start ecosystem.config.js

# 设置内存重启阈值
# 在 ecosystem.config.js 中添加:
max_memory_restart: '500M'

# 定期重启
pm2 restart studyass-backend --cron-restart '0 4 * * *'
```

### 7. Nginx 502 Bad Gateway

**解决**:
```bash
# 检查后端服务是否运行
pm2 status

# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/studyass-error.log

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 性能优化建议

### 1. 启用 Gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml 
           application/javascript application/json;
```

### 2. 配置缓存策略

```nginx
location /uploads {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

location /static {
    expires 1y;
    add_header Cache-Control "public";
}
```

### 3. 数据库优化

```bash
# SQLite：启用 WAL 模式
sqlite3 database/sqlite.db "PRAGMA journal_mode=WAL;"

# PostgreSQL：优化配置
# 编辑 postgresql.conf
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
```

### 4. Redis 优化

```bash
# 配置 Redis 内存限制
# 编辑 /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

---

## 备份与恢复

### 数据库备份

```bash
# SQLite 备份
cp database/sqlite.db database/sqlite.db.backup.$(date +%Y%m%d)

# PostgreSQL 备份
pg_dump -U user studyass > backup_$(date +%Y%m%d).sql

# 压缩备份
tar -czf studyass-backup-$(date +%Y%m%d).tar.gz database/ uploads/
```

### 数据恢复

```bash
# SQLite 恢复
cp database/sqlite.db.backup.20260317 database/sqlite.db

# PostgreSQL 恢复
psql -U user studyass < backup_20260317.sql
```

---

## 安全建议

1. **修改默认密钥**: 生产环境必须修改 `JWT_SECRET`
2. **启用 HTTPS**: 使用 Let's Encrypt 免费证书
3. **配置防火墙**: 仅开放必要端口（80, 443）
4. **定期更新**: 及时更新 Node.js 和依赖包
5. **日志审计**: 定期检查访问日志和错误日志
6. **速率限制**: 防止暴力破解和 DDoS 攻击
7. **备份策略**: 定期备份数据库和上传文件

---

**部署指南结束**

如需技术支持，请联系俊哥的学习助手团队。
