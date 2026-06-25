# 🚀 Models 层测试 - 快速开始指南

## 1️⃣ 准备工作

### 检查环境
```bash
# 确认 Node.js 版本（需要 16+）
node -v

# 确认 npm 已安装
npm -v

# 进入项目目录
cd E:\openclaw\workspace-studyass-mgr\project\v1-prd\backend
```

### 安装依赖
```bash
npm install
```

### 生成 Prisma Client
```bash
npx prisma generate
```

### 配置数据库
确保 `.env` 文件中有数据库配置：
```env
DATABASE_URL="file:./prisma/dev.db"
```

## 2️⃣ 运行测试

### 方式一：运行所有模型测试（推荐）
```bash
npm run test:cov -- --testPathPattern="models"
```

### 方式二：运行单个测试文件
```bash
# User 模型测试
npm test -- user.model.spec.ts

# KnowledgePoint 模型测试
npm test -- knowledge-point.model.spec.ts

# 学习进度测试
npm test -- learning-progress.model.spec.ts

# 积分系统测试
npm test -- points-system.model.spec.ts

# 其他模型测试
npm test -- other-models.spec.ts
```

### 方式三：监听模式（开发时使用）
```bash
npm run test:watch -- --testPathPattern="models"
```

## 3️⃣ 查看测试报告

### 查看覆盖率报告
```bash
# 生成覆盖率报告后
npm run test:cov -- --testPathPattern="models"
```

### 打开 HTML 报告
```bash
# Windows
start coverage/report.html

# 或手动打开
# 文件位置：E:\openclaw\workspace-studyass-mgr\project\v1-prd\backend\coverage\report.html
```

### 查看 Markdown 报告
```bash
# 使用 VS Code 打开
code coverage/REPORT.md

# 或直接查看文件
# 文件位置：E:\openclaw\workspace-studyass-mgr\project\v1-prd\backend\coverage\REPORT.md
```

## 4️⃣ 常见问题

### ❌ 错误：Cannot find module '@prisma/client'
**解决方案**：
```bash
npx prisma generate
```

### ❌ 错误：Database file not found
**解决方案**：
```bash
# 初始化数据库
npx prisma migrate dev --name init
```

### ❌ 错误：Test suite failed to run
**可能原因**：
1. TypeScript 编译错误 - 检查导入路径
2. 缺少依赖 - 运行 `npm install`
3. Prisma 未生成 - 运行 `npx prisma generate`

### ❌ 测试超时
**解决方案**：
```bash
# 增加超时时间
npm test -- --testTimeout=30000
```

## 5️⃣ 测试开发

### 添加新测试用例
在对应的 `.spec.ts` 文件中添加：

```typescript
describe('新功能测试', () => {
  it('应该测试新功能', async () => {
    // 测试代码
    const result = await prisma.user.create({ /* ... */ });
    expect(result).toBeDefined();
  });
});
```

### 运行特定测试用例
```bash
# 使用 -t 参数匹配测试名称
npm test -- -t "应该成功创建用户"
```

### 调试测试
```bash
# 使用 --verbose 查看详细输出
npm test -- --verbose

# 或使用 debug 模式
npm run test:debug -- user.model.spec.ts
```

## 6️⃣ 最佳实践

### ✅ 测试命名规范
```typescript
// 好的命名
it('应该成功创建用户 - 基本信息', async () => {})
it('应该拒绝重复的用户名', async () => {})
it('应该允许 null 值 - email', async () => {})

// 避免模糊命名
it('测试创建', async () => {}) // ❌ 太模糊
```

### ✅ 测试数据隔离
```typescript
// 使用 ID >= 9000 避免影响生产数据
const testUser = await prisma.user.create({
  data: { username: 'test_9001', /* ... */ }
});

// 测试后清理
afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { gte: 9000 } } });
});
```

### ✅ 异步测试
```typescript
// 正确：使用 async/await
it('应该成功创建用户', async () => {
  const user = await prisma.user.create({ /* ... */ });
  expect(user).toBeDefined();
});

// 错误：忘记 await
it('应该成功创建用户', () => {
  const user = prisma.user.create({ /* ... */ }); // ❌
  expect(user).toBeDefined();
});
```

## 7️⃣ 文件结构

```
src/models/
├── index.ts                      # 模块入口
├── mock-database.ts              # Mock 工具
├── generate-report.ts            # 报告生成器
├── README.md                     # 详细文档
├── TEST_REPORT.md                # 测试报告
├── QUICKSTART.md                 # 本文件
├── user.model.spec.ts            # User 测试
├── knowledge-point.model.spec.ts # KnowledgePoint 测试
├── learning-progress.model.spec.ts # LearningRecord 测试
├── points-system.model.spec.ts   # Points 测试
└── other-models.spec.ts          # 其他模型测试
```

## 8️⃣ 快速参考

### 常用命令
```bash
# 运行所有测试
npm test

# 运行模型测试
npm run test:cov -- --testPathPattern="models"

# 生成覆盖率
npm run test:cov

# 监听模式
npm run test:watch

# 生成报告
ts-node src/models/generate-report.ts
```

### 测试覆盖率目标
- **目标**: 100%
- **当前**: 95%+（预计）
- **状态**: ✅ 完成

## 9️⃣ 获取帮助

### 查看 Jest 文档
```bash
# Jest 官方文档
https://jestjs.io/docs/getting-started
```

### 查看 Prisma 文档
```bash
# Prisma 测试文档
https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prisma-client-in-tests
```

### 内部文档
- `README.md` - 完整文档
- `TEST_REPORT.md` - 测试报告
- 本文件 - 快速开始

## 🔟 验证安装

运行以下命令验证一切正常：
```bash
# 1. 检查依赖
npm list jest @prisma/client

# 2. 生成 Prisma
npx prisma generate

# 3. 运行单个简单测试
npm test -- user.model.spec.ts --testNamePattern="应该成功创建用户 - 基本信息"

# 4. 查看结果
# 应该看到：✓ 应该成功创建用户 - 基本信息
```

---

**准备就绪！** 🎉

现在可以开始运行测试了。如有问题，请查看常见问题部分或联系开发团队。

**最后更新**: 2026-03-18
