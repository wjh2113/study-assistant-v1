# Redis Auto-Installation Script for WSL2
# This script installs Ubuntu 24.04 on WSL2 and Redis 7

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redis Auto-Installation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Ubuntu 24.04 on WSL2
Write-Host "[1/4] Installing Ubuntu 24.04 on WSL2..." -ForegroundColor Yellow
wsl --install -d Ubuntu-24.04 --no-launch
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: WSL installation may require restart or manual intervention" -ForegroundColor Orange
}
Start-Sleep -Seconds 5

# Step 2: Wait for WSL to be ready and install Redis
Write-Host "[2/4] Installing Redis 7 on Ubuntu..." -ForegroundColor Yellow
$redisInstallScript = @'
#!/bin/bash
set -e

echo "Updating package lists..."
apt-get update

echo "Installing Redis 7..."
apt-get install -y redis-server redis-tools

echo "Configuring Redis..."
# Allow connections from all interfaces
sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf

# Enable protected mode off for development
sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf

echo "Starting Redis service..."
service redis-server start

echo "Verifying Redis installation..."
redis-server --version
redis-cli ping

echo "Redis installation complete!"
'@

# Write script to temp location and execute
$tempScript = "$env:TEMP\redis-install.sh"
Set-Content -Path $tempScript -Value $redisInstallScript -NoNewline

# Execute in WSL (this may take a moment)
Write-Host "[3/4] Executing Redis installation in WSL..." -ForegroundColor Yellow
wsl -d Ubuntu-24.04 bash -c "$redisInstallScript"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Redis installation failed" -ForegroundColor Red
    exit 1
}

# Step 4: Verify installation
Write-Host "[4/4] Verifying Redis installation..." -ForegroundColor Yellow
$redisVersion = wsl -d Ubuntu-24.04 redis-server --version
$redisPing = wsl -d Ubuntu-24.04 redis-cli ping

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Redis Version: $redisVersion"
Write-Host "Redis Ping: $redisPing"
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor Cyan
Write-Host "  Host: localhost (WSL2)"
Write-Host "  Port: 6379"
Write-Host "  Distribution: Ubuntu 24.04 (WSL2)"
Write-Host ""
