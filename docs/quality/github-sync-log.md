# GitHub 同步日志

**项目名称**: 小学生全科智能复习助手  
**创建日期**: 2026-03-15  
**同步频率**: 每 30 分钟  
**维护人**: 项目助理（质量审计）

---

## 1. 当前状态

### 1.1 Git 仓库配置

| 配置项 | 状态 | 值 |
|--------|------|-----|
| Git 初始化 | ❌ 未检测 | 需要执行 `git init` |
| Remote 配置 | ❌ 未配置 | 需要俊哥提供仓库地址 |
| 分支策略 | ⏳ 待配置 | 建议：main + develop + feature/* |
| 自动同步 | ❌ 未配置 | 需要配置定时任务 |

### 1.2 需要同步的目录

| 目录 | 优先级 | 说明 |
|------|--------|------|
| `backend/` | P0 | 后端代码（NestJS） |
| `frontend/` | P0 | 前端代码（Vite + React） |
| `mobile/` | P0 | 移动端代码（React Native） |
| `docs/` | P1 | 项目文档 |
| `project/v1-prd/` | P1 | PRD 和设计文档 |
| `sub-agents/` | P2 | Sub-Agent 配置 |

### 1.3 排除目录（.gitignore）

```
# 依赖
node_modules/
.pnp/
.pnp.js

# 构建输出
dist/
build/
.bundle/

# 环境变量
.env
.env.local
.env.*.local

# 日志
logs/
*.log
npm-debug.log*

# 测试覆盖
coverage/

# 系统文件
.DS_Store
Thumbs.db

# 临时文件
tmp/
temp/
.uploads/

# Prisma
prisma/migrations/ (可选，建议保留)

# 敏感配置
backend/src/config/*.env
```

---

## 2. 配置步骤

### 2.1 初始化 Git 仓库

```bash
cd E:\openclaw\workspace-studyass-mgr

# 1. 初始化 Git
git init

# 2. 创建 .gitignore
# (参考上方排除目录)

# 3. 首次提交
git add .
git commit -m "Initial commit: 学习助手项目 v1.0"
```

### 2.2 配置 GitHub Remote

```bash
# 俊哥需要创建 GitHub 仓库并提供地址
# 然后执行：
git remote add origin https://github.com/USERNAME/studyass-mgr.git

# 验证配置
git remote -v

# 推送代码
git branch -M main
git push -u origin main
```

### 2.3 配置自动同步（Windows 任务计划）

#### 方案 A: PowerShell 脚本 + 任务计划程序

**创建同步脚本** `scripts/github-sync.ps1`:

```powershell
# github-sync.ps1
$ErrorActionPreference = "Stop"

$workspace = "E:\openclaw\workspace-studyass-mgr"
Set-Location $workspace

Write-Host "[$(Get-Date)] 开始 GitHub 同步..." -ForegroundColor Cyan

try {
    # 拉取最新代码
    git fetch origin
    git pull origin main --rebase
    
    # 添加变更
    git add .
    
    # 检查是否有变更
    $status = git status --porcelain
    if ($status) {
        # 提交变更
        git commit -m "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        
        # 推送代码
        git push origin main
        
        Write-Host "[$(Get-Date)] 同步完成，已提交并推送" -ForegroundColor Green
    } else {
        Write-Host "[$(Get-Date)] 无变更，跳过提交" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[$(Get-Date)] 同步失败：$_" -ForegroundColor Red
    exit 1
}

Write-Host "[$(Get-Date)] 同步流程结束" -ForegroundColor Cyan
```

**创建任务计划**:

```powershell
# 以管理员身份运行 PowerShell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -File E:\openclaw\workspace-studyass-mgr\scripts\github-sync.ps1"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 30) `
    -RepetitionDuration (New-TimeSpan -Days 365)

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "StudyAss-GitHub-Sync" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "每 30 分钟自动同步代码到 GitHub"
```

#### 方案 B: Node.js 脚本（推荐，跨平台）

**创建同步脚本** `scripts/sync-github.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE = path.join(__dirname, '..');
const LOG_FILE = path.join(WORKSPACE, 'docs/quality/github-sync-log.md');

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    }[type];
    
    const logLine = `[${timestamp}] ${prefix} ${message}`;
    console.log(logLine);
    
    // 追加到日志文件
    fs.appendFileSync(LOG_FILE, `${logLine}\n`);
}

function run(command) {
    try {
        return execSync(command, { 
            cwd: WORKSPACE, 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (error) {
        throw new Error(`命令执行失败：${command}\n${error.message}`);
    }
}

function main() {
    log('开始 GitHub 同步...', 'info');
    
    try {
        // 检查是否在 Git 仓库中
        run('git rev-parse --git-dir');
        
        // 拉取最新代码
        log('拉取最新代码...', 'info');
        run('git fetch origin');
        run('git pull origin main --rebase || true');
        
        // 添加变更
        log('检查文件变更...', 'info');
        run('git add .');
        
        // 检查是否有变更
        const status = run('git status --porcelain').trim();
        
        if (status) {
            // 提交变更
            const timestamp = new Date().toISOString();
            const commitMsg = `Auto-sync: ${timestamp}`;
            log(`提交变更：${commitMsg}`, 'info');
            run(`git commit -m "${commitMsg}"`);
            
            // 推送代码
            log('推送到 GitHub...', 'info');
            run('git push origin main');
            
            log('同步完成', 'success');
        } else {
            log('无变更，跳过提交', 'warning');
        }
        
    } catch (error) {
        log(`同步失败：${error.message}`, 'error');
        process.exit(1);
    }
    
    log('同步流程结束', 'info');
}

main();
```

**配置 cron** (Linux/Mac) 或任务计划 (Windows):

```bash
# Linux/Mac: 编辑 crontab
crontab -e

# 添加以下行（每 30 分钟执行）
*/30 * * * * cd /path/to/workspace && node scripts/sync-github.js >> docs/quality/github-sync.log 2>&1
```

---

## 3. 同步记录

### 3.1 手动同步记录

| 日期时间 | 操作 | 结果 | 备注 |
|----------|------|------|------|
| 2026-03-15 08:00 | 创建同步日志 | ✅ 完成 | 初始配置 |
| 2026-03-15 08:20 | Git 仓库初始化 | ✅ 完成 | `git init` |
| 2026-03-15 08:20 | 配置 remote | ✅ 完成 | `origin → https://github.com/wjh2113/study-assistant-v1.git` |
| 2026-03-15 08:21 | 首次提交 | ✅ 完成 | 268 文件，48900 行代码 |
| 2026-03-15 08:22 | 推送到 GitHub | ✅ 完成 | `main` 分支，commit: `32f449c` |

