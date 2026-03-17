# Redis 7.2 升级指南（Windows 环境）

## 📋 升级背景

- **当前版本**: Redis 3.0.504 (Windows 原生)
- **目标版本**: Redis 7.2.x
- **升级原因**: BullMQ 3.x 需要 Redis 5.0+，当前版本不兼容
- **错误信息**: `Redis version needs to be greater than 5.0.0 Current: 3.0.504`

## ⚠️ Windows 环境限制

**重要**: Redis 官方已停止 Windows 原生支持。最后官方 Windows 版本为 3.2.100 (2016 年)。

要在 Windows 上使用 Redis 7.x，必须使用以下方案之一：

### 方案 A: WSL2（推荐）⭐
- 在 WSL2 中运行原生 Linux Redis
- 性能最佳，功能完整
- Windows 应用可通过 localhost 连接

### 方案 B: Docker Desktop
- 使用 Redis 官方容器
- 需要 Docker Desktop 安装

### 方案 C: Memurai（商业版）
- Redis 兼容的商业服务器
- 有免费开发者版

---

## 🚀 方案 A: WSL2 安装步骤（推荐）

### 步骤 1: 安装 WSL2 和 Ubuntu

以**管理员身份**运行 PowerShell：

```powershell
# 启用 WSL 功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 启用虚拟机平台
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 重启电脑（首次安装需要）
# restart-computer

# 安装 Ubuntu 22.04
wsl --install -d Ubuntu
```

### 步骤 2: 初始化 Ubuntu

1. 首次启动 Ubuntu 时，设置用户名和密码
2. 更新软件包：

```bash
sudo apt update && sudo apt upgrade -y
```

### 步骤 3: 安装 Redis 7.2

```bash
# 添加 Redis 官方 APT 仓库
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# 安装 Redis
sudo apt update
sudo apt install -y redis

# 验证版本
redis-server --version
# 应显示：Redis server v=7.2.x
```

### 步骤 4: 配置 Redis 允许外部连接

```bash
# 编辑配置文件
sudo nano /etc/redis/redis.conf

# 修改以下配置：
# 1. 绑定所有接口
bind 0.0.0.0

# 2. 保护模式（如果从 Windows 连接，设为 no）
protected-mode no

# 3. 设置密码（可选但推荐）
requirepass YourStrongPassword123!

# 保存并退出 (Ctrl+O, Enter, Ctrl+X)
```

### 步骤 5: 启动 Redis 服务

```bash
# 启动 Redis
sudo systemctl start redis

# 设置开机自启
sudo systemctl enable redis

# 检查状态
sudo systemctl status redis
```

### 步骤 6: 配置 Windows 应用连接

在项目的 `.env` 文件中更新 Redis 配置：

```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=YourStrongPassword123!  # 如果设置了密码
```

**注意**: WSL2 的 localhost 与 Windows 的 localhost 是互通的，可以直接连接。

### 步骤 7: 验证连接

从 Windows PowerShell 测试：

```powershell
# 安装 redis-cli（可选）
# 或使用 telnet 测试
telnet localhost 6379
# 输入：PING
# 应返回：+PONG
```

从 Node.js 测试：

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'YourStrongPassword123!' // 如果设置了
});

redis.ping().then(console.log); // 应输出：PONG
```

---

## 🐳 方案 B: Docker 安装步骤

### 步骤 1: 安装 Docker Desktop

从 https://www.docker.com/products/docker-desktop 下载并安装

### 步骤 2: 运行 Redis 容器

```powershell
docker run -d `
  --name redis-7 `
  -p 6379:6379 `
  -v redis-data:/data `
  redis:7.2 `
  redis-server --appendonly yes --requirepass YourStrongPassword123!
```

### 步骤 3: 验证

```powershell
docker ps
docker exec -it redis-7 redis-cli ping
```

---

## 📦 升级后验证清单

### 1. 版本验证
```bash
redis-server --version
# 应显示：Redis server v=7.2.x
```

### 2. 连接验证
```bash
redis-cli ping
# 应返回：PONG
```

### 3. BullMQ 队列验证
```bash
cd backend
node -e "const {Queue} = require('bullmq'); const Redis = require('ioredis'); const conn = new Redis({host:'localhost',port:6379,password:'YourStrongPassword123!'}); const q = new Queue('test-queue',{connection:conn}); q.add('test',{msg:'hello'}).then(job => {console.log('✅ Job added:',job.id); process.exit(0);}).catch(e => {console.error('❌ Error:',e.message); process.exit(1);});"
```

### 4. 应用功能验证
- [ ] 课本解析队列正常工作
- [ ] AI 题目生成队列正常工作
- [ ] 学习报告生成队列正常工作
- [ ] 排行榜计算正常工作

---

## 📝 备份与回滚

### 备份位置
```
C:\Program Files\Redis\backup_20260317_095016\
├── dump.rdb                    # Redis 数据文件
├── redis-server.exe            # 原 Redis 可执行文件
└── redis.windows-service.conf  # 原配置文件
```

### 回滚步骤（如需要）
1. 停止 WSL2/Docker Redis
2. 恢复原 Redis 服务：
```powershell
# 如果保留了原 Windows Redis 服务
net start Redis
```

---

## 🔧 故障排查

### 问题 1: WSL2 无法连接
```powershell
# 检查 WSL 状态
wsl --list --verbose

# 重启 WSL
wsl --shutdown
wsl
```

### 问题 2: Redis 连接被拒绝
```bash
# 检查 Redis 是否监听正确接口
redis-cli CONFIG GET bind

# 检查防火墙
sudo ufw status
sudo ufw allow 6379/tcp
```

### 问题 3: BullMQ 版本检查错误
确保在队列配置中设置 `skipVersionCheck: true`（仅用于测试）

---

## 📚 参考资源

- [Redis 官方文档](https://redis.io/docs/)
- [WSL2 安装指南](https://learn.microsoft.com/en-us/windows/wsl/install)
- [BullMQ 文档](https://docs.bullmq.io/)
- [Redis on Windows (归档)](https://github.com/microsoftarchive/redis)

---

## 📅 升级记录

| 日期 | 操作 | 执行人 | 状态 |
|------|------|--------|------|
| 2026-03-17 | 备份原 Redis 数据 | 自动脚本 | ✅ 完成 |
| 2026-03-17 | 创建升级指南 | 自动脚本 | ✅ 完成 |
| 2026-03-17 | WSL2 安装（自动） | 自动脚本 | ❌ 失败（需手动） |
| 2026-03-17 | Redis 7.2 安装 | - | ⏳ 待执行 |
| 2026-03-17 | BullMQ 验证 | - | ⏳ 待执行 |

---

**文档生成时间**: 2026-03-17 09:50 GMT+8
**最后更新**: 2026-03-17
