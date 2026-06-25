# 架构风险项清单 - 小学生全科智能复习助手

**创建日期**: 2026-03-15  
**评审人**: 架构师 (Sub-Agent)  
**状态跟踪**: 动态更新

---

## 🔴 严重风险（P0）

### RISK-001: 越权访问漏洞（IDOR）

| 属性 | 值 |
|------|-----|
| **风险等级** | 🔴 严重 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-22 |

**问题描述**:
多个核心模块（练习、教材、错题本）在查询、更新、删除操作时未校验资源归属权，已登录用户可通过枚举 ID 访问他人数据。

**影响范围**:
- `practice.controller.ts` - 练习会话查询/提交答案
- `textbook.controller.ts` - 教材更新/删除
- `wrong-questions.controller.ts` - 错题操作
- `learning.controller.ts` - 学习记录查询

**潜在后果**:
- 学生可查看他人练习记录和成绩
- 用户可修改/删除他人教材
- 隐私数据泄露
- 数据被恶意篡改

**修复方案**:
```typescript
// 服务层强制校验归属权
async getSessionDetail(sessionId: number, currentUserId: number) {
  const session = await this.prisma.practiceSession.findFirst({
    where: { 
      id: sessionId, 
      userId: currentUserId // 必须匹配当前用户
    }
  });
  
  if (!session) {
    throw new ForbiddenException('无权访问该练习会话');
  }
  
  return session;
}

// 控制器传递用户 ID
async getSession(@Param('id') id: string, @Req() req: Request) {
  const userId = req.user.userId;
  return this.practiceService.getSessionDetail(+id, userId);
}
```

**验收标准**:
- [ ] 所有资源查询接口增加 `userId` 校验
- [ ] 返回 403 而非 404（避免 ID 枚举）
- [ ] 增加越权访问单元测试（覆盖率 100%）
- [ ] 审计日志记录越权尝试

**验证方法**:
```bash
# 使用用户 A 的 Token 访问用户 B 的资源
curl -H "Authorization: Bearer <userA_token>" \
  http://localhost:3000/api/practice/sessions/<userB_session_id>

# 预期返回：403 Forbidden
```

---

### RISK-002: JWT Token 字段不一致导致鉴权失效

| 属性 | 值 |
|------|-----|
| **风险等级** | 🔴 严重 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-18 |

**问题描述**:
JWT Strategy 中返回的字段为 `userId`，但多个控制器读取 `req.user.sub`，导致获取到 `undefined`，鉴权逻辑失效。

**代码位置**:
- `backend/src/modules/auth/jwt.strategy.ts:22`
- `backend/src/modules/practice/practice.controller.ts:16`
- `backend/src/modules/textbooks/textbook.controller.ts:16`
- `backend/src/modules/family/family.controller.ts:16`

**潜在后果**:
- 用户身份识别失败
- 创建资源时 `userId` 为 `undefined`
- 数据归属关系混乱
- 接口行为不稳定

**修复方案**:
```typescript
// 方案 1: 统一使用 userId（推荐）
// jwt.strategy.ts
validate(payload: JwtPayload) {
  return { userId: payload.sub };
}

// 所有控制器
const userId = req.user.userId;

// 方案 2: 统一使用 sub
// jwt.strategy.ts
validate(payload: JwtPayload) {
  return { sub: payload.sub };
}

// 所有控制器
const userId = req.user.sub;
```

**验收标准**:
- [ ] 全局搜索 `req.user.sub` 和 `req.user.userId`
- [ ] 统一字段名
- [ ] 增加鉴权集成测试

---

### RISK-003: 注册接口权限提升漏洞

| 属性 | 值 |
|------|-----|
| **风险等级** | 🔴 严重 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-18 |

**问题描述**:
用户注册接口允许在请求体中指定 `role` 字段，攻击者可注册管理员或教师账号。

**代码位置**:
- `backend/src/modules/auth/dto/auth.dto.ts:45-47`
- `backend/src/modules/auth/auth.service.ts:140-147`

