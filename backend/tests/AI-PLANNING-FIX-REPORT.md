# AI Planning 测试修复报告

**修复日期:** 2026-03-17  
**修复人:** 算法 Sub-Agent  
**任务:** 【P0 紧急】修复 ai-planning 剩余 5 个失败测试  

---

## 📊 修复结果

| 指标 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| 通过测试数 | 12/17 | **17/17** | ✅ |
| 失败测试数 | 5/17 | **0/17** | ✅ |
| 测试通过率 | 70.6% | **100%** | ✅ |

---

## 🐛 问题分析与修复

### 失败测试清单（修复前）

1. ❌ `应该成功生成个性化学习计划` - `generatePersonalizedPlan` 返回 `success: false`
2. ❌ `应该根据用户画像调整学习风格` - `result.plan.learningStyle` 为 `undefined`
3. ❌ `应该生成每日学习任务` - 缺少 `user_preferences` 表
4. ❌ `应该生成完整的执行跟踪报告` - 缺少 `learning_plan_snapshots` 表
5. ❌ `应该完整执行计划生成到跟踪的流程` - `generatePersonalizedPlan` 返回 `success: false`

---

### 修复 1: 可行性评估算法过于严格

**问题:** `PersonalizedPlanningAlgorithm.evaluateFeasibility()` 只考虑用户历史练习量，未考虑用户每日时间限制 (`preferences.dailyTimeLimit`)，导致合理的目标被误判为不可行。

**修复:** 
- 修改 `evaluateFeasibility()` 方法签名，增加 `preferences` 参数
- 引入基于时间的容量计算：`timeBasedCapacity = dailyTimeLimit / 5`（假设每练习 5 分钟）
- 使用历史容量和时间容量的较大值作为有效容量

**文件:** `src/modules/ai-planning/PersonalizedPlanningAlgorithm.js`

```javascript
// 修复前
static evaluateFeasibility(goals, userProfile, timeframe) {
  const adjustedUserCapacity = userAvgDailyPractice * completionFactor;
  // 只使用历史容量...
}

// 修复后
static evaluateFeasibility(goals, userProfile, timeframe, preferences = {}) {
  const adjustedUserCapacity = userAvgDailyPractice * completionFactor;
  
  // 考虑用户每日时间限制
  const dailyTimeLimit = preferences.dailyTimeLimit || 60;
  const timeBasedCapacity = Math.floor(dailyTimeLimit / 5);
  
  // 使用较大值
  const effectiveCapacity = Math.max(adjustedUserCapacity, timeBasedCapacity);
  // ...
}
```

---

### 修复 2: 测试数据库缺少必要表

**问题:** 测试的 `beforeEach` 中未创建 `user_preferences` 和 `learning_plan_snapshots` 表，导致查询失败。

**修复:** 在测试初始化时创建这两个表

**文件:** `tests/ai-planning.test.js`

```javascript
// 创建 user_preferences 表
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    daily_time_limit INTEGER DEFAULT 60,
    preferred_study_time TEXT,
    learning_style TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// 创建 learning_plan_snapshots 表
db.exec(`
  CREATE TABLE IF NOT EXISTS learning_plan_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    completion_rate REAL,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    quality_score REAL,
    recorded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (plan_id) REFERENCES learning_plans(id)
  )
`);
```

---

### 修复 3: learning_plans 表缺少列

**问题:** `AIPlanningService.savePlan()` 使用了 `weekly_goals`, `schedule`, `milestones` 列，但数据库表定义中没有这些列。

**修复:** 更新数据库表定义

**文件:** `src/config/database.js`

```sql
CREATE TABLE IF NOT EXISTS learning_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  timeframe TEXT,
  goals TEXT,
  weekly_goals TEXT,      -- 新增
  schedule TEXT,          -- 新增
  milestones TEXT,        -- 新增
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

---

### 修复 4: KnowledgeMasteryModel 查询错误列名

**问题:** `KnowledgeMasteryModel.getWeakPoints()` 查询了不存在的 `mastery_score` 列，应该使用 `mastery_level`。

**修复:** 修正查询语句，使用正确的列名并返回标准格式

**文件:** `src/modules/weakness-analysis/KnowledgeMasteryModel.js`

```javascript
// 修复前
SELECT * FROM knowledge_mastery
WHERE user_id = ?
  AND mastery_score >= ?
  AND mastery_score <= ?
ORDER BY mastery_score ASC

// 修复后
SELECT 
  km.knowledge_point_id as knowledgePointId,
  km.mastery_level as masteryLevel,
  km.review_count as reviewCount,
  kp.title as knowledgePointName,
  kp.category as subject
FROM knowledge_mastery km
LEFT JOIN knowledge_points kp ON km.knowledge_point_id = kp.id
WHERE km.user_id = ?
  AND km.mastery_level >= ?
  AND km.mastery_level <= ?
ORDER BY km.mastery_level ASC
```

---

## ✅ 测试验证

运行命令:
```bash
cd backend
npm test -- ai-planning.test.js
```

测试结果:
```
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Snapshots:   0 total
```

### 通过的测试用例

#### PersonalizedPlanningAlgorithm (7 个)
- ✅ 应该成功生成个性化学习计划
- ✅ 当目标过于激进时应该返回不可行
- ✅ 应该根据用户画像调整学习风格
- ✅ 应该正确评估目标可行性
- ✅ 当每日练习量超出用户能力时应该标记为不可行
- ✅ 应该正确计算优先级权重
- ✅ 应该构建完整的用户画像

#### DynamicTaskGenerator (4 个)
- ✅ 应该生成每日学习任务
- ✅ 应该根据用户状态调整任务量
- ✅ 应该基于遗忘曲线获取需要复习的知识点
- ✅ 应该更新任务状态并记录完成时间

#### PlanExecutionTracker (5 个)
- ✅ 应该生成完整的执行跟踪报告
- ✅ 应该检测进度落后风险
- ✅ 当没有风险时应该返回空风险列表
- ✅ 应该根据风险生成对应的建议
- ✅ 应该获取每日进度数据

#### AIPlanningService Integration (1 个)
- ✅ 应该完整执行计划生成到跟踪的流程

---

## 📝 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/modules/ai-planning/PersonalizedPlanningAlgorithm.js` | 修改 | 修复可行性评估算法 |
| `src/config/database.js` | 修改 | 添加 learning_plans 表缺失列 |
| `src/modules/weakness-analysis/KnowledgeMasteryModel.js` | 修改 | 修复查询列名错误 |
| `tests/ai-planning.test.js` | 修改 | 添加测试表初始化 |

---

## 🎯 结论

所有 5 个失败测试已全部修复，17 个测试用例全部通过。修复主要集中在：

1. **算法逻辑优化** - 可行性评估考虑用户时间限制
2. **数据库表结构完善** - 补充缺失的表和列
3. **查询语句修正** - 使用正确的列名

开发环境测试已完成，可以进入下一阶段。

---

**报告生成时间:** 2026-03-17 19:30 GMT+8
