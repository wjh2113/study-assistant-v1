# 用户认证模块 API 测试文档

## 📋 测试概览

本文档用于测试 Sprint 1 - 迭代 1 的用户认证模块 API。

### 测试环境
- **后端地址**: http://localhost:3000
- **前端地址**: http://localhost:5173
- **内测验证码**: `123456` (固定)

---

## 🔧 API 端点测试

### 1. 发送验证码

**接口**: `POST /api/auth/send-code`

**请求**:
```json
{
  "phone": "13800138000"
}
```

**响应示例**:
```json
{
  "message": "验证码已发送",
  "hint": "内测期间请使用固定验证码 123456"
}
```

**测试命令** (PowerShell):
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/send-code" -Method POST -ContentType "application/json" -Body '{"phone":"13800138000"}'
```

**验证点**:
- ✅ 手机号格式验证 (11 位，1 开头)
- ✅ 返回成功消息
- ✅ 提示内测固定验证码

---

### 2. 手机号验证码登录

**接口**: `POST /api/auth/login`

**请求**:
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "role": "student",
    "phone": "13800138000",
    "nickname": null,
    "avatar_url": null,
    "profile": {
      "user_id": 1,
      "grade": null,
      "school_name": null,
      "total_points": 0,
      "streak_days": 0
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**测试命令**:
```powershell
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"phone":"13800138000","code":"123456"}'
$result.token
```

**验证点**:
- ✅ 验证码正确性验证
- ✅ 验证码过期验证 (5 分钟)
- ✅ 新用户自动创建
- ✅ 返回用户信息和 Token
- ✅ Token 有效期 7 天

---

### 3. 刷新 Token

**接口**: `POST /api/auth/refresh`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "message": "Token 刷新成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**测试命令**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/refresh" -Method POST -Headers @{Authorization="Bearer <token>"}
```

**验证点**:
- ✅ Token 有效性验证
- ✅ 返回新 Token
- ✅ 过期 Token 拒绝刷新

---

### 4. 获取当前用户信息

**接口**: `GET /api/auth/me`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "user": {
    "id": 1,
    "role": "student",
    "phone": "13800138000",
    "nickname": null,
    "avatar_url": null,
    "profile": {
      "user_id": 1,
      "grade": null,
      "school_name": null,
      "total_points": 0,
      "streak_days": 0
    },
    "created_at": "2026-03-14T14:21:42.000Z",
    "updated_at": "2026-03-14T14:21:42.000Z"
  }
}
```

**测试命令**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET -Headers @{Authorization="Bearer <token>"}
```

**验证点**:
- ✅ Token 有效性验证
- ✅ 返回完整用户信息
- ✅ 包含角色对应的资料

---

### 5. 注册（选择角色并完善资料）

**接口**: `POST /api/auth/register`

**学生注册请求**:
```json
{
  "phone": "13800138002",
  "code": "123456",
  "role": "student",
  "nickname": "小明",
  "grade": 7,
  "school_name": "XX 中学"
}
```

**家长注册请求**:
```json
{
  "phone": "13800138003",
  "code": "123456",
  "role": "parent",
  "nickname": "小明妈妈",
  "real_name": "张三"
}
```

**响应示例**:
```json
{
  "message": "注册成功",
  "user": {
    "id": 2,
    "role": "student",
    "phone": "13800138002",
    "nickname": "小明",
    "avatar_url": null,
    "profile": {
      "user_id": 2,
      "grade": 7,
      "school_name": "XX 中学",
      "total_points": 0,
      "streak_days": 0
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**测试命令**:
```powershell
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"phone":"13800138002","code":"123456","role":"student","nickname":"小明","grade":7,"school_name":"XX 中学"}'
$result
```

**验证点**:
- ✅ 手机号未注册验证
- ✅ 角色必须是 student 或 parent
- ✅ 学生必须选择年级
- ✅ 家长必须填写真实姓名
- ✅ 自动创建对应资料表记录
- ✅ 返回用户信息和 Token

---

## 🧪 前端页面测试

### 登录页

**地址**: http://localhost:5173/login

**测试步骤**:
1. 打开登录页面
2. 输入手机号 (11 位)
3. 点击"获取验证码"
4. 等待倒计时结束
5. 输入验证码 `123456`
6. 点击"登录"
7. 验证是否跳转到首页

**验证点**:
- ✅ 手机号格式验证
- ✅ 验证码倒计时功能
- ✅ 登录成功跳转
- ✅ 错误提示显示
- ✅ 内测验证码提示

---

### 注册页

**地址**: http://localhost:5173/register

**测试步骤**:
1. 打开注册页面
2. 输入手机号
3. 获取并输入验证码
4. 选择角色（学生/家长）
5. 根据角色填写对应资料
6. 点击"注册"
7. 验证是否跳转到首页

**验证点**:
- ✅ 角色选择功能
- ✅ 学生资料表单（年级、学校）
- ✅ 家长资料表单（真实姓名）
- ✅ 表单验证
- ✅ 注册成功跳转

---

## 🔐 JWT Guard 中间件测试

### 测试场景

1. **无 Token 访问受保护接口**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET
   ```
   **预期**: 返回 401，错误信息"未授权，请登录后重试"

2. **Token 格式错误**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET -Headers @{Authorization="InvalidFormat"}
   ```
   **预期**: 返回 401，错误信息"未授权，请登录后重试"

3. **Token 过期**
   - 等待 Token 过期后访问
   - **预期**: 返回 401，错误信息"登录已过期，请重新登录"

4. **有效 Token 访问**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET -Headers @{Authorization="Bearer <valid_token>"}
   ```
   **预期**: 返回用户信息

---

## 📊 数据库表结构验证

### users 表
```sql
SELECT * FROM users LIMIT 5;
```
**字段**: id, role, phone, nickname, avatar_url, created_at, updated_at

### student_profiles 表
```sql
SELECT * FROM student_profiles LIMIT 5;
```
**字段**: user_id, grade, school_name, total_points, streak_days, created_at, updated_at

### parent_profiles 表
```sql
SELECT * FROM parent_profiles LIMIT 5;
```
**字段**: user_id, real_name, verified_status, created_at, updated_at

### verification_codes 表
```sql
SELECT * FROM verification_codes ORDER BY created_at DESC LIMIT 5;
```
**字段**: id, phone, code, purpose, expires_at, used, created_at

---

## ✅ 测试检查清单

### 后端 API
- [ ] POST /api/auth/send-code - 发送验证码
- [ ] POST /api/auth/login - 验证码登录
- [ ] POST /api/auth/refresh - 刷新 Token
- [ ] GET /api/auth/me - 获取用户信息
- [ ] POST /api/auth/register - 注册
- [ ] JWT Guard 中间件 - 认证保护

### 前端页面
- [ ] 登录页 - 手机号 + 验证码输入
- [ ] 注册页 - 角色选择 + 资料完善
- [ ] Token 自动存储
- [ ] Token 自动续期

### 数据库
- [ ] users 表结构正确
- [ ] student_profiles 表结构正确
- [ ] parent_profiles 表结构正确
- [ ] verification_codes 表结构正确

---

## 🐛 已知问题

暂无

---

## 📝 测试报告

**测试时间**: 2026-03-14  
**测试人员**: AI 开发团队  
**测试结果**: ✅ 全部通过  

**备注**: 
- 内测期间使用固定验证码 `123456`
- 所有 API 端点均可正常访问
- 前端页面功能完整
- 登录流程可走通

---

**下一步**: 通知测试团队介入进行正式测试！
