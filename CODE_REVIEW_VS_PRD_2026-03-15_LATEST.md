# 🔍 代码审查报告 - 基于最新 PRD v1.1（2026-03-15 更新版）

**项目名称**: 小学生全科智能复习助手  
**审查日期**: 2026-03-15 08:25  
**PRD 版本**: v1.1（2026-03-15 更新）  
**审查范围**: PRD 对比、代码实现、数据库设计、安全性  
**审查人**: AI 代码审查团队  

---

## 📊 审查概览

| 类别 | 符合项 | 不符合项 | 部分符合 | 符合率 |
|------|--------|----------|----------|--------|
| 技术栈选型 | 2 | 3 | 0 | 40% |
| 数据库设计 | 8 | 5 | 3 | 50% |
| 功能实现 | 5 | 10 | 4 | 32% |
| 安全性 | 1 | 5 | 1 | 14% |
| 部署配置 | 2 | 2 | 1 | 40% |
| **总计** | **18** | **25** | **9** | **35%** |

---

## 🔄 PRD 重大变更（2026-03-15 更新）

### 技术栈调整

| 组件 | 原方案 | **新方案（PRD v1.1 更新）** | 变更原因 |
|------|--------|---------------------------|----------|
| 后端框架 | NestJS 10 | **Express + Prisma** | 更轻量，快速交付 |
| 数据库 | PostgreSQL 16 | **MySQL 8.0** | 3 年省 5.6 万，运维简单 |
| 对象存储 | 阿里云 OSS | **本地文件存储** | 零成本，等稳定后再上云 |
| 向量能力 | pgvector | **阿里云 DashVector（V1.2）** | 外部服务，降低部署复杂度 |
| 部署方式 | Docker Compose | **直接部署（Node.js 服务）** | 适合现有服务器规模 |

### 成本对比

| 方案 | 3 年成本 | 说明 |
|------|----------|------|
| **MySQL 8.0（新方案）** | **¥96,520** | 完全免费（社区版） |
| PostgreSQL 16（原方案） | ¥152,600 | 云数据库成本 |
| **节省** | **¥56,080** | **3 年省 5.6 万** |

---

## ✅ 符合 PRD 的实现

### 1. 技术栈部分符合

| 组件 | PRD 要求 | 当前实现 | 状态 |
|------|----------|----------|------|
| ORM | Prisma 5 | ✅ Prisma | ✅ 符合 |
| 缓存 | Redis 3.0 + BullMQ | ⚠️ 未实现 | ❌ 缺失 |
| 前端 | Taro 4 + React 18 | ⚠️ 待确认 | ⚠️ 待验证 |

### 2. 数据库表结构（部分符合）

**已实现的表**（符合 PRD 第 10 节）:
- ✅ `users` - 用户表
- ✅ `subjects` - 学科表
- ✅ `knowledge_points` - 知识点表
- ✅ `exercises` - 习题表
- ✅ `wrong_questions` - 错题本
- ✅ `study_plans` - 学习计划表
- ✅ `exercise_records` - 学习记录表
- ✅ `family_bindings` - 家庭绑定关系表
- ✅ `textbooks` - 课本表
- ✅ `textbook_units` - 课本文单元表
- ✅ `practice_sessions` - 练习会话表
- ✅ `practice_questions` - 练习题目表
- ✅ `practice_answers` - 练习答案表
- ✅ `learning_records` - 学习记录表（Sprint 1 新版）
- ✅ `points_ledgers` - 积分流水表

**缺失的表**（PRD 要求但代码中缺失）:
- ❌ `student_profiles` - 学生档案表
- ❌ `parent_profiles` - 家长档案表
- ❌ `textbook_chunks` - 课本分片表（用于 RAG）
- ❌ `knowledge_mastery` - 知识点掌握度表
- ❌ `daily_learning_stats` - 每日学习统计表
- ❌ `posts`, `post_comments`, `post_likes`, `post_favorites` - 社区表
- ❌ `leaderboard_snapshots` - 排行榜快照表
- ❌ `ai_task_logs` - AI 调用日志表
- ❌ `audit_logs` - 审计日志表

