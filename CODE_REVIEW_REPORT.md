# 🔍 代码审查问题报告

**项目名称**: 小学生全科智能复习助手  
**审查日期**: 2026-03-15  
**审查范围**: PRD 对比、代码实现、数据库设计、部署配置  
**审查人**: AI 代码审查团队  

---

## 📊 审查概览

| 类别 | 问题数 | 严重程度 |
|------|--------|----------|
| 架构设计 | 3 | 🔴 高 |
| 数据库设计 | 5 | 🟡 中 |
| 代码实现 | 8 | 🟡 中 |
| 安全性 | 4 | 🔴 高 |
| 部署配置 | 3 | 🟡 中 |
| 文档完整性 | 2 | 🟢 低 |
| **总计** | **25** | - |

---

## 🔴 严重问题（P0 - 必须修复）

### ISSUE-P0-001: 数据库实现与 PRD 严重不符

**位置**: `backend/prisma/schema.prisma`

**问题描述**:
PRD 明确要求使用 **PostgreSQL 16**，但实际实现使用了 **SQLite**。

**当前实现**:
```prisma
datasource db {
  provider = "sqlite"  // ❌ 错误：使用了 SQLite
  url      = "file:./dev.db"
}
```

**PRD 要求**:
- 数据库：PostgreSQL 16
- 扩展：`pgcrypto`、`uuid-ossp`、`pgvector`（V1.2 启用）
- 原因：与 NestJS、JSONB、统计分析、后续向量扩展最匹配

**影响**:
1. 无法使用 UUID 类型（PRD 中所有主键都是 uuid）
2. 不支持 JSONB 类型（PRD 中多个字段使用 jsonb）
3. 不支持向量类型（V1.2 的 RAG 功能无法实现）
4. 不支持复杂的统计分析查询
5. 生产环境无法横向扩展

**修复建议**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**优先级**: 🔴 P0  
**预计工作量**: 2-4 小时（包括迁移脚本）

---

### ISSUE-P0-002: 数据库表结构与 PRD 设计不一致

**位置**: `backend/prisma/schema.prisma`

**问题描述**:
Prisma schema 中的表结构与 PRD 设计的表结构存在多处不一致。

**具体差异**:

| 表名 | PRD 设计 | 实际实现 | 影响 |
|------|----------|----------|------|
| `users` | id 为 uuid | id 为 Int 自增 | 无法与 PRD 其他设计对齐 |
| `users` | role 为 `student/parent/admin` | role 为 `STUDENT/PARENT/TEACHER/ADMIN` | 命名规范不统一 |
| `textbooks` | 包含 `parse_status`, `parse_result` 字段 | 缺少这些字段 | 课本解析功能无法实现 |
| `knowledge_points` | 与 textbook 关联 | 只与 subject 关联 | 无法按课本管理知识点 |
| `practice_sessions` | 包含 AI 上下文、积分等字段 | 字段简化 | 无法追踪 AI 出题过程 |
| `knowledge_mastery` | PRD 中有此表 | 完全缺失 | 薄弱点分析功能无法实现 |
| `leaderboard_snapshots` | PRD 中有此表 | 完全缺失 | 排行榜功能无法实现 |
| `posts`, `post_comments` 等 | PRD 中有社区表 | 完全缺失 | 社区功能无法实现 |

**影响**:
1. 核心业务逻辑无法按 PRD 实现
2. 薄弱点分析、排行榜、社区等关键功能缺失数据支撑
3. 后续需要大量数据迁移工作

**修复建议**:
1. 对照 PRD 第 10 节完整重写 Prisma schema
2. 使用 UUID 作为所有主键
3. 添加缺失的表和字段
4. 创建数据库迁移脚本

**优先级**: 🔴 P0  
**预计工作量**: 8-16 小时

---

### ISSUE-P0-003: AI 出题功能完全缺失

**位置**: 整个后端代码库

**问题描述**:
PRD 核心功能"AI 智能出题"在代码中没有任何实现。

**PRD 要求**（第 7、9.3 节）:
- AI Gateway 统一管理所有模型调用
- 支持多种模型路由（qwen-flash, qwen-plus, qwen-max 等）
- 出题输入：课本内容 + 年级 + 科目 + 单元 + 学生薄弱点
- 出题输出：结构化题目（题干、选项、答案、解析、知识点、难度）
- JSON 结构校验和修复机制
- 模型调用日志记录

