# ADR-001: 数据库 Schema 标准化

**状态**: 提议  
**日期**: 2026-03-15  
**决策人**: 架构师  
**影响范围**: 后端、数据库

---

## 背景

当前项目存在数据库 Schema 不一致问题:
- PRD 设计使用 MySQL 8.0
- Prisma Schema 配置为 SQLite
- 缺少 PRD 中定义的关键字段
- 枚举类型使用 String 而非 Prisma Enum

这导致:
1. 开发环境与生产环境不一致
2. 数据迁移困难
3. 类型安全性降低
4. 无法利用 MySQL 特性

---

## 决策

### 1. 统一数据库为 MySQL 8.0

**Prisma Schema 修改**:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

DATABASE_URL="mysql://user:password@localhost:3306/study_assistant"
```

### 2. 使用 Prisma Enum

**修改前**:
```prisma
model User {
  role String @default("STUDENT")
}
```

**修改后**:
```prisma
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

### 3. 补充缺失字段

**users 表**:
```prisma
model User {
  // ... 现有字段
  status       UserStatus @default(ACTIVE)
  lastLoginAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  @@index([role])
  @@index([status])
  @@index([lastLoginAt])
}

enum UserStatus {
  ACTIVE
  DISABLED
  PENDING_VERIFICATION
}
```

**textbooks 表**:
```prisma
model Textbook {
  // ... 现有字段
  parseStatus  ParseStatus @default(PENDING)
  parseResult  Json?
  pageCount    Int         @default(0)
  unitCount    Int         @default(0)
  
  @@index([parseStatus])
  @@index([userId, subject, grade])
}

enum ParseStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
}
```

**practice_sessions 表**:
```prisma
model PracticeSession {
  // ... 现有字段
  practiceMode  PracticeMode @default(AI_GENERATED)
  pointsEarned  Int          @default(0)
  
  @@index([userId, status])
  @@index([userId, createdAt])
}

enum PracticeMode {
  AI_GENERATED
  MANUAL
  WEAKNESS
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  ABANDONED
}
```

### 4. 增加审计字段

```prisma
model User {
  // ...
  createdBy Int?
  updatedBy Int?
  deletedAt DateTime? // 软删除
  
  @@index([deletedAt])
}
```

### 5. 数据库迁移策略

```bash
# 1. 备份现有数据
npx prisma db pull --schema=prisma/sqlite.schema.prisma
cp dev.db dev.sqlite.backup

# 2. 更新 Schema 为 MySQL
# 编辑 prisma/schema.prisma

# 3. 生成迁移
npx prisma migrate dev --name standardize_schema

# 4. 应用迁移到生产
npx prisma migrate deploy
```

---

## 方案对比

### 方案 A: 保持 SQLite（不推荐）

**优点**:
- 无需配置 MySQL
- 开发简单

**缺点**:
- 生产环境不匹配
- 性能差
- 不支持并发
- 无备份机制

### 方案 B: 统一 MySQL（推荐）✅

**优点**:
- 环境一致
- 性能好
- 支持并发
- 生态完善

**缺点**:
- 需要配置 MySQL
- 迁移成本

### 方案 C: 开发 SQLite，生产 MySQL（不推荐）

**优点**:
- 开发简单

**缺点**:
- 环境不一致
- 迁移风险高
- 可能遗漏 MySQL 特性

---

## 实施计划

### 阶段 1: Schema 标准化（2 天）
- [ ] 更新 Prisma Schema
- [ ] 定义所有 Enum
- [ ] 补充缺失字段
- [ ] 添加索引

### 阶段 2: 本地验证（1 天）
- [ ] Docker 启动 MySQL
- [ ] 运行迁移
- [ ] 验证数据类型
- [ ] 运行测试

### 阶段 3: 生产迁移（1 天）
- [ ] 备份现有数据
- [ ] 执行迁移
- [ ] 验证数据完整性
- [ ] 回滚方案准备

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据迁移丢失 | 高 | 完整备份 + 验证脚本 |
| 迁移失败 | 高 | 回滚方案 + 分步执行 |
| 性能下降 | 中 | 索引优化 + 查询分析 |
| 应用不兼容 | 中 | 全面测试 |

---

## 验收标准

- [ ] Prisma Schema 使用 MySQL provider
- [ ] 所有枚举类型使用 Prisma Enum
- [ ] 补充 PRD 中定义的所有字段
- [ ] 关键表有适当索引
- [ ] 迁移脚本可重复执行
- [ ] 测试覆盖率 > 80%

---

## 参考

- PRD 文档：`docs/PRD_v1.1.md` 第 10 章
- Prisma 文档：https://www.prisma.io/docs/
- MySQL 8.0 文档：https://dev.mysql.com/doc/

---

**批准人**: 俊哥  
**批准日期**: 待定  
**复审日期**: 2026-03-29
