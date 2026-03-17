# 🧪 测试用例优化方案

**文档状态**: 草稿  
**创建时间**: 2026-03-17 06:45  
**负责人**: QA Sub-Agent  
**预计工时**: 45 分钟（分析）+ 4 小时（实施）

---

## 📊 一、现有测试用例覆盖率审查

### 1.1 测试文件统计

| 模块 | 测试文件 | 测试用例数 | 覆盖的 API/功能 | 状态 |
|------|----------|------------|----------------|------|
| **Backend** | | | | |
| Auth | `auth.test.js` | 18 | `/api/auth/*` (7 个端点) | ✅ 良好 |
| AI | `ai.test.js` | 10 | `/api/ai/*` (4 个端点) | ⚠️ 中等 |
| Knowledge | `knowledge.test.js` | 13 | `/api/knowledge/*` (6 个端点) | ✅ 良好 |
| Progress | `progress.test.js` | 10 | `/api/progress/*` (4 个端点) | ⚠️ 中等 |
| Leaderboard | `leaderboard.test.js` | 7 | `LeaderboardModel` (仅单元测试) | ❌ 不足 |
| Points System | `points-system.test.js` | 5 | `PointsSystemModel` (仅单元测试) | ❌ 不足 |
| Weakness Analysis | `weakness-analysis.test.js` | 8 | `KnowledgeMasteryModel` (仅单元测试) | ❌ 不足 |
| Textbook Parser | `textbook-parser.test.js` | 6 | `TextbookParserService` (仅单元测试) | ❌ 不足 |
| Integration | `integration-flow.test.js` | - | 集成测试 | ❓ 未审查 |
| Full API | `api-full-test.test.js` | - | 全 API 测试 | ❓ 未审查 |
| Comprehensive | `comprehensive-api.test.js` | - | 综合测试 | ❓ 未审查 |
| **Frontend** | | | | |
| Login | `Login.test.jsx` | 3 | 登录页面 | ❌ 不足 |
| Register | `Register.test.jsx` | - | 注册页面 | ❓ 未审查 |
| Dashboard | `Dashboard.test.jsx` | - | 仪表盘 | ❓ 未审查 |
| Knowledge | `Knowledge.test.jsx` | - | 知识点页面 | ❓ 未审查 |
| AIChat | `AIChat.test.jsx` | - | AI 聊天页面 | ❓ 未审查 |
| E2E | `e2e-comprehensive.test.jsx` | - | 端到端测试 | ❓ 未审查 |
| **Mobile** | | | | |
| App | `App.test.tsx` | - | React Native 应用 | ❓ 未审查 |

**总计**: 
- Backend 测试文件：14 个
- Frontend 测试文件：6 个
- Mobile 测试文件：1 个
- **预估总测试用例数**: ~80+

### 1.2 代码覆盖率分析

#### 已覆盖的后端模块
| 模块 | 测试覆盖 | 覆盖率估算 |
|------|----------|-----------|
| `controllers/authController.js` | ✅ API 测试 | 85% |
| `controllers/aiController.js` | ✅ API 测试 | 70% |
| `controllers/knowledgeController.js` | ✅ API 测试 | 80% |
| `controllers/progressController.js` | ✅ API 测试 | 75% |
| `modules/leaderboard/*` | ⚠️ 仅单元测试 | 40% |
| `modules/points-system/*` | ⚠️ 仅单元测试 | 45% |
| `modules/weakness-analysis/*` | ⚠️ 仅单元测试 | 50% |
| `modules/textbook-parser/*` | ⚠️ 仅单元测试 | 55% |

#### 未覆盖/覆盖不足的后端模块
| 模块 | 文件 | 测试状态 | 优先级 |
|------|------|----------|--------|
| `controllers/practiceController.js` | `src/controllers/practiceController.js` | ❌ 无测试 | 🔴 P0 |
| `controllers/healthController.js` | `src/controllers/healthController.js` | ❌ 无测试 | 🟡 P1 |
| `modules/ai-gateway/*` | `src/modules/ai-gateway/*` | ❌ 无测试 | 🔴 P0 |
| `modules/rate-limiter/*` | `src/modules/rate-limiter/*` | ❌ 无测试 | 🟡 P1 |
| `modules/logger/*` | `src/modules/logger/*` | ❌ 无测试 | 🟢 P2 |
| `services/verificationService.js` | `src/services/verificationService.js` | ❌ 无测试 | 🔴 P0 |
| `middleware/auth.js` | `src/middleware/auth.js` | ❌ 无测试 | 🔴 P0 |
| `workers/*` | `src/workers/*` | ❌ 无测试 | 🟡 P1 |