**当前实现**:
- ❌ 无 AI Gateway 模块
- ❌ 无模型路由逻辑
- ❌ 无题目生成服务
- ❌ 无 JSON 校验机制
- ❌ 无 AI 调用日志

**仅存的相关代码**:
```typescript
// exercises.service.ts - 只有 CRUD，没有 AI 生成
async create(createExerciseDto: CreateExerciseDto) {
  return this.prisma.exercise.create({
    data: createExerciseDto as any,
    // ...
  });
}
```

**影响**:
1. 产品的核心差异化功能缺失
2. 无法实现"智能复习"的产品定位
3. 只能手动录入题目，退化为传统题库系统

**修复建议**:
1. 创建 `AiGatewayModule`，统一管理模型调用
2. 创建 `PracticeModule`，实现智能出题逻辑
3. 实现模型路由策略（PRD 第 7.3 节）
4. 添加题目结构校验器
5. 创建 `ai_task_logs` 表记录调用日志

**优先级**: 🔴 P0  
**预计工作量**: 16-24 小时

---

## 🔴 安全问题（P0 - 必须修复）

### ISSUE-P0-004: 硬编码的测试验证码

**位置**: `backend/src/modules/auth/auth.service.ts`

**问题描述**:
```typescript
// 内测固定验证码
const TEST_VERIFICATION_CODE = '123456';

// 验证码存储（内存，生产环境应使用 Redis）
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();
```

**风险**:
1. 所有用户使用相同的验证码 `123456`
2. 验证码存储在内存中，服务重启后丢失
3. 无速率限制，可被暴力破解
4. 无审计日志，无法追踪异常登录

**修复建议**:
1. 移除硬编码验证码
2. 使用 Redis 存储验证码（支持分布式）
3. 实现真实的短信服务集成
4. 添加登录速率限制（如：5 次/分钟）
5. 记录所有登录尝试到审计日志

**优先级**: 🔴 P0  
**预计工作量**: 4-6 小时

---

### ISSUE-P0-005: JWT 密钥使用默认值

**位置**: `docker-compose.yml`, `.env.example`

**问题描述**:
```yaml
environment:
  - JWT_SECRET=${JWT_SECRET:-your-secret-key-change-in-production}
```

**风险**:
1. 如果未修改 `.env`，所有实例使用相同的密钥
2. 攻击者可以伪造任意用户的 Token
3. 密钥未加密存储

**修复建议**:
1. 在 `.env` 中生成强随机密钥（至少 32 字节）
2. 使用密钥管理服务（如 AWS Secrets Manager）
3. 定期轮换 JWT 密钥
4. 添加密钥强度校验

**优先级**: 🔴 P0  
**预计工作量**: 1-2 小时

---

### ISSUE-P0-006: 验证码存储无过期清理

**位置**: `backend/src/modules/auth/auth.service.ts`

**问题描述**:
```typescript
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();
```

**风险**:
1. 内存泄漏：过期的验证码不会被清理
2. 长期运行后可能耗尽内存
3. 无最大存储限制

**修复建议**:
1. 使用 Redis 的 TTL 功能自动过期
2. 或实现定时清理任务
3. 限制单个手机号的验证码数量

**优先级**: 🔴 P0  
**预计工作量**: 2-3 小时

---

### ISSUE-P0-007: 无输入验证和 SQL 注入防护

**位置**: 多个 Service 文件

**问题描述**:
```typescript
async create(createExerciseDto: CreateExerciseDto) {
  return this.prisma.exercise.create({
    data: createExerciseDto as any,  // ❌ 类型断言绕过了类型检查
  });
}
```

**风险**:
1. 使用 `as any` 绕过了 TypeScript 类型检查
2. 未验证输入数据的合法性
3. 可能存在 SQL 注入风险（虽然 Prisma 有防护）

**修复建议**:
1. 移除所有 `as any` 断言
2. 使用 `class-validator` 严格验证 DTO
3. 添加输入白名单机制

