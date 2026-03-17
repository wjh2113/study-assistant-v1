# AI 学习规划服务 API 文档

**版本**: v1.0  
**创建时间**: 2026-03-17  
**模块**: AI Phase 4 - 学习规划服务

---

## 📋 目录

1. [概述](#概述)
2. [核心功能](#核心功能)
3. [API 接口](#api-接口)
4. [数据模型](#数据模型)
5. [使用示例](#使用示例)
6. [错误码](#错误码)

---

## 概述

AI 学习规划服务提供个性化的学习计划生成、动态任务调整和执行跟踪功能。

### 核心特性

- ✅ **个性化规划算法** - 基于用户画像、学习风格、历史表现
- ✅ **动态任务生成** - 根据遗忘曲线、薄弱点、实时状态调整
- ✅ **执行跟踪** - 实时监控进度、质量检测、风险预警
- ✅ **智能推荐** - 基于执行情况提供调整建议

### 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                  AI Planning Service                     │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │ PersonalizedPlan   │  │ DynamicTaskGen     │        │
│  │ - 用户画像分析     │  │ - 遗忘曲线复习     │        │
│  │ - 学习风格识别     │  │ - 薄弱点补救       │        │
│  │ - 可行性评估       │  │ - 任务优先级调整   │        │
│  │ - 学习路径生成     │  │ - 精力状态适配     │        │
│  └────────────────────┘  └────────────────────┘        │
│  ┌────────────────────┐                                │
│  │ PlanExecutionTrack │                                │
│  │ - 进度跟踪         │                                │
│  │ - 质量检测         │                                │
│  │ - 风险预警         │                                │
│  │ - 调整建议         │                                │
│  └────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

---

## 核心功能

### 1. 个性化学习规划算法

#### 功能说明
基于用户历史数据、学习风格、目标难度生成个性化学习计划。

#### 核心流程
1. **用户画像构建** - 分析历史练习数据、学习习惯、计划完成率
2. **学习风格识别** - 视觉型/听觉型/动觉型/读写型
3. **可行性评估** - 判断目标是否合理，提供调整建议
4. **优先级计算** - 考虑差距、优先级、紧急度、基础薄弱度
5. **学习路径生成** - 分阶段、分批次安排知识点
6. **时间资源分配** - 根据用户可用时间和偏好分配
7. **每日计划生成** - 细化到每日任务
8. **检查点设置** - 周回顾、阶段性测试、最终评估

#### 输出内容
```json
{
  "userId": 123,
  "subject": "math",
  "timeframe": { "totalDays": 30 },
  "learningStyle": "visual",
  "learningPath": [
    {
      "stage": 1,
      "goals": [...],
      "estimatedDuration": 6
    }
  ],
  "dailySchedule": [...],
  "checkpoints": [...],
  "estimatedCompletionRate": 0.85,
  "confidenceScore": 78
}
```

---

### 2. 动态任务生成

#### 功能说明
根据用户当前状态、遗忘曲线、薄弱点动态生成每日学习任务。

#### 任务类型
- **new_learning** - 新知识点学习
- **practice** - 练习巩固
- **review** - 复习（基于遗忘曲线）
- **assessment** - 测试评估
- **remedial** - 补救学习（薄弱点）

#### 优先级规则
1. **URGENT (1)** - 薄弱点补救（掌握度 < 40%）
2. **HIGH (2)** - 到期复习（基于遗忘曲线）
3. **MEDIUM (3)** - 新学习任务
4. **LOW (4)** - 扩展练习

#### 遗忘曲线复习间隔
```javascript
const reviewIntervals = [1, 2, 4, 7, 15, 30]; // 天
```

#### 动态调整
- **精力状态** - 疲劳时减少 40% 任务量
- **时间约束** - 超出可用时间时按优先级裁剪
- **学习势头** - 高势头时适当增加挑战

---

### 3. 规划执行跟踪

#### 功能说明
实时跟踪计划执行情况，提供进度、质量、风险全方位监控。

#### 跟踪指标

**进度指标**
- 完成率 (completionRate)
- 时间效率 (timeEfficiency)
- 活跃率 (activeRate)
- 学习速度 (velocity)
- 预计完成日期

**质量指标**
- 平均得分 (avgScore)
- 准确率趋势 (accuracyTrend)
- 掌握度提升 (masteryImprovement)
- 一致性得分 (consistencyScore)
- 连续学习天数 (streakDays)
- 参与度等级 (engagementLevel)

**风险检测**
- 进度落后 (>20% 为高风险)
- 质量下降
- 参与度低
- 连续中断
- 时间效率低

#### 风险等级
- **low** - 无风险或轻微风险
- **medium** - 需要关注
- **high** - 需要干预
- **critical** - 严重风险，计划可能失败

#### 调整建议类型
- **schedule_adjustment** - 调整学习计划
- **quality_improvement** - 提升学习质量
- **engagement_boost** - 提升学习动力
- **habit_rebuild** - 重建学习习惯
- **time_optimization** - 优化时间分配

---

## API 接口

### 基础信息

**Base URL**: `/api/ai/planning`  
**认证**: 所有接口需要 JWT Token  
**Content-Type**: `application/json`

---

### 1. 生成个性化学习计划

```http
POST /api/ai/planning/generate
```

#### 请求参数

**Body**:
```json
{
  "subject": "math",
  "timeframe": {
    "totalDays": 30,
    "startDate": "2026-03-17",
    "endDate": "2026-04-16"
  },
  "goals": [
    {
      "knowledgePointId": "kp_001",
      "knowledgePointName": "一元二次方程",
      "currentMastery": 30,
      "targetMastery": 80,
      "priority": "high",
      "difficulty": "medium",
      "deadline": "2026-03-25"
    }
  ],
  "preferences": {
    "dailyTimeLimit": 60,
    "includeWeekend": true,
    "learningStyle": "visual"
  }
}
```

#### 响应示例

**成功**:
```json
{
  "success": true,
  "planId": 123,
  "plan": {
    "userId": 123,
    "subject": "math",
    "timeframe": { "totalDays": 30 },
    "userProfile": {
      "totalPractices": 150,
      "avgAccuracy": 72.5,
      "activeDays": 20,
      "avgDailyPractice": 8,
      "consistencyScore": 75
    },
    "learningStyle": "visual",
    "learningPath": [...],
    "dailySchedule": [...],
    "checkpoints": [...],
    "estimatedCompletionRate": 0.85,
    "confidenceScore": 78
  },
  "message": "学习计划生成成功"
}
```

**目标不可行**:
```json
{
  "success": false,
  "reason": "目标过于激进，超出用户能力范围",
  "suggestion": "建议将时间延长至 45 天，或减少目标知识点数量",
  "adjustedPlan": {
    "suggestedTimeframe": { "totalDays": 45 },
    "reducedGoals": [...]
  }
}
```

---

### 2. 获取用户学习画像

```http
GET /api/ai/planning/user-profile?subject=math
```

#### 响应示例

```json
{
  "success": true,
  "userProfile": {
    "totalPractices": 150,
    "avgAccuracy": 72.5,
    "activeDays": 20,
    "avgDailyPractice": 8,
    "avgSessionDuration": 25,
    "preferredStudyTime": "evening",
    "avgFocusDuration": 30,
    "consistencyScore": 75,
    "masteryDistribution": {
      "total": 50,
      "excellent": 10,
      "good": 15,
      "fair": 15,
      "needsImprovement": 10,
      "avgMastery": 65.5
    },
    "planCompletionRate": 80,
    "avgPlanProgress": 75
  },
  "learningStyle": "visual"
}
```

---

### 3. 获取每日任务

```http
GET /api/ai/planning/daily-tasks/:date?planId=123&subject=math
```

#### 路径参数
- `date` (required): 日期，格式 `YYYY-MM-DD`

#### 查询参数
- `planId` (optional): 计划 ID
- `subject` (optional): 科目

#### 响应示例

```json
{
  "success": true,
  "date": "2026-03-17",
  "tasks": [
    {
      "type": "remedial",
      "priority": 1,
      "knowledgePointId": "kp_001",
      "knowledgePointName": "一元二次方程",
      "title": "补救学习：一元二次方程",
      "estimatedTime": 38,
      "content": {
        "action": "remedial",
        "reason": "掌握度低于 40%",
        "currentMastery": 35
      },
      "status": "pending",
      "createdAt": "2026-03-17T08:00:00.000Z"
    },
    {
      "type": "review",
      "priority": 2,
      "knowledgePointId": "kp_002",
      "knowledgePointName": "因式分解",
      "title": "复习：因式分解",
      "estimatedTime": 20,
      "content": {
        "action": "review",
        "lastMastery": 65
      },
      "status": "pending",
      "createdAt": "2026-03-17T08:00:00.000Z"
    },
    {
      "type": "new_learning",
      "priority": 3,
      "knowledgePointId": "kp_003",
      "knowledgePointName": "函数概念",
      "title": "学习：函数概念",
      "estimatedTime": 25,
      "content": {
        "action": "learn",
        "materials": ["video", "text"]
      },
      "status": "pending",
      "createdAt": "2026-03-17T08:00:00.000Z"
    }
  ],
  "total": 3
}
```

---

### 4. 更新任务状态

```http
PUT /api/ai/planning/tasks/:taskId/status
```

#### 路径参数
- `taskId` (required): 任务 ID

#### 请求参数

**Body**:
```json
{
  "status": "completed",
  "score": 85,
  "actualTime": 30,
  "feedback": {
    "difficulty": "medium",
    "understanding": "good"
  }
}
```

**status 可选值**:
- `pending` - 待完成
- `in_progress` - 进行中
- `completed` - 已完成
- `skipped` - 已跳过
- `failed` - 失败

#### 响应示例

```json
{
  "success": true,
  "message": "任务状态更新成功"
}
```

---

### 5. 获取任务统计

```http
GET /api/ai/planning/tasks/statistics?startDate=2026-03-01&endDate=2026-03-31&planId=123
```

#### 查询参数
- `startDate` (optional): 开始日期，默认 7 天前
- `endDate` (optional): 结束日期，默认今天
- `planId` (optional): 计划 ID

#### 响应示例

```json
{
  "success": true,
  "stats": [
    {
      "task_type": "new_learning",
      "total": 10,
      "completed": 8,
      "pending": 2,
      "avg_actual_time": 28.5
    },
    {
      "task_type": "review",
      "total": 15,
      "completed": 12,
      "pending": 3,
      "avg_actual_time": 22.0
    }
  ],
  "dateRange": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}
```

---

### 6. 获取计划进度

```http
GET /api/ai/planning/:planId/progress
```

#### 路径参数
- `planId` (required): 计划 ID

#### 响应示例

```json
{
  "success": true,
  "progress": {
    "overall": {
      "totalTasks": 50,
      "completedTasks": 25,
      "pendingTasks": 25,
      "progress": 50.0
    },
    "daily": [
      {
        "date": "2026-03-17",
        "total_tasks": 5,
        "completed_tasks": 3,
        "avg_time": 25.5
      }
    ],
    "byKnowledgePoint": [
      {
        "knowledgePointId": "kp_001",
        "knowledgePointName": "一元二次方程",
        "totalTasks": 5,
        "completedTasks": 4,
        "completionRate": 80,
        "avgScore": 82
      }
    ]
  }
}
```

---

### 7. 跟踪计划执行

```http
GET /api/ai/planning/:planId/track
```

#### 路径参数
- `planId` (required): 计划 ID

#### 响应示例

```json
{
  "success": true,
  "report": {
    "planId": 123,
    "plan": {
      "id": 123,
      "userId": 123,
      "subject": "math",
      "startDate": "2026-03-17",
      "endDate": "2026-04-16",
      "status": "active"
    },
    "progress": {
      "completionRate": 50,
      "timeEfficiency": 95,
      "activeRate": 80,
      "remainingTasks": 25,
      "skippedTasks": 2,
      "velocity": 2.5,
      "estimatedCompletionDate": "2026-04-15"
    },
    "quality": {
      "avgScore": 78,
      "accuracyTrend": "stable",
      "masteryImprovement": 15,
      "consistencyScore": 70,
      "streakDays": 5,
      "engagementLevel": "medium"
    },
    "risks": {
      "risks": [
        {
          "type": "slightly_behind",
          "severity": "medium",
          "description": "进度稍落后 10%",
          "impact": "需要加快进度"
        }
      ],
      "overallRiskLevel": "medium",
      "requiresIntervention": false
    },
    "recommendations": [
      {
        "type": "schedule_adjustment",
        "priority": "medium",
        "title": "调整学习计划",
        "description": "建议减少每日任务量或延长计划时间",
        "actions": [
          "减少 20% 的每日任务",
          "增加周末学习时间",
          "优先完成高优先级任务"
        ]
      }
    ],
    "updatedAt": "2026-03-17T10:00:00.000Z"
  }
}
```

---

### 8. 获取计划执行报告

```http
GET /api/ai/planning/:planId/report
```

#### 路径参数
- `planId` (required): 计划 ID

#### 响应示例

```json
{
  "success": true,
  "report": {
    "planId": 123,
    "plan": {...},
    "progress": {...},
    "quality": {...},
    "risks": {...},
    "recommendations": {...},
    "dailyProgress": [...],
    "knowledgePointProgress": [...],
    "generatedAt": "2026-03-17T10:00:00.000Z"
  }
}
```

---

### 9. 获取推荐行动

```http
GET /api/ai/planning/:planId/recommendations
```

#### 路径参数
- `planId` (required): 计划 ID

#### 响应示例

```json
{
  "success": true,
  "recommendations": [
    {
      "type": "engagement_boost",
      "priority": "high",
      "title": "提升学习动力",
      "description": "需要外部激励和反馈",
      "actions": [
        "设置小目标和奖励",
        "加入学习小组",
        "寻求老师或家长监督"
      ]
    }
  ],
  "riskLevel": "high"
}
```

---

### 10. 调整学习计划

```http
POST /api/ai/planning/:planId/adjust
```

#### 路径参数
- `planId` (required): 计划 ID

#### 请求参数

**Body**:
```json
{
  "adjustmentType": "reduce_load",
  "reason": "进度落后，需要减轻负担",
  "changes": {}
}
```

**adjustmentType 可选值**:
- `reduce_load` - 减少任务量
- `extend_time` - 延长计划时间
- `reprioritize` - 重新调整优先级

#### 响应示例

```json
{
  "success": true,
  "adjustedPlan": {
    "dailyTaskReduction": 0.2,
    "message": "每日任务量减少 20%"
  },
  "currentStatus": {
    "progress": {
      "completionRate": 30,
      "timeEfficiency": 85
    },
    "risks": {
      "overallRiskLevel": "medium"
    }
  }
}
```

---

## 数据模型

### LearningPlan (学习计划)

```typescript
interface LearningPlan {
  id: number;
  userId: number;
  subject: string;
  timeframe: Timeframe;
  goals: LearningGoal[];
  weeklyGoals: WeeklyGoal[];
  schedule: DailySchedule[];
  milestones: Milestone[];
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}
```

### LearningGoal (学习目标)

```typescript
interface LearningGoal {
  knowledgePointId: string;
  knowledgePointName: string;
  currentMastery: number;      // 0-100
  targetMastery: number;       // 0-100
  priority: 'high' | 'medium' | 'low';
  difficulty?: 'easy' | 'medium' | 'hard';
  deadline?: string;
}
```

### DailySchedule (每日计划)

```typescript
interface DailySchedule {
  date: string;
  stage: number;
  type: 'study' | 'buffer';
  tasks: Task[];
  totalEstimatedTime: number;
  status: 'pending' | 'completed';
}
```

### Task (任务)

```typescript
interface Task {
  type: 'new_learning' | 'practice' | 'review' | 'assessment' | 'remedial';
  priority: number;  // 1-4
  knowledgePointId: string;
  knowledgePointName: string;
  title: string;
  estimatedTime: number;  // 分钟
  content: TaskContent;
  status: TaskStatus;
}
```

### UserProfile (用户画像)

```typescript
interface UserProfile {
  totalPractices: number;
  avgAccuracy: number;
  activeDays: number;
  avgDailyPractice: number;
  avgSessionDuration: number;
  preferredStudyTime: 'morning' | 'noon' | 'afternoon' | 'evening';
  avgFocusDuration: number;
  consistencyScore: number;
  masteryDistribution: MasteryDistribution;
  planCompletionRate: number;
  avgPlanProgress: number;
}
```

### ExecutionReport (执行报告)

```typescript
interface ExecutionReport {
  planId: number;
  progress: ProgressMetrics;
  quality: QualityMetrics;
  risks: RiskAnalysis;
  recommendations: Recommendation[];
}
```

---

## 使用示例

### JavaScript/Node.js

```javascript
// 生成学习计划
const generatePlan = async (userId, goals) => {
  const response = await fetch('/api/ai/planning/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subject: 'math',
      timeframe: {
        totalDays: 30,
        startDate: new Date().toISOString().split('T')[0]
      },
      goals,
      preferences: {
        dailyTimeLimit: 60,
        includeWeekend: true
      }
    })
  });

  const result = await response.json();
  return result;
};

// 获取每日任务
const getDailyTasks = async (date, planId) => {
  const response = await fetch(
    `/api/ai/planning/daily-tasks/${date}?planId=${planId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const result = await response.json();
  return result.tasks;
};

// 更新任务状态
const completeTask = async (taskId, score, actualTime) => {
  const response = await fetch(
    `/api/ai/planning/tasks/${taskId}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'completed',
        score,
        actualTime
      })
    }
  );
  
  return await response.json();
};

// 获取执行报告
const getExecutionReport = async (planId) => {
  const response = await fetch(
    `/api/ai/planning/${planId}/report`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  return await response.json();
};
```

### cURL

```bash
# 生成学习计划
curl -X POST http://localhost:3000/api/ai/planning/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "math",
    "timeframe": { "totalDays": 30 },
    "goals": [
      {
        "knowledgePointId": "kp_001",
        "knowledgePointName": "一元二次方程",
        "currentMastery": 30,
        "targetMastery": 80,
        "priority": "high"
      }
    ],
    "preferences": { "dailyTimeLimit": 60 }
  }'

# 获取每日任务
curl http://localhost:3000/api/ai/planning/daily-tasks/2026-03-17 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 更新任务状态
curl -X PUT http://localhost:3000/api/ai/planning/tasks/123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "score": 85,
    "actualTime": 30
  }'
```

---

## 错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_PARAMS | 缺少必要参数或参数格式错误 |
| 401 | UNAUTHORIZED | 未认证或 Token 无效 |
| 404 | PLAN_NOT_FOUND | 计划不存在 |
| 404 | TASK_NOT_FOUND | 任务不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 500 | DATABASE_ERROR | 数据库操作失败 |
| 500 | AI_SERVICE_ERROR | AI 服务调用失败 |

### 错误响应示例

```json
{
  "success": false,
  "error": "缺少必要参数：timeframe.totalDays",
  "code": "INVALID_PARAMS"
}
```

---

## 最佳实践

### 1. 计划生成
- 目标数量建议 5-15 个知识点
- 时间框架建议 14-60 天
- 掌握度差距不宜超过 60%

### 2. 任务执行
- 每日任务量建议 3-8 个
- 总时间控制在 30-90 分钟
- 及时更新任务状态以获取准确跟踪

### 3. 计划调整
- 每周查看执行报告
- 风险等级达到 medium 时考虑调整
- 连续 3 天未完成任务时触发调整

### 4. 数据监控
- 关注完成率趋势
- 监控质量指标变化
- 及时处理高风险预警

---

## 更新日志

### v1.0 (2026-03-17)
- ✅ 实现个性化学习规划算法
- ✅ 实现动态任务生成
- ✅ 实现规划执行跟踪
- ✅ 提供完整 API 接口
- ✅ 编写单元测试
- ✅ 编写 API 文档

---

## 联系支持

如有问题或建议，请联系开发团队。
