# AI 功能快速参考卡

## 🚀 快速开始

```javascript
// 1. 导入服务
import { aiGatewayV2API, aiGradingAPI, aiPlanningAPI } from '../services'

// 2. 调用 API
const response = await aiGatewayV2API.chat([{ role: 'user', content: '你好' }])

// 3. 处理响应
if (response.data.success) {
  console.log(response.data.data.content)
}
```

---

## 📞 API 速查

### AI Gateway V2

| 方法 | 用途 | 示例 |
|------|------|------|
| `chat(messages, opts)` | 智能对话 | `chat([{role:'user',content:'问题'}])` |
| `generateQuestions(params)` | 生成题目 | `generateQuestions({grade:'9',subject:'math'})` |
| `health()` | 健康检查 | `health()` |
| `getTokenUsage(date)` | Token 统计 | `getTokenUsage('2026-03-17')` |

### AI 批改服务

| 方法 | 用途 | 示例 |
|------|------|------|
| `gradeSubjective(params)` | 批改主观题 | `gradeSubjective({question,userAnswer,rubric})` |
| `gradeEssay(params)` | 批改作文 | `gradeEssay({essay,subject:'chinese',grade:'9'})` |
| `batchGrade(submissions)` | 批量批改 | `batchGrade([submission1, submission2])` |
| `getHistory(params)` | 批改历史 | `getHistory({page:1,pageSize:20})` |

### AI 学习规划

| 方法 | 用途 | 示例 |
|------|------|------|
| `generatePlan(params)` | 生成计划 | `generatePlan({subject,timeframe,goals})` |
| `getUserProfile(subject)` | 用户画像 | `getUserProfile('math')` |
| `getDailyTasks(date)` | 每日任务 | `getDailyTasks('2026-03-17')` |
| `updateTaskStatus(id,status)` | 更新任务 | `updateTaskStatus(1,'completed')` |
| `getPlanProgress(planId)` | 计划进度 | `getPlanProgress(123)` |

---

## 🌐 页面路由

| 页面 | 路由 | 文件 |
|------|------|------|
| AI 智能答疑 V2 | `/ai-chat-v2` | `pages/AIChatV2.jsx` |
| AI 作文评分 | `/ai/essay-grading` | `pages/EssayGrading.jsx` |
| AI 学习规划 | `/ai/learning-plan` | `pages/LearningPlan.jsx` |

---

## 🎯 常用代码片段

### 智能对话

```javascript
const [messages, setMessages] = useState([])

const sendMessage = async (content) => {
  const newMessages = [...messages, { role: 'user', content }]
  setMessages(newMessages)
  
  const res = await aiGatewayV2API.chat(newMessages)
  setMessages([...newMessages, { role: 'assistant', content: res.data.data.content }])
}
```

### 作文评分

```javascript
const result = await aiGradingAPI.gradeEssay({
  essay: content,
  subject: 'chinese',
  grade: '9',
  topic: '我的梦想',
  wordLimit: { min: 600, max: 800 }
})

console.log(`总分：${result.totalScore}`)
console.log(`评语：${result.overallFeedback}`)
```

### 学习计划

```javascript
const plan = await aiPlanningAPI.generatePlan({
  subject: 'math',
  timeframe: { totalDays: 30 },
  goals: [
    { knowledgePointName: '二次函数', currentMastery: 30, targetMastery: 80, priority: 'high' }
  ],
  preferences: { dailyTimeLimit: 60, includeWeekend: true }
})
```

---

## ⚠️ 错误处理

```javascript
try {
  const res = await aiGatewayV2API.chat(messages)
  
  if (!res.data.success) {
    setError(res.data.error || '操作失败')
    return
  }
  
  // 处理成功
} catch (error) {
  if (error.response?.status === 401) {
    navigate('/login')  // 未授权
  } else if (error.response?.status === 429) {
    setError('请求过于频繁')  // 限流
  } else {
    setError('操作失败，请稍后重试')  // 其他错误
  }
}
```

---

## 🔑 认证机制

所有 API 请求自动携带 Token：

```javascript
// 请求头格式
Authorization: Bearer <token>

// Token 来源
const token = localStorage.getItem('token')
```

---

## 📊 响应格式

### 成功响应

```javascript
{
  success: true,
  data: { ... },
  message: '操作成功'
}
```

### 失败响应

```javascript
{
  success: false,
  error: '错误信息'
}
```

---

## 🛠️ 开发工具

### 启动开发服务器

```bash
cd frontend
npm run dev
```

### 构建生产版本

```bash
cd frontend
npm run build
```

### 运行测试

```bash
cd frontend
npm test
```

---

## 📚 完整文档

详细文档请查看：[FRONTEND-AI-INTEGRATION.md](./FRONTEND-AI-INTEGRATION.md)
