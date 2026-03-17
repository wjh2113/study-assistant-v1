# 📚 学习助手 (StudyAss) API 文档

**版本**: 1.0.0  
**最后更新**: 2026-03-17  
**基础 URL**: `http://localhost:3000/api`

---

## 📋 目录

1. [概述](#概述)
2. [认证机制](#认证机制)
3. [错误码说明](#错误码说明)
4. [速率限制](#速率限制)
5. [API 接口详情](#api-接口详情)
   - [健康检查](#健康检查)
   - [用户认证](#用户认证)
   - [知识点管理](#知识点管理)
   - [学习进度](#学习进度)
   - [AI 问答](#ai-问答)
   - [AI 出题 (Gateway)](#ai-出题-gateway)
   - [AI Gateway V2](#ai-gateway-v2)
   - [AI 学习规划](#ai-学习规划)
   - [课本解析](#课本解析)
   - [薄弱点分析](#薄弱点分析)
   - [积分系统](#积分系统)
   - [排行榜](#排行榜)
   - [文件上传](#文件上传)
   - [练习会话](#练习会话)

---

## 概述

StudyAss 学习助手平台提供 RESTful API 接口，支持用户认证、知识点管理、学习进度跟踪、AI 辅助学习等功能。

### 响应格式

所有 API 响应均采用 JSON 格式：

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

---

## 认证机制

### JWT Token 认证

除健康检查和发送验证码接口外，所有接口都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <your_jwt_token>
```

### Token 获取

通过登录或注册接口获取 Token：

```bash
POST /api/auth/login
{
  "phone": "13800138000",
  "code": "123456"
}
```

响应：
```json
{
  "message": "登录成功",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Token 有效期

- 默认有效期：7 天
- 可通过 `/api/auth/refresh` 接口刷新 Token

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token 无效 |
| 403 | 禁止访问/权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（速率限制） |
| 500 | 服务器内部错误 |

---

## 速率限制

### 全局速率限制

- 默认：100 请求/分钟/IP

### 特殊接口限制

| 接口 | 限制 |
|------|------|
| `/api/auth/send-code` | 5 次/分钟 |
| `/api/ai/generate-questions` | 10 次/小时 |
| `/api/textbooks/parse` | 5 次/小时 |

---

## API 接口详情

### 健康检查

#### GET /api/health

**认证**: 不需要

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "memory": {
      "used": 256,
      "total": 512,
      "unit": "MB"
    }
  }
}
```

---

### 用户认证

#### POST /api/auth/send-code

发送验证码

**认证**: 不需要

**请求体**:
```json
{
  "phone": "13800138000",
  "purpose": "login"  // login | register
}
```

**响应**:
```json
{
  "message": "验证码已发送",
  "hint": "验证码 5 分钟内有效"
}
```

---

#### POST /api/auth/login

用户登录

**认证**: 不需要

**请求体**:
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应**:
```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "role": "STUDENT",
    "phone": "13800138000",
    "nickname": "小明",
    "avatar_url": "http://localhost:3000/uploads/avatars/xxx.jpg",
    "profile": {
      "grade": 10,
      "school_name": "XX 中学"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### POST /api/auth/register

用户注册

**认证**: 不需要

**请求体**:
```json
{
  "phone": "13800138000",
  "code": "123456",
  "nickname": "小明",
  "grade": 10,
  "school_name": "XX 中学",
  "real_name": "张三"
}
```

**响应**:
```json
{
  "message": "注册成功",
  "user": { ... },
  "token": "..."
}
```

---

#### POST /api/auth/refresh

刷新 Token

**认证**: 需要 (Bearer Token)

**响应**:
```json
{
  "message": "Token 刷新成功",
  "token": "new_jwt_token"
}
```

---

#### GET /api/auth/me

获取当前用户信息

**认证**: 需要

**响应**:
```json
{
  "user": {
    "id": 1,
    "role": "STUDENT",
    "phone": "13800138000",
    "nickname": "小明",
    "avatar_url": "...",
    "profile": { ... },
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-03-17T00:00:00.000Z"
  }
}
```

---

#### PUT /api/auth/me

更新用户信息

**认证**: 需要

**请求体**:
```json
{
  "nickname": "新昵称",
  "avatar_url": "http://..."
}
```

**响应**:
```json
{
  "message": "更新成功",
  "user": { ... }
}
```

---

### 知识点管理

所有知识点接口需要认证。

#### POST /api/knowledge

创建知识点

**请求体**:
```json
{
  "name": "二次函数",
  "subject": "math",
  "grade": 10,
  "description": "二次函数的基本概念和性质",
  "parent_id": null
}
```

---

#### GET /api/knowledge

获取知识点列表

**查询参数**:
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 20
- `subject` (可选): 科目过滤
- `grade` (可选): 年级过滤

**响应**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

---

#### GET /api/knowledge/search

搜索知识点

**查询参数**:
- `keyword`: 搜索关键词

**响应**:
```json
{
  "success": true,
  "data": [ ... ]
}
```

---

#### GET /api/knowledge/:id

获取单个知识点详情

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "二次函数",
    "subject": "math",
    "grade": 10,
    "description": "...",
    "parent_id": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

#### PUT /api/knowledge/:id

更新知识点

**请求体**:
```json
{
  "name": "二次函数进阶",
  "description": "更新后的描述"
}
```

---

#### DELETE /api/knowledge/:id

删除知识点

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 学习进度

所有学习进度接口需要认证。

#### POST /api/progress/upsert

创建/更新学习进度

**请求体**:
```json
{
  "knowledge_point_id": 1,
  "mastery": 0.8,
  "last_reviewed_at": "2026-03-17T12:00:00.000Z"
}
```

---

#### POST /api/progress/log

记录学习时长

**请求体**:
```json
{
  "subject": "math",
  "duration": 60,
  "description": "完成二次函数练习"
}
```

---

#### GET /api/progress

获取学习进度列表

**查询参数**:
- `subject` (可选): 科目过滤
- `grade` (可选): 年级过滤

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "knowledge_point_id": 1,
      "knowledge_point_name": "二次函数",
      "mastery": 0.8,
      "last_reviewed_at": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

#### GET /api/progress/stats

获取学习统计

**响应**:
```json
{
  "success": true,
  "data": {
    "total_study_time": 3600,
    "knowledge_points_learned": 50,
    "average_mastery": 0.75,
    "weekly_stats": [ ... ]
  }
}
```

---

### AI 问答

所有 AI 问答接口需要认证。

#### POST /api/ai/ask

AI 答疑

**请求体**:
```json
{
  "question": "如何解二次方程？",
  "context": {
    "subject": "math",
    "grade": 10
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "question": "如何解二次方程？",
    "answer": "解二次方程的方法有...",
    "created_at": "..."
  }
}
```

---

#### GET /api/ai/history

获取问答历史

**查询参数**:
- `page` (可选): 页码
- `pageSize` (可选): 每页数量

**响应**:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { ... }
}
```

---

#### GET /api/ai/search

搜索问答历史

**查询参数**:
- `keyword`: 搜索关键词

---

#### DELETE /api/ai/:id

删除单条问答记录

---

### AI 出题 (Gateway)

#### POST /api/ai/generate-questions

AI 出题（带速率限制）

**认证**: 需要

**请求体**:
```json
{
  "knowledge_point_id": 1,
  "question_type": "choice",  // choice | fill | calculation
  "difficulty": "medium",     // easy | medium | hard
  "count": 5
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "task_id": "xxx",
    "status": "processing",
    "questions": [ ... ]
  }
}
```

---

#### GET /api/ai/task-logs

获取任务日志列表

**查询参数**:
- `page` (可选)
- `pageSize` (可选)
- `status` (可选): pending | processing | completed | failed

---

#### GET /api/ai/task-logs/:id

获取单条任务日志详情

---

### AI Gateway V2

#### POST /api/ai/v2/generate-questions

生成题目（V2 版本）

---

#### POST /api/ai/v2/chat

智能对话

---

#### GET /api/ai/v2/health

健康检查

---

#### GET /api/ai/v2/status

获取服务状态

---

#### GET /api/ai/v2/token-usage

获取 Token 使用统计

---

#### GET /api/ai/v2/task-logs

获取任务日志

---

### AI 学习规划

#### POST /api/ai/planning/generate

生成个性化学习计划

**请求体**:
```json
{
  "subject": "math",
  "timeframe": {
    "total_days": 30,
    "start_date": "2026-03-17",
    "end_date": "2026-04-16"
  },
  "goals": [
    {
      "knowledge_point_id": 1,
      "knowledge_point_name": "二次函数",
      "current_mastery": 0.3,
      "target_mastery": 0.8,
      "priority": "high"
    }
  ],
  "preferences": {
    "daily_time_limit": 60,
    "include_weekend": true,
    "learning_style": "visual"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "plan_id": 1,
    "subject": "math",
    "total_days": 30,
    "tasks": [ ... ],
    "created_at": "..."
  }
}
```

---

#### GET /api/ai/planning/user-profile

获取用户学习画像

**查询参数**:
- `subject` (可选): 科目

**响应**:
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "subject": "math",
    "knowledge_points": [ ... ],
    "learning_style": "visual",
    "average_study_time": 45,
    "weak_areas": [ ... ]
  }
}
```

---

#### GET /api/ai/planning/daily-tasks/:date

获取指定日期的学习任务

**路径参数**:
- `date`: 日期 (YYYY-MM-DD)

**查询参数**:
- `planId` (可选): 计划 ID
- `subject` (可选): 科目

**响应**:
```json
{
  "success": true,
  "data": {
    "date": "2026-03-17",
    "tasks": [
      {
        "id": 1,
        "knowledge_point_name": "二次函数",
        "task_type": "practice",
        "estimated_time": 30,
        "status": "pending"
      }
    ]
  }
}
```

---

#### PUT /api/ai/planning/tasks/:taskId/status

更新任务状态

**路径参数**:
- `taskId`: 任务 ID

**请求体**:
```json
{
  "status": "completed",  // pending | in_progress | completed | skipped
  "score": 85,
  "actual_time": 25,
  "feedback": {
    "difficulty": "medium",
    "comments": "题目难度适中"
  }
}
```

---

#### GET /api/ai/planning/tasks/statistics

获取任务统计

**查询参数**:
- `startDate`: 开始日期
- `endDate`: 结束日期
- `planId` (可选): 计划 ID

**响应**:
```json
{
  "success": true,
  "data": {
    "total_tasks": 100,
    "completed_tasks": 75,
    "completion_rate": 0.75,
    "average_score": 82,
    "daily_stats": [ ... ]
  }
}
```

---

#### GET /api/ai/planning/:planId/progress

获取计划进度

**路径参数**:
- `planId`: 计划 ID

**响应**:
```json
{
  "success": true,
  "data": {
    "plan_id": 1,
    "progress": 0.6,
    "completed_tasks": 18,
    "total_tasks": 30,
    "estimated_completion_date": "2026-04-10"
  }
}
```

---

#### GET /api/ai/planning/:planId/track

跟踪计划执行情况

---

#### GET /api/ai/planning/:planId/report

获取计划执行报告

---

#### GET /api/ai/planning/:planId/recommendations

获取推荐行动

---

#### POST /api/ai/planning/:planId/adjust

调整学习计划

**请求体**:
```json
{
  "adjustment_type": "reduce_load",
  "reason": "学习时间不足",
  "changes": {
    "daily_time_limit": 45
  }
}
```

---

### 课本解析

#### POST /api/textbooks/upload

上传课本 PDF

**认证**: 需要

**Content-Type**: `multipart/form-data`

**表单参数**:
- `file`: PDF 文件 (最大 50MB)
- `title`: 课本标题

**响应**:
```json
{
  "success": true,
  "message": "上传成功",
  "data": {
    "id": 1,
    "title": "高中数学必修一",
    "file_url": "/uploads/textbooks/xxx.pdf",
    "status": "pending"
  }
}
```

---

#### POST /api/textbooks/parse

上传并解析课本（旧接口，兼容）

**请求体**:
```json
{
  "file_path": "/path/to/file.pdf",
  "grade": 10,
  "subject": "math"
}
```

---

#### GET /api/textbooks/tasks/:taskId

获取解析任务状态

**响应**:
```json
{
  "success": true,
  "data": {
    "task_id": "xxx",
    "status": "completed",
    "progress": 100,
    "result": { ... }
  }
}
```

---

#### GET /api/textbooks/tasks

获取用户的任务列表

**查询参数**:
- `page` (可选)
- `pageSize` (可选)
- `status` (可选)

---

#### GET /api/textbooks

获取课本文本列表

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "高中数学必修一",
      "file_url": "...",
      "status": "completed",
      "units": [ ... ]
    }
  ]
}
```

---

#### GET /api/textbooks/:id/units

获取课本单元列表

---

#### GET /api/textbooks/:id

获取单个课本详情

---

#### DELETE /api/textbooks/:id

删除课本

---

### 薄弱点分析

#### GET /api/weakness/analyze

分析薄弱点

**响应**:
```json
{
  "success": true,
  "data": {
    "weak_areas": [
      {
        "knowledge_point_id": 1,
        "knowledge_point_name": "二次函数",
        "mastery": 0.3,
        "recommendation": "建议加强练习"
      }
    ]
  }
}
```

---

#### GET /api/weakness/mastery

获取知识点掌握度列表

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "knowledge_point_id": 1,
      "mastery": 0.8,
      "last_updated": "..."
    }
  ]
}
```

---

#### POST /api/weakness/update

更新掌握度（练习后）

**请求体**:
```json
{
  "knowledge_point_id": 1,
  "mastery": 0.85,
  "practice_count": 10,
  "correct_count": 8
}
```

---

#### GET /api/weakness/recommend

获取推荐题目

**响应**:
```json
{
  "success": true,
  "data": {
    "questions": [ ... ],
    "reason": "基于您的薄弱点推荐"
  }
}
```

---

#### GET /api/weakness/trend/:knowledgePointId

获取掌握度趋势

**路径参数**:
- `knowledgePointId`: 知识点 ID

**响应**:
```json
{
  "success": true,
  "data": {
    "knowledge_point_id": 1,
    "trend": [
      { "date": "2026-03-01", "mastery": 0.5 },
      { "date": "2026-03-08", "mastery": 0.6 },
      { "date": "2026-03-15", "mastery": 0.7 }
    ]
  }
}
```

---

### 积分系统

#### GET /api/points/me

获取我的积分

**响应**:
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "total_points": 1500,
    "weekly_points": 200,
    "monthly_points": 800,
    "level": 5,
    "next_level_points": 2000
  }
}
```

---

#### GET /api/points/records

获取积分记录

**查询参数**:
- `page` (可选)
- `pageSize` (可选)
- `type` (可选): check_in | practice | bonus

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "check_in",
      "points": 10,
      "description": "连续打卡 7 天奖励",
      "created_at": "..."
    }
  ],
  "pagination": { ... }
}
```

---

#### POST /api/points/check-in

打卡

**响应**:
```json
{
  "success": true,
  "data": {
    "points": 10,
    "streak": 7,
    "bonus": 50,
    "message": "连续打卡 7 天，额外奖励 50 积分！"
  }
}
```

---

#### POST /api/points/practice

记录练习积分

**请求体**:
```json
{
  "session_id": 1,
  "score": 85,
  "duration": 30
}
```

---

#### GET /api/points/check-in/status

获取打卡状态

**响应**:
```json
{
  "success": true,
  "data": {
    "today_checked": false,
    "streak": 7,
    "last_check_in": "2026-03-16T08:00:00.000Z"
  }
}
```

---

### 排行榜

#### GET /api/leaderboard/:type?

获取排行榜

**路径参数**:
- `type` (可选): `total` | `weekly` | `monthly` (默认: total)

**查询参数**:
- `page` (可选)
- `pageSize` (可选)

**响应**:
```json
{
  "success": true,
  "data": {
    "type": "total",
    "leaderboard": [
      {
        "rank": 1,
        "user_id": 1,
        "nickname": "学霸小明",
        "avatar_url": "...",
        "points": 5000,
        "school_name": "XX 中学"
      }
    ],
    "updated_at": "..."
  }
}
```

---

#### GET /api/leaderboard/me/rank

获取我的排名

**响应**:
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "total_rank": 15,
    "weekly_rank": 8,
    "monthly_rank": 12,
    "points": 1500
  }
}
```

---

#### GET /api/leaderboard/history

获取排行榜历史

**查询参数**:
- `type` (可选): total | weekly | monthly
- `date` (可选): 历史日期

---

#### POST /api/leaderboard/refresh

刷新排行榜（管理员）

**认证**: 需要管理员权限

---

### 文件上传

#### POST /api/upload/textbook

上传课本 PDF

**Content-Type**: `multipart/form-data`

**表单参数**:
- `file`: PDF 文件
- `title`: 课本标题
- `subject`: 科目
- `grade`: 年级
- `version` (可选): 版本

**响应**:
```json
{
  "success": true,
  "textbook": {
    "id": 1,
    "title": "高中数学",
    "subject": "math",
    "grade": 10,
    "parse_status": "pending",
    "file_url": "http://localhost:3000/uploads/textbooks/xxx.pdf",
    "file_size": 10485760
  }
}
```

---

#### POST /api/upload/avatar

上传头像

**表单参数**:
- `file`: 图片文件 (JPEG/PNG/GIF/WebP, 最大 5MB)
- `userId`: 用户 ID

**响应**:
```json
{
  "success": true,
  "avatar_url": "http://localhost:3000/uploads/avatars/xxx.jpg",
  "file_size": 102400
}
```

---

#### POST /api/upload/attachment

上传附件

**表单参数**:
- `file`: 附件文件
- `entityType`: 实体类型 (knowledge, question 等)
- `entityId`: 实体 ID

**响应**:
```json
{
  "success": true,
  "attachment": {
    "id": 1,
    "file_url": "http://localhost:3000/uploads/attachments/xxx.pdf",
    "original_name": "资料.pdf",
    "file_size": 204800
  }
}
```

---

#### GET /api/upload/test

测试上传功能

---

### 练习会话

#### POST /api/practice/sessions

创建练习会话

**请求体**:
```json
{
  "subject": "math",
  "knowledge_point_ids": [1, 2, 3],
  "question_count": 10,
  "difficulty": "medium",
  "time_limit": 60
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "subject": "math",
    "status": "active",
    "questions": [ ... ],
    "created_at": "..."
  }
}
```

---

#### GET /api/practice/sessions

获取会话列表

**查询参数**:
- `page` (可选)
- `pageSize` (可选)
- `status` (可选): active | completed | expired

---

#### GET /api/practice/sessions/:id

获取单个会话详情

---

#### PUT /api/practice/sessions/:id

更新会话状态

**请求体**:
```json
{
  "status": "completed"
}
```

---

#### DELETE /api/practice/sessions/:id

删除会话

---

#### POST /api/practice/sessions/:id/questions

添加问题到会话

**请求体**:
```json
{
  "question_id": 1,
  "question_content": "...",
  "question_type": "choice"
}
```

---

#### POST /api/practice/sessions/:id/answers

提交答案

**请求体**:
```json
{
  "question_id": 1,
  "answer": "A",
  "time_spent": 30
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "correct": true,
    "correct_answer": "A",
    "explanation": "解析内容...",
    "points_earned": 10
  }
}
```

---

#### GET /api/practice/sessions/:id/answers

获取答题记录

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "question_id": 1,
      "user_answer": "A",
      "correct_answer": "A",
      "is_correct": true,
      "time_spent": 30,
      "submitted_at": "..."
    }
  ]
}
```

---

## 附录

### 科目代码

| 代码 | 科目 |
|------|------|
| math | 数学 |
| chinese | 语文 |
| english | 英语 |
| physics | 物理 |
| chemistry | 化学 |
| biology | 生物 |
| history | 历史 |
| geography | 地理 |
| politics | 政治 |

### 难度级别

| 级别 | 说明 |
|------|------|
| easy | 简单 |
| medium | 中等 |
| hard | 困难 |

### 任务状态

| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| in_progress | 进行中 |
| completed | 已完成 |
| skipped | 已跳过 |
| failed | 失败 |

---

**文档结束**