#### 未覆盖的数据库模型
| 模型 | 文件 | 测试状态 |
|------|------|----------|
| `User.js` | `src/models/User.js` | ❌ 无测试 |
| `KnowledgePoint.js` | `src/models/KnowledgePoint.js` | ❌ 无测试 |
| `LearningProgress.js` | `src/models/LearningProgress.js` | ❌ 无测试 |
| `PracticeSession.js` | `src/models/PracticeSession.js` | ❌ 无测试 |
| `AIQARecord.js` | `src/models/AIQARecord.js` | ❌ 无测试 |

---

## 🎯 二、缺失的边界测试场景识别

### 2.1 Auth 模块边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| 手机号边界值 | ✅ 有效/无效格式 | ❌ 11 位边界、特殊字符、国际区号 | 🟡 P1 |
| 验证码边界 | ✅ 错误验证码 | ❌ 验证码过期、重发限制、并发请求 | 🔴 P0 |
| Token 边界 | ✅ 有效/无效 token | ❌ Token 过期边界、刷新 token 竞争条件 | 🟡 P1 |
| 角色权限 | ✅ student/parent | ❌ 非法角色、权限越权、role 注入 | 🔴 P0 |
| 并发登录 | ❌ 无 | ❌ 同一手机号多设备同时登录 | 🟡 P1 |
| 注册限制 | ⚠️ 部分 | ❌ 昵称长度边界、特殊字符、敏感词 | 🟡 P1 |

**建议补充测试用例**:
```javascript
// 1. 验证码重发限制（60 秒内）
it('应该限制验证码重发频率（60 秒内）', async () => {
  // 第一次发送
  const res1 = await request(server).post('/api/auth/send-code').send({ phone: testPhone });
  expect(res1.statusCode).toBe(200);
  
  // 立即第二次发送
  const res2 = await request(server).post('/api/auth/send-code').send({ phone: testPhone });
  expect(res2.statusCode).toBe(429);
  expect(res2.body.error).toContain('发送过于频繁');
});

// 2. Token 过期边界测试
it('应该拒绝刚好过期的 token', async () => {
  // 使用伪造的过期 token
  const expiredToken = 'expired_token_mock';
  const res = await request(server)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${expiredToken}`);
  expect(res.statusCode).toBe(401);
});

// 3. 权限越权测试
it('应该拒绝 student 访问 admin 接口', async () => {
  // student token
  const res = await request(server)
    .get('/api/admin/users')  // 假设的管理员接口
    .set('Authorization', `Bearer ${studentToken}`);
  expect(res.statusCode).toBe(403);
});
```

### 2.2 AI 模块边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| 问题长度 | ❌ 无 | ❌ 空问题、超长问题（1000+ 字）、特殊字符 | 🔴 P0 |
| 科目验证 | ⚠️ 部分 | ❌ 无效科目、科目大小写、科目注入 | 🟡 P1 |
| AI 服务降级 | ❌ 无 | ❌ AI 服务超时、AI 服务不可用、重试机制 | 🔴 P0 |
| 并发请求 | ❌ 无 | ❌ 同一用户并发多个 AI 请求 | 🟡 P1 |
| 敏感内容 | ❌ 无 | ❌ 敏感问题过滤、不当内容检测 | 🔴 P0 |
| 历史记录分页 | ⚠️ 部分 | ❌ 超大页码、负数页码、limit 边界 | 🟡 P1 |

**建议补充测试用例**:
```javascript
// 1. 超长问题测试
it('应该拒绝超长问题（>1000 字）', async () => {
  const longQuestion = 'a'.repeat(1001);
  const res = await request(server)
    .post('/api/ai/ask')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ question: longQuestion, subject: '数学' });
  expect(res.statusCode).toBe(400);
  expect(res.body.error).toContain('问题过长');
});