### 3. 接口设计（部分符合）

**已实现的接口**（参考 `docs/API.md`）:
- ✅ `/api/auth/send-code` - 发送验证码
- ✅ `/api/auth/register` - 用户注册
- ✅ `/api/auth/login` - 用户登录
- ✅ `/api/auth/me` - 获取当前用户信息
- ✅ `/api/textbooks` - 课本管理接口
- ✅ `/api/practice/sessions` - 练习会话接口
- ✅ `/api/family/bindings` - 家庭绑定接口
- ✅ `/api/files/upload` - 文件上传接口

**缺失的接口**（PRD 要求但未实现）:
- ❌ `/api/practice/sessions/:id/questions:generate` - AI 出题（仅有占位）
- ❌ `/api/learning/stats` - 学习统计
- ❌ `/api/learning/calendar` - 学习日历
- ❌ `/api/learning/knowledge-mastery` - 知识点掌握度
- ❌ `/api/leaderboards/*` - 排行榜接口
- ❌ `/api/posts/*` - 社区接口
- ❌ `/api/speech/synthesize` - 语音合成

---

## ❌ 不符合 PRD 的实现

### ISSUE-P0-001: 数据库使用 SQLite 而非 MySQL 8.0

**位置**: `backend/prisma/schema.prisma`

**PRD 要求**（第 6.1、10.1 节）:
```
数据库：MySQL 8.0（社区版，完全免费）
ORM：Prisma 5（支持 MySQL/PostgreSQL/SQLite 无缝切换）
```

**当前实现**:
```prisma
datasource db {
  provider = "sqlite"  // ❌ 应为 mysql
  url      = "file:./dev.db"  // ❌ 应为 MySQL 连接字符串
}
```

**影响**:
1. 开发环境与生产环境不一致
2. SQLite 不支持 MySQL 的某些特性（如全文索引）
3. 无法验证真实的数据库性能

