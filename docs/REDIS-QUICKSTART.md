# 🚀 Redis 7.2 快速升级指南

> **紧急**: BullMQ 需要 Redis 5.0+，当前 3.0.504 不兼容！

## ⚡ 5 分钟快速升级（WSL2 方案）

### 步骤 1: 安装 WSL2 Ubuntu（3 分钟）

**管理员 PowerShell**:
```powershell
wsl --install -d Ubuntu
# 等待安装完成，可能需要重启
```

**首次启动**:
```powershell
wsl -d Ubuntu
# 设置用户名和密码（记住这个密码）
```

### 步骤 2: 安装 Redis 7.2（2 分钟）

**在 Ubuntu 中运行**:
```bash
# 一键安装脚本
sudo bash /mnt/e/openclaw/workspace-studyass-mgr/scripts/redis-install-wsl.sh
```

或手动安装：
```bash
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update && sudo apt install -y redis
sudo sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf
echo "requirepass StudyAss2026!Redis" | sudo tee -a /etc/redis/redis.conf
sudo systemctl start redis && sudo systemctl enable redis
```

### 步骤 3: 验证（30 秒）

**在 Ubuntu 中**:
```bash
redis-cli ping
# 应返回：PONG
```

**在 Windows PowerShell 中**:
```powershell
cd E:\openclaw\workspace-studyass-mgr\backend
node -e "const Redis = require('ioredis'); const r = new Redis({host:'localhost',port:6379,password:'StudyAss2026!Redis'}); r.ping().then(console.log);"
# 应返回：PONG
```

### 步骤 4: 测试 BullMQ（30 秒）

```powershell
cd E:\openclaw\workspace-studyass-mgr\backend
node -e "const {Queue} = require('bullmq'); const Redis = require('ioredis'); const conn = new Redis({host:'localhost',port:6379,password:'StudyAss2026!Redis'}); const q = new Queue('test-queue',{connection:conn}); q.add('test',{msg:'hello'}).then(job => {console.log('✅ Success! Job ID:',job.id); process.exit(0);}).catch(e => {console.error('❌ Error:',e.message); process.exit(1);});"
# 应显示：✅ Success! Job ID: xxx
```

---

## ✅ 完成！

现在 BullMQ 队列应该正常工作了。

### 启动应用

```powershell
cd E:\openclaw\workspace-studyass-mgr\backend
npm run dev
```

---

## 📋 连接信息

| 配置项 | 值 |
|--------|-----|
| Host | localhost |
| Port | 6379 |
| Password | StudyAss2026!Redis |

### .env 配置

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=StudyAss2026!Redis
```

---

## 🔧 常用命令

### Redis 管理（在 Ubuntu 中）

```bash
sudo systemctl start redis    # 启动
sudo systemctl stop redis     # 停止
sudo systemctl restart redis  # 重启
sudo systemctl status redis   # 状态
redis-cli                     # 命令行客户端
```

### 查看日志

```bash
sudo journalctl -u redis -f
```

---

## ❓ 故障排查

### 问题 1: WSL 安装失败
```powershell
# 检查 WSL 状态
wsl --list --verbose

# 重启 WSL
wsl --shutdown
wsl
```

### 问题 2: Redis 连接被拒绝
```bash
# 在 Ubuntu 中检查 Redis 状态
sudo systemctl status redis

# 检查配置
sudo grep -E "^bind|^protected-mode" /etc/redis/redis.conf
# 应显示：bind 0.0.0.0 和 protected-mode no
```

### 问题 3: BullMQ 版本错误
确认 Redis 版本：
```bash
redis-server --version
# 应显示：Redis server v=7.2.x
```

---

## 📚 详细文档

- 完整指南：`docs/REDIS-UPGRADE-GUIDE.md`
- 升级报告：`docs/REDIS-UPGRADE-REPORT.md`
- 后端文档：`backend/README.md`

---

**生成时间**: 2026-03-17
**预计时间**: 5 分钟
