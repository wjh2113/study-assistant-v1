# 🚀 快速启动指南

## 方法一：使用启动脚本（推荐）

### 启动后端
双击 `backend/start.bat`

### 启动前端
双击 `frontend/start.bat`

## 方法二：命令行启动

### 后端
```bash
# 打开命令提示符或 PowerShell
cd backend
npm install
npm start
```

后端服务地址：http://localhost:3000

### 前端
```bash
# 打开新的命令提示符或 PowerShell
cd frontend
npm install
npm run dev
```

前端服务地址：http://localhost:5173

## 首次使用

1. 访问 http://localhost:5173
2. 点击"立即注册"创建账号
3. 登录后即可使用所有功能

## 配置 AI API

编辑 `backend/.env` 文件，配置你的 AI API：

```env
AI_API_KEY=your-api-key-here
AI_API_URL=https://api.example.com/v1/chat
```

支持的 AI 服务：
- OpenAI GPT
- 通义千问
- 文心一言
- 其他兼容 OpenAI 格式的 API

## 测试 API

使用 Postman 或 curl 测试：

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

## 常见问题

**Q: npm install 失败？**
A: 检查 Node.js 是否安装（需要 v18+），运行 `node --version` 确认

**Q: 端口被占用？**
A: 修改 `backend/.env` 中的 PORT 或 `frontend/vite.config.js` 中的 port

**Q: 数据库文件在哪？**
A: `backend/database/sqlite.db`，首次启动会自动创建
