# 架构评审报告 - 小学生全科智能复习助手

**评审日期**: 2026-03-15  
**评审人**: 架构师 (Sub-Agent)  
**评审范围**: 后端架构、数据库设计、API 接口、安全架构  
**项目版本**: v1.1

---

## 📋 执行摘要

本次架构评审覆盖了学习助手项目的整体技术架构，包括现有代码实现、PRD 文档、数据库 Schema 和 API 接口规范。评审发现项目整体架构设计合理，但存在**多个高风险安全问题**需要优先修复。

### 评审结论

| 维度 | 评分 | 状态 |
|------|------|------|
| 业务架构 | ⭐⭐⭐⭐ | 良好 |
| 应用架构 | ⭐⭐⭐ | 需改进 |
| 数据架构 | ⭐⭐⭐ | 需改进 |
| 技术架构 | ⭐⭐⭐ | 需改进 |
| 安全架构 | ⭐⭐ | **高风险** |
| AI 架构 | ⭐⭐⭐⭐ | 良好 |

**整体评级**: ⭐⭐⭐ (中等，存在高风险项)

---

## 🔴 紧急问题（需立即处理）

### P0-1: 越权访问漏洞（IDOR）

**问题描述**: 多个核心模块缺少资源归属权校验，已登录用户可访问/修改/删除他人数据。

**影响范围**:
- 练习会话 (`practice.controller.ts`, `practice.service.ts`)
- 教材管理 (`textbook.controller.ts`, `textbook.service.ts`)
- 错题本、学习记录等

**风险等级**: 🔴 **严重**

**修复建议**:
```typescript
// 错误示例
async getSessionDetail(sessionId: number) {
  return this.prisma.practiceSession.findUnique({ where: { id: sessionId } });
}

// 正确示例
async getSessionDetail(sessionId: number, currentUserId: number) {
  return this.prisma.practiceSession.findFirst({
    where: { id: sessionId, userId: currentUserId }
  });
}
```

**验收标准**:
- 所有资源查询接口必须校验 `userId` 或 `ownerId`
- 增加 403 错误码和审计日志
- 补充越权访问单元测试

---

### P0-2: JWT Token 字段不一致

**问题描述**: JWT Strategy 返回 `userId`，但控制器读取 `req.user.sub`，导致鉴权失效。

**影响范围**: 所有需要用户身份的接口

**风险等级**: 🔴 **严重**

**修复建议**:
```typescript
// jwt.strategy.ts
validate(payload: JwtPayload) {
  return { userId: payload.sub }; // 统一字段名
}

// 控制器
const userId = req.user.userId; // 统一读取
```

---

### P0-3: 注册接口权限提升漏洞

**问题描述**: 用户注册时可指定任意角色（包括 ADMIN/TEACHER）。

**影响范围**: `auth.service.ts` 注册逻辑

**风险等级**: 🔴 **严重**

**修复建议**:
```typescript
// 强制限制公共注册角色
const allowedRoles = ['STUDENT', 'PARENT'];
const role = allowedRoles.includes(registerDto.role) 
  ? registerDto.role 
  : 'STUDENT';
```

---

### P1-1: 验证码安全缺陷

**问题描述**: 
- 固定验证码 `123456`
- 内存存储（重启丢失）
- 日志明文输出

**风险等级**: 🟠 **高**

**修复建议**:
1. 接入短信服务商（阿里云 SMS / 腾讯云 SMS）
2. 使用 Redis 存储验证码（设置 TTL）
3. 增加发送频率限制（1 分钟 1 次，1 小时 5 次）
4. 移除日志中的明文验证码

---

## 📊 架构详细评审

### 1. 业务架构评审

#### 1.1 用户流程设计 ✅

| 流程 | 完整性 | 备注 |
|------|--------|------|
| 学生注册登录 | ✅ | 支持手机号验证码 |
| 家长绑定学生 | ✅ | 家庭关系管理完整 |
| 课本上传解析 | ✅ | 支持 PDF 上传 + AI 解析 |
| AI 出题练习 | ✅ | 支持多种出题模式 |
| 学习数据分析 | ✅ | 统计、日历、薄弱点 |
| 积分排行榜 | ✅ | 激励体系完整 |

#### 1.2 业务边界 ⚠️

