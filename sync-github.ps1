# GitHub 自动同步脚本 - 每 30 分钟执行
$ErrorActionPreference = "Stop"

try {
    Set-Location "E:\openclaw\workspace-studyass-mgr"
    
    # 拉取最新更改
    git pull origin main --rebase
    
    # 添加所有更改
    git add -A
    
    # 检查是否有更改
    $status = git status --porcelain
    if ($status) {
        # 提交更改
        git commit -m "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        
        # 推送到 GitHub
        git push origin main
        
        Write-Host "[$(Get-Date)] 同步成功"
    } else {
        Write-Host "[$(Get-Date)] 无更改，跳过同步"
    }
} catch {
    Write-Host "[$(Get-Date)] 同步失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
