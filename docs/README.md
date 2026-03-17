# 📚 StudyAss 学习助手 - 文档中心

**版本**: 1.0.0  
**最后更新**: 2026-03-17

---

## 📖 文档导航

欢迎来到 StudyAss 学习助手文档中心！本文档包含完整的 API 文档、部署指南、运维手册和用户使用指南。

### 快速导航

| 文档 | 说明 | 目标读者 |
|------|------|---------|
| [API 文档](./API.md) | 完整的 API 接口文档，包含 20+ 个接口的详细说明 | 开发者 |
| [OpenAPI 规范](./openapi.yaml) | OpenAPI/Swagger 格式，可导入 Postman 或 Swagger UI | 开发者 |
| [部署指南](./DEPLOY.md) | 从本地开发到生产环境的完整部署流程 | 运维/开发 |
| [运维手册](./OPERATIONS.md) | 日常运维、监控告警、故障排查指南 | 运维人员 |
| [用户指南](./USER_GUIDE.md) | 功能使用说明和最佳实践 | 最终用户 |

---

## 📋 API 接口汇总

### 接口统计

| 模块 | 接口数量 | 认证要求 |
|------|---------|---------|
| 健康检查 | 1 | 不需要 |
| 用户认证 | 6 | 部分需要 |
| 知识点管理 | 6 | 需要 |
| 学习进度 | 4 | 需要 |
| AI 问答 | 4 | 需要 |
| AI 出题 | 3 | 需要 |
| AI Gateway V2 | 6 | 需要 |
| AI 学习规划 | 11 | 需要 |
| 课本解析 | 7 | 需要 |
| 薄弱点分析 | 5 | 需要 |
| 积分系统 | 5 | 需要 |
| 排行榜 | 4 | 需要 |
| 文件上传 | 4 | 需要 |
| 练习会话 | 8 | 需要 |
| **总计** | **74** | - |

### 接口列表速查

#### 健康检查
- `GET /api/health` - 系统健康状态

