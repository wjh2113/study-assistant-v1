# 📚 学习助手 API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **请求格式**: JSON (`Content-Type: application/json`)

## 认证说明

除登录/注册接口外，所有接口需要在请求头中携带 JWT Token：

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 用户认证模块 (Auth)

### 发送验证码
```http
POST /api/auth/send-code
Content-Type: application/json

{
  "phone": "13800138000"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456",
  "username": "张三",
  "password": "securePassword123",
  "role": "STUDENT"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "username": "张三", "role": "STUDENT" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "securePassword123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "username": "张三", "role": "STUDENT" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "张三",
    "phone": "13800138000",
    "role": "STUDENT",
    "avatar": "https://..."
  }
}
```

### 更新用户信息
```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "新名字",
  "avatar": "https://..."
}
```

---

## 👥 用户管理模块 (Users)

### 获取用户列表
```http
GET /api/users?page=1&limit=20
Authorization: Bearer <token>
```

### 获取用户详情
```http
GET /api/users/:id
Authorization: Bearer <token>
```

---

## 📖 课本管理模块 (Textbooks)

### 创建课本
```http
POST /api/textbooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "人教版英语七年级上册",
  "subject": "ENGLISH",
  "grade": "GRADE_7",
  "version": "2024 秋",
  "coverUrl": "https://..."
}
```

### 查询课本列表
```http
GET /api/textbooks?subject=ENGLISH&grade=GRADE_7&status=READY
Authorization: Bearer <token>
```

### 查询课本详情
```http
GET /api/textbooks/:id
Authorization: Bearer <token>
```

### 更新课本
```http
POST /api/textbooks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "更新后的标题",
  "status": "READY"
}
```

### 删除课本
```http
DELETE /api/textbooks/:id
Authorization: Bearer <token>
```

### 解析课本 PDF
```http
POST /api/textbooks/:id/parse
Authorization: Bearer <token>
```

### 获取单元树
```http
GET /api/textbooks/:id/units
Authorization: Bearer <token>
```

### 创建单元
```http
POST /api/textbooks/:id/units
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "第一单元",
  "unitNumber": "Unit 1",
  "pageStart": 1,
  "pageEnd": 10,
  "parentId": null
}
```

### 更新单元
```http
POST /api/textbooks/units/:unitId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "更新后的单元名",
  "pageStart": 5
}
```

### 删除单元
```http
DELETE /api/textbooks/units/:unitId
Authorization: Bearer <token>
```

---

## 📝 习题管理模块 (Exercises)

### 创建习题
```http
POST /api/exercises
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "习题标题",
  "type": "SINGLE_CHOICE",
  "content": "题目内容",
  "options": ["A. 选项 1", "B. 选项 2", "C. 选项 3", "D. 选项 4"],
  "answer": "A",
  "analysis": "解析内容",
  "knowledgePointIds": [1, 2],
  "difficulty": "MEDIUM"
}
```

### 查询习题列表
```http
GET /api/exercises?knowledgePointId=1&difficulty=MEDIUM
Authorization: Bearer <token>
```

### 查询习题详情
```http
GET /api/exercises/:id
Authorization: Bearer <token>
```

---

## ❌ 错题管理模块 (Wrong Questions)

### 添加错题
```http
POST /api/wrong-questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "exerciseId": 1,
  "userAnswer": "B",
  "wrongReason": "概念不清"
}
```

### 查询我的错题
```http
GET /api/wrong-questions/my
Authorization: Bearer <token>
```

### 标记已掌握
```http
POST /api/wrong-questions/:id/master
Authorization: Bearer <token>
```

---

## 📊 学习进度模块 (Learning)

### 记录学习进度
```http
POST /api/learning/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "knowledgePointId": 1,
  "status": "LEARNING",
  "mastery": 60
}
```

### 获取学习统计
```http
GET /api/learning/stats
Authorization: Bearer <token>
```

---

## 🎯 练习模块 (Practice)

### 开始练习
```http
POST /api/practice/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "knowledgePointIds": [1, 2, 3],
  "questionCount": 10,
  "difficulty": "MEDIUM"
}
```

### 提交答案
```http
POST /api/practice/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "practiceId": 1,
  "answers": [
    { "exerciseId": 1, "userAnswer": "A" },
    { "exerciseId": 2, "userAnswer": "C" }
  ]
}
```

### 获取练习结果
```http
GET /api/practice/:id/result
Authorization: Bearer <token>
```

---

## 🏆 积分模块 (Points)

### 获取我的积分
```http
GET /api/points/me
Authorization: Bearer <token>
```

### 获取积分记录
```http
GET /api/points/records?page=1&limit=20
Authorization: Bearer <token>
```

### 每日打卡
```http
POST /api/points/check-in
Authorization: Bearer <token>
```

### 记录练习积分
```http
POST /api/points/practice
Authorization: Bearer <token>
Content-Type: application/json

{
  "practiceId": 1,
  "score": 90
}
```

---

## 👨‍👩‍👧 家庭模块 (Family)

### 绑定家庭关系
```http
POST /api/family/bind
Authorization: Bearer <token>
Content-Type: application/json

{
  "childPhone": "13800138000",
  "relation": "PARENT"
}
```

### 查看家庭成员
```http
GET /api/family/members
Authorization: Bearer <token>
```

---

## 📁 文件管理模块 (Files)

### 上传文件
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

### 获取文件列表
```http
GET /api/files?type=image
Authorization: Bearer <token>
```

### 删除文件
```http
DELETE /api/files/:id
Authorization: Bearer <token>
```

---

## 📈 排行榜模块 (Leaderboard)

### 总排行榜
```http
GET /api/leaderboard/total?limit=10
Authorization: Bearer <token>
```

### 周排行榜
```http
GET /api/leaderboard/weekly?limit=10
Authorization: Bearer <token>
```

### 我的排名
```http
GET /api/leaderboard/me/rank
Authorization: Bearer <token>
```

---

## 🔍 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "资源不存在"
  }
}
```

---

## 📋 枚举值说明

### 用户角色 (Role)
- `STUDENT` - 学生
- `PARENT` - 家长
- `TEACHER` - 老师
- `ADMIN` - 管理员

### 科目 (Subject)
- `CHINESE` - 语文
- `MATH` - 数学
- `ENGLISH` - 英语
- `PHYSICS` - 物理
- `CHEMISTRY` - 化学
- `BIOLOGY` - 生物
- `HISTORY` - 历史
- `GEOGRAPHY` - 地理
- `POLITICS` - 政治

### 年级 (Grade)
- `GRADE_1` ~ `GRADE_12` - 一年级到十二年级

### 习题类型 (ExerciseType)
- `SINGLE_CHOICE` - 单选题
- `MULTIPLE_CHOICE` - 多选题
- `FILL_BLANK` - 填空题
- `TRUE_FALSE` - 判断题
- `SHORT_ANSWER` - 简答题

### 难度 (Difficulty)
- `EASY` - 简单
- `MEDIUM` - 中等
- `HARD` - 困难

### 课本状态 (TextbookStatus)
- `PENDING` - 待处理
- `PROCESSING` - 处理中
- `READY` - 就绪
- `FAILED` - 失败

---

**文档版本**: v1.0  
**最后更新**: 2026-03-15