**优先级**: 🔴 P0  
**预计工作量**: 4-6 小时

---

## 🟡 中等问题（P1 - 重要）

### ISSUE-P1-001: 缺少健康检查接口

**位置**: 后端 API

**问题描述**:
测试日志显示 `/api/health` 接口返回 404。

**影响**:
1. 无法快速检查服务状态
2. Kubernetes/Docker 健康检查失败
3. 监控系统无法采集状态

**修复建议**:
```typescript
// app.controller.ts
@Get('health')
health() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

**优先级**: 🟡 P1  
**预计工作量**: 0.5 小时

---

### ISSUE-P1-002: 课本解析功能未实现

**位置**: `backend/src/modules/textbooks/textbook.service.ts`

**问题描述**:
PRD 要求支持 PDF 上传、解析、单元识别，但当前只有基础的 CRUD。

**缺失功能**:
1. PDF 文本提取
2. 目录结构识别
3. 单元/章节自动分割
4. 知识点抽取
5. 解析状态管理

**修复建议**:
1. 集成 PDF 解析库（如 pdf-parse）
2. 调用 AI 模型进行结构识别（PRD 7.2）
3. 实现 Worker 异步处理
4. 添加解析进度查询接口

**优先级**: 🟡 P1  
**预计工作量**: 12-16 小时

---

### ISSUE-P1-003: 薄弱点分析功能缺失

**位置**: 整个代码库

**问题描述**:
PRD 核心功能"薄弱点识别"（第 4.3 节）完全未实现。

**缺失内容**:
1. `knowledge_mastery` 表缺失
2. 知识点掌握度计算逻辑
3. 薄弱点推荐算法
4. 个性化练习生成

**修复建议**:
1. 添加 `knowledge_mastery` 表
2. 实现掌握度计算引擎
3. 创建薄弱点推荐服务
4. 集成到出题逻辑中

**优先级**: 🟡 P1  
**预计工作量**: 8-12 小时

---

### ISSUE-P1-004: 积分系统实现不完整

**位置**: `backend/src/modules/points/`

**问题描述**:
积分模块存在但功能简化，未按 PRD 实现。

**PRD 要求**（第 4.4 节）:
- 答对 1 题 +10 积分
- 正确率≥80% 额外 +20 积分
- 连续打卡奖励
- 积分明细查询

**当前实现**:
只有基础的积分记录，无自动计算逻辑。

**修复建议**:
1. 实现积分计算规则引擎
2. 与练习模块集成
3. 添加打卡功能
4. 实现积分排行榜

**优先级**: 🟡 P1  
**预计工作量**: 4-6 小时

---

### ISSUE-P1-005: 排行榜功能缺失

**位置**: 整个代码库

**问题描述**:
PRD 要求的排行榜（总榜、周榜、月榜、科目榜）完全未实现。

**缺失内容**:
1. `leaderboard_snapshots` 表
2. 定时计算任务
3. 缓存机制
4. 排行榜查询接口

**修复建议**:
1. 添加排行榜表
2. 使用 BullMQ 定时计算
3. Redis 缓存排行榜数据
4. 实现分页查询接口

**优先级**: 🟡 P1  
**预计工作量**: 6-8 小时

---

### ISSUE-P1-006: FTP 配置存在安全隐患

**位置**: `docker-compose.yml`

**问题描述**:
```yaml
vsftpd:
  environment:
    - PASV_ADDRESS=localhost  # ❌ 生产环境需改为公网 IP
