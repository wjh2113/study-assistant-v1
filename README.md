# 小学生全科智能复习助手

> 基于 NestJS + Taro + PostgreSQL 的智能教育平台

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 📚 项目简介

**小学生全科智能复习助手** 是一款面向小学生的全科智能复习平台，支持语文、数学、英语、科学等学科。通过 AI 智能辅导、个性化错题本、学习计划等功能，帮助学生高效复习。

### 核心功能

- 📖 **智能练习** - 根据年级和知识点推荐习题
- ❌ **错题本** - 自动收录错题，智能推送复习
- 📊 **学习报告** - 可视化学习数据分析
- 🎯 **学习计划** - 自定义学习目标，跟踪进度
- 🤖 **AI 辅导** - 7×24 小时智能答疑
- 📱 **多端支持** - 微信小程序 + H5

---

## 🛠 技术栈

### 后端
- **框架**: NestJS 10
- **ORM**: Prisma 5
- **数据库**: PostgreSQL 16
- **缓存/队列**: Redis 7 + BullMQ
- **认证**: JWT + Passport
- **文件存储**: FTP (vsftpd)

### 前端
- **框架**: Taro 4 + React 18
- **目标平台**: 微信小程序、H5
- **状态管理**: MobX
- **UI**: 自定义组件

### 基础设施
- **容器**: Docker + Docker Compose
- **Web 服务器**: Nginx
- **CI/CD**: GitHub Actions (待配置)

---

## 🚀 快速启动

### 前置要求

- Node.js >= 20
- Docker & Docker Compose
- Git

### 1. 克隆项目

```bash
git clone <repository-url>
cd study-assistant
```

### 2. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置必要参数
# 至少需要配置：
# - JWT_SECRET
# - DATABASE_URL (如使用 Docker 可保持默认)
```

### 3. Docker 一键启动（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

服务启动后访问：
- **前端**: http://localhost
- **API**: http://localhost/api
- **健康检查**: http://localhost/api/health

### 4. 本地开发模式

#### 启动数据库和中间件

```bash
docker-compose up -d postgres redis vsftpd
```

#### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 数据库迁移
npx prisma migrate dev --name init

# 启动开发服务器
npm run start:dev
```

后端服务运行在：http://localhost:3000

#### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 微信小程序开发
npm run dev:weapp

# H5 开发
npm run dev:h5
```

---

## 📁 项目结构

```
study-assistant/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   ├── main.ts
│   │   ├── modules/        # 功能模块
│   │   ├── common/         # 公共模块
│   │   └── prisma/         # Prisma 服务
│   ├── prisma/
│   │   ├── schema.prisma   # 数据库 Schema
│   │   └── migrations/     # 迁移文件
│   ├── test/               # 测试文件
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Taro 前端
│   ├── src/
│   │   ├── pages/         # 页面
│   │   ├── components/    # 组件
│   │   ├── services/      # API 服务
│   │   ├── utils/         # 工具函数
│   │   └── styles/        # 样式
│   ├── config/            # 配置文件
│   └── package.json
├── docs/                  # 文档
│   └── DB_SCHEMA.md      # 数据库设计
├── nginx/                 # Nginx 配置
│   └── conf.d/
├── docker-compose.yml     # Docker 编排
├── .env.example          # 环境变量模板
└── README.md             # 项目说明
```

---

## 📖 API 文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/refresh | 刷新 Token |
| GET | /api/auth/profile | 获取用户信息 |

### 习题接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/exercises | 获取习题列表 |
| GET | /api/exercises/:id | 获取习题详情 |
| POST | /api/exercises | 创建习题（教师） |
| PUT | /api/exercises/:id | 更新习题 |
| DELETE | /api/exercises/:id | 删除习题 |

### 错题本接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/wrong-questions | 获取错题列表 |
| POST | /api/wrong-questions | 添加错题 |
| PUT | /api/wrong-questions/:id | 更新错题 |
| DELETE | /api/wrong-questions/:id | 删除错题 |

详细 API 文档请访问：`/api/docs` (Swagger UI，待实现)

---

## 🧪 测试

```bash
# 后端测试
cd backend
npm run test          # 单元测试
npm run test:e2e      # 端到端测试
npm run test:cov      # 测试覆盖率

# 前端测试
cd frontend
npm run test:unit     # 单元测试
```

---

## 📝 开发规范

### 代码风格

- 后端：遵循 [NestJS 风格指南](https://docs.nestjs.com/recipes/eslint)
- 前端：遵循 [Taro 开发规范](https://taro-docs.jd.com/docs/guideline)

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

---

## 🔧 常见问题

### 1. Docker 启动失败

```bash
# 查看日志
docker-compose logs

# 重启服务
docker-compose restart

# 重建容器
docker-compose up -d --force-recreate
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres

# 重置数据库（危险操作！）
docker-compose down -v
docker-compose up -d postgres
```

### 3. Prisma 迁移错误

```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

---

## 👥 团队

- **项目经理**: 俊哥
- **全栈开发**: AI 团队
- **产品 UX**: AI 团队

---

## 📄 许可证

MIT License

---

## 📞 联系方式

如有问题，请联系项目负责人。

---

**最后更新**: 2026-03-14
