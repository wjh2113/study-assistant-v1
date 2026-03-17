# 📖 StudyAss 学习助手 - 用户使用指南

**版本**: 1.0.0  
**最后更新**: 2026-03-17

---

## 📋 目录

1. [快速入门](#快速入门)
2. [用户注册与登录](#用户注册与登录)
3. [核心功能使用](#核心功能使用)
4. [AI 功能使用指南](#ai-功能使用指南)
5. [积分与排行榜](#积分与排行榜)
6. [常见问题](#常见问题)
7. [最佳实践](#最佳实践)

---

## 快速入门

### 1.1 什么是 StudyAss？

StudyAss 是一款 AI 驱动的智能学习助手，提供以下核心功能：

- 📚 **知识点管理** - 系统化管理各学科知识点
- 🤖 **AI 答疑** - 随时解答学习问题
- 📝 **AI 出题** - 智能生成练习题
- 📊 **学习规划** - 个性化学习计划
- 📈 **薄弱点分析** - 精准定位知识盲区
- 🏆 **积分排行榜** - 激励学习动力

### 1.2 访问方式

- **Web 端**: https://studyass.com
- **API**: https://api.studyass.com/api
- **移动端**: React Native APP（开发中）

### 1.3 系统要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 稳定的网络连接
- 手机号（用于注册登录）

---

## 用户注册与登录

### 2.1 注册账号

#### 步骤

1. 访问 StudyAss 官网或 APP
2. 点击「注册」按钮
3. 输入手机号
4. 获取并输入验证码
5. 填写基本信息（昵称、年级、学校）
6. 完成注册

#### 注册请求示例

```bash
curl -X POST https://api.studyass.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456",
    "nickname": "小明",
    "grade": 10,
    "school_name": "XX 中学"
  }'
```

#### 注册响应

```json
{
  "message": "注册成功",
  "user": {
    "id": 1,
    "role": "STUDENT",
    "phone": "13800138000",
    "nickname": "小明",
    "avatar_url": null,
    "profile": {
      "grade": 10,
      "school_name": "XX 中学"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.2 登录

#### 步骤

1. 打开 StudyAss
2. 点击「登录」
3. 输入手机号
4. 获取并输入验证码
5. 登录成功

#### 登录请求示例

```bash
curl -X POST https://api.studyass.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456"
  }'
```

### 2.3 Token 管理

登录后获得的 Token 有效期为 7 天，需要在请求头中携带：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 刷新 Token

Token 即将过期时，可以刷新：

```bash
curl -X POST https://api.studyass.com/api/auth/refresh \
  -H "Authorization: Bearer YOUR_CURRENT_TOKEN"
```

---

## 核心功能使用

### 3.1 知识点管理

#### 查看知识点列表

```bash
curl https://api.studyass.com/api/knowledge \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 搜索知识点

```bash
curl "https://api.studyass.com/api/knowledge/search?keyword=二次函数" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 创建知识点

```bash
curl -X POST https://api.studyass.com/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "二次函数",
    "subject": "math",
    "grade": 10,
    "description": "形如 y=ax²+bx+c 的函数"
  }'
```

### 3.2 学习进度跟踪

#### 更新学习进度

```bash
curl -X POST https://api.studyass.com/api/progress/upsert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "knowledge_point_id": 1,
    "mastery": 0.8,
    "last_reviewed_at": "2026-03-17T12:00:00.000Z"
  }'
```

#### 记录学习时长

```bash
curl -X POST https://api.studyass.com/api/progress/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "math",
    "duration": 60,
    "description": "完成二次函数练习"
  }'
```

#### 查看学习统计

```bash
curl https://api.studyass.com/api/progress/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 课本解析

#### 上传 PDF 课本

```bash
curl -X POST https://api.studyass.com/api/textbooks/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@math_textbook.pdf" \
  -F "title=高中数学必修一"
```

#### 查看解析进度

```bash
curl https://api.studyass.com/api/textbooks/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 查看课本单元

```bash
curl https://api.studyass.com/api/textbooks/TEXTBOOK_ID/units \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## AI 功能使用指南

### 4.1 AI 答疑

#### 提问

```bash
curl -X POST https://api.studyass.com/api/ai/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "question": "如何解一元二次方程？",
    "context": {
      "subject": "math",
      "grade": 10
    }
  }'
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 1,
    "question": "如何解一元二次方程？",
    "answer": "解一元二次方程有三种常用方法：\n1. 因式分解法\n2. 配方法\n3. 公式法：x = (-b ± √(b²-4ac)) / 2a\n...",
    "created_at": "2026-03-17T12:00:00.000Z"
  }
}
```

#### 查看问答历史

```bash
curl "https://api.studyass.com/api/ai/history?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.2 AI 出题

#### 生成题目

```bash
curl -X POST https://api.studyass.com/api/ai/generate-questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "knowledge_point_id": 1,
    "question_type": "choice",
    "difficulty": "medium",
    "count": 5
  }'
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "task_id": "task_123",
    "status": "completed",
    "questions": [
      {
        "id": 1,
        "content": "二次函数 y = x² - 4x + 3 的顶点坐标是？",
        "type": "choice",
        "options": ["A. (2, -1)", "B. (-2, 1)", "C. (2, 1)", "D. (-2, -1)"],
        "answer": "A",
        "explanation": "..."
      }
    ]
  }
}
```

#### 查看任务状态

```bash
curl https://api.studyass.com/api/ai/task-logs/task_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 AI 学习规划