// 2. AI 服务超时处理
it('应该在 AI 服务超时时返回友好错误', async () => {
  // Mock AI 服务超时
  vi.spyOn(AIService, 'ask').mockImplementation(() => {
    return new Promise(resolve => setTimeout(resolve, 35000)); // 35 秒超时
  });
  
  const res = await request(server)
    .post('/api/ai/ask')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ question: '测试问题', subject: '数学' });
  
  expect(res.statusCode).toBe(503);
  expect(res.body.error).toContain('服务暂时不可用');
});

// 3. 敏感内容过滤
it('应该过滤敏感问题', async () => {
  const res = await request(server)
    .post('/api/ai/ask')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ question: '如何作弊？', subject: '考试' });
  expect(res.statusCode).toBe(400);
  expect(res.body.error).toContain('问题包含不当内容');
});
```

### 2.3 Knowledge 模块边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| 内容长度 | ❌ 无 | ❌ 空内容、超长内容、HTML 注入 | 🔴 P0 |
| 标签验证 | ⚠️ 部分 | ❌ 空标签、特殊字符标签、标签数量限制 | 🟡 P1 |
| 搜索边界 | ⚠️ 部分 | ❌ SQL 注入、XSS 注入、特殊字符搜索 | 🔴 P0 |
| 并发更新 | ❌ 无 | ❌ 同一知识点并发更新、乐观锁 | 🟡 P1 |
| 删除级联 | ❌ 无 | ❌ 删除有关联记录的知识点 | 🟡 P1 |

### 2.4 Progress 模块边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| mastery 边界 | ✅ 0-100 | ❌ 负数、小数、非数字 | 🟡 P1 |
| 时间记录 | ⚠️ 正数 | ❌ 超大时长、精度（秒 vs 分）、时区 | 🟡 P1 |
| 状态转换 | ❌ 无 | ❌ 非法状态转换、状态机验证 | 🟡 P1 |
| 统计计算 | ❌ 无 | ❌ 空数据、大数据量性能 | 🟡 P1 |

### 2.5 积分系统边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| 积分计算 | ✅ 基本逻辑 | ❌ 边界值（0 题、1 题、100 题）、并发积分 | 🟡 P1 |
| 积分流水 | ❌ 无 | ❌ 负积分、超大积分、事务一致性 | 🔴 P0 |
| 积分兑换 | ❌ 无 | ❌ 积分不足、重复兑换、并发兑换 | 🔴 P0 |

### 2.6 薄弱点分析边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| 掌握度计算 | ✅ 基本逻辑 | ❌ 极端值、浮点精度 | 🟡 P1 |
| 等级判定 | ✅ 边界值 | ❌ 边界值（59、60、79、80） | 🟡 P1 |
| 推荐算法 | ❌ 无 | ❌ 无数据推荐、数据稀疏推荐 | 🟡 P1 |

### 2.7 课本解析器边界测试缺失

| 场景 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| JSON 解析 | ✅ 基本解析 | ❌  malformed JSON、编码问题、大文件 | 🟡 P1 |
| 结构验证 | ⚠️ 部分 | ❌ 缺失必填字段、循环引用 | 🟡 P1 |
| AI 响应格式 | ⚠️ 部分 | ❌ 非标准格式、Markdown 变体 | 🟡 P1 |

### 2.8 前端组件边界测试缺失

| 组件 | 当前测试 | 缺失测试 | 优先级 |
|------|----------|----------|--------|
| Login | ⚠️ 基础 | ❌ 网络错误、加载状态、表单验证、键盘事件 | 🔴 P0 |
| Register | ❓ 未知 | ❌ 所有边界测试 | 🔴 P0 |
| Dashboard | ❓ 未知 | ❌ 数据加载、空状态、错误处理 | 🔴 P0 |
| Knowledge | ❓ 未知 | ❌ 搜索、筛选、分页、CRUD | 🔴 P0 |
| AIChat | ❓ 未知 | ❌ 消息发送、加载状态、错误恢复 | 🔴 P0 |

---

## 🏗️ 三、测试用例结构优化

### 3.1 当前问题

1. **重复代码多**: 每个测试文件都重复登录逻辑
2. **测试数据硬编码**: 测试数据散落在各个文件中
3. **缺少 Setup/Teardown 标准化**: 数据库清理不统一
4. **断言不够精确**: 部分断言只检查 status code，未验证业务逻辑
5. **缺少测试数据工厂**: 没有统一的测试数据生成工具

### 3.2 优化方案

#### 3.2.1 创建测试工具库

**文件**: `backend/tests/test-utils.js`

```javascript
/**
 * 测试工具函数库
 */