**问题**:
- 学生账号与社区发帖权限边界在代码中未明确实现
- 家长查看详细学习数据的绑定校验不完整

**建议**:
```typescript
// 增加权限守卫
@Injectable()
export class StudentRestrictedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    return user.role !== 'STUDENT'; // 学生禁止访问
  }
}
```

---

### 2. 应用架构评审

#### 2.1 模块拆分 ✅

当前模块划分合理:
```
backend/src/modules/
├── auth/           # 认证授权
├── users/          # 用户管理
├── family/         # 家庭绑定
├── textbooks/      # 教材管理
├── practice/       # 练习会话
├── exercises/      # 习题管理
├── wrong-questions/# 错题本
├── learning/       # 学习分析
├── points/         # 积分系统
├── files/          # 文件管理
└── users/          # 用户信息
```

#### 2.2 接口规范 ⚠️

**问题**:
- 接口返回格式不统一（`success` vs `code`）
- 错误码未标准化
- 部分接口与 PRD 描述不一致

**建议统一响应格式**:
```typescript
// 标准响应
{
  "code": 0,          // 0=成功，非 0=错误
  "message": "ok",
  "data": {}
}

// 标准错误码
const ERROR_CODES = {
  SUCCESS: 0,
  BAD_REQUEST: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  TOO_MANY_REQUESTS: 42901,
  INTERNAL_ERROR: 50001
};
```

#### 2.3 部署拓扑 ⚠️

**当前设计**:
- 京东云 4G/60G: 生产环境（Nginx + API + Worker + MySQL + Redis）
- 阿里云 2G/40G: 预发 + 备份

**风险**:
- 单机部署所有组件，故障影响面大
- 无负载均衡，无法横向扩展
- 数据库与服务同机，资源争抢

**演进建议** (V1.2+):
```
生产环境架构:
┌─────────────┐
│   Nginx     │ (负载均衡 + HTTPS)
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│API-1│ │API-2│ (无状态服务，可横向扩展)
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│MySQL│ │Redis│ (独立部署或云数据库)
└─────┘ └─────┘
```

---

### 3. 数据架构评审

#### 3.1 数据库选型 ⚠️

**PRD 决策**: MySQL 8.0（成本优先）  
**实际实现**: SQLite (开发环境)

**问题**:
- Prisma Schema 配置为 SQLite，与生产 MySQL 不一致
- 缺少数据库迁移脚本
- 无数据备份方案实现

**建议**:
```prisma
// 修改为 MySQL 配置
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL") // mysql://user:pass@host:3306/db
}
```

#### 3.2 Schema 设计评审

##### ✅ 优点
- 表结构完整，覆盖核心业务
- 外键关系清晰
- 索引设计合理

##### ⚠️ 问题

**3.2.1 缺少关键字段**

| 表 | 缺失字段 | 影响 |
|----|----------|------|
| `users` | `status` (active/disabled) | 无法禁用账号 |
| `users` | `last_login_at` | 无法分析活跃度 |
| `textbooks` | `parse_status` | 无法追踪解析状态 |
| `practice_sessions` | `practice_mode` | 无法区分出题模式 |

**3.2.2 数据类型问题**

```prisma
// 问题：使用 String 存储枚举值
role      String    @default("STUDENT")
status    String    @default("PENDING")

// 建议：使用 Prisma Enum
enum UserRole {
  STUDENT
  PARENT
  TEACHER
  ADMIN
}

model User {
  role UserRole @default(STUDENT)
}
```

**3.2.3 缺少审计字段**

大部分表缺少:
- `created_by` / `updated_by` (操作人)
- `deleted_at` (软删除)
- `version` (乐观锁)

**3.2.4 性能风险**

| 表 | 风险 | 建议 |
|----|------|------|
| `exercise_records` | 数据增长快，无分区 | 按月分区 |
| `ai_chats` | 大文本字段，无归档 | 定期归档 |
| `points_ledger` | 高频写入 | 考虑分表 |

#### 3.3 数据流设计 ⚠️

**问题**:
- 缺少数据生命周期管理
- 无数据归档策略
- 敏感数据（手机号）未加密存储