**潜在后果**:
- 攻击者获取管理员权限
- 平台数据被恶意篡改
- 其他用户数据泄露
- 平台被完全控制

**修复方案**:
```typescript
// auth.service.ts
async register(registerDto: RegisterDto) {
  // 强制限制公共注册角色
  const allowedPublicRoles = ['STUDENT', 'PARENT'];
  const role = allowedPublicRoles.includes(registerDto.role)
    ? registerDto.role
    : 'STUDENT'; // 默认降级
  
  // ADMIN/TEACHER 只能通过后台创建
  return this.prisma.user.create({
    data: {
      ...registerDto,
      role: role as UserRole
    }
  });
}

// 或者：完全移除注册接口的 role 字段
// 仅在后台管理接口支持角色指定
```

**验收标准**:
- [ ] 注册接口移除 `role` 字段或强制限制
- [ ] 增加权限提升攻击测试
- [ ] 管理员创建接口增加二次验证

---

### RISK-004: 短信验证码安全缺陷

| 属性 | 值 |
|------|-----|
| **风险等级** | 🔴 严重 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-22 |

**问题描述**:
1. 验证码固定为 `123456`
2. 使用内存 Map 存储（重启丢失）
3. 日志明文输出验证码

**代码位置**:
- `backend/src/modules/auth/auth.service.ts:9-12`
- `backend/src/modules/auth/auth.service.ts:40`

**潜在后果**:
- 任意用户可登录他人账号
- 验证码绕过攻击
- 敏感信息日志泄露

**修复方案**:
```typescript
// 1. 生成随机验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 2. 使用 Redis 存储
async sendSmsCode(phone: string) {
  const code = generateCode();
  const key = `sms_code:${phone}`;
  
  // 检查发送频率
  const lastSent = await this.redis.get(`sms_limit:${phone}`);
  if (lastSent) {
    throw new TooManyRequestsException('发送过于频繁');
  }
  
  // 存储验证码（5 分钟有效期）
  await this.redis.setex(key, 300, code);
  await this.redis.setex(`sms_limit:${phone}`, 60, '1');
  
  // 调用短信服务商
  await this.smsService.send(phone, code);
  
  // 日志脱敏
  this.logger.log(`SMS sent to ${phone.substring(0,3)}****${phone.substring(7)}`);
}

// 3. 验证验证码
async verifySmsCode(phone: string, code: string) {
  const key = `sms_code:${phone}`;
  const storedCode = await this.redis.get(key);
  
  if (!storedCode || storedCode !== code) {
    throw new BadRequestException('验证码错误');
  }
  
  await this.redis.del(key);
  return true;
}
```

**验收标准**:
- [ ] 接入短信服务商（阿里云/腾讯云）
- [ ] Redis 存储验证码
- [ ] 发送频率限制（1 分钟 1 次，1 小时 5 次，1 天 20 次）
- [ ] 验证码有效期 5 分钟
- [ ] 日志脱敏
- [ ] 连续错误 5 次锁定 30 分钟

---

## 🟠 高风险（P1）

### RISK-010: 数据库 Schema 与 PRD 不一致

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟠 高 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-29 |

**问题描述**:
- PRD 设计使用 MySQL 8.0，Prisma Schema 配置为 SQLite
- 缺少 PRD 中定义的关键字段
- 枚举类型使用 String 而非 Enum

**影响**:
- 开发环境与生产环境不一致
- 数据迁移困难
- 类型安全性降低

**修复方案**:
1. 更新 Prisma Schema 为 MySQL
2. 补充缺失字段
3. 使用 Prisma Enum

详见 `adr-001-database-schema.md`

---

### RISK-011: 缺少审计日志

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟠 高 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-29 |

**问题描述**:
- 无操作审计日志
- 登录日志不完整
- 异常日志非结构化

**影响**:
- 安全事件无法追溯
- 问题排查困难
- 合规风险

