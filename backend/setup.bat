@echo off
cd /d E:\openclaw\workspace-studyass-mgr\project\v1-prd\backend
call npm install --legacy-peer-deps
call npm run prisma:generate
call npm run prisma:migrate -- --name init
echo Done!
pause