**建议**:
```typescript
// 敏感数据加密
import { createCipheriv, randomBytes } from 'crypto';

function encryptPhone(phone: string): string {
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY), randomBytes(16));
  return cipher.update(phone, 'utf8', 'hex') + cipher.final('hex');
}
```

---

### 4. 技术架构评审

#### 4.1 技术栈评估

| 组件 | 选型 | 评估 |
|------|------|------|
| 后端框架 | NestJS → Express | ⚠️ PRD 变更频繁 |
| ORM | Prisma 5 | ✅ 合适 |
| 数据库 | MySQL 8.0 | ✅ 成本优 |
| 缓存 | Redis 7 | ✅ 合适 |
| 队列 | BullMQ | ✅ 合适 |
| 文件存储 | 本地 → OSS | ⚠️ 待迁移 |
| 前端 | Taro 4 + React 18 | ✅ 合适 |

#### 4.2 性能指标 ⚠️

**PRD 目标**:
- 首屏加载 < 2s
- AI 出题 < 5s
- 排行榜响应 < 300ms

**当前风险**:
- 无缓存策略实现
- 无数据库查询优化
- 无性能监控

**建议**:
```typescript
// 排行榜缓存
@CacheKey('leaderboard:total:2026-03-15')
@CacheTTL(300) // 5 分钟
async getTotalLeaderboard() {
  // 查询逻辑
}

// 数据库查询优化
async getStudentStats(userId: number) {
  return this.prisma.$queryRaw`
    SELECT COUNT(*) as total, AVG(score) as avg_score
    FROM practice_sessions
    WHERE user_id = ${userId}
  `;
}
```

#### 4.3 可扩展性 ⚠️

**当前架构**: 模块化单体  
**扩展风险**:
- 服务耦合度高
- 无法独立部署
- 数据库单点

**演进路线**:
```
V1.0: 模块化单体 (当前)
  ↓
V1.5: 服务拆分 (按模块)
  - auth-service
  - practice-service
  - textbook-service
  ↓
V2.0: 微服务 + 事件驱动
  - 引入消息队列
  - 服务网格
  - 分布式追踪
```

---

### 5. 安全架构评审 🔴

#### 5.1 认证授权

| 项目 | 状态 | 风险 |
|------|------|------|
| JWT Token | ⚠️ 字段不一致 | 高 |
| 角色权限 | ⚠️ 注册可指定角色 | 严重 |
| 资源权限 | ❌ 缺少归属校验 | 严重 |
| Token 刷新 | ⚠️ 未实现 | 中 |

#### 5.2 数据安全

| 项目 | 状态 | 风险 |
|------|------|------|
| 敏感数据加密 | ❌ 未实现 | 高 |
| SQL 注入防护 | ✅ Prisma 防护 | 低 |
| XSS 防护 | ⚠️ 未验证 | 中 |
| CSRF 防护 | ❌ 未实现 | 中 |

#### 5.3 审计日志

| 项目 | 状态 |
|------|------|
| 登录日志 | ⚠️ 不完整 |
| 操作日志 | ❌ 缺失 |
| AI 调用日志 | ⚠️ 部分实现 |
| 异常日志 | ⚠️ 未结构化 |

**建议实现**:
```typescript
// 审计日志中间件
@Injectable()
export class AuditLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, url, user } = req;
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.auditService.log({
        userId: user?.id,
        action: `${method} ${url}`,
        duration,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    });
    
    next();
  }
}
```

---

### 6. AI 架构评审

#### 6.1 模型路由 ✅

PRD 设计的模型路由策略合理:

| 场景 | 主模型 | 备模型 | 评估 |
|------|--------|--------|------|
| 常规出题 | qwen-flash | deepseek-chat | ✅ 成本优 |
| 个性化出题 | qwen-plus | deepseek-chat | ✅ 平衡 |
| 课本解析 | Qwen-Doc-Turbo | - | ✅ 专用 |
| 薄弱点分析 | qwen-plus | deepseek-reasoner | ✅ 深度 |

#### 6.2 Prompt 工程 ⚠️

**问题**:
- 缺少 Prompt 版本管理
- 无 Prompt 效果评估
- 无降级策略实现

**建议**:
```typescript
// Prompt 模板管理
const QUESTION_GENERATION_PROMPT_V1 = `
你是一名小学教育专家，请根据以下信息生成{questionCount}道{difficulty}难度的{subject}题目：

