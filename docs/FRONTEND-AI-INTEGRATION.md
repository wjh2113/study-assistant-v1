# AI 功能前端集成文档

**版本**: 1.0  
**更新日期**: 2026-03-17  
**作者**: AI 开发团队

---

## 📋 目录

1. [概述](#概述)
2. [API 服务集成](#api-服务集成)
3. [AI Gateway V2](#ai-gateway-v2)
4. [AI 批改服务](#ai-批改服务)
5. [AI 学习规划](#ai-学习规划)
6. [示例页面](#示例页面)
7. [使用指南](#使用指南)

---

## 概述

本文档介绍如何在前端集成 AI 相关功能，包括：

- **AI Gateway V2**: 多 AI 服务路由，支持智能对话、题目生成
- **AI 批改服务**: 主观题批改、作文评分
- **AI 学习规划**: 个性化学习计划生成、任务管理

---

## API 服务集成

### 1. 服务文件位置

所有 AI 服务接口定义在：
```
frontend/src/services/aiServices.js
```

### 2. 导入方式

```javascript
// 在组件中导入
import { aiGatewayV2API, aiGradingAPI, aiPlanningAPI } from '../services'

// 或者从 services/index.js 统一导出
import { aiGatewayV2API, aiGradingAPI, aiPlanningAPI } from '../services'
```

### 3. 认证机制

所有 AI API 请求自动携带认证 Token（通过 axios 拦截器）：
- Token 存储在 `localStorage.getItem('token')`
- 401 错误自动跳转到登录页

---

## AI Gateway V2

### 接口列表

#### 1. 智能对话

```javascript
// 调用示例
const response = await aiGatewayV2API.chat(messages, {
  taskType: 'chat',        // 任务类型
  temperature: 0.7,        // 温度参数
  maxTokens: 2048          // 最大 token 数
})

// messages 格式
[
  { role: 'user', content: '什么是勾股定理？' },
  { role: 'assistant', content: '勾股定理是...' },
  { role: 'user', content: '如何证明？' }
]

// 响应格式
{
  success: true,
  data: {
    content: '回答内容',
    model: 'qwen-plus',
    provider: 'aliyun',
    usage: { total_tokens: 150 },
    latency: 1200
  }
}
```

#### 2. 生成题目

```javascript
const response = await aiGatewayV2API.generateQuestions({
  textbookContent: '课本内容...',
  grade: '9',
  subject: 'math',
  unit: '二次函数',
  questionCount: 5,
  difficulty: 'medium',
  questionType: 'choice'
})

// 响应格式
{
  success: true,
  data: {
    questions: [...],
    count: 5,
    model: 'qwen-plus',
    provider: 'aliyun',
    usage: { total_tokens: 500 },
    latency: 3000
  }
}
```

#### 3. 健康检查

```javascript
// 完整健康检查
const health = await aiGatewayV2API.health()

// 获取状态（不主动检测）
const status = await aiGatewayV2API.status()

// 获取 Token 使用统计
const usage = await aiGatewayV2API.getTokenUsage('2026-03-17')

// 获取任务日志
const logs = await aiGatewayV2API.getTaskLogs({
  page: 1,
  pageSize: 20,
  taskType: 'chat_v2',
  status: 'completed'
})
```

---

## AI 批改服务

### 接口列表

#### 1. 批改主观题

```javascript
const response = await aiGradingAPI.gradeSubjective({
  questionId: 1,
  question: '简述光合作用的过程',
  userAnswer: '光合作用是植物...',
  rubric: {
    maxScore: 10,
    keyPoints: ['光反应', '暗反应', 'ATP 生成'],
    additionalCriteria: '需要提到叶绿体'
  }
})

// 响应格式
{
  success: true,
  score: 8.5,
  maxScore: 10,
  percentage: 85.0,
  feedback: {
    strengths: ['答案完整', '逻辑清晰'],
    improvements: ['可以补充细节'],
    suggestions: '建议复习光反应阶段'
  },
  detailedScoring: {
    completeness: 90,
    accuracy: 85,
    clarity: 80
  },
  model: 'qwen-plus',
  tokens: 200
}
```

#### 2. 批改作文

```javascript
const response = await aiGradingAPI.gradeEssay({
  essay: '作文内容...',
  subject: 'chinese',     // 'chinese' | 'english'
  grade: '9',             // 年级
  topic: '我的梦想',
  wordLimit: {
    min: 600,
    max: 800
  },
  criteria: {
    content: { weight: 0.30, aspects: ['主题明确', '内容充实'] },
    structure: { weight: 0.25, aspects: ['段落清晰', '逻辑连贯'] },
    language: { weight: 0.25, aspects: ['语法正确', '词汇丰富'] },
    creativity: { weight: 0.20, aspects: ['观点新颖', '表达独特'] }
  }
})

// 响应格式
{
  success: true,
  totalScore: 85.5,
  scores: {
    content: 88,
    structure: 85,
    language: 82,
    creativity: 87
  },
  feedback: {
    content: '内容评价...',
    structure: '结构评价...',
    language: '语言评价...',
    creativity: '创意评价...'
  },
  overallFeedback: '总体评语...',
  suggestions: ['建议 1', '建议 2', '建议 3'],
  wordCount: 720,
  errors: [
    {
      type: 'grammar',
      original: '错误原文',
      suggestion: '建议修改',
      position: 100
    }
  ]
}
```

#### 3. 批量批改

```javascript
const submissions = [
  {
    id: 1,
    type: 'essay',
    essay: '作文内容...',
    subject: 'chinese',
    grade: '9',
    topic: '我的梦想'
  },
  {
    id: 2,
    type: 'subjective',
    questionId: 1,
    question: '题目...',
    userAnswer: '答案...',
    rubric: { maxScore: 10, keyPoints: [...] }
  }
]

const results = await aiGradingAPI.batchGrade(submissions)
```

#### 4. 获取批改历史

```javascript
const history = await aiGradingAPI.getHistory({
  page: 1,
  pageSize: 20,
  submissionType: 'essay'  // 'essay' | 'subjective'
})
```

---

## AI 学习规划

### 接口列表

#### 1. 生成个性化学习计划

```javascript
const response = await aiPlanningAPI.generatePlan({
  subject: 'math',
  timeframe: {
    totalDays: 30,
    startDate: '2026-03-17',
    endDate: '2026-04-16'
  },
  goals: [
    {
      knowledgePointName: '二次函数',
      currentMastery: 30,
      targetMastery: 80,
      priority: 'high'
    },
    {
      knowledgePointName: '三角函数',
      currentMastery: 50,
      targetMastery: 90,
      priority: 'medium'
    }
  ],
  preferences: {
    dailyTimeLimit: 60,      // 每日学习时长（分钟）
    includeWeekend: true,     // 是否包含周末
    learningStyle: 'visual'   // 学习风格：visual|auditory|kinesthetic|reading
  }
})

// 响应格式
{
  success: true,
  planId: 123,
  plan: {
    totalDays: 30,
    goals: [...],
    learningPath: [
      {
        week: 1,
        focus: '二次函数基础',
        targetMastery: 50
      },
      ...
    ],
    dailySchedule: [...]
  },
  message: '学习计划生成成功'
}
```

#### 2. 获取用户学习画像

```javascript
const profile = await aiPlanningAPI.getUserProfile('math')

// 响应格式
{
  success: true,
  userProfile: {
    totalStudyTime: 1200,
    completedTasks: 50,
    weakPoints: [...],
    strongPoints: [...]
  },
  learningStyle: {
    type: 'visual',
    score: 0.75
  }
}
```

#### 3. 获取每日任务

```javascript
const tasks = await aiPlanningAPI.getDailyTasks('2026-03-17', {
  planId: 123,
  subject: 'math'
})

// 响应格式
{
  success: true,
  date: '2026-03-17',
  tasks: [
    {
      id: 1,
      title: '学习二次函数图像',
      description: '观看视频并完成练习',
      type: 'video',
      estimatedTime: 30,
      knowledgePoint: '二次函数',
      priority: 'high'
    },
    ...
  ],
  total: 5
}
```

#### 4. 更新任务状态

```javascript
await aiPlanningAPI.updateTaskStatus(taskId, 'completed', {
  score: 90,
  actualTime: 25,
  feedback: {
    difficulty: 'medium',
    notes: '掌握良好'
  }
})

// 状态选项：pending | in_progress | completed | skipped
```

#### 5. 获取计划进度

```javascript
const progress = await aiPlanningAPI.getPlanProgress(planId)

// 响应格式
{
  success: true,
  progress: {
    overall: {
      completionRate: 0.65,
      totalTasks: 100,
      completedTasks: 65
    },
    daily: [...],
    byKnowledgePoint: [...]
  }
}
```

#### 6. 跟踪计划执行

```javascript
const report = await aiPlanningAPI.trackPlanExecution(planId)

// 响应格式
{
  success: true,
  report: {
    progress: 0.65,
    risks: {
      overallRiskLevel: 'medium',
      behindSchedule: true,
      atRiskGoals: [...]
    },
    recommendations: [
      '建议增加每日学习时长',
      '优先完成高优先级任务'
    ]
  }
}
```

#### 7. 调整学习计划

```javascript
const result = await aiPlanningAPI.adjustPlan(
  planId,
  'reduce_load',     // reduce_load | extend_time | reprioritize
  '学习压力过大',
  { dailyTaskReduction: 0.2 }
)
```

---

## 示例页面

### 1. AI 智能答疑 V2

**文件**: `frontend/src/pages/AIChatV2.jsx`  
**路由**: `/ai-chat-v2`

功能特性：
- 多轮对话支持
- 实时消息显示
- 对话历史管理
- 加载状态提示

### 2. AI 作文评分

**文件**: `frontend/src/pages/EssayGrading.jsx`  
**路由**: `/ai/essay-grading`

功能特性：
- 科目选择（语文/英语）
- 年级选择
- 作文字数要求设置
- 多维度评分展示
- 详细评语和建议
- 错误标注

### 3. AI 学习规划

**文件**: `frontend/src/pages/LearningPlan.jsx`  
**路由**: `/ai/learning-plan`

功能特性：
- 三步向导式规划
- 学习目标管理
- 个性化参数设置
- 学习路径可视化
- 每日任务展示
- 计划调整功能

---

## 使用指南

### 1. 添加新路由

在 `frontend/src/App.jsx` 中添加路由：

```javascript
import AIChatV2 from './pages/AIChatV2'
import EssayGrading from './pages/EssayGrading'
import LearningPlan from './pages/LearningPlan'

// 在 Routes 中添加
<Route path="/ai-chat-v2" element={<PrivateRoute><AIChatV2 /></PrivateRoute>} />
<Route path="/ai/essay-grading" element={<PrivateRoute><EssayGrading /></PrivateRoute>} />
<Route path="/ai/learning-plan" element={<PrivateRoute><LearningPlan /></PrivateRoute>} />
```

### 2. 在导航中添加链接

在 `frontend/src/pages/Dashboard.jsx` 中添加导航链接：

```javascript
<Link to="/ai-chat-v2">AI 智能答疑</Link>
<Link to="/ai/essay-grading">AI 作文评分</Link>
<Link to="/ai/learning-plan">AI 学习规划</Link>
```

### 3. 错误处理建议

```javascript
try {
  const response = await aiGatewayV2API.chat(messages)
  
  if (!response.data.success) {
    // 业务错误
    setError(response.data.error || '操作失败')
    return
  }
  
  // 处理成功响应
  setData(response.data.data)
} catch (error) {
  if (error.response?.status === 401) {
    // 未授权，跳转登录
    navigate('/login')
  } else if (error.response?.status === 429) {
    // 请求过于频繁
    setError('请求过于频繁，请稍后再试')
  } else {
    // 其他错误
    setError('操作失败，请稍后重试')
  }
}
```

### 4. 加载状态管理

```javascript
const [loading, setLoading] = useState(false)

const handleSubmit = async () => {
  setLoading(true)
  try {
    await apiCall()
  } finally {
    setLoading(false)
  }
}

// UI 中使用
<button disabled={loading}>
  {loading ? '处理中...' : '提交'}
</button>
```

---

## 后端 API 路由参考

| 功能 | 后端路由 | 方法 | 认证 |
|------|---------|------|------|
| 智能对话 | `/api/ai/v2/chat` | POST | ✅ |
| 生成题目 | `/api/ai/v2/generate-questions` | POST | ✅ |
| 健康检查 | `/api/ai/v2/health` | GET | ✅ |
| 获取状态 | `/api/ai/v2/status` | GET | ✅ |
| Token 统计 | `/api/ai/v2/token-usage` | GET | ✅ |
| 任务日志 | `/api/ai/v2/task-logs` | GET | ✅ |
| 批改主观题 | `/api/ai/grading/subjective` | POST | ✅ |
| 批改作文 | `/api/ai/grading/essay` | POST | ✅ |
| 批量批改 | `/api/ai/grading/batch` | POST | ✅ |
| 生成计划 | `/api/ai/planning/generate` | POST | ✅ |
| 用户画像 | `/api/ai/planning/user-profile` | GET | ✅ |
| 每日任务 | `/api/ai/planning/daily-tasks/:date` | GET | ✅ |
| 更新任务 | `/api/ai/planning/tasks/:taskId/status` | PUT | ✅ |
| 计划进度 | `/api/ai/planning/:planId/progress` | GET | ✅ |
| 跟踪执行 | `/api/ai/planning/:planId/track` | GET | ✅ |
| 执行报告 | `/api/ai/planning/:planId/report` | GET | ✅ |
| 推荐行动 | `/api/ai/planning/:planId/recommendations` | GET | ✅ |
| 调整计划 | `/api/ai/planning/:planId/adjust` | POST | ✅ |

---

## 常见问题

### Q: 如何处理 API 超时？

A: 在 axios 拦截器中设置超时：

```javascript
// frontend/src/services/api.js
const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 秒超时
  headers: { 'Content-Type': 'application/json' }
})
```

### Q: 如何优化大文件上传？

A: 使用 FormData 和进度监听：

```javascript
const formData = new FormData()
formData.append('file', file)

await api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (progressEvent) => {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )
    console.log(`上传进度：${percent}%`)
  }
})
```

### Q: 如何实现实时 Token 统计？

A: 使用定时器定期刷新：

```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const usage = await aiGatewayV2API.getTokenUsage()
    setTokenUsage(usage.data.data)
  }, 60000) // 每分钟刷新
  
  return () => clearInterval(interval)
}, [])
```

---

## 更新日志

### v1.0 (2026-03-17)
- ✅ 完成 AI Gateway V2 集成
- ✅ 完成 AI 批改服务集成
- ✅ 完成 AI 学习规划集成
- ✅ 创建示例页面（AIChatV2, EssayGrading, LearningPlan）
- ✅ 编写集成文档

---

## 联系方式

如有问题，请联系开发团队或查阅后端 API 文档。
