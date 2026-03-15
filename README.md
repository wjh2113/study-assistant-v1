# 📚 学习助手 (StudyAss)

俊哥的学习助手项目 - Web 端 + APP 端（React Native）

## 技术栈

- **前端**: React + TailwindCSS + Vite
- **APP**: React Native (Expo)
- **后端**: NestJS + Prisma
- **数据库**: SQLite (开发) / PostgreSQL (生产)

## 文档导航

- 📖 [API 接口文档](project/v1-prd/docs/API.md)
- 🚀 [部署指南](project/v1-prd/docs/DEPLOY.md)
- 📋 [产品需求文档](project/v1-prd/docs/PRD_v1.1.md)
- 💾 [数据库设计](project/v1-prd/docs/DB_SCHEMA.md)

## 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x
- Git

### 一键启动（开发环境）

```bash
# 克隆项目
git clone <repo-url>
cd studyass-mgr/project/v1-prd

# 安装后端依赖
cd backend
npm install
cp .env.example .env
npm run dev

# 新终端 - 安装前端依赖
cd ../frontend
npm install
npm run dev
```

### 后端启动

```bash
cd project/v1-prd/backend
npm install
npm run dev          # 开发模式（热重载）
npm start            # 生产模式
npm test             # 运行测试
```

后端服务将在 http://localhost:3000 启动

### 前端启动

```bash
cd project/v1-prd/frontend
npm install
npm run dev          # 开发模式
npm run build        # 生产构建
npm run preview      # 预览生产构建
```

前端服务将在 http://localhost:5173 启动

## 项目结构

```
studyass-mgr/
├── project/v1-prd/         # v1 版本主目录
│   ├── backend/            # NestJS + Prisma 后端
│   │   ├── src/
│   │   │   ├── modules/    # 功能模块（按业务划分）
│   │   │   │   ├── auth/          # 认证模块
│   │   │   │   ├── users/         # 用户模块
│   │   │   │   ├── textbooks/     # 课本模块
│   │   │   │   ├── exercises/     # 习题模块
│   │   │   │   ├── wrong-questions/ # 错题模块
│   │   │   │   ├── practice/      # 练习模块
│   │   │   │   ├── learning/      # 学习进度模块
│   │   │   │   ├── points/        # 积分模块
│   │   │   │   ├── family/        # 家庭模块
│   │   │   │   └── files/         # 文件模块
│   │   │   ├── prisma/     # Prisma 服务
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/         # Prisma Schema
│   │   ├── uploads/        # 上传文件
│   │   └── package.json
│   │
│   ├── frontend/           # React + TailwindCSS + Vite 前端
│   │   ├── src/
│   │   │   ├── components/ # 组件
│   │   │   ├── pages/      # 页面
│   │   │   ├── services/   # API 服务
│   │   │   └── utils/      # 工具函数
│   │   └── package.json
│   │
│   ├── docs/               # 项目文档
│   │   ├── API.md          # API 接口文档
│   │   ├── DEPLOY.md       # 部署指南
│   │   ├── PRD_v1.1.md     # 产品需求文档
│   │   └── DB_SCHEMA.md    # 数据库设计
│   │
│   ├── docker-compose.yml  # Docker 编排
│   └── .env.example        # 环境变量模板
│
├── sub-agents/             # Sub-Agent 配置
│   ├── product-ux/
│   ├── fullstack/
│   ├── qa/
│   └── algorithm/
│
└── README.md
```

## API 接口

### 用户认证
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/me` - 更新用户信息

### 知识点管理
- `GET /api/knowledge` - 获取知识点列表
- `GET /api/knowledge/:id` - 获取单个知识点
- `POST /api/knowledge` - 创建知识点
- `PUT /api/knowledge/:id` - 更新知识点
- `DELETE /api/knowledge/:id` - 删除知识点
- `GET /api/knowledge/search?keyword=xxx` - 搜索知识点

### 学习进度
- `GET /api/progress` - 获取学习进度列表
- `GET /api/progress/stats` - 获取学习统计
- `POST /api/progress/upsert` - 创建/更新学习进度
- `POST /api/progress/log` - 记录学习时长

### AI 功能
- `POST /api/ai/ask` - AI 答疑
- `GET /api/ai/history` - 获取问答历史
- `POST /api/ai/generate-questions` - AI 出题
- `GET /api/ai/task-logs` - 获取任务日志

### 课本解析
- `POST /api/textbooks/parse` - 上传并解析课本
- `GET /api/textbooks` - 获取课本列表
- `GET /api/textbooks/tasks/:taskId` - 获取解析任务状态

### 薄弱点分析
- `GET /api/weakness/analyze` - 分析薄弱点
- `GET /api/weakness/mastery` - 获取知识点掌握度
- `POST /api/weakness/update` - 更新掌握度

### 积分系统
- `GET /api/points/me` - 获取我的积分
- `GET /api/points/records` - 获取积分记录
- `POST /api/points/check-in` - 打卡
- `POST /api/points/practice` - 记录练习积分

### 排行榜
- `GET /api/leaderboard/total` - 总排行榜
- `GET /api/leaderboard/weekly` - 周排行榜
- `GET /api/leaderboard/monthly` - 月排行榜
- `GET /api/leaderboard/me/rank` - 我的排名

详细 API 文档请查看 [project/v1-prd/docs/API.md](project/v1-prd/docs/API.md)

## 环境变量配置

### 后端环境变量

编辑 `project/v1-prd/backend/.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/studyass
DATABASE_PATH=./database/sqlite.db

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI API 配置
AI_API_KEY=your-api-key
AI_API_URL=https://api.example.com/v1/chat

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 测试模式
TEST_MODE=false
```

### 前端环境变量

编辑 `project/v1-prd/frontend/.env` 文件：

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=学习助手
```

## 开发规范

### 命名规范

- **数据库表名**: snake_case (e.g., `user_profiles`, `knowledge_points`)
- **类名**: PascalCase (e.g., `UserModel`, `KnowledgePointController`)
- **变量/函数名**: camelCase (e.g., `getUserById`, `isLoggedIn`)
- **枚举值**: UPPER_CASE (e.g., `STUDENT`, `PARENT`, `ACTIVE`)
- **常量**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `API_VERSION`)

### 代码风格

- 使用 ESLint + Prettier 统一代码格式
- 函数注释使用 JSDoc 格式
- 错误处理使用 try-catch
- 异步操作使用 async/await

## 测试

```bash
# 后端测试
cd project/v1-prd/backend
npm test
npm run test:coverage

# 前端测试
cd project/v1-prd/frontend
npm test
```

## 部署

详细部署指南请查看 [project/v1-prd/docs/DEPLOY.md](project/v1-prd/docs/DEPLOY.md)

## 版本变更

版本变更日志请查看 [project/v1-prd/docs/CHANGELOG.md](project/v1-prd/docs/CHANGELOG.md)

## P2 优化记录

P2 阶段优化内容请查看 [docs/p2-optimization-log.md](docs/p2-optimization-log.md)

## 下一步计划

- [ ] 完善前端页面开发
- [ ] 完成 React Native 移动端开发
- [ ] 添加更多学习功能（错题本、复习提醒等）
- [ ] 优化 UI/UX
- [ ] 添加 E2E 测试
- [ ] 集成 CI/CD 流程

## 开发者

俊哥的学习助手团队

## 许可证

MIT License
