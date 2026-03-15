# P0 安全漏洞修复日志

**修复日期**: 2026-03-15  
**修复工程师**: fullstack 工程师  
**修复用时**: < 30 分钟  
**状态**: ✅ 已完成

---

## 漏洞概述

俊哥要求的 6 个 P0 问题已全部修复：

| 编号 | 问题名称 | 风险等级 | 修复状态 |
|------|----------|----------|----------|
| P0-001 | 数据库切换 MySQL 8.0 | P0 | ✅ 已修复 |
| P0-004 | AI 出题功能 | P0 | ✅ 已实现 |
| P0-005 | 验证码安全修复 | P0 | ✅ 已修复 |
| P0-006 | 练习会话越权修复 | P0 | ✅ 已修复 |
| P0-007 | 教材权限校验修复 | P0 | ✅ 已修复 |
| P0-008 | 注册权限提升修复 | P0 | ✅ 已修复 |

---

## 详细修复记录

### P0-001: 数据库切换 MySQL 8.0

**风险描述**: 使用 SQLite 不适合生产环境，需要切换到 MySQL 8.0。

**修复措施**:
- ✅ 修改 `backend/prisma/schema.prisma`
- ✅ provider 从 sqlite 改为 mysql
- ✅ url 改为 env("DATABASE_URL")

**涉及文件**:
- `backend/prisma/schema.prisma`

**修复代码**:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

**迁移命令**:
```bash
npx prisma migrate dev --name switch_to_mysql
```

---

### P0-004: AI 出题功能

**需求描述**: 实现 AI 出题功能，支持根据课本内容生成练习题。

**实现措施**:
- ✅ 创建 AiGateway 模块
- ✅ 实现基础出题功能
- ✅ 支持多种模型路由（qwen-flash/plus/max）
- ✅ 支持多种题型（选择题/填空题/简答题）

**涉及文件**:
- `backend/src/modules/ai-gateway/AiGatewayService.js` - AI 模型调用服务
- `backend/src/modules/ai-gateway/AiGatewayController.js` - AI 出题控制器
- `backend/src/routes/ai-gateway.js` - AI 出题路由

**API 端点**:
```
POST /api/ai/generate-questions
{
  "textbookContent": "课本内容",
  "grade": "三年级",
  "subject": "数学",
  "unit": "第一单元",
  "questionCount": 5,
  "difficulty": "medium",
  "questionType": "choice"
}
```

---

### P0-005: 验证码安全修复

**风险描述**: 
1. 日志中输出验证码明文，存在信息泄露风险
2. 使用内存 Map 存储验证码，重启后丢失且不支持分布式部署
3. 缺少速率限制，可能被暴力破解或短信轰炸

**修复措施**:
- ✅ 移除所有日志中的验证码明文输出
- ✅ 使用 Redis 存储验证码（带 TTL 自动过期）
- ✅ 添加速率限制（5 次/分钟/手机号）
- ✅ 添加本地 Map 作为 Redis 不可用时的 fallback

**涉及文件**:
- `backend/src/services/verificationService.js` - 完全重写
- `backend/src/controllers/authController.js` - 更新 sendCode 方法

**修复代码**:

1. **Redis 存储（带 TTL）**:
```javascript
const client = initRedis();
if (client) {
  await client.setex(key, expiresInMinutes * 60, code);
  console.log(`[VerificationService] 验证码已生成并存储到 Redis：${phone} (${purpose})`);
}
```

2. **速率限制（5 次/分钟）**:
```javascript
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(phone) {
  const now = Date.now();
  const record = rateLimitMap.get(phone);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(phone, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}
```

**依赖安装**:
```bash
npm install ioredis
```

---

### P0-006: 练习会话越权修复

**风险描述**: 用户可能通过修改请求参数访问其他用户的练习会话和答题记录。

**修复措施**:
- ✅ 创建 PracticeSession 模型，所有查询使用 userId 进行数据隔离
- ✅ 创建 practiceController，所有接口使用 req.user.id 进行所有权校验
- ✅ 创建 practice 路由，所有路由都需要认证
- ✅ 在模型层和控制器层都进行所有权校验

**涉及文件**:
- `backend/src/models/PracticeSession.js` - 新建（带所有权校验）
- `backend/src/controllers/practiceController.js` - 新建（带所有权校验）
- `backend/src/routes/practice.js` - 新建（需要认证）
- `backend/src/server.js` - 注册新路由

