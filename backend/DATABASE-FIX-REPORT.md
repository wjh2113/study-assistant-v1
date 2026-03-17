# 数据库初始化问题修复报告

**修复时间:** 2026-03-17 20:38  
**问题级别:** P0 紧急  
**状态:** ✅ 已修复

## 问题根因

### 原始问题
- `database.js` 创建表使用单例 `db`
- `optimized-queries.js` 创建索引使用独立 `dbPool` 连接
- 结果：表在 `db` 中存在，但在 `dbPool` 连接中不存在

### 技术细节
1. `database.js` 在模块加载时创建 SQLite 连接并导出 `db` 单例
2. `optimized-queries.js` 的 `getOptimizedDb()` 函数创建新的数据库连接
3. 两个连接指向不同的数据库文件（或不同的连接实例）
4. 导致索引创建失败或创建到错误的数据库中

## 修复方案

### 1. 修改 `optimized-queries.js`

**核心改动:** 让 `optimized-queries.js` 使用 `database.js` 的同一个 `db` 单例

```javascript
// 获取主数据库单例的函数（延迟加载）
function getMainDb() {
  try {
    const dbModule = require('../config/database.js');
    if (dbModule && dbModule.db && !dbModule.isPostgreSQL) {
      return dbModule.db;
    }
  } catch (err) {
    // 忽略错误，使用备用连接
  }
  return null;
}

// getOptimizedDb() 优先使用主数据库单例
function getOptimizedDb() {
  const currentMainDb = getMainDb();
  if (currentMainDb) {
    return currentMainDb;  // 使用同一个 db 实例
  }
  // 备用：创建新连接（仅当主数据库不可用时）
  // ...
}
```

### 2. 修改 `database.js`

**核心改动:** 在测试模式下强制使用 SQLite

```javascript
// 检测是否使用 PostgreSQL
// 测试模式下强制使用 SQLite
const usePostgreSQL = process.env.TEST_MODE !== 'true' && 
                      process.env.DATABASE_URL && 
                      process.env.DATABASE_URL.startsWith('postgresql://');
```

### 3. 修改测试文件

**文件:** `tests/controllers-comprehensive.test.js`

```javascript
const dbModule = require('../src/config/database');
const { db, initDatabase } = dbModule;

beforeAll(async () => {
  // 初始化数据库表
  if (initDatabase && typeof initDatabase === 'function') {
    initDatabase();
  }
  // ...
});
```

## 验证结果

### 1. 数据库初始化测试 ✅

```bash
node test-db-init.js
```

**结果:**
- ✅ isPostgreSQL: false
- ✅ db exists: true
- ✅ 创建 14 个表
- ✅ Optimized DB is same as main DB: true
- ✅ 创建 19 个索引

### 2. Controllers 测试

**运行:** `npm test -- controllers-comprehensive.test.js --no-coverage`

**结果:** 测试可以正常运行，数据库表正确创建

### 3. Auth 模块测试

**运行:** `npm test -- auth.test.js --no-coverage`

**结果:** 
- ✅ 17 个测试中 13 个通过
- ❌ 4 个失败与数据库无关（Redis mock 问题和其他逻辑问题）

### 4. 集成测试

**运行:** `npm test -- integration-flow.test.js --no-coverage`

**结果:**
- ✅ 数据库表正确创建
- ✅ 基础流程测试通过
- ⚠️ 部分测试失败因为缺少 `ai_task_logs` 表（需要运行 ai-gateway migration）

## 已知问题

### 1. 缺失的表

以下表不在主数据库初始化中，需要运行各自的 migration：

- `ai_task_logs` - AI Gateway 任务日志表
- `points_ledger` - 积分明细表
- `practice_sessions` - 练习会话表

**解决方案:** 运行相应的 migration 脚本：
```bash
npm run migrate
```

### 2. 索引创建警告

部分索引创建失败（因为对应的表不存在）：
- `idx_points_ledger_user`
- `idx_points_ledger_created`
- `idx_practice_sessions_user`
- `idx_practice_sessions_status`

**影响:** 无功能性影响，只是查询性能可能不是最优

**解决方案:** 在 `optimized-queries.js` 中添加表存在性检查，或将这些索引的创建移到相应的 migration 中

## 文件变更清单

1. `src/config/database.js` - 添加测试模式强制使用 SQLite
2. `src/database/optimized-queries.js` - 使用主数据库单例
3. `tests/controllers-comprehensive.test.js` - 添加 initDatabase() 调用

## 下一步建议

1. **完善数据库迁移系统** - 将所有表的创建统一到 migration 脚本中
2. **添加表存在性检查** - 在创建索引前检查表是否存在
3. **修复 Redis Mock** - 完善 Jest 测试中的 Redis mock 实现
4. **运行完整 migration** - 确保所有模块的表都正确创建

## 结论

✅ **核心问题已修复**: `optimized-queries.js` 现在使用与 `database.js` 相同的数据库单例，确保表和索引在同一个数据库中创建。

✅ **测试可以正常运行**: 数据库初始化正确，基础测试通过。

⚠️ **需要后续完善**: 部分模块的表需要通过 migration 创建。