课本内容：{textbookContent}
单元：{unitTitle}
学生薄弱点：{weaknessPoints}

要求：
1. 返回标准 JSON 格式
2. 每道题包含：题干、选项、答案、解析、知识点
3. 难度适配{grade}年级学生
`;

// 降级策略
async generateQuestions(context: QuestionContext) {
  try {
    return await this.aiService.generate(context, 'qwen-plus');
  } catch (error) {
    // 降级到轻量模型
    return await this.aiService.generate(context, 'qwen-flash');
  }
}
```

#### 6.3 成本控制 ⚠️

**问题**:
- 无 Token 用量监控
- 无成本预警
- 无调用频率限制

**建议**:
```typescript
// AI 调用限流
@Throttle({
  default: { limit: 10, ttl: 60000 } // 每分钟 10 次
})
async generateQuestions() {
  // ...
}

// Token 用量追踪
async trackTokenUsage(provider: string, model: string, tokens: number) {
  await this.prisma.aiTaskLogs.create({
    data: {
      provider,
      model,
      tokenUsage: tokens,
      cost: this.calculateCost(provider, model, tokens)
    }
  });
}
```

---

## 📋 改进建议优先级

### P0 - 立即修复（1 周内）

| # | 问题 | 工作量 | 负责人 |
|---|------|--------|--------|
| 1 | 越权访问漏洞 | 2 天 | fullstack |
| 2 | JWT 字段不一致 | 0.5 天 | fullstack |
| 3 | 注册权限提升 | 0.5 天 | fullstack |
| 4 | 验证码安全 | 2 天 | fullstack |

### P1 - 近期优化（1 个月内）

| # | 问题 | 工作量 | 负责人 |
|---|------|--------|--------|
| 1 | 数据库 Schema 完善 | 2 天 | fullstack |
| 2 | 审计日志实现 | 2 天 | fullstack |
| 3 | 接口响应标准化 | 1 天 | fullstack |
| 4 | 敏感数据加密 | 2 天 | fullstack |
| 5 | 缓存策略实现 | 2 天 | fullstack |

### P2 - 中期规划（3 个月内）

| # | 问题 | 工作量 | 负责人 |
|---|------|--------|--------|
| 1 | 服务拆分准备 | 5 天 | architect |
| 2 | 性能监控体系 | 3 天 | fullstack |
| 3 | 数据归档策略 | 2 天 | fullstack |
| 4 | 部署架构优化 | 3 天 | architect |

---

## 📈 架构健康度评估

### 当前状态

```
业务架构    ████████████████████ 80%
应用架构    ██████████████░░░░░░ 60%
数据架构    ██████████████░░░░░░ 60%
技术架构    ██████████████░░░░░░ 60%
安全架构    ████████░░░░░░░░░░░░ 40%  ← 重点改进
AI 架构     █████████████████░░░ 75%
────────────────────────────────────
整体        ██████████████░░░░░░ 62%
```

### 目标状态（V1.2）

```
业务架构    ████████████████████ 85%
应用架构    ████████████████████ 80%
数据架构    ████████████████████ 80%
技术架构    ████████████████████ 80%
安全架构    ████████████████████ 85%
AI 架构     ████████████████████ 85%
────────────────────────────────────
整体        ████████████████████ 82%
```

---

## 📝 结论

### 架构优势
1. 业务模型清晰，覆盖核心学习场景
2. 技术选型合理，成本可控
3. 模块划分清晰，便于维护
4. AI 路由策略完善

### 架构风险
1. 🔴 **安全问题严重**：越权访问、权限提升、验证码缺陷
2. 🟠 **数据架构不完善**：Schema 与 PRD 不一致，缺少审计字段
3. 🟠 **性能无保障**：无缓存、无监控、无优化
4. 🟡 **扩展性受限**：单体架构，耦合度高

### 核心建议
1. **立即修复 P0 安全问题**，否则不应上线
2. 统一数据库 Schema 与 PRD 设计
3. 建立性能监控和告警体系
4. 规划服务拆分路线，为扩展做准备

---

**评审人**: 架构师  
**评审日期**: 2026-03-15  
**下次评审**: 2026-04-15（P0 问题修复后复评）
