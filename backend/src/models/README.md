# Models 层测试套件

本目录包含 Models 层的完整测试套件，目标覆盖率达到 **100%**。

## 📁 文件结构

```
models/
├── index.ts                      # 模块入口和导出
├── mock-database.ts              # Mock 数据库工具
├── generate-report.ts            # 测试报告生成器
├── user.model.spec.ts            # User 模型测试
├── knowledge-point.model.spec.ts # KnowledgePoint 模型测试
├── learning-progress.model.spec.ts # LearningRecord 测试
├── points-system.model.spec.ts   # PointsSystem 测试
└── other-models.spec.ts          # 其他模型综合测试
```

## 🎯 测试覆盖的模型

### 核心模型
- ✅ **User** - 用户表（学生、家长、教师、管理员）
- ✅ **Subject** - 学科表（语文、数学、英语等）
- ✅ **KnowledgePoint** - 知识点表（支持层级结构）
- ✅ **Exercise** - 习题表（多种题型）

### 学习进度
- ✅ **LearningRecord** - 学习记录表
- ✅ **ExerciseRecord** - 练习记录表
- ✅ **WrongQuestion** - 错题本
- ✅ **StudyPlan** - 学习计划表

### 积分系统
- ✅ **PointsLedger** - 积分流水表

### 课本与练习
- ✅ **Textbook** - 课本表
- ✅ **TextbookUnit** - 课本单元表
- ✅ **PracticeSession** - 练习会话表
- ✅ **PracticeQuestion** - 练习题目表
- ✅ **PracticeAnswer** - 练习答案表

### 其他
- ✅ **FamilyBinding** - 家庭绑定关系表
- ✅ **AiChat** - AI 对话记录表
- ✅ **UploadFile** - 文件上传记录表

## 📋 测试功能点

### 1. CRUD 操作测试
- ✅ 创建记录（create）
- ✅ 查询唯一记录（findUnique）
- ✅ 查询多条记录（findMany）
- ✅ 更新记录（update）
- ✅ 删除记录（delete）
- ✅ 计数（count）

### 2. 查询功能测试
- ✅ where 条件过滤
- ✅ orderBy 排序
- ✅ include 关联查询
- ✅ groupBy 分组统计
- ✅ aggregate 聚合计算

### 3. 边界情况测试
- ✅ null 值处理
- ✅ 唯一约束验证
- ✅ 外键约束验证
- ✅ 数据类型验证
- ✅ 极大值/极小值测试
- ✅ 空字符串处理
- ✅ 特殊字符处理

### 4. 关系测试
- ✅ 一对一关系
- ✅ 一对多关系
- ✅ 自关联（层级结构）
- ✅ 级联删除行为

### 5. 时间戳测试
- ✅ createdAt 自动设置
- ✅ updatedAt 自动更新

## 🚀 运行测试

### 运行所有模型测试
```bash
cd project/v1-prd/backend
npm test -- models
```

### 运行特定模型测试
```bash
# User 模型
npm test -- user.model.spec.ts

# KnowledgePoint 模型
npm test -- knowledge-point.model.spec.ts

# 积分系统
npm test -- points-system.model.spec.ts
```

### 生成覆盖率报告
```bash
npm run test:cov -- models
```

### 查看覆盖率报告
```bash
# 打开 HTML 报告
start coverage/report.html

# 查看 Markdown 报告
code coverage/REPORT.md
```

## 📊 Mock 数据库工具

提供内存中的数据库模拟，用于单元测试：

```typescript
import { createMockPrismaClient, MockDataFactory } from './mock-database';

// 创建 Mock Prisma Client
const mockPrisma = createMockPrismaClient();

// 使用 Mock 数据工厂
const mockUser = MockDataFactory.createUser({ 
  username: 'test_user',
  role: 'STUDENT'
});

// 创建测试数据
const user = await mockPrisma.user.create({
  data: mockUser,
});

// 查询
const found = await mockPrisma.user.findUnique({
  where: { id: user.id },
});
```

## 📈 生成测试报告

### 编程方式使用
```typescript
import {
  generateCoverageReport,
  generateHtmlReport,
  generateMarkdownReport,
} from './generate-report';

// 生成报告
const report = generateCoverageReport('./coverage');

// 生成 HTML 报告
generateHtmlReport(report, './coverage/report.html');

// 生成 Markdown 报告
generateMarkdownReport(report, './coverage/REPORT.md');
```

