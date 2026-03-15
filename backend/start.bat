@echo off
echo ========================================
echo   学习助手 - 后端服务启动脚本
echo ========================================
echo.

cd /d %~dp0

echo [1/2] 安装依赖...
call npm install

echo.
echo [2/2] 启动服务...
call npm start

pause