#### 生成学习计划

```bash
curl -X POST https://api.studyass.com/api/ai/planning/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
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
      "include_weekend": true
    }
  }'
```

#### 查看每日任务

```bash
curl https://api.studyass.com/api/ai/planning/daily-tasks/2026-03-17 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 更新任务状态

```bash
curl -X PUT https://api.studyass.com/api/ai/planning/tasks/TASK_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "score": 85,
    "actual_time": 25
  }'
```

#### 查看计划进度

```bash
curl https://api.studyass.com/api/ai/planning/PLAN_ID/progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4 薄弱点分析

#### 分析薄弱点

```bash
curl https://api.studyass.com/api/weakness/analyze \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "weak_areas": [
      {
        "knowledge_point_id": 1,
        "knowledge_point_name": "二次函数",
        "mastery": 0.3,
        "recommendation": "建议加强练习，重点掌握顶点坐标和对称轴"
      },
      {
        "knowledge_point_id": 2,
        "knowledge_point_name": "三角函数",
        "mastery": 0.4,
        "recommendation": "建议复习基本公式和图像性质"
      }
    ]
  }
}
```

#### 获取推荐题目

```bash
curl https://api.studyass.com/api/weakness/recommend \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 查看掌握度趋势

```bash
curl https://api.studyass.com/api/weakness/trend/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 积分与排行榜

### 5.1 获取积分

#### 积分来源

| 行为 | 积分 | 说明 |
|------|------|------|
| 每日打卡 | 10 | 首次打卡 |
| 连续打卡 | +5~50 | 连续天数奖励 |
| 完成练习 | 5~20 | 根据正确率 |
| AI 答疑 | 2 | 每次提问 |
| 上传课本 | 50 | 首次上传 |

#### 查看我的积分

```bash
curl https://api.studyass.com/api/points/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 每日打卡

```bash
curl -X POST https://api.studyass.com/api/points/check-in \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 查看积分记录

```bash
curl "https://api.studyass.com/api/points/records?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 排行榜

#### 查看总排行榜

```bash
curl https://api.studyass.com/api/leaderboard/total \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 查看周排行榜

```bash
curl https://api.studyass.com/api/leaderboard/weekly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 查看月排行榜

```bash
curl https://api.studyass.com/api/leaderboard/monthly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 查看我的排名