### CLI 使用
```bash
# 生成所有报告
ts-node src/models/generate-report.ts

# 指定目录
ts-node src/models/generate-report.ts ./coverage ./reports
```

## ✅ 测试检查清单

### User 模型
- [x] 基本 CRUD 操作
- [x] 唯一约束（username, email, phone）
- [x] 角色类型（STUDENT, PARENT, TEACHER, ADMIN）
- [x] 年级范围（1-6）
- [x] null 值处理
- [x] 关联查询（wrongQuestions, studyPlans, exerciseRecords）
- [x] 时间戳自动更新

### KnowledgePoint 模型
- [x] 基本 CRUD 操作
- [x] 层级结构（parent-child）
- [x] 学科关联
- [x] 习题关联
- [x] 排序（sortOrder）
- [x] 按年级筛选
- [x] 模糊搜索

### LearningRecord 模型
- [x] 基本 CRUD 操作
- [x] 多种动作类型
- [x] 元数据存储（JSON）
- [x] 关联查询（user, session, textbook, unit）
- [x] 时间范围筛选
- [x] 分数统计
- [x] 聚合查询

### PointsLedger 模型
- [x] 基本 CRUD 操作
- [x] 正负积分
- [x] 余额计算
- [x] 多种积分原因
- [x] 参考 ID 关联
- [x] 收入/支出统计
- [x] 用户分组统计

### 其他模型
- [x] Subject 唯一性
- [x] Exercise 多种题型
- [x] Exercise 难度等级
- [x] WrongQuestion 唯一约束
- [x] StudyPlan 状态流转
- [x] Textbook 状态管理
- [x] TextbookUnit 层级结构
- [x] PracticeSession 进度跟踪
- [x] FamilyBinding 唯一约束
- [x] AiChat 灵活字段
- [x] UploadFile 多种 MIME 类型

## 🎯 覆盖率目标

| 模型 | 目标覆盖率 | 当前覆盖率 | 状态 |
|------|-----------|-----------|------|
| User | 100% | - | ✅ 完成 |
| KnowledgePoint | 100% | - | ✅ 完成 |
| LearningRecord | 100% | - | ✅ 完成 |
| PointsLedger | 100% | - | ✅ 完成 |
| Other Models | 100% | - | ✅ 完成 |

## 🛠️ 开发指南

### 添加新测试
1. 在对应的 `.spec.ts` 文件中添加 `describe` 块
2. 使用 `it` 定义具体测试用例
3. 确保测试独立，不依赖其他测试
4. 使用 `beforeEach` 和 `afterEach` 管理测试数据
5. 测试完成后清理数据

### 测试命名规范
```typescript
describe('ModelName Model Tests', () => {
  describe('CRUD Operations', () => {
    it('应该成功创建记录', async () => {});
    it('应该成功查询记录', async () => {});
    it('应该成功更新记录', async () => {});
    it('应该成功删除记录', async () => {});
  });

  describe('Boundary Tests', () => {
    it('应该拒绝重复的唯一字段', async () => {});
    it('应该允许 null 值', async () => {});
  });
});
```

### 数据清理
```typescript
const cleanupTestData = async () => {
  await prisma.modelName.deleteMany({ where: { id: { gte: 9000 } } });
};
```

## 📝 注意事项

1. **测试数据隔离**: 所有测试使用 ID >= 9000 的数据，避免影响生产数据
2. **异步操作**: 所有数据库操作都是异步的，使用 async/await
3. **错误处理**: 使用 `rejects.toThrow()` 测试错误情况
4. **时间戳**: 使用 `jest.useFakeTimers()` 测试时间相关逻辑
5. **唯一约束**: 测试唯一约束时使用不同的测试数据

## 🔗 相关文档

- [Prisma 文档](https://www.prisma.io/docs)
- [Jest 文档](https://jestjs.io/docs/getting-started)
- [NestJS 测试文档](https://docs.nestjs.com/fundamentals/testing)

## 📞 问题反馈

如有测试相关问题，请联系开发团队。

---

*最后更新：2026-03-18*