**修复建议**:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")  // mysql://user:password@localhost:3306/studyass
}
```

**优先级**: 🔴 P0  
**预计工作量**: 1-2 小时

---

### ISSUE-P0-002: 后端框架仍使用 NestJS 而非 Express

**位置**: 整个后端代码库

**PRD 要求**（第 6.1 节）:
```
后端：Express + Prisma ORM（模块化单体，快速交付）
变更：从 NestJS 改为 Express（更轻量）
```

**当前实现**:
```
NestJS 框架结构（modules、controllers、services、decorators）
```

**影响**:
1. 与 PRD 技术选型不符
2. NestJS 相对较重，学习曲线陡峭
3. 但 NestJS 功能更完善，长期来看可能更适合

**建议**:
- **选项 A**: 按 PRD 迁移到 Express（工作量大）
- **选项 B**: 更新 PRD，保留 NestJS（推荐）

**优先级**: 🟡 P1  
**预计工作量**: 16-24 小时（如迁移）

---

### ISSUE-P0-003: 文件存储使用本地而非规划的路径

**位置**: `backend/src/modules/files/files.service.ts`

**PRD 要求**（第 6.1 节）:
```
对象存储：本地文件存储（backend/uploads/）
存 PDF、封面、头像、附件
```

**当前实现**:
```typescript
// 文件存储在 backend/uploads/
UPLOAD_DIR=/app/uploads  // docker-compose.yml
```

**状态**: ✅ 基本符合，但需确认路径配置

---

### ISSUE-P0-004: AI 出题功能完全缺失

**位置**: `backend/src/modules/practice/practice.service.ts`

**PRD 要求**（第 4.2、7 节）:
- AI Gateway 统一管理所有模型调用
- 支持多种模型路由（qwen-flash, qwen-plus, qwen-max 等）
- 出题输入：课本内容 + 年级 + 科目 + 单元 + 学生薄弱点
- 出题输出：结构化题目（题干、选项、答案、解析、知识点、难度）

**当前实现**:
```typescript
// practice.service.ts
async generateQuestions(...) {
  // TODO: 接入 AI 出题
  const questions = PLACEHOLDER_QUESTIONS;  // ❌ 占位题目
}
```

**影响**:
1. 核心差异化功能缺失
2. 无法实现"智能复习"的产品定位

**修复建议**:
1. 创建 `AiGatewayModule`
2. 实现模型路由策略
3. 添加题目结构校验器

**优先级**: 🔴 P0  
**预计工作量**: 16-24 小时

---

### ISSUE-P0-005: 硬编码验证码 + 内存存储

**位置**: `backend/src/modules/auth/auth.service.ts`

**PRD 要求**（第 5.3 节）:
```
安全目标：关键接口需要鉴权、限流、审计日志
```

**当前实现**:
```typescript
const TEST_VERIFICATION_CODE = '123456';  // ❌ 固定验证码
const verificationCodes = new Map<...>();  // ❌ 内存存储
```

**风险**:
1. 所有用户使用相同的验证码
2. 服务重启后验证码丢失
3. 无速率限制
4. 日志明文输出验证码

**修复建议**:
1. 使用 Redis 存储验证码
2. 实现真实的短信服务
3. 添加速率限制

**优先级**: 🔴 P0  
**预计工作量**: 4-6 小时

---

### ISSUE-P0-006: 练习会话越权访问（IDOR）

**位置**: `backend/src/modules/practice/practice.service.ts`

**PRD 要求**（第 2.3、5.3 节）:
```
权限边界：查看学生详细学习数据 - 仅本人/仅已绑定学生
安全目标：关键接口需要鉴权、限流、审计日志
```

**当前实现**:
```typescript
async getSessionDetail(sessionId: number) {
  return this.prisma.practiceSession.findUnique({
    where: { id: sessionId },  // ❌ 未校验 userId
  });
}
```

**风险**:
1. 用户可越权访问他人练习数据
2. 违反 PRD 权限边界设计

**修复建议**:
```typescript
async getSessionDetail(sessionId: number, userId: number) {
  return this.prisma.practiceSession.findUnique({
    where: { id: sessionId, userId },  // ✅ 增加 userId 校验
  });
}
```

**优先级**: 🔴 P0  
**预计工作量**: 4-6 小时

---

### ISSUE-P0-007: 教材模块缺少权限校验

**位置**: `backend/src/modules/textbooks/textbooks.service.ts`

**PRD 要求**（第 2.3、5.3 节）:
```
权限边界：上传课本 - 学生/家长/管理员均可
安全目标：关键接口需要鉴权、限流、审计日志
```

**当前实现**:
```typescript
async update(id: number, dto: UpdateTextbookDto) {
  const textbook = await this.prisma.textbook.findUnique({
    where: { id },
  });
  // ❌ 未校验 textbook.userId === currentUserId
  return this.prisma.textbook.update({ where: { id }, data: dto });
}
```

**风险**:
1. 用户可修改/删除他人教材
2. 违反资源所有权原则

**修复建议**:
增加 owner 校验，管理员走白名单放行

**优先级**: 🔴 P0  
**预计工作量**: 3-4 小时

---

### ISSUE-P0-008: 注册接口权限提升风险

**位置**: `backend/src/modules/auth/auth.service.ts`

**PRD 要求**（第 2.1、2.3 节）:
```
用户角色：学生、家长、管理员
权限边界：内容审核 - 仅管理员
```

**当前实现**:
```typescript
// auth.dto.ts
@IsEnum(UserRole)
@IsOptional()
role?: UserRole;  // ❌ 允许传 ADMIN/TEACHER

