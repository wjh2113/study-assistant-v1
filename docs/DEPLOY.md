# 🚀 学习助手部署指南

## 部署环境要求

### 服务器配置
- **CPU**: 2 核及以上
- **内存**: 4GB 及以上
- **存储**: 20GB 及以上
- **系统**: Ubuntu 20.04+ / CentOS 7+ / Windows Server 2019+

### 软件依赖
- Node.js >= 18.x
- npm >= 9.x
- Docker & Docker Compose (可选，推荐)
- Nginx (反向代理)
- PostgreSQL 14+ (生产环境)

---

## 方案一：Docker 部署（推荐）

### 1. 克隆项目
```bash
git clone <repo-url>
cd studyass-mgr/project/v1-prd
```

### 2. 配置环境变量
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑环境变量
vim .env
```

**.env 配置说明**:
```env
# 数据库配置
DATABASE_URL=postgresql://studyass:your_password@db:5432/studyass

# JWT 配置
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI API 配置
AI_API_KEY=your-api-key
AI_API_URL=https://api.example.com/v1/chat

# 文件存储
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
```

### 3. 启动服务
```bash
# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 初始化数据库
```bash
# 进入后端容器
docker-compose exec backend npm run prisma:migrate

# 创建初始数据（可选）
docker-compose exec backend npm run prisma:seed
```

### 5. 验证部署
```bash
# 测试后端 API
curl http://localhost:3000/api/health

# 测试前端
curl http://localhost:5173
```

---

## 方案二：手动部署

### 1. 安装依赖

#### 后端
```bash
cd backend
npm install --production
```

#### 前端
```bash
cd frontend
npm install
npm run build
```

### 2. 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/conf.d/studyass.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/studyass-mgr/project/v1-prd/frontend/dist;
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 文件上传
    location /uploads {
        alias /path/to/studyass-mgr/project/v1-prd/backend/uploads;
        expires 30d;
    }
}
```

### 3. 配置 PM2（进程管理）

安装 PM2:
```bash
npm install -g pm2
```

创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'studyass-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

启动服务:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. 配置 PostgreSQL

```bash
# 安装 PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE studyass;
CREATE USER studyass WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE studyass TO studyass;
\q
```

### 5. 配置 SSL（推荐）

使用 Let's Encrypt 免费证书:
```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 方案三：云服务器部署

### 阿里云/腾讯云 ECS

1. 购买 ECS 实例（推荐 2 核 4G）
2. 配置安全组（开放 80/443/22 端口）
3. 按照「方案二」手动部署
4. 配置域名解析

### 使用宝塔面板（简化部署）

1. 安装宝塔面板
2. 一键安装 LNMP 环境
3. 添加站点，配置反向代理
4. 使用 PM2 管理器运行 Node.js 应用

---

## 数据库迁移

### 开发环境（SQLite）
```bash
cd backend
npx prisma migrate dev
```

### 生产环境（PostgreSQL）
```bash
cd backend
npx prisma migrate deploy
```

### 查看迁移状态
```bash
npx prisma migrate status
```

### 重置数据库（谨慎使用）
```bash
npx prisma migrate reset
```

---

## 监控与日志

### 应用日志
```bash
# PM2 日志
pm2 logs studyass-backend

# Docker 日志
docker-compose logs -f backend
```

### 系统监控
```bash
# 安装监控工具
npm install -g pm2

# 启用监控
pm2 monit
```

### 错误追踪（推荐集成 Sentry）
```javascript
// backend/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: 'production',
});
```

---

## 备份策略

### 数据库备份
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U studyass studyass > /backups/studyass_$DATE.sql
# 保留最近 7 天备份
find /backups -name "studyass_*.sql" -mtime +7 -delete
```

### 定时备份（Cron）
```bash
# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

---

## 性能优化

### 1. 启用 Gzip 压缩
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 2. 配置缓存
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库优化
- 为常用查询字段添加索引
- 启用查询缓存
- 定期执行 VACUUM ANALYZE

### 4. 启用 Cluster 模式
```javascript
// backend/src/main.ts
import { cluster } from 'cluster';
import { cpus } from 'os';

if (cluster.isPrimary) {
  for (let i = 0; i < cpus().length; i++) {
    cluster.fork();
  }
} else {
  bootstrap();
}
```

---

## 故障排查

### 后端无法启动
```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 检查环境变量
cat .env

# 查看完整日志
pm2 logs studyass-backend --lines 100
```

### 数据库连接失败
```bash
# 测试数据库连接
psql -h localhost -U studyass -d studyass

# 检查 PostgreSQL 状态
systemctl status postgresql
```

### 前端页面空白
```bash
# 检查构建输出
ls -la frontend/dist

# 查看浏览器控制台错误
# 检查 Nginx 配置
nginx -t
```

---

## 安全建议

1. **修改默认密钥**: 更换 JWT_SECRET 为强随机字符串
2. **启用 HTTPS**: 生产环境必须使用 SSL
3. **限制文件上传**: 设置合理的文件大小和类型限制
4. **定期更新依赖**: `npm audit fix`
5. **配置防火墙**: 仅开放必要端口
6. **数据库权限**: 使用最小权限原则
7. **备份密钥**: 安全存储数据库密码和 API 密钥

---

## 版本更新

### 更新流程
```bash
# 1. 备份当前版本
git archive -o backup.zip HEAD

# 2. 拉取新代码
git pull origin main

# 3. 安装依赖
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# 4. 数据库迁移
cd ../backend && npx prisma migrate deploy

# 5. 重启服务
pm2 restart studyass-backend
# 或
docker-compose restart
```

### 回滚方案
```bash
# 回滚数据库
npx prisma migrate resolve --rolled-back <migration-name>

# 恢复代码
git checkout <previous-commit>

# 重启服务
pm2 restart all
```

---

## 联系支持

部署遇到问题？
- 查看日志：`docker-compose logs -f` 或 `pm2 logs`
- 检查文档：[API.md](./API.md)
- 提交 Issue: GitHub Issues

---

**文档版本**: v1.0  
**最后更新**: 2026-03-15
