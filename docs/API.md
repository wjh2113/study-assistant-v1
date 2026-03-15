# 学习助手 API 文档

> 版本：v1.0.0  
> 最后更新：2026-03-15

## 目录

- [认证接口](#认证接口)
- [用户接口](#用户接口)
- [知识点管理](#知识点管理)
- [学习进度](#学习进度)
- [AI 功能](#ai-功能)
- [课本解析](#课本解析)
- [薄弱点分析](#薄弱点分析)
- [积分系统](#积分系统)
- [排行榜](#排行榜)
- [文件上传](#文件上传)
- [健康检查](#健康检查)
- [错误码](#错误码)

---

## 认证接口

### 发送验证码

```http
POST /api/auth/send-code
Content-Type: application/json
```

**请求体：**
```json
{
  "phone": "13800138000",
  "purpose": "login"
}
```

**响应：**
```json
{
  "message": "验证码已发送",
  "hint": "验证码 5 分钟内有效"
}
```

### 用户注册

```http
POST /api/auth/register
Content-Type: application/json
```

**请求体：**
```json
{
  "phone": "13800138000",
  "code": "123456",
  "role": "STUDENT",
  "nickname": "小明",
  "grade": 3,
  "school_name": "XX 小学"
}
```

**响应：**
```json
{
  "message": "注册成功",
  "user": {
    "id": "uuid",
    "role": "STUDENT",
    "phone": "13800138000",
    "nickname": "小明",
    "profile": { ... }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 用户登录

```http
POST /api/auth/login
Content-Type: application/json
```

**请求体：**
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应：**
```json
{
  "message": "登录成功",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**响应：**
```json
{
  "user": {
    "id": "uuid",
    "role": "STUDENT",
    "phone": "13800138000",
    "nickname": "小明",
    "avatar_url": "https://...",
    "profile": { ... },
    "created_at": "2026-03-15T00:00:00Z",
    "updated_at": "2026-03-15T00:00:00Z"
  }
}
```

### 更新用户信息

```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "nickname": "新昵称",
  "avatar_url": "https://..."
}
```

---

## 用户接口

### 获取学生资料

```http
GET /api/users/profile/student
Authorization: Bearer <token>
```

### 更新学生资料

```http
PUT /api/users/profile/student
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "grade": 4,
  "school_name": "新学校名称"
}
```

---

## 知识点管理

### 获取知识点列表

```http
GET /api/knowledge?page=1&pageSize=20&status=ACTIVE
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 获取单个知识点

```http
GET /api/knowledge/:id
Authorization: Bearer <token>
```

### 创建知识点

```http
POST /api/knowledge
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "分数的加减法",
  "content": "知识点内容...",
  "category": "数学",
  "tags": "分数，加减法"
}
```

### 更新知识点

```http
PUT /api/knowledge/:id
Authorization: Bearer <token>
Content-Type: application/json
```

### 删除知识点

```http
DELETE /api/knowledge/:id
Authorization: Bearer <token>
```

### 搜索知识点

```http
GET /api/knowledge/search?keyword=分数&page=1&pageSize=20
Authorization: Bearer <token>
```

---

## 学习进度

### 获取学习进度列表

```http
GET /api/progress?page=1&pageSize=20
Authorization: Bearer <token>
```

### 获取学习统计

```http
GET /api/progress/stats
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "totalStudyTime": 3600,
    "totalKnowledgePoints": 50,
    "averageCompletionRate": 75.5,
    "streakDays": 7
  }
}
```

### 创建/更新学习进度

```http
POST /api/progress/upsert
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "knowledge_point_id": "uuid",
  "study_duration": 30,
  "completion_rate": 0.8
}
```

### 记录学习时长

```http
POST /api/progress/log
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "knowledge_point_id": "uuid",
  "duration": 60
}
```

---

## AI 功能

### AI 答疑

```http
POST /api/ai/ask
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "question": "如何计算分数的加减法？",
  "knowledge_point_id": "uuid"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "answer": "分数的加减法需要通分...",
    "model": "qwen-plus",
    "usage": {
      "input_tokens": 100,
      "output_tokens": 200
    }
  }
}
```

### 获取问答历史

```http
GET /api/ai/history?page=1&pageSize=20
Authorization: Bearer <token>
```

### AI 出题

```http
POST /api/ai/generate-questions
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "textbookId": 1,
  "textbookContent": "课本文本内容...",
  "grade": "三年级",
  "subject": "数学",
  "unit": "第一单元",
  "questionCount": 5,
  "difficulty": "medium",
  "questionType": "choice"
}
```

**响应：**
```json
{
  "success": true,
  "message": "题目生成成功",
  "data": {
    "questions": [
      {
        "id": 1,
        "type": "choice",
        "difficulty": "medium",
        "question": "题目题干",
        "options": ["A. 选项 1", "B. 选项 2", "C. 选项 3", "D. 选项 4"],
        "answer": "A",
        "explanation": "答案解析",
        "knowledgePoint": "考察的知识点",
        "unit": "第一单元"
      }
    ],
    "count": 5,
    "model": "qwen-plus",
    "usage": {"input_tokens": 100, "output_tokens": 200}
  }
}
```

### 获取 AI 任务日志

```http
GET /api/ai/task-logs?page=1&pageSize=20&taskType=generate_questions&status=completed
Authorization: Bearer <token>
```

---

## 课本解析

### 上传并解析课本

```http
POST /api/textbooks/parse
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**FormData：**
- `file`: [PDF 文件]
- `grade`: "三年级"
- `subject`: "数学"

**响应：**
```json
{
  "success": true,
  "message": "解析任务已创建",
  "data": {
    "taskId": 123,
    "status": "pending"
  }
}
```

### 获取解析任务状态

```http
GET /api/textbooks/tasks/:taskId
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "completed",
    "pageCount": 50,
    "sectionsCount": 10,
    "knowledgePointsCount": 25,
    "durationMs": 15000
  }
}
```

### 获取课本列表

```http
GET /api/textbooks?page=1&pageSize=20&status=COMPLETED
Authorization: Bearer <token>
```

---

## 薄弱点分析

### 分析薄弱点

```http
GET /api/weakness/analyze?subject=数学
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "weakPoints": [
    {
      "id": 1,
      "knowledge_point_id": 101,
      "knowledge_point_name": "分数的加减法",
      "mastery_score": 35,
      "mastery_level": "weak",
      "correct_count": 7,
      "wrong_count": 13,
      "total_count": 20
    }
  ],
  "summary": {
    "totalPoints": 50,
    "weakCount": 5,
    "avgMastery": 62.5,
    "recommendation": {
      "priority": ["分数的加减法", "小数的乘法"],
      "suggestions": [...],
      "studyPlan": "..."
    }
  }
}
```

### 获取知识点掌握度

```http
GET /api/weakness/mastery?subject=数学&sortBy=mastery_score&sortOrder=ASC
Authorization: Bearer <token>
```

### 更新掌握度

```http
POST /api/weakness/update
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "questions": [
    {
      "knowledgePointId": 101,
      "knowledgePointName": "分数的加减法",
      "subject": "数学",
      "isCorrect": true
    }
  ]
}
```

---

## 积分系统

### 获取我的积分

```http
GET /api/points/me
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "totalPoints": 520,
    "streak": 7,
    "weeklyStats": [
      {"source": "practice", "count": 20, "total_points": 250},
      {"source": "check_in", "count": 7, "total_points": 35}
    ]
  }
}
```

### 获取积分记录

```http
GET /api/points/records?page=1&pageSize=20&source=practice
Authorization: Bearer <token>
```

### 打卡

```http
POST /api/points/check-in
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "message": "打卡成功",
  "data": {
    "streak": 7,
    "points": 5,
    "checkedToday": false
  }
}
```

### 记录练习积分

```http
POST /api/points/practice
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "questions": [
    {"isCorrect": true},
    {"isCorrect": true},
    {"isCorrect": false}
  ],
  "practiceId": 456
}
```

**响应：**
```json
{
  "success": true,
  "message": "获得 30 积分",
  "data": {
    "points": 30,
    "recordId": 789
  }
}
```

### 获取打卡状态

```http
GET /api/points/check-in/status
Authorization: Bearer <token>
```

---

## 排行榜

### 获取总排行榜

```http
GET /api/leaderboard/total?page=1&pageSize=20
Authorization: Bearer <token>
```

### 获取周排行榜

```http
GET /api/leaderboard/weekly?page=1&pageSize=20
Authorization: Bearer <token>
```

### 获取月排行榜

```http
GET /api/leaderboard/monthly?page=1&pageSize=20
Authorization: Bearer <token>
```

### 获取我的排名

```http
GET /api/leaderboard/me/rank?type=total
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "rank": 15,
    "score": 520
  }
}
```

---

## 文件上传

### 上传文件

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**FormData：**
- `file`: [文件]

**响应：**
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3000/uploads/xxx.jpg",
    "filename": "xxx.jpg",
    "size": 102400
  }
}
```

---

## 健康检查

### 健康检查

```http
GET /api/health
```

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T00:00:00Z",
  "uptime": 3600
}
```

---

## 错误码

| 错误码 | 说明 |
|-------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求超限 |
| 500 | 服务器内部错误 |

**错误响应格式：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 速率限制

| 接口类型 | 限制 | 时间窗口 |
|---------|------|---------|
| 全局接口 | 100 次/IP | 15 分钟 |
| 发送验证码 | 3 次/手机号 | 1 小时 |
| AI 出题 | 20 次/用户 | 1 小时 |
| 课本解析 | 10 次/用户 | 1 小时 |

**超限响应：**
```json
{
  "success": false,
  "error": "请求过于频繁，请稍后再试"
}
```

---

## 认证

所有接口（除健康检查外）均需要在 Header 中携带 JWT Token：

```
Authorization: Bearer <token>
```

---

## 积分规则

### 练习积分
| 项目 | 积分 | 说明 |
|------|------|------|
| 答对题目 | +10 分/题 | 基础分 |
| 正确率≥80% | +20 分 | 准确率奖励 |
| 正确率=100% | +50 分 | 完美奖励（≥3 题） |
| 连续练习≥3 天 | +5 分/3 天 | 连续练习奖励 |

### 打卡积分
| 项目 | 积分 | 说明 |
|------|------|------|
| 每日打卡 | +5 分 | 基础打卡 |
| 连续 7 天 | +20 分 | 周奖励（第 7 天额外） |
| 连续 30 天 | +100 分 | 月奖励（第 30 天额外） |
