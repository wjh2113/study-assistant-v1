@echo off
cd /d E:\openclaw\workspace-studyass-mgr\project\v1-prd\backend
echo Installing dependencies...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo npm install failed!
    pause
    exit /b %errorlevel%
)
echo Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo prisma generate failed!
    pause
    exit /b %errorlevel%
)
echo Running migration...
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo prisma migrate failed!
    pause
    exit /b %errorlevel%
)
echo Setup complete!
