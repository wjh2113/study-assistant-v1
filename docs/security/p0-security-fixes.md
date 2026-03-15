# P0 安全漏洞修复日志

**修复日期**: 2026-03-15  
**修复工程师**: 安全工程师  
**修复用时**: < 30 分钟  
**状态**: ✅ 已完成

---

## 漏洞概述

架构师发现的 4 个 P0 安全漏洞已全部修复：

| 编号 | 漏洞名称 | 风险等级 | 修复状态 |
|------|----------|----------|----------|
| 1 | 越权访问漏洞 (IDOR) | P0 | ✅ 已修复 |
| 2 | JWT 字段不一致 | P0 | ✅ 已修复 |
| 3 | 注册权限提升 | P0 | ✅ 已修复 |
| 4 | 验证码安全缺陷 | P0 | ✅ 已修复 |

---

## 详细修复记录

### 1. 越权访问漏洞 (IDOR)

**风险描述**: 用户可能通过修改请求参数访问其他用户的资源（练习/教材/错题本）。

**修复措施**:
- ✅ 检查所有资源接口（练习/教材/错题本/AI 问答/知识点）
- ✅ 确认所有模型层查询都使用 `userId` 进行数据隔离
- ✅ 确认所有控制器都使用 `req.user.id` 进行所有权校验
- ✅ 添加明确的所有权验证注释

**涉及文件**:
- `backend/src/controllers/progressController.js` - 学习进度接口
- `backend/src/controllers/knowledgeController.js` - 知识点接口（已有所有权校验）
- `backend/src/controllers/aiController.js` - AI 问答接口（已有所有权校验）
- `backend/src/routes/textbooks.js` - 课本文本接口（已有所有权校验）
- `backend/src/modules/weakness-analysis/WeaknessAnalysisController.js` - 薄弱点分析接口
- `backend/src/models/LearningProgress.js` - 学习进度模型
- `backend/src/models/KnowledgePoint.js` - 知识点模型
- `backend/src/models/AIQARecord.js` - AI 问答记录模型
- `backend/src/modules/textbook-parser/TextbookModel.js` - 课本文本模型
- `backend/src/modules/weakness-analysis/KnowledgeMasteryModel.js` - 知识点掌握度模型

**验证结果**: 所有资源接口都已正确使用 `userId` 进行数据隔离，不存在 IDOR 漏洞。

---

### 2. JWT 字段不一致

**风险描述**: JWT token 解析逻辑不统一，`req.user.sub` 和 `req.user.userId` 可能指向不同值，导致权限校验错误。

**修复措施**:
- ✅ 统一 JWT token 解析逻辑
- ✅ 支持 JWT 标准字段 `sub` 和自定义字段 `userId`
- ✅ 确保 `req.user.sub` 和 `req.user.userId` 始终指向同一个用户 ID
- ✅ 添加明确的字段统一注释

**涉及文件**:
- `backend/src/middleware/auth.js`

**修复代码**:
```javascript
// 统一 JWT 字段：支持 sub 和 userId，优先使用 sub（JWT 标准字段）
const userId = decoded.sub || decoded.userId;

if (!userId) {
  return res.status(401).json({ error: '无效的令牌：缺少用户标识' });
}

// 将用户信息附加到 request，统一字段
req.user = user;
req.user.sub = userId;      // JWT 标准字段
req.user.userId = userId;   // 兼容旧代码
```

---

### 3. 注册权限提升

**风险描述**: 注册接口接受 `role` 参数，攻击者可以注册时指定 `ADMIN` 或 `TEACHER` 角色，实现权限提升。

**修复措施**:
- ✅ 移除注册接口的 `role` 参数
- ✅ 默认所有新用户为 `student` 角色
- ✅ ADMIN/TEACHER 角色只能通过后台创建
- ✅ 删除角色验证逻辑

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
- 管理员和教师账号需要通过后台管理界面创建

---

### 4. 验证码安全缺陷

**风险描述**: 
1. 日志中输出验证码明文，存在信息泄露风险
2. 使用内存 Map 存储验证码，重启后丢失且不支持分布式部署
3. 缺少速率限制，可能被暴力破解或短信轰炸

**修复措施**:
- ✅ 移除所有日志中的验证码明文输出
- ✅ 使用 Redis 存储验证码（带 TTL 自动过期）
- ✅ 添加速率限制（5 次/分钟/手机号）
- ✅ 添加本地 Map 作为 Redis 不可用时的 fallback
- ✅ 更新发送验证码接口处理速率限制错误

**涉及文件**:
- `backend/src/services/verificationService.js` - 完全重写
- `backend/src/controllers/authController.js` - 更新 sendCode 方法

**修复代码**:

1. **Redis 存储（带 TTL）**:
```javascript
const client = initRedis();
if (client) {
  // 使用 Redis 存储，带 TTL
  await client.setex(key, expiresInMinutes * 60, code);
  console.log(`[VerificationService] 验证码已生成并存储到 Redis：${phone} (${purpose})`);
}
```

2. **速率限制（5 次/分钟）**:
```javascript
const RATE_LIMIT_MAX = 5;        // 最多 5 次
const RATE_LIMIT_WINDOW = 60000; // 1 分钟

function checkRateLimit(phone) {
  const now = Date.now();
  const record = rateLimitMap.get(phone);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(phone, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: ... };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}
```

3. **移除日志明文输出**:
```javascript
// 修复前：console.log(`发送验证码到 ${phone}: ${code}`);
// 修复后：console.log(`验证码已生成并存储到 Redis：${phone} (${purpose})`);
```

**依赖安装**:
```bash
npm install ioredis
```

---

## 测试建议

### 1. IDOR 测试
```bash
# 使用用户 A 的 token 访问用户 B 的资源
GET /api/knowledge/:id  # 应返回 403
GET /api/progress/      # 应只返回用户 A 的数据
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

# 验证日志中无验证码明文
grep -r "123456" backend/logs/  # 应无结果
```

---

## 后续建议

1. **监控告警**: 添加验证码发送频率监控，异常时告警
2. **审计日志**: 记录所有权限相关操作（登录、注册、资源访问）
3. **定期扫描**: 使用安全扫描工具定期检测新漏洞
4. **依赖更新**: 定期更新依赖包，修复已知安全漏洞

---

## 修复确认

- [x] 漏洞 1: 越权访问漏洞 (IDOR) - 已确认所有接口安全
- [x] 漏洞 2: JWT 字段不一致 - 已统一字段
- [x] 漏洞 3: 注册权限提升 - 已移除 role 参数
- [x] 漏洞 4: 验证码安全缺陷 - 已使用 Redis + 速率限制

**修复完成时间**: 2026-03-15 08:30  
**下一步**: 部署到测试环境进行验证
