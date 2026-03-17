# Redis 7.2 升级脚本 (Windows PowerShell)
# 使用方法：以管理员身份运行 PowerShell，然后执行 .\redis-upgrade.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Redis 7.2 升级脚本 (Windows + WSL2)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ 错误：请以管理员身份运行此脚本" -ForegroundColor Red
    Write-Host "   右键点击 PowerShell -> '以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 管理员权限检查通过" -ForegroundColor Green
Write-Host ""

# 步骤 1: 检查 WSL 状态
Write-Host "[1/6] 检查 WSL 状态..." -ForegroundColor Cyan
try {
    $wslStatus = wsl --list --verbose 2>&1
    if ($wslStatus -match "Ubuntu") {
        Write-Host "✅ Ubuntu WSL 已安装" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Ubuntu WSL 未安装，开始安装..." -ForegroundColor Yellow
        
        Write-Host "    正在安装 Ubuntu 22.04..." -ForegroundColor Gray
        winget install Canonical.Ubuntu.2204 --accept-source-agreements --accept-package-agreements --silent
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Ubuntu 安装完成" -ForegroundColor Green
            Write-Host "⚠️  请手动启动 Ubuntu 完成初始化设置" -ForegroundColor Yellow
            Write-Host "    1. 运行 'wsl -d Ubuntu' 启动 Ubuntu" -ForegroundColor Gray
            Write-Host "    2. 设置用户名和密码" -ForegroundColor Gray
            Write-Host "    3. 重新运行此脚本" -ForegroundColor Gray
            exit 0
        } else {
            Write-Host "❌ Ubuntu 安装失败，请手动安装" -ForegroundColor Red
            Write-Host "    运行：wsl --install -d Ubuntu" -ForegroundColor Gray
            exit 1
        }
    }
} catch {
    Write-Host "❌ WSL 检查失败：$_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 步骤 2: 备份当前 Redis 数据
Write-Host "[2/6] 备份 Redis 数据..." -ForegroundColor Cyan
$redisDir = "C:\Program Files\Redis"
$backupDir = "$redisDir\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

if (Test-Path "$redisDir\dump.rdb") {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item "$redisDir\dump.rdb" "$backupDir\" -Force
    Copy-Item "$redisDir\redis.windows-service.conf" "$backupDir\" -Force
    Write-Host "✅ 备份完成：$backupDir" -ForegroundColor Green
} else {
    Write-Host "⚠️  未找到 Redis 数据文件，跳过备份" -ForegroundColor Yellow
}

Write-Host ""

# 步骤 3: 检查 Redis 安装脚本
Write-Host "[3/6] 准备 Redis 安装脚本..." -ForegroundColor Cyan
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installScript = "$scriptDir\redis-install-wsl.sh"

if (Test-Path $installScript) {
    Write-Host "✅ 找到安装脚本：$installScript" -ForegroundColor Green
} else {
    Write-Host "⚠️  安装脚本不存在，请确保脚本在同一目录" -ForegroundColor Yellow
}

Write-Host ""

# 步骤 4: 指导用户安装 Redis
Write-Host "[4/6] Redis 7.2 安装说明" -ForegroundColor Cyan
Write-Host ""
Write-Host "请按照以下步骤在 WSL2 中安装 Redis 7.2：" -ForegroundColor White
Write-Host ""
Write-Host "1. 启动 Ubuntu WSL:" -ForegroundColor Cyan
Write-Host "   wsl -d Ubuntu" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 在 Ubuntu 中运行安装脚本:" -ForegroundColor Cyan
Write-Host "   sudo bash /mnt/e/openclaw/workspace-studyass-mgr/scripts/redis-install-wsl.sh" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 或者手动安装:" -ForegroundColor Cyan
Write-Host "   curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg" -ForegroundColor Gray
Write-Host "   echo 'deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main' | sudo tee /etc/apt/sources.list.d/redis.list" -ForegroundColor Gray
Write-Host "   sudo apt update && sudo apt install -y redis" -ForegroundColor Gray
Write-Host ""

Write-Host "按任意键继续配置..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""

# 步骤 5: 更新项目配置
Write-Host "[5/6] 更新项目配置..." -ForegroundColor Cyan

$envFile = "E:\openclaw\workspace-studyass-mgr\backend\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # 更新 Redis 配置
    $envContent = $envContent -replace '(REDIS_HOST=).*', '${1}localhost'
    $envContent = $envContent -replace '(REDIS_PORT=).*', '${1}6379'
    # 如果存在密码配置，更新为默认值
    if ($envContent -match 'REDIS_PASSWORD=') {
        $envContent = $envContent -replace '(REDIS_PASSWORD=).*', '${1}StudyAss2026!Redis'
    } else {
        $envContent += "`nREDIS_PASSWORD=StudyAss2026!Redis"
    }
    
    Set-Content $envFile $envContent -NoNewline
    Write-Host "✅ 已更新 .env 配置" -ForegroundColor Green
} else {
    Write-Host "⚠️  未找到 .env 文件，请手动配置" -ForegroundColor Yellow
}

Write-Host ""

# 步骤 6: 验证说明
Write-Host "[6/6] 验证说明" -ForegroundColor Cyan
Write-Host ""
Write-Host "安装完成后，运行以下命令验证：" -ForegroundColor White
Write-Host ""
Write-Host "1. 在 Ubuntu 中验证 Redis:" -ForegroundColor Cyan
Write-Host "   redis-cli ping" -ForegroundColor Gray
Write-Host "   # 应返回：PONG" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 在 Windows 中验证连接:" -ForegroundColor Cyan
Write-Host "   cd E:\openclaw\workspace-studyass-mgr\backend" -ForegroundColor Gray
Write-Host "   node -e \"const Redis = require('ioredis'); const r = new Redis({host:'localhost',port:6379,password:'StudyAss2026!Redis'}); r.ping().then(console.log);\"" -ForegroundColor Gray
Write-Host "   # 应返回：PONG" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 验证 BullMQ 队列:" -ForegroundColor Cyan
Write-Host "   node -e \"const {Queue} = require('bullmq'); const Redis = require('ioredis'); const conn = new Redis({host:'localhost',port:6379,password:'StudyAss2026!Redis'}); const q = new Queue('test-queue',{connection:conn}); q.add('test',{msg:'hello'}).then(job => {console.log('✅ Job added:',job.id); process.exit(0);}).catch(e => {console.error('❌ Error:',e.message); process.exit(1);});\"" -ForegroundColor Gray
Write-Host "   # 应显示：✅ Job added: xxx" -ForegroundColor Gray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ✅ 配置完成！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor White
Write-Host "1. 按照上述说明在 WSL2 中安装 Redis 7.2" -ForegroundColor Gray
Write-Host "2. 运行验证命令确认连接正常" -ForegroundColor Gray
Write-Host "3. 启动应用测试队列功能" -ForegroundColor Gray
Write-Host ""
Write-Host "详细指南请查看：docs\REDIS-UPGRADE-GUIDE.md" -ForegroundColor Cyan
Write-Host ""