```bash
curl https://api.studyass.com/api/leaderboard/me/rank \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 响应示例

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

## 练习会话

### 6.1 创建练习会话

```bash
curl -X POST https://api.studyass.com/api/practice/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "math",
    "knowledge_point_ids": [1, 2, 3],
    "question_count": 10,
    "difficulty": "medium",
    "time_limit": 60
  }'
```

### 6.2 提交答案

```bash
curl -X POST https://api.studyass.com/api/practice/sessions/SESSION_ID/answers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "question_id": 1,
    "answer": "A",
    "time_spent": 30
  }'
```

### 6.3 查看答题记录

```bash
curl https://api.studyass.com/api/practice/sessions/SESSION_ID/answers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 文件上传

### 7.1 上传头像

```bash
curl -X POST https://api.studyass.com/api/upload/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@avatar.jpg" \
  -F "userId=1"
```

### 7.2 上传附件

```bash
curl -X POST https://api.studyass.com/api/upload/attachment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@notes.pdf" \
  -F "entityType=knowledge" \
  -F "entityId=1"
```

---

## 常见问题

### Q1: 验证码收不到怎么办？

**A**: 
1. 检查手机号是否正确
2. 检查短信垃圾箱
3. 等待 60 秒后重新发送
4. 如多次失败，请联系客服

### Q2: Token 过期了怎么办？

**A**: 
1. 使用刷新接口获取新 Token
2. 或重新登录获取 Token

### Q3: AI 出题失败怎么办？

**A**: 
1. 检查网络连接
2. 确认知识点 ID 有效
3. 检查速率限制（每小时最多 10 次）
4. 稍后重试

### Q4: 如何修改个人信息？

**A**: 
```bash
curl -X PUT https://api.studyass.com/api/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "nickname": "新昵称",
    "avatar_url": "https://..."
  }'
```

### Q5: 如何删除账号？

**A**: 请联系客服申请账号注销。

### Q6: 学习计划如何调整？

**A**: 
```bash
curl -X POST https://api.studyass.com/api/ai/planning/PLAN_ID/adjust \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "adjustment_type": "reduce_load",
    "reason": "学习时间不足",
    "changes": {
      "daily_time_limit": 45
    }
  }'
```

### Q7: 积分有什么用？

**A**: 
- 提升等级
- 排行榜排名
- 未来可兑换学习资源（规划中）

### Q8: 支持哪些科目？

**A**: 
- 数学、语文、英语
- 物理、化学、生物
- 历史、地理、政治

---

## 最佳实践

### 8.1 高效学习建议

1. **每日打卡** - 保持学习连续性
2. **制定计划** - 使用 AI 学习规划功能
3. **及时复习** - 根据薄弱点分析针对性练习
4. **善用 AI** - 遇到问题先问 AI 助手
5. **记录进度** - 定期更新学习进度

### 8.2 使用技巧

#### 提问技巧

❌ 不好的提问：
> "这道题怎么做？"

✅ 好的提问：
> "二次函数 y = x² - 4x + 3 的顶点坐标怎么求？我尝试了配方法但算不出来。"

#### 出题技巧

- 从薄弱知识点开始
- 难度循序渐进
- 每次 5-10 题为宜
- 做完及时查看答案解析

#### 计划执行

- 每天固定时间学习
- 完成每日任务后打卡
- 周末适当调整进度
- 定期查看进度报告

### 8.3 数据导出

如需导出个人学习数据，请联系客服申请。

---

## 附录

### A. API 速率限制

| 接口 | 限制 |
|------|------|
| 发送验证码 | 5 次/分钟 |
| AI 出题 | 10 次/小时 |
| AI 答疑 | 50 次/小时 |
| 上传课本 | 5 次/小时 |
| 其他接口 | 100 次/分钟 |

### B. 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token 无效 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

### C. 支持联系方式

- 📧 邮箱：support@studyass.com
- 💬 客服微信：studyass-support
- 📱 电话：400-XXX-XXXX

---

**用户使用指南结束**

祝您学习进步！📚✨
