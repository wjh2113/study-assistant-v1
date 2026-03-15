# 🔧 学习助手 - 运维手册

**版本**: v1.0  
**更新日期**: 2026-03-15  
**适用环境**: 生产环境

---

## 目录

1. [服务启动/停止](#一服务启动停止)
2. [日志查看](#二日志查看)
3. [备份恢复](#三备份恢复)
4. [监控告警](#四监控告警)
5. [常见问题处理](#五常见问题处理)

---

## 一、服务启动/停止

### 1.1 系统架构

```
┌─────────────────────────────────────────────────┐
│                   Nginx (80/443)                │
│              反向代理 + 负载均衡                 │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼───────┐       ┌──────▼──────┐
│   Frontend    │       │   Backend   │
│   (Vite 构建)  │       │ (Node.js)   │
│   静态文件     │       │  API 服务    │
└───────────────┘       └──────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐       ┌──────▼──────┐
              │   MySQL   │       │    Redis    │
              │  数据库    │       │  缓存/队列   │
              └───────────┘       └─────────────┘
```

### 1.2 服务依赖

| 服务 | 端口 | 依赖 | 启动顺序 |
|------|------|------|---------|
| MySQL | 3306 | 无 | 1 |
| Redis | 6379 | 无 | 1 |
| Backend | 3000 | MySQL, Redis | 2 |
| Nginx | 80/443 | Backend | 3 |

### 1.3 启动流程

#### 1.3.1 数据库启动

```bash
# 检查 MySQL 状态
systemctl status mysql

# 启动 MySQL
systemctl start mysql

# 设置开机自启
systemctl enable mysql

# 验证连接
mysql -u root -p -e "SHOW DATABASES;"
```

#### 1.3.2 Redis 启动

```bash
# 检查 Redis 状态
systemctl status redis

# 启动 Redis
systemctl start redis

# 设置开机自启
systemctl enable redis

# 验证连接
redis-cli ping
# 应返回：PONG
```

#### 1.3.3 后端服务启动

```bash
# 进入项目目录
cd /var/www/studyass/backend

# 安装依赖（首次部署）
npm install --production

# 生成 Prisma Client
npm run db:generate

# 数据库迁移（首次部署或 schema 变更）
npm run db:migrate

# 启动服务
npm start

# 或使用 PM2 管理（推荐）
pm2 start src/server.js --name studyass-backend
pm2 save
pm2 startup
```

#### 1.3.4 前端服务部署

```bash
# 进入前端目录
cd /var/www/studyass/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
# 由 Nginx 提供静态文件服务
```

#### 1.3.5 Nginx 启动

```bash
# 检查配置
nginx -t

# 启动 Nginx
systemctl start nginx

# 设置开机自启
systemctl enable nginx

# 重载配置（修改配置后）
systemctl reload nginx
```

### 1.4 停止流程

```bash
# 1. 停止 Nginx
systemctl stop nginx

# 2. 停止后端服务
pm2 stop studyass-backend
# 或
cd /var/www/studyass/backend
npm stop

# 3. 停止 Redis
systemctl stop redis

# 4. 停止 MySQL
systemctl stop mysql
```

### 1.5 重启流程

```bash
# 重启单个服务
systemctl restart nginx
systemctl restart redis
systemctl restart mysql
pm2 restart studyass-backend

# 全部重启（按顺序）
systemctl restart mysql
systemctl restart redis
pm2 restart studyass-backend
systemctl reload nginx
```

### 1.6 使用 Docker 部署

#### 1.6.1 启动

```bash
# 进入项目目录
cd /var/www/studyass

# 启动所有服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 1.6.2 停止

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

#### 1.6.3 重启

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart backend
```

---

## 二、日志查看

### 2.1 日志位置

| 服务 | 日志路径 | 说明 |
|------|---------|------|
| 后端应用 | `/var/www/studyass/backend/logs/` | 应用日志 |
| Nginx 访问 | `/var/log/nginx/access.log` | 访问日志 |
| Nginx 错误 | `/var/log/nginx/error.log` | 错误日志 |
| MySQL | `/var/log/mysql/` | 数据库日志 |
| Redis | `/var/log/redis/` | Redis 日志 |
| PM2 | `~/.pm2/logs/` | PM2 日志 |

### 2.2 后端日志

#### 2.2.1 日志文件

```bash
cd /var/www/studyass/backend/logs

# 日志文件
combined.log    # 综合日志（所有级别）
error.log       # 错误日志
warn.log        # 警告日志
```

#### 2.2.2 查看日志

```bash
# 实时查看综合日志
tail -f logs/combined.log

# 查看最近 100 行
tail -n 100 logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 按时间过滤
grep "2026-03-15" logs/combined.log

# 按级别过滤
grep "ERROR" logs/combined.log

# 搜索特定错误
grep "数据库连接失败" logs/error.log
```

#### 2.2.3 日志格式

```json
{
  "level": "info",
  "message": "用户登录成功",
  "timestamp": "2026-03-15T10:30:00.000Z",
  "userId": "12345",
  "ip": "192.168.1.100"
}
```

### 2.3 PM2 日志

```bash
# 查看所有应用日志
pm2 logs

# 查看指定应用日志
pm2 logs studyass-backend

# 清空日志
pm2 flush

# 限制日志行数
pm2 logs --lines 100
```

### 2.4 Nginx 日志

```bash
# 查看访问日志
tail -f /var/log/nginx/access.log

# 查看错误日志
tail -f /var/log/nginx/error.log

# 统计访问 IP
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# 统计 404 错误
grep " 404 " /var/log/nginx/access.log | wc -l
```

### 2.5 日志轮转

#### 2.5.1 配置 logrotate

```bash
# 创建配置文件
sudo vim /etc/logrotate.d/studyass
```

```conf
/var/www/studyass/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reload studyass-backend > /dev/null
    endscript
}
```

#### 2.5.2 测试配置

```bash
# 测试 logrotate 配置
logrotate -d /etc/logrotate.d/studyass

# 强制执行
logrotate -f /etc/logrotate.d/studyass
```

---

## 三、备份恢复

### 3.1 数据库备份

#### 3.1.1 手动备份

```bash
# 备份整个数据库
mysqldump -u root -p studyass > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份并压缩
mysqldump -u root -p studyass | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 备份单个表
mysqldump -u root -p studyass users > users_backup.sql
```

#### 3.1.2 自动备份脚本

```bash
#!/bin/bash
# /var/www/studyass/scripts/backup-db.sh

BACKUP_DIR="/var/backups/studyass"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="studyass"
DB_USER="root"
DB_PASS="your-password"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 删除 30 天前的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "备份完成：$BACKUP_DIR/db_backup_$DATE.sql.gz"
```

#### 3.1.3 设置定时任务

```bash
# 编辑 crontab
crontab -e

# 添加每日凌晨 2 点备份
0 2 * * * /var/www/studyass/scripts/backup-db.sh >> /var/log/studyass-backup.log 2>&1
```

### 3.2 数据库恢复

#### 3.2.1 从备份恢复

```bash
# 解压备份文件
gunzip backup_20260315_020000.sql.gz

# 恢复数据库
mysql -u root -p studyass < backup_20260315_020000.sql

# 或从压缩文件直接恢复
gunzip -c backup_20260315_020000.sql.gz | mysql -u root -p studyass
```

#### 3.2.2 恢复验证

```bash
# 登录数据库
mysql -u root -p studyass

# 检查表数量
SHOW TABLES;

# 检查数据量
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM knowledge_points;
```

### 3.3 文件备份

#### 3.3.1 备份上传文件

```bash
# 备份 uploads 目录
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/studyass/backend/uploads

# 备份到远程服务器
rsync -avz /var/www/studyass/backend/uploads/ backup@remote:/backups/studyass/uploads/
```

#### 3.3.2 备份代码

```bash
# 使用 Git（推荐）
cd /var/www/studyass
git add .
git commit -m "备份 $(date +%Y%m%d)"
git push origin main

# 或打包备份
tar -czf studyass_code_$(date +%Y%m%d).tar.gz /var/www/studyass --exclude=node_modules --exclude=logs
```

### 3.4 完整备份策略

| 备份类型 | 频率 | 保留期 | 存储位置 |
|---------|------|--------|---------|
| 数据库 | 每日 | 30 天 | 本地 + 云端 |
| 上传文件 | 每日 | 30 天 | 本地 + 云端 |
| 代码 | 每次变更 | 永久 | Git 仓库 |
| 配置文件 | 每次变更 | 永久 | Git 仓库 |

---

## 四、监控告警

### 4.1 系统监控

#### 4.1.1 基础监控指标

```bash
# CPU 使用率
top -bn1 | grep "Cpu(s)"

# 内存使用率
free -h

# 磁盘使用率
df -h

# 磁盘 IO
iostat -x 1

# 网络流量
iftop
```

#### 4.1.2 服务监控

```bash
# 检查服务状态
systemctl status mysql
systemctl status redis
systemctl status nginx
pm2 status studyass-backend

# 检查端口
netstat -tlnp | grep -E "3306|6379|3000|80"

# 检查进程
ps aux | grep -E "mysql|redis|node|nginx"
```

### 4.2 应用监控

#### 4.2.1 健康检查接口

```bash
# 后端健康检查
curl http://localhost:3000/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2026-03-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

#### 4.2.2 监控脚本

```bash
#!/bin/bash
# /var/www/studyass/scripts/health-check.sh

BACKEND_URL="http://localhost:3000"
LOG_FILE="/var/log/studyass-health.log"

# 检查后端服务
response=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/health)

if [ "$response" != "200" ]; then
    echo "$(date) - 后端服务异常 (HTTP $response)" >> $LOG_FILE
    # 发送告警（邮件/短信/钉钉）
    # 示例：发送钉钉消息
    curl 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN' \
      -H 'Content-Type: application/json' \
      -d '{"msgtype":"text","text":{"content":"⚠️ 学习助手后端服务异常，请立即检查！"}}'
fi
```

### 4.3 告警配置

#### 4.3.1 告警阈值

| 指标 | 警告阈值 | 严重阈值 |
|------|---------|---------|
| CPU 使用率 | >70% | >90% |
| 内存使用率 | >80% | >95% |
| 磁盘使用率 | >80% | >95% |
| 响应时间 | >2s | >5s |
| 错误率 | >1% | >5% |
| 服务宕机 | - | 立即告警 |

#### 4.3.2 钉钉告警配置

```bash
# 创建钉钉机器人
# 1. 钉钉群 -> 群设置 -> 智能群助手 -> 添加机器人
# 2. 选择「自定义」
# 3. 获取 Webhook URL

# 告警脚本
#!/bin/bash
send_alert() {
    local message="$1"
    local webhook="https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
    
    curl "$webhook" \
      -H 'Content-Type: application/json' \
      -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"$message\"}}"
}

# 使用示例
send_alert "⚠️ 学习助手服务异常：数据库连接失败"
```

### 4.4 日志监控

```bash
# 监控错误日志
tail -f /var/www/studyass/backend/logs/error.log | while read line; do
    echo "$(date) - $line" >> /var/log/studyass-alerts.log
    send_alert "❌ 新错误：$line"
done

# 监控特定错误
grep -i "数据库连接失败" /var/www/studyass/backend/logs/error.log | tail -1
```

---

## 五、常见问题处理

### 5.1 服务无法启动

#### 5.1.1 后端服务启动失败

**症状**: `npm start` 报错或立即退出

**排查步骤**:

```bash
# 1. 查看错误日志
tail -100 /var/www/studyass/backend/logs/error.log

# 2. 检查端口占用
lsof -i :3000

# 3. 检查环境变量
cat /var/www/studyass/backend/.env

# 4. 检查数据库连接
mysql -u root -p -e "USE studyass; SHOW TABLES;"

# 5. 检查 Redis 连接
redis-cli ping

# 6. 重新安装依赖
cd /var/www/studyass/backend
rm -rf node_modules
npm install
```

**常见原因**:
- 端口被占用
- 数据库连接失败
- Redis 未启动
- 环境变量配置错误
- 依赖包缺失

### 5.2 数据库连接失败

**症状**: 应用报错 "无法连接数据库"

**排查步骤**:

```bash
# 1. 检查 MySQL 服务
systemctl status mysql

# 2. 检查 MySQL 端口
netstat -tlnp | grep 3306

# 3. 测试连接
mysql -u studyass -p -h localhost studyass

# 4. 检查数据库用户权限
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='studyass';"

# 5. 查看 MySQL 错误日志
tail -100 /var/log/mysql/error.log
```

**解决方案**:

```bash
# 重启 MySQL
systemctl restart mysql

# 重置用户权限
mysql -u root -p << EOF
GRANT ALL PRIVILEGES ON studyass.* TO 'studyass'@'localhost' IDENTIFIED BY 'password';
FLUSH PRIVILEGES;
EOF
```

### 5.3 Redis 连接失败

**症状**: 队列任务不执行、排行榜不更新

**排查步骤**:

```bash
# 1. 检查 Redis 服务
systemctl status redis

# 2. 测试连接
redis-cli ping

# 3. 检查 Redis 配置
cat /etc/redis/redis.conf | grep -E "bind|port|requirepass"

# 4. 查看 Redis 日志
tail -100 /var/log/redis/redis-server.log
```

**解决方案**:

```bash
# 重启 Redis
systemctl restart redis

# 清除 Redis 缓存（谨慎使用）
redis-cli FLUSHALL
```

### 5.4 文件上传失败

**症状**: 上传课本 PDF 时报错

**排查步骤**:

```bash
# 1. 检查 uploads 目录权限
ls -la /var/www/studyass/backend/uploads

# 2. 检查磁盘空间
df -h

# 3. 检查 Nginx 配置
cat /etc/nginx/nginx.conf | grep client_max_body_size

# 4. 查看后端日志
tail -100 /var/www/studyass/backend/logs/error.log | grep upload
```

**解决方案**:

```bash
# 修改目录权限
chown -R www-data:www-data /var/www/studyass/backend/uploads
chmod -R 755 /var/www/studyass/backend/uploads

# 修改 Nginx 配置（支持大文件上传）
client_max_body_size 100M;

# 重启 Nginx
systemctl reload nginx
```

### 5.5 性能问题

#### 5.5.1 响应慢

**排查步骤**:

```bash
# 1. 检查系统负载
uptime
top

# 2. 检查慢查询
mysql -u root -p -e "SHOW PROCESSLIST;"

# 3. 启用慢查询日志
mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"
mysql -u root -p -e "SET GLOBAL long_query_time = 2;"

# 4. 查看慢查询
tail -100 /var/log/mysql/mysql-slow.log
```

**优化建议**:
- 添加数据库索引
- 优化 SQL 查询
- 增加 Redis 缓存
- 升级服务器配置

#### 5.5.2 内存泄漏

**症状**: Node.js 进程内存持续增长

**排查步骤**:

```bash
# 1. 监控进程内存
ps aux | grep node

# 2. 使用 PM2 监控
pm2 monit

# 3. 查看 PM2 日志
pm2 logs studyass-backend --lines 1000
```

**解决方案**:

```bash
# 重启服务
pm2 restart studyass-backend

# 配置 PM2 自动重启（内存超过 1GB）
pm2 restart studyass-backend --max-memory-restart 1G
```

### 5.6 定时任务异常

**症状**: 排行榜不更新、积分未计算

**排查步骤**:

```bash
# 1. 检查定时任务进程
ps aux | grep leaderboardCalculator

# 2. 查看定时任务日志
tail -100 /var/www/studyass/backend/logs/combined.log | grep cron

# 3. 手动执行定时任务
cd /var/www/studyass/backend
node src/workers/leaderboardCalculator.js
```

**解决方案**:

```bash
# 重启定时任务
pm2 restart leaderboardCalculator

# 检查 cron 配置
cat /var/www/studyass/backend/src/workers/leaderboardCalculator.js | grep cron
```

---

## 六、应急预案

### 6.1 服务完全不可用

**处理流程**:

1. **快速恢复**: 重启所有服务
   ```bash
   systemctl restart mysql
   systemctl restart redis
   pm2 restart all
   systemctl reload nginx
   ```

2. **问题排查**: 查看日志定位原因

3. **回滚**: 如最近有更新，回滚到上一个稳定版本

4. **通知**: 发送故障通知给用户

### 6.2 数据丢失

**处理流程**:

1. **立即停机**: 防止数据进一步损坏

2. **评估损失**: 确认丢失的数据范围

3. **从备份恢复**: 使用最近的备份恢复

4. **验证数据**: 检查恢复后的数据完整性

5. **恢复服务**: 确认无误后重启服务

### 6.3 安全事件

**处理流程**:

1. **隔离系统**: 断开网络连接

2. **保护现场**: 保存日志和证据

3. **评估影响**: 确认受影响的数据范围

4. **修复漏洞**: 修补安全漏洞

5. **恢复服务**: 确认安全后恢复

6. **通知用户**: 如涉及用户数据，通知受影响用户

---

## 七、运维工具清单

| 工具 | 用途 | 安装命令 |
|------|------|---------|
| PM2 | 进程管理 | `npm install -g pm2` |
| htop | 系统监控 | `apt install htop` |
| iotop | IO 监控 | `apt install iotop` |
| iftop | 网络监控 | `apt install iftop` |
| logrotate | 日志轮转 | `apt install logrotate` |
| mysqldump | 数据库备份 | `apt install mysql-client` |
| rsync | 文件同步 | `apt install rsync` |

---

*本手册由 AI 团队编写，请根据实际情况调整*