**修复方案**:
实现审计日志中间件，记录:
- 用户 ID
- 操作类型
- 目标资源
- IP 地址
- User-Agent
- 时间戳
- 执行时长

详见 `adr-002-audit-logging.md`

---

### RISK-012: 敏感数据未加密

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟠 高 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-29 |

**问题描述**:
- 手机号明文存储
- 无数据加密策略

**影响**:
- 数据库泄露导致用户隐私暴露
- 违反个人信息保护法规

**修复方案**:
- 手机号加密存储
- 访问时解密
- 密钥管理系统

详见 `adr-003-data-encryption.md`

---

### RISK-013: 接口响应格式不统一

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟠 中 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待修复 |
| **负责人** | fullstack |
| **预计修复** | 2026-03-22 |

**问题描述**:
- 部分接口返回 `{success: true, data: {}}`
- 部分接口返回 `{code: 0, message: 'ok', data: {}}`
- 错误码不统一

**影响**:
- 前端处理复杂
- 错误处理不一致

**修复方案**:
统一使用 PRD 定义的格式:
```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

---

## 🟡 中风险（P2）

### RISK-020: 无性能监控

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟡 中 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待规划 |
| **负责人** | fullstack |
| **预计修复** | 2026-04-15 |

**问题描述**:
- 无 API 响应时间监控
- 无数据库慢查询监控
- 无 AI 调用耗时监控

**影响**:
- 性能问题无法及时发现
- 用户体验下降

---

### RISK-021: 无缓存策略

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟡 中 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待规划 |
| **负责人** | fullstack |
| **预计修复** | 2026-04-15 |

**问题描述**:
- 排行榜每次查询数据库
- 频繁读取的静态数据无缓存

**影响**:
- 数据库压力大
- 响应时间长

---

### RISK-022: 无数据归档策略

| 属性 | 值 |
|------|-----|
| **风险等级** | 🟡 中 |
| **发现日期** | 2026-03-15 |
| **状态** | ⏳ 待规划 |
| **负责人** | fullstack |
| **预计修复** | 2026-04-30 |

**问题描述**:
- 学习记录无限增长
- AI 对话记录无归档

**影响**:
- 数据库膨胀
- 查询性能下降

---

## 📊 风险统计

| 等级 | 数量 | 已修复 | 待修复 | 修复率 |
|------|------|--------|--------|--------|
| 🔴 严重 | 4 | 0 | 4 | 0% |
| 🟠 高 | 4 | 0 | 4 | 0% |
| 🟡 中 | 3 | 0 | 3 | 0% |
| **合计** | **11** | **0** | **11** | **0%** |

---

## 📅 修复计划

### 第一周（2026-03-15 ~ 2026-03-22）
- [ ] RISK-001: 越权访问漏洞
- [ ] RISK-002: JWT 字段不一致
- [ ] RISK-003: 注册权限提升
- [ ] RISK-004: 验证码安全
- [ ] RISK-013: 接口响应标准化

### 第二周（2026-03-22 ~ 2026-03-29）
- [ ] RISK-010: 数据库 Schema 完善
- [ ] RISK-011: 审计日志实现
- [ ] RISK-012: 敏感数据加密

### 第三 - 四周（2026-03-29 ~ 2026-04-15）
- [ ] RISK-020: 性能监控体系
- [ ] RISK-021: 缓存策略实现

### 第五 - 六周（2026-04-15 ~ 2026-04-30）
- [ ] RISK-022: 数据归档策略

---

## 📝 状态说明

| 状态 | 说明 |
|------|------|
| ⏳ 待修复 | 已识别，等待修复 |
| 🔄 修复中 | 正在修复 |
| ✅ 已修复 | 已修复并验证 |
| ⚠️ 已接受 | 已知风险，暂不修复 |
| ❌ 已关闭 | 非风险或误报 |

---

**最后更新**: 2026-03-15  
**下次更新**: 2026-03-22
