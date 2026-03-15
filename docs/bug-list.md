# 🐛 Bug 列表 - 学习助手项目

**更新时间**: 2026-03-15 07:36  
**负责人**: qa-agent  
**状态**: 测试中发现的 Bug 汇总

---

## 📊 Bug 统计

| 优先级 | 数量 | 已修复 | 待修复 | 修复率 |
|--------|------|--------|--------|--------|
| **P0** | 2 | 0 | 2 | 0% |
| **P1** | 2 | 0 | 2 | 0% |
| **P2** | 2 | 0 | 2 | 0% |
| **总计** | **6** | **0** | **6** | **0%** |

---

## 🔴 P0 - 严重 Bug (阻塞发布)

### BUG-TEST-001: 验证码测试机制缺陷

| 属性 | 值 |
|------|-----|
| **状态** | 🔴 待修复 |
| **优先级** | P0 |
| **模块** | 认证模块 |
| **影响** | 所有需要认证的 API 测试无法通过 |
| **发现时间** | 2026-03-15 07:22 |
| **负责人** | fullstack-agent |

**问题描述**:
测试环境中使用硬编码验证码 `'123456'`,但实际验证码存储在内存 `verificationCodeMap` 中且 5 分钟过期。导致注册/登录测试始终返回 401。

**复现步骤**:
1. 运行 API 测试 `npm test -- --testPathPatterns="comprehensive-api"`
2. 观察注册/登录测试结果
3. 实际返回 401,预期返回 200/201

**当前状态**:
✅ 已修复 - 测试环境已启用 bypass 模式，使用通用验证码 `123456`

**修复方案**:
```javascript
// src/services/verificationService.js
if (process.env.NODE_ENV === 'test') {
  const TEST_CODE = '123456';
  verificationCodeMap.set(phone, {
    code: TEST_CODE,
    expiresAt: Date.now() + 300000
  });
}
```

---

### BUG-TEST-002: 前端测试缺少 AuthProvider 包装

| 属性 | 值 |
|------|-----|
| **状态** | 🔴 待修复 |
| **优先级** | P0 |
| **模块** | 前端测试 |
| **影响** | 所有前端 E2E 测试失败 (42 个测试) |
| **发现时间** | 2026-03-15 07:35 |
| **负责人** | fullstack-agent |

**问题描述**:
前端测试文件中 `AuthContext` 导入路径错误或未正确包装 `AuthProvider`,导致所有使用 `useAuth` 的组件测试失败。

**错误信息**:
```
TypeError: Cannot read properties of undefined (reading 'Provider')
Error: useAuth must be used within AuthProvider
```

**受影响的测试**:
- `tests/Login.test.jsx` - 6 个测试
- `tests/Register.test.jsx` - 6 个测试
- `tests/Dashboard.test.jsx` - 7 个测试
- `tests/AIChat.test.jsx` - 8 个测试
- `tests/Knowledge.test.jsx` - 8 个测试
- `tests/e2e-comprehensive.test.jsx` - 7 个测试

**修复方案**:
```javascript
// 修复导入
import { AuthContext, AuthProvider } from '../context/AuthContext';

// 修复 renderWithProviders
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AuthContext.Provider value={mockAuthContext}>
          {component}
        </AuthContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  );
};
```

---

## 🟡 P1 - 高优先级 Bug

### BUG-TEST-003: 测试服务器端口占用

| 属性 | 值 |
|------|-----|
| **状态** | 🟡 待修复 |
| **优先级** | P1 |
| **模块** | 测试基础设施 |
| **影响** | 集成测试不稳定 |
| **发现时间** | 2026-03-15 07:22 |
| **负责人** | qa-agent |

**问题描述**:
多个测试文件同时启动服务器实例，导致 `EADDRINUSE address already in use :::3000` 错误。

**修复方案**:
使用单例模式管理 app 实例，在 `beforeAll` 中启动一次，`afterAll` 中关闭。

---

### BUG-TEST-004: 测试清理间隔未关闭

| 属性 | 值 |
|------|-----|
| **状态** | 🟡 待修复 |
| **优先级** | P1 |
| **模块** | verificationService |
| **影响** | Jest 无法正常退出 |
| **发现时间** | 2026-03-15 07:22 |
| **负责人** | fullstack-agent |

**问题描述**:
`verificationService.js` 中的 `cleanupInterval` 在测试结束后未关闭，导致 Jest 检测到 open handles。

**修复方案**:
```javascript
// 测试结束后关闭清理间隔
afterAll(() => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});
```

---

## ⚪ P2 - 中优先级 Bug

### BUG-TEST-005: pdf-parse 原生模块加载警告

| 属性 | 值 |
|------|-----|
| **状态** | ⚪ 待优化 |
| **优先级** | P2 |
| **模块** | textbook-parser |
| **影响** | 测试日志污染 |
| **发现时间** | 2026-03-15 07:22 |
| **负责人** | fullstack-agent |

**问题描述**:
`pdf-parse` 依赖的原生模块 `@napi-rs/canvas` 在测试环境中加载时产生警告。

**影响**: 不影响测试功能，但日志输出混乱。

---

### BUG-TEST-006: 健康检查路由 404

| 属性 | 值 |
|------|-----|
| **状态** | ⚪ 待修复 |
| **优先级** | P2 |
| **模块** | 健康检查 |
| **影响** | 服务监控缺失 |
| **发现时间** | 2026-03-15 07:22 |
| **负责人** | fullstack-agent |

**问题描述**:
`GET /health` 返回 404，健康检查路由未正确挂载。

**修复方案**:
检查 `src/server.js` 中是否包含:
```javascript
app.use('/health', healthRoutes);
```

---

## 📋 Bug 修复进度

### 2026-03-15

| 时间 | Bug ID | 操作 | 操作人 |
|------|--------|------|--------|
| 07:22 | BUG-TEST-001 | 发现 | qa-agent |
| 07:22 | BUG-TEST-002 | 发现 | qa-agent |
| 07:22 | BUG-TEST-003 | 发现 | qa-agent |
| 07:22 | BUG-TEST-004 | 发现 | qa-agent |
| 07:22 | BUG-TEST-005 | 发现 | qa-agent |
| 07:22 | BUG-TEST-006 | 发现 | qa-agent |
| 07:34 | BUG-TEST-001 | ✅ 已修复 (测试 bypass) | fullstack-agent |
| 07:36 | - | Bug 列表创建 | qa-agent |

---

## 📈 Bug 趋势图

```
Bug 数量趋势:
07:22 ██████ 6 个 (新增)
07:36 ██████ 6 个 (1 个已修复，5 个待修复)

修复率: 16.7% (1/6)
```

---

## 🎯 下一步行动

| 优先级 | Bug ID | 预计修复时间 | 负责人 |
|--------|--------|-------------|--------|
| P0 | BUG-TEST-002 | 45 分钟 | fullstack-agent |
| P1 | BUG-TEST-003 | 20 分钟 | qa-agent |
| P1 | BUG-TEST-004 | 15 分钟 | fullstack-agent |
| P2 | BUG-TEST-005 | 30 分钟 | fullstack-agent |
| P2 | BUG-TEST-006 | 10 分钟 | fullstack-agent |

---

**文档维护**: qa-agent  
**最后更新**: 2026-03-15 07:36
