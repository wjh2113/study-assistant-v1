#!/usr/bin/env node

/**
 * GitHub 自动同步脚本
 * 
 * 功能：
 * - 拉取最新代码
 * - 提交本地变更
 * - 推送到 GitHub
 * - 记录同步日志
 * 
 * 使用方式：
 * node scripts/sync-github.js
 * 
 * 定时执行（每 30 分钟）：
 * Windows: 使用任务计划程序
 * Linux/Mac: */30 * * * * node /path/to/sync-github.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const WORKSPACE = path.join(__dirname, '..');
const LOG_FILE = path.join(WORKSPACE, 'docs/quality/github-sync-log.md');
const ENABLE_AUTO_COMMIT = process.env.ENABLE_AUTO_COMMIT !== 'false';
const REMOTE_NAME = process.env.GIT_REMOTE || 'origin';
const BRANCH_NAME = process.env.GIT_BRANCH || 'main';

// 日志级别
const LOG_LEVELS = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌'
};

/**
 * 记录日志
 */
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    const logLine = `[${timestamp}] ${emoji} ${message}`;
    
    console.log(logLine);
    
    // 追加到日志文件（如果存在）
    try {
        if (fs.existsSync(LOG_FILE)) {
            fs.appendFileSync(LOG_FILE, `${logLine}\n`);
        }
    } catch (error) {
        console.warn('写入日志文件失败:', error.message);
    }
}

/**
 * 执行命令
 */
function run(command, options = {}) {
    try {
        const result = execSync(command, {
            cwd: WORKSPACE,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            ...options
        });
        return result.trim();
    } catch (error) {
        // 某些命令允许失败（如 pull 时没有变更）
        if (options.allowFailure) {
            return null;
        }
        throw new Error(`命令执行失败：${command}\n${error.stderr || error.message}`);
    }
}

/**
 * 检查是否在 Git 仓库中
 */
function checkGitRepo() {
    try {
        run('git rev-parse --git-dir');
        return true;
    } catch (error) {
        log('当前目录不是 Git 仓库', 'ERROR');
        return false;
    }
}

/**
 * 检查 Git 配置
 */
function checkGitConfig() {
    try {
        const remote = run(`git remote get-url ${REMOTE_NAME}`, { allowFailure: true });
        if (!remote) {
            log(`Remote "${REMOTE_NAME}" 未配置`, 'WARNING');
            log('请先配置 Git remote:', 'INFO');
            log(`  git remote add ${REMOTE_NAME} <repository-url>`, 'INFO');
            return false;
        }
        log(`Git remote: ${remote}`, 'INFO');
        return true;
    } catch (error) {
        log(`Git 配置检查失败：${error.message}`, 'ERROR');
        return false;
    }
}

/**
 * 拉取最新代码
 */
function pullLatest() {
    log('拉取最新代码...', 'INFO');
    
    try {
        // Fetch
        run(`git fetch ${REMOTE_NAME}`);
        log('Fetch 完成', 'SUCCESS');
        
        // Pull (允许失败，因为可能没有远程分支)
        const pullResult = run(`git pull ${REMOTE_NAME} ${BRANCH_NAME} --rebase`, { allowFailure: true });
        if (pullResult) {
            log('Pull 完成', 'SUCCESS');
        } else {
            log('Pull 跳过（可能首次推送）', 'WARNING');
        }
        
        return true;
    } catch (error) {
        log(`拉取代码失败：${error.message}`, 'ERROR');
        return false;
    }
}

/**
 * 检查并提交变更
 */
function commitChanges() {
    if (!ENABLE_AUTO_COMMIT) {
        log('自动提交已禁用', 'WARNING');
        return false;
    }
    
    log('检查文件变更...', 'INFO');
    
    try {
        // 添加所有变更
        run('git add .');
        
        // 检查是否有变更
        const status = run('git status --porcelain');
        
        if (!status) {
            log('无文件变更', 'INFO');
            return false;
        }
        
        // 统计变更
        const lines = status.split('\n').filter(l => l.trim());
        log(`检测到 ${lines.length} 个文件变更`, 'INFO');
        
        // 创建提交
        const timestamp = new Date().toISOString();
        const commitMsg = `Auto-sync: ${timestamp}`;
        
        log(`创建提交：${commitMsg}`, 'INFO');
        run(`git commit -m "${commitMsg}"`);
        log('提交完成', 'SUCCESS');
        
        return true;
    } catch (error) {
        log(`提交变更失败：${error.message}`, 'ERROR');
        return false;
    }
}

/**
 * 推送代码
 */
function pushChanges(hasCommit) {
    if (!hasCommit) {
        log('无新提交，跳过推送', 'INFO');
        return true;
    }
    
    log(`推送到 ${REMOTE_NAME}/${BRANCH_NAME}...`, 'INFO');
    
    try {
        run(`git push ${REMOTE_NAME} ${BRANCH_NAME}`);
        log('推送完成', 'SUCCESS');
        return true;
    } catch (error) {
        log(`推送失败：${error.message}`, 'ERROR');
        
        // 尝试设置上游分支
        if (error.message.includes('upstream')) {
            log('尝试设置上游分支...', 'INFO');
            try {
                run(`git push -u ${REMOTE_NAME} ${BRANCH_NAME}`);
                log('推送完成（已设置上游分支）', 'SUCCESS');
                return true;
            } catch (retryError) {
                log(`重试失败：${retryError.message}`, 'ERROR');
            }
        }
        
        return false;
    }
}

/**
 * 主函数
 */
function main() {
    log('='.repeat(50), 'INFO');
    log('GitHub 同步开始', 'INFO');
    log('='.repeat(50), 'INFO');
    
    const startTime = Date.now();
    
    try {
        // 1. 检查 Git 仓库
        if (!checkGitRepo()) {
            log('同步终止：不是 Git 仓库', 'ERROR');
            process.exit(1);
        }
        
        // 2. 检查 Git 配置
        if (!checkGitConfig()) {
            log('同步终止：Git 配置不完整', 'ERROR');
            process.exit(1);
        }
        
        // 3. 拉取最新代码
        if (!pullLatest()) {
            log('警告：拉取失败，继续尝试推送', 'WARNING');
        }
        
        // 4. 提交变更
        const hasCommit = commitChanges();
        
        // 5. 推送代码
        const pushSuccess = pushChanges(hasCommit);
        
        // 6. 总结
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log('='.repeat(50), 'INFO');
        
        if (pushSuccess) {
            if (hasCommit) {
                log(`同步完成（耗时 ${duration}s）`, 'SUCCESS');
            } else {
                log(`同步完成（无变更，耗时 ${duration}s）`, 'SUCCESS');
            }
            process.exit(0);
        } else {
            log(`同步完成但有错误（耗时 ${duration}s）`, 'WARNING');
            process.exit(1);
        }
        
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log('='.repeat(50), 'INFO');
        log(`同步失败：${error.message}（耗时 ${duration}s）`, 'ERROR');
        process.exit(1);
    }
}

// 运行
main();