```

**问题**:
1. PASV_ADDRESS 硬编码为 localhost
2. 生产环境无法使用
3. FTP 密码在配置文件中明文存储

**修复建议**:
1. 使用环境变量配置 PASV_ADDRESS
2. FTP 密码使用密钥管理服务
3. 考虑改用对象存储（阿里云 OSS）

**优先级**: 🟡 P1  
**预计工作量**: 2-3 小时

---

### ISSUE-P1-007: 无速率限制和防刷机制

**位置**: 整个后端 API

**问题描述**:
所有接口都没有速率限制。

**风险**:
1. 可被恶意刷接口
2. AI 调用可能产生高额费用
3. 短信接口可被滥用

**修复建议**:
```typescript
// 使用 @nestjs/throttler
@Throttle(5, 60)  // 60 秒内最多 5 次
@Post('send-code')
async sendCode() { ... }
```

**优先级**: 🟡 P1  
**预计工作量**: 3-4 小时

---

### ISSUE-P1-008: 无错误处理和日志记录

**位置**: 多个 Service 文件

**问题描述**:
```typescript
async findOne(id: number) {
  const exercise = await this.prisma.exercise.findUnique({
    where: { id },
  });

  if (!exercise) {
    throw new NotFoundException(`习题 ${id} 不存在`);
  }
  // ❌ 无日志记录
  return exercise;
}
```

**问题**:
1. 无结构化日志
2. 错误无堆栈追踪
3. 无法定位问题

**修复建议**:
1. 集成 Winston 或 Pino 日志库
2. 所有异常记录详细日志
3. 关键操作添加审计日志

**优先级**: 🟡 P1  
**预计工作量**: 4-6 小时

---

## 🟢 轻微问题（P2 - 建议修复）

### ISSUE-P2-001: 命名规范不统一

**位置**: 整个代码库

**问题描述**:
- PRD 使用 snake_case（如 `knowledge_points`）
- 代码中混用 camelCase 和 UPPER_CASE
- 枚举值大小写不统一

**建议**:
1. 数据库表名：snake_case
2. 类名：PascalCase
3. 变量名：camelCase
4. 枚举值：UPPER_CASE

**优先级**: 🟢 P2  
**预计工作量**: 2-3 小时

---

### ISSUE-P2-002: 文档更新不及时

**位置**: `README.md`, `SPRINT_0_REPORT.md`

**问题描述**:
1. README 中的快速启动命令与实际不符
2. Sprint 报告中的文件路径是 Windows 路径
3. 缺少 API 文档

**建议**:
1. 更新 README 中的路径
2. 使用 Swagger 生成 API 文档
3. 添加部署指南

**优先级**: 🟢 P2  
**预计工作量**: 2-3 小时

---

## 📋 修复优先级建议

### 第一阶段（必须修复，否则无法上线）
1. ✅ ISSUE-P0-001: 切换数据库为 PostgreSQL
2. ✅ ISSUE-P0-002: 修正数据库表结构
3. ✅ ISSUE-P0-003: 实现 AI 出题功能
4. ✅ ISSUE-P0-004: 修复验证码安全问题
5. ✅ ISSUE-P0-005: 修改 JWT 密钥

**预计工作量**: 32-48 小时

### 第二阶段（核心功能完善）
1. ✅ ISSUE-P1-002: 课本解析功能
2. ✅ ISSUE-P1-003: 薄弱点分析
3. ✅ ISSUE-P1-004: 积分系统
4. ✅ ISSUE-P1-005: 排行榜功能

**预计工作量**: 30-40 小时

### 第三阶段（安全性和稳定性）
1. ✅ ISSUE-P0-006: 验证码过期清理
2. ✅ ISSUE-P0-007: 输入验证
3. ✅ ISSUE-P1-007: 速率限制
4. ✅ ISSUE-P1-008: 日志系统

**预计工作量**: 12-16 小时

---

## 📊 总体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构设计 | ⭐⭐☆☆☆ | 基础架构完整，但核心 AI 功能缺失 |
| 代码质量 | ⭐⭐⭐☆☆ | 代码规范，但缺少安全防护 |
| 数据库设计 | ⭐⭐☆☆☆ | 与 PRD 严重不符 |
| 安全性 | ⭐☆☆☆☆ | 多处严重安全隐患 |
| 部署配置 | ⭐⭐⭐☆☆ | Docker 配置完整，但需调整 |
| 文档完整性 | ⭐⭐⭐☆☆ | PRD 详细，但代码文档不足 |

**总体评分**: ⭐⭐☆☆☆ (2.5/5)

**结论**: 
项目目前处于**早期原型阶段**，完成了基础架构搭建，但距离 PRD 要求的生产可用版本还有较大差距。**核心 AI 功能、数据库设计、安全性**是三大必须优先解决的问题。

---

**报告生成时间**: 2026-03-15 00:30  
**下次审查建议**: 修复 P0 问题后进行复审
