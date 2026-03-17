# 🚨 数据库初始化问题根因分析

## 问题现象

所有 Controller 测试失败，错误信息:
```
[DB] 创建索引失败：CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id) 
no such table: main.points_ledger
```

## 根本原因

**数据库连接不一致问题**

### 当前架构

```
server.js
├── initDatabase() → database.js
│   └── 创建表结构 (users, textbooks, student_profiles, etc.)
│       └── 使用 db 实例 (单例)
│
└── createOptimizedIndexes(db) → optimized-queries.js
    └── 创建索引 (idx_points_ledger_user, etc.)
        └── 使用 dbPool 实例 (独立的连接池)
```

### 问题

1. `database.js` 中的 `db` 是一个单例
2. `optimized-queries.js` 中的 `dbPool` 是另一个独立的数据库连接
3. `initDatabase()` 在 `db` 上创建表
4. `createOptimizedIndexes()` 在 `dbPool` 的连接上创建索引
5. **结果**: 表在 db 中存在，但在 dbPool 的连接中不存在!

### 代码证据

**database.js (第 8-15 行)**:
```javascript
let db = null;  // 单例

function initDatabase() {
  if (!db) {
    db = new Database(dbPath);  // 创建单例
  }
  // 创建表...
  db.exec(`CREATE TABLE IF NOT EXISTS users...`);
}
```

**optimized-queries.js (第 20-35 行)**:
```javascript
function getOptimizedDb() {
  const db = new Database(dbPath);  // 每次都创建新连接!
  // ...
  return db;
}

// dbPool 实际上是一个工厂函数
const dbPool = {
  getConnection: () => getOptimizedDb()  // 返回新连接
};
```

## 解决方案

### 方案 1: 统一数据库连接 (推荐) ⭐

修改 `optimized-queries.js` 使用 `database.js` 的单例:

```javascript
// optimized-queries.js
const { db } = require('../config/database');  // 使用单例

// 替换 dbPool.getConnection()
function getDb() {
  return db;  // 直接返回单例
}

// 修改 createOptimizedIndexes
function createOptimizedIndexes() {
  const db = getDb();  // 使用单例
  // ...
}
```

### 方案 2: 确保初始化顺序

在 `server.js` 中确保表创建后再创建索引:

```javascript
// server.js

// 1. 初始化数据库 (创建表)
initDatabase();

// 2. 等待表创建完成 (SQLite 是同步的，所以不需要 await)
// 3. 创建索引
const db = dbPool.getConnection();
createOptimizedIndexes(db);
```

但这还不够，因为 `dbPool.getConnection()` 创建的是新连接!

### 方案 3: 修复 dbPool (最佳) ⭐⭐⭐

修改 `optimized-queries.js` 使其使用单例:

```javascript
// optimized-queries.js

// 导入单例
const { db: dbInstance } = require('../config/database');

// 修改 dbPool
const dbPool = {
  getConnection: () => {
    if (!dbInstance) {
      throw new Error('数据库未初始化');
    }
    return dbInstance;
  }
};

// 修改 createOptimizedIndexes
function createOptimizedIndexes(db = null) {
  const connection = db || dbPool.getConnection();
  // ...
}
```

## 推荐实施步骤

### 步骤 1: 修复 optimized-queries.js (5 分钟)

```javascript
// 在文件顶部添加
const { db: mainDb } = require('../config/database');

// 修改 getOptimizedDb
function getOptimizedDb() {
  if (mainDb) {
    return mainDb;  // 使用单例
  }
  // Fallback: 创建新连接 (仅在测试等特殊情况)
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/sqlite.db');
  return new Database(dbPath);
}
```

### 步骤 2: 修复测试 setup (5 分钟)

确保测试时数据库正确初始化:

```javascript
// tests/test-utils.js 或单独的 test-setup.js

beforeAll(async () => {
  // 1. 初始化数据库
  const { initDatabase, db } = require('../src/config/database');
  initDatabase();
  
  // 2. 验证表已创建
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('已创建的表:', tableCheck.map(t => t.name));
  
  // 3. 创建索引 (现在会在同一个 db 实例上执行)
  const { createOptimizedIndexes } = require('../src/database/optimized-queries');
  createOptimizedIndexes(db);
});
```

### 步骤 3: 运行测试验证 (5 分钟)

```bash
cd backend
npm test -- authController-enhanced.test.js --testNamePattern="应该成功发送登录验证码"
```

预期结果：测试通过 ✅

## 额外问题

### Prometheus 监控服务

测试时不需要启动 Prometheus 服务器，应该 Mock:

```javascript
// jest.setup.js 中已存在 Mock，但可能不完整
jest.mock('./src/modules/monitoring/PrometheusExporter', () => ({
  init: jest.fn(),
  startServer: jest.fn(),
  getInstance: jest.fn()
}));
```

### 课本解析模块

`pdf-parse` 模块在测试时会加载原生模块，应该 Mock:

```javascript
// jest.setup.js
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({
    numpages: 10,
    text: 'Mock PDF text'
  });
});
```

## 总结

**核心问题**: 数据库连接不一致，表在一个连接中创建，索引在另一个连接中创建

**解决方案**: 统一使用 `database.js` 的单例 `db` 对象

**预计修复时间**: 15-20 分钟

**修复后预期**: 80%+ 测试通过，覆盖率可达 60-70%

---

**分析人**: QA Sub-Agent  
**时间**: 2026-03-17 20:30  
**状态**: 🔍 已完成根因分析，等待修复实施