// auth.service.ts
async register(registerDto: RegisterDto) {
  const user = await this.usersService.create({
    role: registerDto.role,  // ❌ 直接使用用户传入的 role
  });
}
```

**风险**:
1. 攻击者可注册管理员账号
2. 权限体系被绕过

**修复建议**:
1. 公共注册接口强制仅允许 `STUDENT/PARENT`
2. `ADMIN/TEACHER` 仅后台受控创建

**优先级**: 🔴 P0  
**预计工作量**: 1-2 小时

---

## 🟡 部分符合项

### ISSUE-P1-001: 缺少 Redis 缓存层

**PRD 要求**（第 6.1 节）:
```
缓存/队列：Redis 3.0 + BullMQ
```

**当前实现**:
- ❌ 无 Redis 集成
- ❌ 验证码存储在内存 Map 中
- ❌ 无队列系统

**影响**:
1. 无法支持分布式部署
2. 验证码等服务重启后丢失
3. 无法实现异步任务（PDF 解析、报告生成）

**修复建议**:
1. 集成 Redis
2. 使用 Redis 存储验证码
3. 使用 BullMQ 实现异步任务队列

**优先级**: 🟡 P1  
**预计工作量**: 6-8 小时

---

### ISSUE-P1-002: 缺少薄弱点分析功能

**PRD 要求**（第 4.3、9.4 节）:
- 记录学生在知识点维度上的答题数据
- 计算知识点掌握度
- 薄弱点推荐算法

**当前实现**:
- ❌ `knowledge_mastery` 表缺失
- ❌ 无掌握度计算逻辑
- ❌ 无薄弱点推荐

**修复建议**:
1. 添加 `knowledge_mastery` 表
2. 实现掌握度计算引擎
3. 集成到出题逻辑中

**优先级**: 🟡 P1  
**预计工作量**: 8-12 小时

---

### ISSUE-P1-003: 缺少排行榜功能

**PRD 要求**（第 9.6 节）:
- 计算全平台总榜、周榜、月榜、科目榜
- 采用缓存 + 定时快照机制

**当前实现**:
- ❌ `leaderboard_snapshots` 表缺失
- ❌ 无定时计算任务
- ❌ 无排行榜接口

**修复建议**:
1. 添加排行榜表
2. 使用 BullMQ 定时计算
3. Redis 缓存排行榜数据

**优先级**: 🟡 P1  
**预计工作量**: 6-8 小时

---

### ISSUE-P1-004: 积分系统实现不完整

**PRD 要求**（第 4.4 节）:
- 答对 1 题 +10 积分
- 正确率≥80% 额外 +20 积分
- 连续打卡奖励

**当前实现**:
- ✅ `points_ledgers` 表存在
- ❌ 无自动计算逻辑
- ❌ 未与练习模块集成

**修复建议**:
1. 实现积分计算规则引擎
2. 与练习模块集成
3. 添加打卡功能

**优先级**: 🟡 P1  
**预计工作量**: 4-6 小时

---

### ISSUE-P1-005: 社区功能完全缺失

**PRD 要求**（第 9.5 节）:
- 帖子列表、发帖、评论、点赞、收藏
- 敏感词过滤和人工审核任务

**当前实现**:
- ❌ 社区表完全缺失
- ❌ 无社区接口

**修复建议**:
1. 添加社区相关表
2. 实现社区 CRUD 接口
3. 集成内容审核服务

**优先级**: 🟡 P1  
**预计工作量**: 12-16 小时

---

## 🟢 符合项

### 1. 文档完善
- ✅ `docs/API.md` - 完整 API 文档
- ✅ `docs/DEPLOY.md` - 部署指南
- ✅ `docs/PRD_CHANGELOG.md` - PRD 变更日志
- ✅ `docs/PRD_v1.1.md` - 最新 PRD（2026-03-15 更新）

### 2. 基础架构
- ✅ Prisma ORM 使用正确
- ✅ 模块化结构清晰
- ✅ JWT 鉴权机制完整

### 3. 数据库设计
- ✅ 核心业务表已实现（15 个表）
- ✅ 表关系设计合理
- ✅ 索引设计基本完整

---

## 📋 修复优先级建议

### 第一阶段（必须修复，本周内）
1. ✅ **P0-001**: 切换数据库为 MySQL 8.0
2. ✅ **P0-005**: 修复验证码安全问题
3. ✅ **P0-007**: 修复注册权限提升
4. ✅ **P0-006**: 修复练习会话越权
5. ✅ **P0-008**: 修复教材权限校验

**预计工作量**: 12-18 小时

### 第二阶段（核心功能完善，下周内）
1. ✅ **P0-004**: 实现 AI 出题功能
2. ✅ **P1-001**: 集成 Redis 缓存层
3. ✅ **P1-004**: 完善积分系统
4. ✅ **P1-002**: 实现薄弱点分析

**预计工作量**: 34-50 小时

### 第三阶段（功能扩展，本月内）
1. ✅ **P1-003**: 实现排行榜功能
2. ✅ **P1-005**: 实现社区功能
3. ✅ **P0-002**: 决策是否迁移到 Express

**预计工作量**: 34-56 小时

---

## 📊 总体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 技术栈选型 | ⭐⭐⭐☆☆ | 部分符合（Prisma✅，MySQL❌，Express❌） |
| 数据库设计 | ⭐⭐⭐☆☆ | 核心表已实现，缺失 9 个表 |
| 功能实现 | ⭐⭐☆☆☆ | 基础 CRUD 完整，核心 AI 功能缺失 |
| 安全性 | ⭐☆☆☆☆ | 多处严重安全隐患 |
| 部署配置 | ⭐⭐⭐☆☆ | 文档完整，待验证 |
| 文档完整性 | ⭐⭐⭐⭐☆ | API、DEPLOY、PRD 文档齐全 |

**总体评分**: ⭐⭐☆☆☆ (2.5/5)

---

## 💡 关键决策建议

### 1. 后端框架选择
**现状**: 代码使用 NestJS，PRD 要求 Express

**建议**: **保留 NestJS**（更新 PRD）
- NestJS 功能更完善（依赖注入、装饰器、模块化）
- 迁移成本高（16-24 小时）
- NestJS 更适合中大型项目

**行动**: 更新 PRD v1.2，将后端框架改为 NestJS 10

### 2. 数据库选择
**现状**: 代码使用 SQLite，PRD 要求 MySQL 8.0

**建议**: **立即切换到 MySQL 8.0**
- 开发环境与生产环境保持一致
- 验证真实的数据库性能
- 迁移成本低（1-2 小时）

**行动**: 修改 `schema.prisma`，配置 MySQL 连接

### 3. AI 功能优先级
**现状**: AI 出题功能完全缺失

**建议**: **最高优先级实现**
- 这是产品的核心差异化功能
- 没有 AI 出题，产品退化为传统题库系统
- 建议 2 周内完成 MVP 版本

**行动**: 创建 AI Gateway 模块，实现基础出题功能

---

## 📝 结论

项目目前处于**早期原型阶段**，基础架构搭建完成，但距离 PRD 要求的生产可用版本还有较大差距。

**核心问题**:
1. 技术栈部分不符合 PRD（数据库、后端框架）
2. 安全性存在多处严重隐患
3. 核心 AI 功能未实现
4. 缺少 Redis 缓存层和异步任务队列

**建议行动**:
1. **本周**: 修复 P0 安全问题，切换数据库到 MySQL
2. **下周**: 实现 AI 出题功能，集成 Redis
3. **本月**: 完善薄弱点分析、排行榜、社区功能

**决策人确认**: 请俊哥确认是否更新 PRD（保留 NestJS）或迁移到 Express。

---

**报告生成时间**: 2026-03-15 08:25  
**PRD 版本**: v1.1（2026-03-15 更新）  
**GitHub 路径**: https://github.com/wjh2113/study-assistant-v1  
**下次审查**: 修复 P0 问题后进行