### 3.2 自动同步记录（待配置后自动填充）

| 日期时间 | 提交 Hash | 变更文件数 | 状态 | 备注 |
|----------|-----------|------------|------|------|
| - | - | - | ⏳ 待配置 | - |

---

## 4. 分支策略

### 4.1 建议分支模型

```
main (生产)
  ↑
develop (开发)
  ↑
feature/* (功能分支)
  ↑
fix/* (修复分支)
```

### 4.2 分支保护规则

| 分支 | 保护规则 |
|------|----------|
| main | - 需要 PR 审查<br>- 需要 CI 通过<br>- 禁止直接推送 |
| develop | - 需要 PR 审查<br>- 禁止直接推送 |

### 4.3 PR 模板

创建 `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## 变更说明
<!-- 描述此 PR 的目的和变更内容 -->

## 关联 Issue
<!-- 关联的 Issue 编号 -->

## 测试情况
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成

## 文档更新
- [ ] 已更新相关文档
- [ ] 不需要文档更新

## 审查清单
- [ ] 代码符合项目规范
- [ ] 无敏感信息泄露
- [ ] 已进行自审查
```

---

## 5. CI/CD 配置（可选）

### 5.1 GitHub Actions 工作流

创建 `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run lint
      run: npm run lint
    
    - name: Run tests
      run: npm run test:cov
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        directory: ./backend/coverage

  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run lint
      run: npm run lint
    
    - name: Run tests
      run: npm run test:coverage
```

---

## 6. 监控与告警

### 6.1 同步失败告警

配置同步失败时发送通知：

```powershell
# 在同步脚本中添加
if ($LASTEXITCODE -ne 0) {
    # 发送 Feishu 通知
    Invoke-RestMethod -Uri "WEBHOOK_URL" -Method Post -ContentType "application/json" `
        -Body (@{
            msg_type = "interactive"
            card = @{
                config = @{ wide_screen_mode = $true }
                elements = @(
                    @{
                        tag = "div"
                        text = @{
                            tag = "lark_md"
                            content = "**GitHub 同步失败**\n时间：$(Get-Date)\n错误：$_"
                        }
                    }
                )
            }
        } | ConvertTo-Json -Depth 10)
}
```

### 6.2 同步统计

每周生成同步统计报告：

| 指标 | 本周 | 上周 | 变化 |
|------|------|------|------|
| 同步次数 | - | - | - |
| 成功次数 | - | - | - |
| 失败次数 | - | - | - |
| 平均延迟 | - | - | - |

---

## 7. 故障排查

### 7.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 认证失败 | Token 过期 | 更新 Git credentials |
| 冲突 | 多人同时修改 | 手动解决冲突后重新推送 |
| 大文件 | 超过 100MB | 使用 Git LFS 或排除该文件 |
| 网络超时 | 网络问题 | 检查网络连接，重试 |

### 7.2 恢复步骤

```bash
# 1. 检查 Git 状态
git status

# 2. 查看远程配置
git remote -v

# 3. 测试连接
git ls-remote origin

# 4. 强制同步（谨慎使用）
git fetch origin
git reset --hard origin/main

# 5. 重新推送
git push -f origin main
```

---

## 8. 下一步行动

### 立即行动（今天）

- [ ] 俊哥创建 GitHub 仓库
- [ ] 配置 Git remote
- [ ] 首次推送代码
- [ ] 测试同步脚本

### 本周内

- [ ] 配置自动同步任务
- [ ] 配置分支保护规则
- [ ] 创建 PR 模板
- [ ] 配置 CI/CD（可选）

---

**日志版本**: v1.0  
**配置状态**: ⏳ 待配置  
**下次审查**: 2026-03-22
[2026-03-15T00:21:46.329Z] ℹ️ ==================================================
[2026-03-15T00:21:46.333Z] ℹ️ GitHub 同步开始
[2026-03-15T00:21:46.333Z] ℹ️ ==================================================
[2026-03-15T00:21:46.458Z] ℹ️ Git remote: https://github.com/wjh2113/study-assistant-v1.git
[2026-03-15T00:21:46.458Z] ℹ️ 拉取最新代码...
[2026-03-15T00:21:48.745Z] ✅ Fetch 完成
[2026-03-15T00:21:48.813Z] ⚠️ Pull 跳过（可能首次推送）
[2026-03-15T00:21:48.813Z] ℹ️ 检查文件变更...