#### 用户认证
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/me` - 获取当前用户
- `PUT /api/auth/me` - 更新用户信息

#### 知识点管理
- `POST /api/knowledge` - 创建知识点
- `GET /api/knowledge` - 获取知识点列表
- `GET /api/knowledge/search` - 搜索知识点
- `GET /api/knowledge/:id` - 获取单个知识点
- `PUT /api/knowledge/:id` - 更新知识点
- `DELETE /api/knowledge/:id` - 删除知识点

#### 学习进度
- `POST /api/progress/upsert` - 创建/更新进度
- `POST /api/progress/log` - 记录学习时长
- `GET /api/progress` - 获取进度列表
- `GET /api/progress/stats` - 获取学习统计

#### AI 问答
- `POST /api/ai/ask` - AI 答疑
- `GET /api/ai/history` - 问答历史
- `GET /api/ai/search` - 搜索问答
- `DELETE /api/ai/:id` - 删除问答

#### AI 出题
- `POST /api/ai/generate-questions` - 生成题目
- `GET /api/ai/task-logs` - 任务日志列表
- `GET /api/ai/task-logs/:id` - 单条任务日志

#### AI Gateway V2
- `POST /api/ai/v2/generate-questions` - 生成题目 V2
- `POST /api/ai/v2/chat` - 智能对话
- `GET /api/ai/v2/health` - 健康检查
- `GET /api/ai/v2/status` - 服务状态
- `GET /api/ai/v2/token-usage` - Token 统计
- `GET /api/ai/v2/task-logs` - 任务日志

#### AI 学习规划
- `POST /api/ai/planning/generate` - 生成计划
- `GET /api/ai/planning/user-profile` - 用户画像
- `GET /api/ai/planning/daily-tasks/:date` - 每日任务
- `PUT /api/ai/planning/tasks/:taskId/status` - 更新任务
- `GET /api/ai/planning/tasks/statistics` - 任务统计
- `GET /api/ai/planning/:planId/progress` - 计划进度
- `GET /api/ai/planning/:planId/track` - 跟踪执行
- `GET /api/ai/planning/:planId/report` - 执行报告
- `GET /api/ai/planning/:planId/recommendations` - 推荐行动
- `POST /api/ai/planning/:planId/adjust` - 调整计划

#### 课本解析
- `POST /api/textbooks/upload` - 上传课本
- `POST /api/textbooks/parse` - 解析课本（旧）
- `GET /api/textbooks/tasks/:taskId` - 任务状态
- `GET /api/textbooks/tasks` - 任务列表
- `GET /api/textbooks` - 课本列表
- `GET /api/textbooks/:id/units` - 单元列表
- `GET /api/textbooks/:id` - 课本详情
- `DELETE /api/textbooks/:id` - 删除课本

#### 薄弱点分析
- `GET /api/weakness/analyze` - 分析薄弱点
- `GET /api/weakness/mastery` - 掌握度列表
- `POST /api/weakness/update` - 更新掌握度
- `GET /api/weakness/recommend` - 推荐题目
- `GET /api/weakness/trend/:id` - 掌握度趋势

#### 积分系统
- `GET /api/points/me` - 我的积分
- `GET /api/points/records` - 积分记录
- `POST /api/points/check-in` - 打卡
- `POST /api/points/practice` - 练习积分
- `GET /api/points/check-in/status` - 打卡状态

#### 排行榜
- `GET /api/leaderboard/:type` - 排行榜
- `GET /api/leaderboard/me/rank` - 我的排名
- `GET /api/leaderboard/history` - 历史记录
- `POST /api/leaderboard/refresh` - 刷新榜单

#### 文件上传
- `POST /api/upload/textbook` - 上传课本
- `POST /api/upload/avatar` - 上传头像
- `POST /api/upload/attachment` - 上传附件
- `GET /api/upload/test` - 测试上传

#### 练习会话
- `POST /api/practice/sessions` - 创建会话
- `GET /api/practice/sessions` - 会话列表
- `GET /api/practice/sessions/:id` - 会话详情
- `PUT /api/practice/sessions/:id` - 更新会话
- `DELETE /api/practice/sessions/:id` - 删除会话
- `POST /api/practice/sessions/:id/questions` - 添加问题
- `POST /api/practice/sessions/:id/answers` - 提交答案
- `GET /api/practice/sessions/:id/answers` - 答题记录

---

## 🚀 快速开始

### 开发者

1. 阅读 [API 文档](./API.md) 了解接口详情
2. 导入 [OpenAPI 规范](./openapi.yaml) 到 Postman
3. 参考 [部署指南](./DEPLOY.md) 搭建开发环境

### 运维人员

1. 阅读 [部署指南](./DEPLOY.md) 了解部署流程
2. 参考 [运维手册](./OPERATIONS.md) 进行日常运维
3. 配置监控告警和备份策略

### 最终用户

1. 阅读 [用户指南](./USER_GUIDE.md) 了解功能使用
2. 参考最佳实践提高学习效率

---

## 📁 文档结构

```
docs/
├── README.md           # 本文档（文档中心首页）
├── API.md              # API 接口文档
├── openapi.yaml        # OpenAPI/Swagger 规范
├── DEPLOY.md           # 部署指南
├── OPERATIONS.md       # 运维手册
└── USER_GUIDE.md       # 用户使用指南
```

---

## 🔧 工具集成

### Postman

导入 `openapi.yaml` 到 Postman：

1. 打开 Postman
2. 点击 Import
3. 选择 `openapi.yaml` 文件
4. 自动生成 API 集合

### Swagger UI

使用 Swagger UI 查看 API：

```bash
# 使用 Docker 运行 Swagger UI
docker run -d \
  -p 8080:8080 \
  -e SWAGGER_JSON=/api/openapi.yaml \
  -v $(pwd):/api \
  swaggerapi/swagger-ui
```

访问 http://localhost:8080

### SwaggerHub

上传 `openapi.yaml` 到 SwaggerHub 进行在线协作编辑。

---

## 📊 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-03-17 | 初始版本，包含完整 API 文档 |

---

## 🤝 贡献指南

如发现文档错误或需要改进，请：

1. 提交 Issue 描述问题
2. 或提交 Pull Request 直接修复
3. 联系技术团队：support@studyass.com

---

## 📞 技术支持

- 📧 邮箱：support@studyass.com
- 💬 客服微信：studyass-support
- 📱 电话：400-XXX-XXXX

---

**文档中心首页**

[开始阅读 API 文档 →](./API.md)