const request = require('supertest');

// 测试数据工厂
const factories = {
  user: (overrides = {}) => ({
    phone: `138${'0123456789'.slice(0, 8)}`,
    code: '123456',
    role: 'student',
    nickname: '测试用户',
    grade: '高一',
    school_name: '测试中学',
    ...overrides
  }),
  
  knowledgePoint: (overrides = {}) => ({
    subject: '数学',
    title: '测试知识点',
    content: '测试内容',
    tags: ['测试'],
    ...overrides
  }),
  
  practiceSession: (overrides = {}) => ({
    subject: '数学',
    knowledge_point_ids: [1, 2, 3],
    question_count: 10,
    ...overrides
  })
};

// 认证助手
const authHelper = {
  async login(server, phone = '13800138000', code = '123456') {
    // 发送验证码
    await request(server)
      .post('/api/auth/send-code')
      .send({ phone });
    
    // 登录
    const res = await request(server)
      .post('/api/auth/login')
      .send({ phone, code });
    
    return res.body.token;
  },
  
  async register(server, userData) {
    const user = factories.user(userData);
    
    await request(server)
      .post('/api/auth/send-code')
      .send({ phone: user.phone });
    
    const res = await request(server)
      .post('/api/auth/register')
      .send(user);
    
    return { user, token: res.body.token };
  }
};

// 数据库清理
const dbCleaner = {
  async cleanup(models = []) {
    for (const model of models) {
      await model.destroy({ truncate: true, cascade: true });
    }
  }
};

// 断言助手
const assertions = {
  assertSuccess(res, expectedStatus = 200) {
    expect(res.statusCode).toBe(expectedStatus);
    expect(res.body).toBeDefined();
  },
  
  assertError(res, expectedStatus, expectedError) {
    expect(res.statusCode).toBe(expectedStatus);
    if (expectedError) {
      expect(res.body.error).toContain(expectedError);
    }
  },
  
  assertPagination(res) {
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total');
  }
};

module.exports = {
  factories,
  authHelper,
  dbCleaner,
  assertions,
  request
};
```

#### 3.2.2 标准化测试结构

**模板**: `backend/tests/templates/api-test.template.js`

```javascript
/**
 * API 测试模板
 * 使用方法：复制此模板，替换模块名称和测试用例
 */
const { request, authHelper, dbCleaner, assertions } = require('../test-utils');
const app = require('../../src/server');
// const Model = require('../../src/models/YourModel');

