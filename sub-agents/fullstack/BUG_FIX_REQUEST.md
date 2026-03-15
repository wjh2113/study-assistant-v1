# 🐛 Bug 修复通知

**来自:** QA 测试工程师  
**日期:** 2026-03-15  
**优先级:** P0 - 紧急

---

## 需要立即修复的 Bug

### Bug #1: Knowledge 模块 - 数据库外键约束错误 🔴

**文件:** `backend/src/controllers/knowledgeController.js`

**错误信息:**
```
SqliteError { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' }
```

**问题描述:**
创建知识点时，外键约束失败。可能是 `user_id` 字段引用了不存在的用户，或者数据库表初始化顺序有问题。

**复现步骤:**
```javascript
POST /api/knowledge
{
  "subject": "数学",
  "title": "勾股定理",
  "content": "直角三角形两直角边的平方和等于斜边的平方",
  "tags": ["几何", "三角形"]
}
```

**建议修复:**
1. 检查 `KnowledgePoint.js` 模型中的外键约束
2. 确保在创建知识点前用户已存在
3. 或者暂时移除外键约束进行测试

---

### Bug #2: 测试服务器端口占用 🔴

**错误信息:**
```
listen EADDRINUSE: address already in use :::3000
```

**问题描述:**
测试套件之间服务器实例未正确关闭，导致后续测试无法启动。

**建议修复:**
在 `backend/jest.config.js` 中已配置 `forceExit: true`，但可能需要在每个测试文件的 `afterAll` 中手动关闭服务器：

```javascript
afterAll((done) => {
  server.close(done);
});
```

或者修改 `src/server.js` 导出服务器实例以便测试中关闭。

---

### Bug #3: AI 模块 - Token 验证失败 🔴

**文件:** `backend/src/middleware/auth.js` 或 `backend/src/routes/ai.js`

**错误信息:**
```
Expected: 201
Received: 401
```

**问题描述:**
AI 模块的所有 API 请求都返回 401 未授权，即使传入了正确的 Bearer Token。

**可能原因:**
1. Token 解析逻辑有问题
2. 认证中间件在 AI 路由上的应用顺序错误
3. JWT_SECRET 环境变量未正确加载

**建议修复:**
检查 `backend/src/routes/ai.js` 中的中间件配置，确保 `authMiddleware` 正确应用。

---

### Bug #4: 注册功能异常 🟡

**文件:** `backend/src/controllers/authController.js`

**错误信息:**
```
Expected: 201
Received: 400
```

**问题描述:**
新用户注册（student 和 parent）返回 400 错误，但测试输入看起来是正确的。

**建议修复:**
检查 `register` 函数的输入验证逻辑，可能是字段验证过于严格。

---

### Bug #5: API 响应格式不一致 🟡

**影响文件:**
- `backend/src/controllers/knowledgeController.js` - 返回 `{data, total}` 而非 `{knowledgePoints}`
- `backend/src/controllers/progressController.js` - 返回 `{data}` 而非 `{progressList}`

**问题描述:**
前后端对接时响应格式不统一，导致前端解析困难。

**建议修复:**
统一所有列表 API 的响应格式为：
```javascript
{
  "knowledgePoints": [...],  // 或 "progressList", "records"
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

## 测试报告位置

完整测试报告：`docs/test-report.md`

## 测试覆盖率

- **语句覆盖率:** 45.05%
- **分支覆盖率:** 33.43%
- **函数覆盖率:** 50%

## 下一步

1. 修复上述 Bug
2. 运行 `npm test` 验证修复
3. 更新测试用例以匹配修复后的行为
4. 重新生成测试报告

---

**请 Fullstack 工程师收到通知后立即处理 P0 级别的 Bug！**
