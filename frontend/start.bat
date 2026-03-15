@echo off
echo ========================================
echo   学习助手 - 前端服务启动脚本
echo ========================================
echo.

cd /d %~dp0

echo [1/2] 安装依赖...
call npm install

echo.
echo [2/2] 启动开发服务器...
call npm run dev

pause