describe('[模块名] API Tests', () => {
  let authToken;
  let testUser;
  let server;

  // ===== 生命周期钩子 =====
  beforeAll((done) => {
    console.log('🧪 开始 [模块名] 测试');
    server = app.listen(0, () => {
      console.log(`🔌 测试服务器启动在端口 ${server.address().port}`);
      done();
    });
  });

  afterAll(async (done) => {
    console.log('✅ [模块名] 测试完成');
    // 清理测试数据
    // await dbCleaner.cleanup([Model]);
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(async () => {
    // 每个测试前登录
    const { user, token } = await authHelper.register(server, {
      phone: `138${Math.floor(Math.random() * 100000000)}`,
      nickname: `测试用户_${Date.now()}`
    });
    testUser = user;
    authToken = token;
  });

  afterEach(async () => {
    // 每个测试后清理
    // await dbCleaner.cleanup([Model]);
  });

  // ===== 测试用例组 =====
  describe('POST /api/[resource] - 创建资源', () => {
    it('应该成功创建资源', async () => {
      const res = await request(server)
        .post('/api/[resource]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ /* 测试数据 */ });

      assertions.assertSuccess(res, 201);
      expect(res.body).toHaveProperty('id');
    });

    it('应该拒绝未授权请求', async () => {
      const res = await request(server)
        .post('/api/[resource]')
        .send({ /* 测试数据 */ });

      assertions.assertError(res, 401);
    });

    it('应该拒绝无效数据', async () => {
      const res = await request(server)
        .post('/api/[resource]')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ /* 无效数据 */ });

      assertions.assertError(res, 400);
    });
  });

  describe('GET /api/[resource] - 获取资源列表', () => {
    it('应该成功获取列表', async () => {
      const res = await request(server)
        .get('/api/[resource]')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertSuccess(res);
      assertions.assertPagination(res);
    });

    it('应该支持分页', async () => {
      const res = await request(server)
        .get('/api/[resource]?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      assertions.assertPagination(res);
      expect(res.body.pagination.limit).toBe(10);
    });
  });

  // ... 其他端点测试
});
```

#### 3.2.3 创建测试数据种子

**文件**: `backend/tests/seed-data.js`

```javascript
/**
 * 测试数据种子
 * 用于集成测试和 E2E 测试
 */
const seedData = {
  users: [
    {
      phone: '13800000001',
      role: 'student',
      nickname: '测试学生 1 号',
      grade: '高一',
      school_name: '测试中学'
    },
    {
      phone: '13800000002',
      role: 'parent',
      nickname: '测试家长 1 号',
      real_name: '张三'
    },
    {
      phone: '13800000003',
      role: 'student',
      nickname: '测试学生 2 号',
      grade: '高二',
      school_name: '测试中学'
    }
  ],
  
  knowledgePoints: [
    {
      subject: '数学',
      title: '勾股定理',
      content: '直角三角形两直角边的平方和等于斜边的平方',
      tags: ['几何', '三角形']
    },
    {
      subject: '数学',
      title: '一元二次方程',
      content: '形如 ax²+bx+c=0 的方程',
      tags: ['代数', '方程']
    },
    {
      subject: '物理',
      title: '牛顿第一定律',
      content: '任何物体都要保持匀速直线运动或静止状态',
      tags: ['力学', '运动']
    }
  ],
  
  practiceSessions: [
    {
      subject: '数学',
      knowledge_point_ids: [1, 2],
      question_count: 10,
      difficulty: 'medium'
    }
  ]
};

async function seedDatabase(server, authToken) {
  // 创建知识点
  for (const kp of seedData.knowledgePoints) {
    await request(server)
      .post('/api/knowledge')
      .set('Authorization', `Bearer ${authToken}`)
      .send(kp);
  }
  
  // 创建练习会话
  for (const session of seedData.practiceSessions) {
    await request(server)
      .post('/api/practice/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send(session);
  }
}

module.exports = {
  seedData,
  seedDatabase
};
```

---

## 🔧 四、关键路径自动化测试补充

### 4.1 用户注册登录完整流程

**文件**: `backend/tests/flows/auth-flow.test.js`

```javascript
/**
 * 用户认证完整流程测试
 * 覆盖：注册 → 登录 → 刷新 Token → 获取用户信息 → 更新信息 → 注销
 */
const { request, factories, assertions } = require('../test-utils');
const app = require('../../src/server');

describe('Auth Flow E2E Tests', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('完整用户生命周期流程', async () => {
    const phone = factories.user().phone;
    
    // 1. 注册
    const registerRes = await request(server)
      .post('/api/auth/register')
      .send({
        phone,
        code: '123456',
        role: 'student',
        nickname: '流程测试用户',
        grade: '高一',
        school_name: '测试中学'
      });
    
    assertions.assertSuccess(registerRes, 201);
    const token = registerRes.body.token;
    
    // 2. 获取用户信息
    const meRes = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    
    assertions.assertSuccess(meRes);
    expect(meRes.body.user.phone).toBe(phone);
    
    // 3. 更新用户信息
    const updateRes = await request(server)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nickname: '新昵称' });
    
    assertions.assertSuccess(updateRes);
    expect(updateRes.body.user.nickname).toBe('新昵称');
    
    // 4. 刷新 Token
    const refreshRes = await request(server)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`);
    
    assertions.assertSuccess(refreshRes);
    const newToken = refreshRes.body.token;
    expect(newToken).toBeDefined();
    
    // 5. 使用新 Token 访问
    const newMeRes = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newToken}`);
    
    assertions.assertSuccess(newMeRes);
    
    // 6. 注销（如果有此接口）
    // const logoutRes = await request(server)
    //   .post('/api/auth/logout')
    //   .set('Authorization', `Bearer ${newToken}`);
    // assertions.assertSuccess(logoutRes);
  });
});
```

### 4.2 知识点学习完整流程

**文件**: `backend/tests/flows/learning-flow.test.js`

```javascript
/**
 * 知识点学习完整流程测试
 * 覆盖：创建知识点 → 开始学习 → 记录进度 → 练习 → 查看掌握度 → 薄弱点分析
 */
