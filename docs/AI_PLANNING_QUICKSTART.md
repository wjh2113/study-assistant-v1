# AI 学习规划服务快速开始指南

**版本**: v1.0  
**更新时间**: 2026-03-17

---

## 🚀 快速开始

### 1. 启动服务

```bash
cd backend
npm start
```

服务启动后，访问：`http://localhost:3000`

---

### 2. 获取 Token

首先需要登录获取 JWT Token：

```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000"}'

# 登录（使用验证码）
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000", "code": "123456"}'
```

响应中包含 `token`，后续请求都需要携带此 Token。

---

### 3. 生成学习计划

```bash
curl -X POST http://localhost:3000/api/ai/planning/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "math",
    "timeframe": {
      "totalDays": 30,
      "startDate": "2026-03-17"
    },
    "goals": [
      {
        "knowledgePointId": "1",
        "knowledgePointName": "一元二次方程",
        "currentMastery": 30,
        "targetMastery": 80,
        "priority": "high"
      },
      {
        "knowledgePointId": "2",
        "knowledgePointName": "因式分解",
        "currentMastery": 50,
        "targetMastery": 85,
        "priority": "medium"
      }
    ],
    "preferences": {
      "dailyTimeLimit": 60,
      "includeWeekend": true
    }
  }'
```

响应示例：
```json
{
  "success": true,
  "planId": 123,
  "plan": {
    "userId": 123,
    "subject": "math",
    "learningStyle": "visual",
    "learningPath": [...],
    "dailySchedule": [...],
    "estimatedCompletionRate": 0.85,
    "confidenceScore": 78
  }
}
```

---

### 4. 查看每日任务

```bash
# 获取今日任务
curl http://localhost:3000/api/ai/planning/daily-tasks/2026-03-17 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. 完成任务

```bash
curl -X PUT http://localhost:3000/api/ai/planning/tasks/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "score": 85,
    "actualTime": 30
  }'
```

---

### 6. 查看进度

```bash
# 查看计划进度
curl http://localhost:3000/api/ai/planning/123/progress \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查看执行报告
curl http://localhost:3000/api/ai/planning/123/report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 核心概念

### 学习计划 (Learning Plan)
包含目标、时间安排、每日任务的完整学习计划。

### 学习风格 (Learning Style)
- **visual**: 视觉型 - 偏好图表、视频
- **auditory**: 听觉型 - 偏好讲解、音频
- **kinesthetic**: 动觉型 - 偏好互动、练习
- **reading**: 读写型 - 偏好阅读、笔记

### 任务类型
- **new_learning**: 新知识点学习
- **review**: 复习（基于遗忘曲线）
- **practice**: 练习巩固
- **remedial**: 补救学习（薄弱点）
- **assessment**: 测试评估

### 遗忘曲线
复习间隔：1 天 → 2 天 → 4 天 → 7 天 → 15 天 → 30 天

---

## 🔧 常见问题

### Q1: 计划生成失败，提示"目标过于激进"
**原因**: 目标知识点太多或时间太短  
**解决**: 
- 减少知识点数量
- 延长计划时间
- 使用返回的 `adjustedPlan` 建议

### Q2: 任务太多完成不了
**解决**:
- 调用 `/api/ai/planning/:planId/adjust` 调整计划
- 设置 `adjustmentType: "reduce_load"`
- 系统会自动减少 20% 任务量

### Q3: 如何查看学习效果
**方法**:
- 定期查看 `/api/ai/planning/:planId/report`
- 关注 `progress.completionRate`（完成率）
- 关注 `quality.masteryImprovement`（掌握度提升）

---

## 📈 最佳实践

### 1. 合理设置目标
- 知识点数量：5-15 个
- 掌握度差距：不超过 60%
- 时间框架：14-60 天

### 2. 每日执行
- 固定学习时间
- 及时更新任务状态
- 关注系统推荐

### 3. 定期回顾
- 每周查看执行报告
- 风险等级达 medium 时及时调整
- 连续 3 天未完成触发调整

### 4. 个性化配置
- 根据实际情况调整 `dailyTimeLimit`
- 选择是否 `includeWeekend`
- 系统会自动识别学习风格

---

## 🎯 API 速查

| 接口 | 方法 | 说明 |
|------|------|------|
| `/generate` | POST | 生成计划 |
| `/user-profile` | GET | 用户画像 |
| `/daily-tasks/:date` | GET | 每日任务 |
| `/tasks/:id/status` | PUT | 更新任务 |
| `/:planId/progress` | GET | 计划进度 |
| `/:planId/track` | GET | 执行跟踪 |
| `/:planId/report` | GET | 执行报告 |
| `/:planId/recommendations` | GET | 推荐行动 |
| `/:planId/adjust` | POST | 调整计划 |

---

## 📚 完整文档

详细 API 文档：[AI_PLANNING_API.md](./AI_PLANNING_API.md)  
完成报告：[AI_PHASE4_COMPLETION_REPORT.md](./AI_PHASE4_COMPLETION_REPORT.md)

---

## 💡 示例代码

### JavaScript 完整示例

```javascript
const TOKEN = 'your_jwt_token';
const BASE_URL = 'http://localhost:3000/api/ai/planning';

// 生成计划
async function createPlan() {
  const response = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      subject: 'math',
      timeframe: { totalDays: 30 },
      goals: [
        {
          knowledgePointId: '1',
          knowledgePointName: '一元二次方程',
          currentMastery: 30,
          targetMastery: 80,
          priority: 'high'
        }
      ],
      preferences: { dailyTimeLimit: 60 }
    })
  });
  
  const result = await response.json();
  console.log('Plan ID:', result.planId);
  return result.planId;
}

// 获取并完成任务
async function completeTodayTasks(planId) {
  const today = new Date().toISOString().split('T')[0];
  
  // 获取任务
  const tasksResponse = await fetch(
    `${BASE_URL}/daily-tasks/${today}?planId=${planId}`,
    { headers: { 'Authorization': `Bearer ${TOKEN}` } }
  );
  const { tasks } = await tasksResponse.json();
  
  // 完成任务
  for (const task of tasks) {
    await fetch(`${BASE_URL}/tasks/${task.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        status: 'completed',
        score: 80,
        actualTime: 25
      })
    });
  }
  
  console.log(`Completed ${tasks.length} tasks`);
}

// 查看进度
async function checkProgress(planId) {
  const response = await fetch(
    `${BASE_URL}/${planId}/report`,
    { headers: { 'Authorization': `Bearer ${TOKEN}` } }
  );
  const { report } = await response.json();
  
  console.log('Completion Rate:', report.progress.completionRate + '%');
  console.log('Risk Level:', report.risks.overallRiskLevel);
  console.log('Recommendations:', report.recommendations);
}

// 使用示例
(async () => {
  const planId = await createPlan();
  await completeTodayTasks(planId);
  await checkProgress(planId);
})();
```

---

## 🎉 开始使用

现在你已经了解了基础知识，开始生成你的第一个学习计划吧！

```bash
# 第一步：获取 Token
curl -X POST http://localhost:3000/api/auth/login ...

# 第二步：生成计划
curl -X POST http://localhost:3000/api/ai/planning/generate ...

# 第三步：查看任务
curl http://localhost:3000/api/ai/planning/daily-tasks/today ...

# 开始学习！📚
```