**关键代码**:
```javascript
// 模型层所有权校验
async function getById(id, userId) {
  const session = await prisma.practiceSession.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } }
  });
  
  // P0-006 安全修复：校验所有权
  if (session && session.user_id !== userId) {
    return null;
  }
  
  return session;
}
```

**API 端点**:
```
POST   /api/practice/sessions          # 创建会话
GET    /api/practice/sessions          # 获取会话列表
GET    /api/practice/sessions/:id      # 获取会话详情
PUT    /api/practice/sessions/:id      # 更新会话
DELETE /api/practice/sessions/:id      # 删除会话
POST   /api/practice/sessions/:id/questions  # 添加问题
POST   /api/practice/sessions/:id/answers    # 提交答案
GET    /api/practice/sessions/:id/answers    # 获取答题记录
```

---

### P0-007: 教材权限校验修复

**风险描述**: 用户可能访问其他用户的教材内容。

**修复措施**:
- ✅ 检查 textbooks.js 路由，确认已有 owner 校验
- ✅ 管理员走白名单逻辑
- ✅ 所有教材接口都需要认证

**涉及文件**:
- `backend/src/routes/textbooks.js`

**验证结果**: 教材接口已正确实现所有权校验：
```javascript
if (textbook.user_id !== req.user.id) {
  return res.status(403).json({ success: false, error: '无权访问' });
}
```

---

### P0-008: 注册权限提升修复

**风险描述**: 注册接口接受 `role` 参数，攻击者可以注册时指定 `ADMIN` 或 `TEACHER` 角色，实现权限提升。

**修复措施**:
- ✅ 移除注册接口的 `role` 参数
- ✅ 默认所有新用户为 `student` 角色
- ✅ ADMIN/TEACHER 角色只能通过后台创建

**涉及文件**:
- `backend/src/controllers/authController.js`

**修复代码**:
```javascript
// 安全修复：默认所有新用户为 student 角色
// ADMIN/TEACHER 角色只能通过后台创建，防止注册时权限提升
const defaultRole = 'student';
const user = UserModel.create(phone, defaultRole, nickname);
```

**影响范围**: 
- 前端注册接口不再需要传递 `role` 参数
- 所有新用户默认创建为学生角色

---

## 测试建议

### 1. IDOR 测试
```bash
# 使用用户 A 的 token 访问用户 B 的资源
GET /api/knowledge/:id  # 应返回 403
GET /api/practice/sessions/:id  # 应返回 403
```

### 2. JWT 字段测试
```bash
# 验证 req.user.sub 和 req.user.userId 一致
GET /api/auth/me  # 检查返回的用户 ID 与 token 一致
```

### 3. 注册权限测试
```bash
# 尝试注册时指定 ADMIN 角色（应被忽略）
POST /api/auth/register
{
  "phone": "13800138000",
  "code": "123456",
  "role": "ADMIN"  # 应被忽略，创建为 student
}
```

### 4. 验证码安全测试
```bash
# 测试速率限制（连续发送 6 次，第 6 次应返回 429）
POST /api/auth/send-code  # 连续调用 6 次

# 验证 Redis 存储
redis-cli KEYS "verification:*"  # 应能看到验证码 key
```

### 5. 练习会话权限测试
```bash
# 使用用户 A 的 token 访问用户 B 的练习会话
GET /api/practice/sessions/:id  # 应返回 404 或 403
```

---

## 后续建议

1. **监控告警**: 添加验证码发送频率监控，异常时告警
2. **审计日志**: 记录所有权限相关操作（登录、注册、资源访问）
3. **定期扫描**: 使用安全扫描工具定期检测新漏洞
4. **依赖更新**: 定期更新依赖包，修复已知安全漏洞

---

## 修复确认

- [x] P0-001: 数据库切换 MySQL 8.0 - schema.prisma 已配置
- [x] P0-004: AI 出题功能 - AiGateway 模块已实现
- [x] P0-005: 验证码安全修复 - Redis + 速率限制已实现
- [x] P0-006: 练习会话越权修复 - 新模型和控制器已创建
- [x] P0-007: 教材权限校验修复 - 已有 owner 校验
- [x] P0-008: 注册权限提升修复 - role 参数已移除

**修复完成时间**: 2026-03-15 08:36  
**下一步**: 部署到测试环境进行验证
