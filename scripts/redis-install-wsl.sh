# Redis 7.2 WSL2 快速安装脚本
# 使用方法：在 Ubuntu WSL2 中运行以下命令
# 
# 1. 在 PowerShell 中：wsl -d Ubuntu
# 2. 在 Ubuntu 中：curl -O https://your-server/redis-install.sh && bash redis-install.sh

#!/bin/bash

set -e

echo "========================================="
echo "  Redis 7.2 安装脚本 (Ubuntu WSL2)"
echo "========================================="

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

# 步骤 1: 更新软件包
echo "[1/5] 更新软件包..."
apt update -qq

# 步骤 2: 安装必要工具
echo "[2/5] 安装必要工具..."
apt install -y -qq curl gnupg lsb-release

# 步骤 3: 添加 Redis 官方仓库
echo "[3/5] 添加 Redis 官方仓库..."
curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" > /etc/apt/sources.list.d/redis.list

# 步骤 4: 安装 Redis
echo "[4/5] 安装 Redis 7.2..."
apt update -qq
apt install -y -qq redis

# 验证版本
REDIS_VERSION=$(redis-server --version | awk '{print $3}')
echo "✅ Redis 版本：$REDIS_VERSION"

# 步骤 5: 配置 Redis
echo "[5/5] 配置 Redis..."

# 备份原配置
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# 修改配置：绑定所有接口
sed -i 's/^bind 127.0.0.1.*/bind 0.0.0.0/' /etc/redis/redis.conf

# 修改配置：关闭保护模式
sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

# 设置密码（可以通过环境变量覆盖）
REDIS_PASSWORD=${REDIS_PASSWORD:-"StudyAss2026!Redis"}
if grep -q "^requirepass" /etc/redis/redis.conf; then
  sed -i "s/^requirepass.*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
else
  echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf
fi

echo "✅ Redis 密码：$REDIS_PASSWORD"

# 启动 Redis
echo "启动 Redis 服务..."
systemctl start redis
systemctl enable redis

# 验证
echo ""
echo "========================================="
echo "  验证安装"
echo "========================================="
redis-cli ping
echo ""
echo "Redis 信息:"
redis-cli INFO server | grep -E "redis_version|os|tcp_port"

echo ""
echo "========================================="
echo "  ✅ Redis 7.2 安装完成!"
echo "========================================="
echo ""
echo "连接信息:"
echo "  Host: localhost (从 Windows 可直接访问)"
echo "  Port: 6379"
echo "  Password: $REDIS_PASSWORD"
echo ""
echo "Windows .env 配置:"
echo "  REDIS_HOST=localhost"
echo "  REDIS_PORT=6379"
echo "  REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""
echo "管理命令:"
echo "  sudo systemctl start redis    # 启动"
echo "  sudo systemctl stop redis     # 停止"
echo "  sudo systemctl restart redis  # 重启"
echo "  sudo systemctl status redis   # 状态"
echo "  redis-cli                     # 命令行客户端"
echo ""
