# 🔧 StudyAss 学习助手 - 运维手册

**版本**: 1.0.0  
**最后更新**: 2026-03-17

---

## 📋 目录

1. [日常运维](#日常运维)
2. [监控告警](#监控告警)
3. [日志管理](#日志管理)
4. [备份恢复](#备份恢复)
5. [性能优化](#性能优化)
6. [故障排查](#故障排查)
7. [安全加固](#安全加固)
8. [版本升级](#版本升级)
9. [应急预案](#应急预案)

---

## 日常运维

### 1.1 服务状态检查

#### 每日检查清单

```bash
# 1. 检查服务运行状态
pm2 status

# 2. 检查系统资源
top -bn1 | head -20

# 3. 检查磁盘空间
df -h

# 4. 检查 Redis 状态
redis-cli ping

# 5. 检查数据库文件
ls -lh backend/database/

# 6. 检查日志文件大小
ls -lh backend/logs/
```

#### 自动化检查脚本

```bash
#!/bin/bash
# scripts/daily-check.sh

echo "=== StudyAss 日常检查 $(date) ==="

# 服务状态
echo -e "\n📊 PM2 服务状态:"
pm2 status

# 内存使用
echo -e "\n💾 内存使用:"
free -h

# 磁盘空间
echo -e "\n💿 磁盘空间:"
df -h /var/www

# Redis 状态
echo -e "\n🔴 Redis 状态:"
redis-cli ping

# 最近错误日志
echo -e "\n❌ 最近错误 (最后 10 条):"
tail -10 /var/www/studyass/backend/logs/error.log

echo -e "\n=== 检查完成 ==="
```

### 1.2 定期任务

#### 每日任务

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点执行日常检查
0 2 * * * /var/www/studyass/scripts/daily-check.sh >> /var/log/studyass/daily-check.log 2>&1

# 每天凌晨 3 点备份数据库
0 3 * * * /var/www/studyass/scripts/backup.sh

# 每天凌晨 4 点清理旧日志
0 4 * * * find /var/www/studyass/backend/logs -name "*.log" -mtime +7 -delete
```

#### 每周任务

```bash
# 每周一上午 9 点生成周报
0 9 * * 1 /var/www/studyass/scripts/weekly-report.sh

# 每周日凌晨 2 点重启服务（释放内存）
0 2 * * 0 pm2 restart studyass-backend
```

#### 每月任务

```bash
# 每月 1 号生成月度报告
0 9 1 * * /var/www/studyass/scripts/monthly-report.sh

# 每月清理一次上传文件（删除孤立的文件）
0 3 1 * * /var/www/studyass/scripts/cleanup-uploads.sh
```

### 1.3 服务启停

```bash
# 启动服务
pm2 start studyass-backend

# 停止服务
pm2 stop studyass-backend

# 重启服务
pm2 restart studyass-backend

# 优雅重启（不中断请求）
pm2 reload studyass-backend

# 查看服务详情
pm2 describe studyass-backend

# 查看服务日志
pm2 logs studyass-backend --lines 100

# 实时监控
pm2 monit
```

---

## 监控告警

### 2.1 Prometheus 监控

#### 安装 Prometheus

```bash
# 使用 Docker 运行 Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /var/www/studyass/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# 或使用系统安装
sudo apt install -y prometheus
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

#### Prometheus 配置

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'studyass'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### 关键监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `node_process_cpu_usage` | CPU 使用率 | > 80% |
| `node_process_memory_usage` | 内存使用率 | > 85% |
| `http_request_duration_seconds` | 请求响应时间 | p99 > 2s |
| `http_requests_total` | 请求总数 | - |
| `http_request_errors_total` | 错误请求数 | > 10/分钟 |
| `bull_queue_active_jobs` | 队列活跃任务 | > 100 |
| `bull_queue_failed_jobs` | 队列失败任务 | > 10 |

### 2.2 Grafana 可视化

```bash
# 使用 Docker 运行 Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  -v grafana_data:/var/lib/grafana \
  grafana/grafana

# 访问 http://localhost:3001
# 默认账号：admin / admin
```

#### 推荐仪表盘

1. **Node.js 应用监控**
   - ID: 11159
   - 展示：CPU、内存、事件循环、HTTP 请求

2. **Redis 监控**
   - ID: 11835
   - 展示：内存、连接数、命令统计

3. **Nginx 监控**
   - ID: 12708
   - 展示：请求量、响应时间、错误率

### 2.3 告警配置

#### Alertmanager 配置

```yaml
# monitoring/alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@example.com'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

#### 告警规则

```yaml
# monitoring/alerts.yml
groups:
  - name: studyass
    rules:
      - alert: HighCPUUsage
        expr: node_process_cpu_usage > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "CPU 使用率 {{ $value }}% 超过 80%"

      - alert: HighMemoryUsage
        expr: node_process_memory_usage / 1024 / 1024 / 1024 > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "内存使用率 {{ $value }}% 超过 85%"

      - alert: ServiceDown
        expr: up{job="studyass"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务宕机"
          description: "StudyAss 服务已宕机超过 1 分钟"

      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "错误率过高"
          description: "错误率 {{ $value }} 超过 10%"
```

### 2.4 健康检查端点

```bash
# 基础健康检查
curl https://api.studyass.com/api/health

# 详细健康检查（包含所有依赖）
curl https://api.studyass.com/api/health/verbose

# 就绪检查（用于 Kubernetes）
curl https://api.studyass.com/api/health/ready

# 存活检查（用于 Kubernetes）
curl https://api.studyass.com/api/health/live
```

---

## 日志管理

### 3.1 日志配置

#### Winston 日志配置

```javascript
// backend/src/modules/logger/WinstonLoggerService.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'studyass-backend' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    // 所有日志
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

// 开发环境输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 3.2 日志级别

| 级别 | 说明 | 示例 |
|------|------|------|
| error | 错误信息 | 数据库连接失败、API 调用失败 |
| warn | 警告信息 | 速率限制触发、重试操作 |
| info | 一般信息 | 用户登录、任务完成 |
| debug | 调试信息 | 请求参数、查询语句 |

### 3.3 日志查询

```bash
# 查看最近 100 行日志
tail -100 backend/logs/combined.log

# 实时查看日志
tail -f backend/logs/combined.log

# 搜索错误日志
grep "ERROR" backend/logs/error.log | tail -50

# 搜索特定用户操作
grep "user_id:123" backend/logs/combined.log

# 使用 jq 格式化 JSON 日志
cat backend/logs/combined.log | jq '.'

# 统计错误数量
grep -c "ERROR" backend/logs/error.log
```

### 3.4 日志轮转

#### 使用 logrotate

```bash
# /etc/logrotate.d/studyass
/var/www/studyass/backend/logs/*.log {
    daily
    rotate 10
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

### 3.5 集中式日志（可选）

#### ELK Stack

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

---

## 备份恢复

### 4.1 数据库备份

#### SQLite 备份

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/var/backups/studyass"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份 SQLite 数据库
cp /var/www/studyass/backend/database/sqlite.db \
   $BACKUP_DIR/sqlite_$DATE.db

# 压缩备份
tar -czf $BACKUP_DIR/sqlite_$DATE.db.tar.gz \
   $BACKUP_DIR/sqlite_$DATE.db

# 删除原始文件
rm $BACKUP_DIR/sqlite_$DATE.db

# 删除 30 天前的备份
find $BACKUP_DIR -name "sqlite_*.db.tar.gz" -mtime +30 -delete

echo "备份完成：$BACKUP_DIR/sqlite_$DATE.db.tar.gz"
```

#### PostgreSQL 备份

```bash
#!/bin/bash
# scripts/backup-postgres.sh

BACKUP_DIR="/var/backups/studyass"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="studyass"
DB_USER="studyass"

# 全量备份
pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/postgres_$DATE.sql

# 压缩
gzip $BACKUP_DIR/postgres_$DATE.sql

# 删除 30 天前的备份
find $BACKUP_DIR -name "postgres_*.sql.gz" -mtime +30 -delete
```

### 4.2 文件备份

```bash
#!/bin/bash
# scripts/backup-files.sh

BACKUP_DIR="/var/backups/studyass"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
   /var/www/studyass/backend/uploads/

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
   /var/www/studyass/backend/.env \
   /var/www/studyass/backend/ecosystem.config.js

# 删除 30 天前的备份
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "config_*.tar.gz" -mtime +30 -delete
```

### 4.3 备份验证

```bash
#!/bin/bash
# scripts/verify-backup.sh

BACKUP_DIR="/var/backups/studyass"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/sqlite_*.db.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "错误：未找到备份文件"
    exit 1
fi

# 验证备份文件完整性
if tar -tzf $LATEST_BACKUP > /dev/null 2>&1; then
    echo "备份文件完整：$LATEST_BACKUP"
else
    echo "错误：备份文件损坏"
    exit 1
fi

# 检查备份文件大小
SIZE=$(stat -c%s "$LATEST_BACKUP")
if [ $SIZE -lt 1000 ]; then
    echo "警告：备份文件过小，可能异常"
    exit 1
fi

echo "备份验证通过"
```

### 4.4 数据恢复

#### SQLite 恢复

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法：$0 <备份文件>"
    exit 1
fi

# 停止服务
pm2 stop studyass-backend

# 备份当前数据库
cp /var/www/studyass/backend/database/sqlite.db \
   /var/www/studyass/backend/database/sqlite.db.backup.before_restore

# 解压并恢复
tar -xzf $BACKUP_FILE -C /tmp
cp /tmp/sqlite_*.db /var/www/studyass/backend/database/sqlite.db

# 启动服务
pm2 start studyass-backend

echo "恢复完成"
```

#### PostgreSQL 恢复

```bash
#!/bin/bash

BACKUP_FILE=$1
DB_NAME="studyass"
DB_USER="studyass"

# 解压
gunzip $BACKUP_FILE

# 恢复
psql -U $DB_USER $DB_NAME < ${BACKUP_FILE%.gz}

echo "恢复完成"
```

---

## 性能优化

### 5.1 应用层优化

#### 启用集群模式

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'studyass-backend',
    script: 'src/server.js',
    instances: 'max',  // 使用所有 CPU 核心
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
}
```

#### 优化数据库查询

```javascript
// 添加索引
CREATE INDEX idx_knowledge_point_user ON learning_progress(knowledge_point_id, user_id);
CREATE INDEX idx_practice_session_user ON practice_sessions(user_id, status);

// 使用查询缓存
const { LRUCache } = require('lru-cache');
const cache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 5  // 5 分钟
});
```

#### Redis 缓存策略

```javascript
// 缓存热点数据
const cacheLeaderboard = async (type) => {
  const cacheKey = `leaderboard:${type}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await calculateLeaderboard(type);
  await redis.setex(cacheKey, 300, JSON.stringify(data));  // 5 分钟过期
  return data;
};
```

### 5.2 数据库优化

#### SQLite 优化

```bash
# 启用 WAL 模式
sqlite3 database/sqlite.db "PRAGMA journal_mode=WAL;"

# 设置缓存大小
sqlite3 database/sqlite.db "PRAGMA cache_size=-64000;"  # 64MB

# 分析查询
sqlite3 database/sqlite.db "EXPLAIN QUERY PLAN SELECT * FROM users WHERE id = 1;"
```

#### PostgreSQL 优化

```sql
-- 分析表
ANALYZE;

-- 优化配置
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';

-- 重启 PostgreSQL 生效
SELECT pg_reload_conf();
```

### 5.3 前端优化

#### 静态资源 CDN

```nginx
# Nginx 配置
location /static {
    expires 1y;
    add_header Cache-Control "public, immutable";
    
    # 启用 CDN
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml 
           application/javascript application/json;
```

### 5.4 监控性能指标

```bash
# 使用 autocannon 进行压力测试
npm install -g autocannon

# 测试登录接口
autocannon -c 100 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"phone":"13800138000","code":"123456"}' \
  http://localhost:3000/api/auth/login

# 测试 AI 出题接口
autocannon -c 50 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -b '{"knowledge_point_id":1,"count":5}' \
  http://localhost:3000/api/ai/generate-questions
```

---

## 故障排查

### 6.1 常见问题诊断

#### 服务无法启动

```bash
# 1. 检查端口占用
lsof -i :3000

# 2. 检查 Node.js 版本
node -v  # 应 >= 18.x

# 3. 检查依赖
cd backend
npm install

# 4. 检查环境变量
cat .env

# 5. 查看详细错误
pm2 logs studyass-backend --err
```

#### 数据库连接失败

```bash
# SQLite
ls -lh backend/database/
sqlite3 backend/database/sqlite.db ".tables"

# PostgreSQL
psql -U studyass -d studyass -c "\dt"

# 检查连接字符串
echo $DATABASE_URL
```

#### Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli ping

# 检查配置
redis-cli CONFIG GET bind
redis-cli CONFIG GET port
```

#### 内存泄漏

```bash
# 监控内存
pm2 monit

# 生成堆快照
node --inspect src/server.js

# 使用 Chrome DevTools 分析
# 访问 chrome://inspect
```

### 6.2 日志分析

```bash
# 统计错误类型
grep "ERROR" backend/logs/error.log | \
  awk -F'"message":"' '{print $2}' | \
  awk -F'"' '{print $1}' | \
  sort | uniq -c | sort -rn

# 查找慢查询
grep "slow query" backend/logs/combined.log | tail -20

# 分析请求量
grep "GET /api/" backend/logs/combined.log | \
  awk '{print $7}' | sort | uniq -c | sort -rn
```

### 6.3 性能分析

```bash
# 使用 clinic.js
npm install -g clinic

# 生成火焰图
clinic flame -- node src/server.js

# 分析事件循环
clinic doctor -- node src/server.js
```

---

## 安全加固

### 7.1 系统安全

#### 防火墙配置

```bash
# UFW 配置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 查看状态
sudo ufw status verbose
```

#### SSH 加固

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# 重启 SSH
sudo systemctl restart sshd
```

### 7.2 应用安全

#### 速率限制

```javascript
// 全局速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 请求
  message: '请求过于频繁，请稍后再试'
});

// 登录接口特殊限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 最多 5 次登录尝试
  message: '登录尝试过多，请 15 分钟后再试'
});
```

#### CORS 配置

```javascript
app.use(cors({
  origin: ['https://studyass.com', 'https://www.studyass.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 7.3 数据安全

#### 敏感信息加密

```javascript
// 使用 bcrypt 加密密码
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(password, hash);

// JWT Token 签名
const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
  expiresIn: '7d'
});
```

#### SQL 注入防护

```javascript
// 使用参数化查询
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(userId);

// 使用 ORM/查询构建器
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

---

## 版本升级

### 8.1 升级流程

```bash
# 1. 备份当前版本
cd /var/www/studyass
tar -czf /var/backups/studyass_$(date +%Y%m%d).tar.gz .

# 2. 拉取新代码
git fetch origin
git checkout <new-version-tag>

# 3. 安装新依赖
cd backend
npm install

# 4. 运行数据库迁移
npm run migrate

# 5. 重启服务
pm2 restart studyass-backend

# 6. 验证服务
curl https://api.studyass.com/api/health

# 7. 运行测试
npm test
```

### 8.2 回滚流程

```bash
# 1. 停止服务
pm2 stop studyass-backend

# 2. 恢复代码
cd /var/www/studyass
git checkout <previous-version-tag>

# 3. 恢复依赖
cd backend
npm install

# 4. 恢复数据库
# （如有数据库迁移回滚脚本）
npm run migrate:rollback

# 5. 启动服务
pm2 start studyass-backend

# 6. 验证
curl https://api.studyass.com/api/health
```

---

## 应急预案

### 9.1 服务宕机

```bash
# 1. 检查服务状态
pm2 status

# 2. 查看错误日志
pm2 logs studyass-backend --err --lines 100

# 3. 尝试重启
pm2 restart studyass-backend

# 4. 如仍失败，检查系统资源
free -h
df -h
top -bn1 | head -20

# 5. 通知相关人员
# （发送邮件/短信/钉钉通知）
```

### 9.2 数据库损坏

```bash
# 1. 停止服务
pm2 stop studyass-backend

# 2. 备份损坏的数据库
cp database/sqlite.db database/sqlite.db.corrupted

# 3. 从备份恢复
tar -xzf /var/backups/studyass/sqlite_*.db.tar.gz -C database/

# 4. 验证数据库
sqlite3 database/sqlite.db "PRAGMA integrity_check;"

# 5. 启动服务
pm2 start studyass-backend
```

### 9.3 安全事件

```bash
# 1. 立即隔离
sudo ufw deny from <attacker-ip>

# 2. 保存日志
cp -r backend/logs /var/backups/incident_$(date +%Y%m%d_%H%M%S)

# 3. 重置密钥
# 修改 .env 中的 JWT_SECRET 等

# 4. 强制所有用户重新登录
# 清空 Token 黑名单或修改密钥

# 5. 分析攻击
# 检查访问日志，确定攻击方式

# 6. 修复漏洞
# 根据分析结果修复安全漏洞
```

### 9.4 紧急联系人

| 角色 | 姓名 | 电话 | 邮箱 |
|------|------|------|------|
| 技术负责人 | 俊哥 | 138****0000 | jun@example.com |
| 运维工程师 | 张三 | 139****0000 | zhangsan@example.com |
| 数据库管理员 | 李四 | 137****0000 | lisi@example.com |

---

## 附录

### A. 常用命令速查

```bash
# 服务管理
pm2 start/stop/restart/reload studyass-backend
pm2 status
pm2 logs
pm2 monit

# 日志管理
tail -f logs/combined.log
grep "ERROR" logs/error.log
journalctl -u studyass -f

# 数据库
sqlite3 database/sqlite.db
psql -U studyass -d studyass

# Redis
redis-cli
redis-cli monitor

# 系统监控
top
htop
df -h
free -h
netstat -tlnp

# 网络诊断
curl -v https://api.studyass.com/api/health
ping api.studyass.com
traceroute api.studyass.com
```

### B. 配置文件模板

详见 `backend/.env.example` 和 `docker-compose.yml`

### C. 监控仪表盘

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Kibana: http://localhost:5601

---

**运维手册结束**

定期更新本手册以反映最新的运维实践和系统变更。