const { request, authHelper, assertions } = require('../test-utils');
const app = require('../../src/server');

describe('Learning Flow E2E Tests', () => {
  let authToken;
  let server;
  let knowledgeId;

  beforeAll(async (done) => {
    server = app.listen(0, done);
    // 登录
    const { token } = await authHelper.register(server, {
      phone: '13800138100',
      nickname: '学习流程测试用户'
    });
    authToken = token;
  });

  afterAll((done) => {
    server.close(done);
  });

  it('完整知识点学习流程', async () => {
    // 1. 创建知识点
    const createKpRes = await request(server)
      .post('/api/knowledge')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        subject: '数学',
        title: '流程测试知识点',
        content: '测试内容',
        tags: ['测试']
      });
    
    assertions.assertSuccess(createKpRes, 201);
    knowledgeId = createKpRes.body.id;
    
    // 2. 创建学习进度
    const progressRes = await request(server)
      .post('/api/progress/upsert')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        knowledge_id: knowledgeId,
        status: 'learning',
        mastery: 30
      });
    
    assertions.assertSuccess(progressRes);
    
    // 3. 记录学习时间
    const logRes = await request(server)
      .post('/api/progress/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        knowledge_id: knowledgeId,
        duration_minutes: 30
      });
    
    assertions.assertSuccess(logRes, 201);
    
    // 4. 开始练习会话
    const sessionRes = await request(server)
      .post('/api/practice/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        subject: '数学',
        knowledge_point_ids: [knowledgeId],
        question_count: 5
      });
    
    assertions.assertSuccess(sessionRes, 201);
    const sessionId = sessionRes.body.id;
    
    // 5. 提交练习答案
    const submitRes = await request(server)
      .post(`/api/practice/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        answers: [
          { question_id: 1, answer: 'A', is_correct: true },
          { question_id: 2, answer: 'B', is_correct: true },
          { question_id: 3, answer: 'C', is_correct: false }
        ]
      });
    
    assertions.assertSuccess(submitRes);
    
    // 6. 更新掌握度
    const updateProgressRes = await request(server)
      .post('/api/progress/upsert')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        knowledge_id: knowledgeId,
        status: 'proficient',
        mastery: 70
      });
    
    assertions.assertSuccess(updateProgressRes);
    expect(updateProgressRes.body.mastery).toBe(70);
    
    // 7. 查看统计数据
    const statsRes = await request(server)
      .get('/api/progress/stats')
      .set('Authorization', `Bearer ${authToken}`);
    
    assertions.assertSuccess(statsRes);
    expect(statsRes.body).toHaveProperty('totalLearned');
    expect(statsRes.body).toHaveProperty('totalTimeMinutes');
  });
});
```

### 4.3 积分系统完整流程

**文件**: `backend/tests/flows/points-flow.test.js`

```javascript
/**
 * 积分系统完整流程测试
 * 覆盖：练习 → 获得积分 → 查看积分流水 → 积分兑换（如果有）
 */
const { request, authHelper, assertions } = require('../test-utils');
const app = require('../../src/server');

describe('Points Flow E2E Tests', () => {
  let authToken;
  let server;

  beforeAll(async (done) => {
    server = app.listen(0, done);
    const { token } = await authHelper.register(server, {
      phone: '13800138200',
      nickname: '积分流程测试用户'
    });
    authToken = token;
  });

  afterAll((done) => {
    server.close(done);
  });

  it('完整积分获取流程', async () => {
    // 1. 初始积分查询（如果有此接口）
    // const initialRes = await request(server)
    //   .get('/api/points/balance')
    //   .set('Authorization', `Bearer ${authToken}`);
    // assertions.assertSuccess(initialRes);
    // const initialPoints = initialRes.body.balance;
    
    // 2. 创建练习会话
    const sessionRes = await request(server)
      .post('/api/practice/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        subject: '数学',
        knowledge_point_ids: [1],
        question_count: 10
      });
    
    assertions.assertSuccess(sessionRes, 201);
    const sessionId = sessionRes.body.id;
    
    // 3. 提交全对答案
    const answers = Array(10).fill(null).map((_, i) => ({
      question_id: i + 1,
      answer: 'A',
      is_correct: true
    }));
    
    const submitRes = await request(server)
      .post(`/api/practice/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ answers });
    
    assertions.assertSuccess(submitRes);
    
    // 4. 验证积分增加（如果有积分流水接口）
    // const ledgerRes = await request(server)
    //   .get('/api/points/ledger')
    //   .set('Authorization', `Bearer ${authToken}`);
    // assertions.assertSuccess(ledgerRes);
    // expect(ledgerRes.body.ledger).toHaveLength(1);
    // expect(ledgerRes.body.ledger[0].points).toBe(70); // 全对奖励
  });

  it('积分计算边界值测试', async () => {
    // 测试不同正确率的积分计算
    const testCases = [
      { correct: 10, total: 10, expectedMin: 100 }, // 全对
      { correct: 8, total: 10, expectedMin: 80 },    // 80%
      { correct: 5, total: 10, expectedMin: 50 },    // 50%
      { correct: 0, total: 10, expectedMin: 0 }      // 全错
    ];

    for (const { correct, total, expectedMin } of testCases) {
      const sessionRes = await request(server)
        .post('/api/practice/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: '数学',
          knowledge_point_ids: [1],
          question_count: total
        });
      
      assertions.assertSuccess(sessionRes, 201);
      const sessionId = sessionRes.body.id;
      
      const answers = Array(total).fill(null).map((_, i) => ({
        question_id: i + 1,
        answer: 'A',
        is_correct: i < correct
      }));
      
      const submitRes = await request(server)
        .post(`/api/practice/sessions/${sessionId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ answers });
      
      assertions.assertSuccess(submitRes);
      
      // 验证积分（具体逻辑根据实际实现调整）
      // expect(submitRes.body.pointsEarned).toBeGreaterThanOrEqual(expectedMin);
    }
  });
});
```

### 4.4 AI 网关集成测试

**文件**: `backend/tests/flows/ai-gateway-flow.test.js`

```javascript
/**
 * AI 网关集成测试
 * 覆盖：AI 问答 → 任务记录 → 历史查询 → 搜索
 */
const { request, authHelper, assertions } = require('../test-utils');
const app = require('../../src/server');

describe('AI Gateway Flow E2E Tests', () => {
  let authToken;
  let server;
  let recordId;

  beforeAll(async (done) => {
    server = app.listen(0, done);
    const { token } = await authHelper.register(server, {
      phone: '13800138300',
      nickname: 'AI 网关测试用户'
    });
    authToken = token;
  });

  afterAll((done) => {
    server.close(done);
  });

  it('完整 AI 问答流程', async () => {
    // 1. 提交 AI 问题
    const askRes = await request(server)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question: '什么是勾股定理？',
        subject: '数学'
      });
    
    assertions.assertSuccess(askRes, 201);
    recordId = askRes.body.id;
    expect(askRes.body).toHaveProperty('answer');
    
    // 2. 查询问答历史
    const historyRes = await request(server)
      .get('/api/ai/history')
      .set('Authorization', `Bearer ${authToken}`);
    
    assertions.assertSuccess(historyRes);
    expect(historyRes.body.records).toBeInstanceOf(Array);
    expect(historyRes.body.records.length).toBeGreaterThan(0);
    
    // 3. 搜索问答记录
    const searchRes = await request(server)
      .get('/api/ai/search?q=勾股')
      .set('Authorization', `Bearer ${authToken}`);
    
    assertions.assertSuccess(searchRes);
    expect(searchRes.body.records).toBeInstanceOf(Array);
    
    // 4. 删除问答记录
    const deleteRes = await request(server)
      .delete(`/api/ai/${recordId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    assertions.assertSuccess(deleteRes);
  });

  it('AI 服务降级处理', async () => {
    // Mock AI 服务不可用
    // 验证系统是否有降级策略（返回缓存答案、友好错误等）
    
    const askRes = await request(server)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        question: '测试降级处理',
        subject: '数学'
      });
    
    // 期望：要么成功（有降级），要么返回友好错误
    expect([201, 503]).toContain(askRes.statusCode);
  });
});
```

---

## 📈 五、实施计划

### 5.1 第一阶段：测试基础设施优化（1 小时）

- [ ] 创建 `backend/tests/test-utils.js`
- [ ] 创建 `backend/tests/templates/` 目录
- [ ] 创建 `backend/tests/seed-data.js`
- [ ] 更新 `.env.test` 配置文件
- [ ] 配置 Jest 测试覆盖率报告

### 5.2 第二阶段：补充缺失的关键测试（2 小时）

**优先级 P0**:
- [ ] `backend/tests/middleware/auth.test.js` - 认证中间件测试
- [ ] `backend/tests/services/verificationService.test.js` - 验证码服务测试
- [ ] `backend/tests/controllers/practiceController.test.js` - 练习控制器测试
- [ ] `backend/tests/modules/ai-gateway/*.test.js` - AI 网关测试
- [ ] `backend/tests/flows/auth-flow.test.js` - 认证流程测试
- [ ] `backend/tests/flows/learning-flow.test.js` - 学习流程测试

**优先级 P1**:
- [ ] `backend/tests/flows/points-flow.test.js` - 积分流程测试
- [ ] `backend/tests/flows/ai-gateway-flow.test.js` - AI 网关流程测试
- [ ] `backend/tests/boundary/auth-boundary.test.js` - 认证边界测试
- [ ] `backend/tests/boundary/ai-boundary.test.js` - AI 边界测试

### 5.3 第三阶段：前端测试补充（1 小时）

- [ ] 审查现有前端测试文件
- [ ] 补充 Login 组件测试（网络错误、加载状态）
- [ ] 创建 Register 组件测试
- [ ] 创建 Dashboard 组件测试
- [ ] 创建 Knowledge 组件测试
- [ ] 创建 AIChat 组件测试

### 5.4 第四阶段：测试覆盖率提升（可选）

- [ ] 配置 Istanbul/nyc 覆盖率报告
- [ ] 设置覆盖率门槛（目标：80%）
- [ ] 集成到 CI/CD 流程
- [ ] 生成覆盖率报告 HTML

---

## 📊 六、预期成果

### 6.1 测试覆盖率提升

| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| Backend API 覆盖率 | ~50% | 85% | +35% |
| 关键路径覆盖率 | ~30% | 90% | +60% |
| 边界测试覆盖率 | ~10% | 70% | +60% |
| Frontend 组件覆盖率 | ~5% | 60% | +55% |
| 总测试用例数 | ~80 | 250+ | +170+ |

### 6.2 测试质量提升

- ✅ 消除重复代码（DRY 原则）
- ✅ 标准化测试结构
- ✅ 完善的测试数据管理
- ✅ 精确的断言验证
- ✅ 全面的边界场景覆盖

### 6.3 可维护性提升

- 📁 清晰的测试文件组织
- 🔧 可复用的测试工具库
- 📝 详细的测试文档
- 🚀 易于扩展的测试模板

---

## 🎯 七、验收标准

### 7.1 功能验收

- [ ] 所有 P0 优先级测试用例通过
- [ ] 关键业务流程 E2E 测试通过
- [ ] 边界测试覆盖所有已知边界场景
- [ ] 无测试用例遗漏关键功能

### 7.2 质量验收

- [ ] 测试代码符合 ESLint 规范
- [ ] 测试用例命名清晰（应该...）
- [ ] 每个测试用例独立运行
- [ ] 测试数据正确清理

### 7.3 覆盖率验收

- [ ] Backend 核心模块覆盖率 ≥ 80%
- [ ] 关键路径覆盖率 ≥ 90%
- [ ] 前端核心组件覆盖率 ≥ 60%

---

## 📝 八、后续优化建议

1. **性能测试**: 引入 k6 或 Artillery 进行 API 性能测试
2. **安全测试**: 引入 OWASP ZAP 进行安全扫描
3. **视觉回归测试**: 前端引入 Percy 或 Chromatic
4. **契约测试**: 前后端引入 Pact 进行契约测试
5. **混沌工程**: 引入故障注入测试系统韧性

---

**文档结束**

**下一步**: 
1. 俊哥审阅此方案
2. 确认后开始实施
3. 预计 4 小时完成全部优化
4. 输出测试覆盖率报告
