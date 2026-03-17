# 后端 API 全量测试报告

> 生成时间：2026-03-17T12:34:33.405Z
> 测试执行时间：11451ms (11.45秒)
> 俊哥指令：测试进度严重落后，立即加速！

## 📊 测试结果汇总

| 指标 | 数值 |
|------|------|
| 总接口数 | 49 |
| 通过 | 24 |
| 失败 | 25 |
| 通过率 | 48.98% |
| 执行时间 | 11.45秒 |
| 平均响应时间 | 233.69ms |

## 📋 各模块测试结果

### ✅ auth 模块 (6/6) - 100.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/auth/send-code | ✅ | 200 | 87ms | {"message":"验证码已发送","hint":"验证码 5 分钟内有效"} |
| POST /api/auth/register | ✅ | 201 | 21ms | {"message":"注册成功","user":{"id":"c652fe63-45de-4785... |
| POST /api/auth/login | ✅ | 200 | 23ms | {"message":"登录成功","user":{"id":"c652fe63-45de-4785... |
| POST /api/auth/refresh | ✅ | 401 | 23ms | {"error":"未授权"} |
| GET /api/auth/me | ✅ | 200 | 16ms | {"user":{"id":"c652fe63-45de-4785-8bea-2cb1605621d... |
| PUT /api/auth/me | ✅ | 200 | 25ms | {"message":"更新成功","user":{"id":"c652fe63-45de-4785... |

### ⚠️ ai 模块 (2/4) - 50.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/ai/ask | ❌ | 500 | 10364ms | {"error":"服务器错误"} |
| GET /api/ai/history | ✅ | 200 | 18ms | {"data":[{"id":null,"user_id":"c652fe63-45de-4785-... |
| GET /api/ai/search | ❌ | 400 | 14ms | {"error":"搜索关键词不能为空"} |
| DELETE /api/ai/:id | ✅ | 404 | 13ms | {"error":"记录不存在"} |

### ⚠️ knowledge 模块 (5/6) - 83.33%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/knowledge | ✅ | 200 | 15ms | {"data":[],"total":0} |
| GET /api/knowledge/:id | ✅ | 404 | 21ms | {"error":"知识点不存在"} |
| POST /api/knowledge | ✅ | 201 | 29ms | {"message":"创建成功"} |
| PUT /api/knowledge/:id | ✅ | 404 | 25ms | {"error":"知识点不存在"} |
| DELETE /api/knowledge/:id | ✅ | 404 | 30ms | {"error":"知识点不存在"} |
| GET /api/knowledge/search | ❌ | 400 | 25ms | {"error":"搜索关键词不能为空"} |

### ⚠️ progress 模块 (2/4) - 50.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/progress | ✅ | 200 | 51ms | {"data":[]} |
| GET /api/progress/stats | ✅ | 200 | 28ms | {"data":{"totalPoints":0,"totalDuration":0,"avgCom... |
| POST /api/progress/upsert | ❌ | 400 | 16ms | {"error":"知识点 ID 不能为空"} |
| POST /api/progress/log | ❌ | 400 | 15ms | {"error":"知识点 ID 和学习时长不能为空"} |

### ⚠️ points 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/points/balance | ❌ | 404 | 13ms | {"error":"接口不存在"} |
| GET /api/points/ledger | ❌ | 404 | 15ms | {"error":"接口不存在"} |
| POST /api/points/earn | ❌ | 404 | 15ms | {"error":"接口不存在"} |
| GET /api/points/rank | ❌ | 404 | 13ms | {"error":"接口不存在"} |

### ⚠️ weakness 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/weakness/analysis | ❌ | 404 | 19ms | {"error":"接口不存在"} |
| GET /api/weakness/recommendations | ❌ | 404 | 18ms | {"error":"接口不存在"} |
| POST /api/weakness/practice | ❌ | 404 | 15ms | {"error":"接口不存在"} |
| GET /api/weakness/stats | ❌ | 404 | 16ms | {"error":"接口不存在"} |

### ⚠️ leaderboard 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/leaderboards/total | ❌ | 404 | 14ms | {"error":"接口不存在"} |
| GET /api/leaderboards/weekly | ❌ | 404 | 20ms | {"error":"接口不存在"} |
| GET /api/leaderboards/monthly | ❌ | 404 | 15ms | {"error":"接口不存在"} |
| GET /api/leaderboards/subject/:subject | ❌ | 404 | 14ms | {"error":"接口不存在"} |

### ⚠️ textbooks 模块 (5/6) - 83.33%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/textbooks | ✅ | 200 | 21ms | {"success":true,"data":[]} |
| GET /api/textbooks/:id | ✅ | 404 | 23ms | {"success":false,"error":"课本文本不存在"} |
| POST /api/textbooks | ❌ | 404 | 18ms | {"error":"接口不存在"} |
| PUT /api/textbooks/:id | ✅ | 404 | 15ms | {"error":"接口不存在"} |
| DELETE /api/textbooks/:id | ✅ | 404 | 13ms | {"success":false,"error":"课本不存在"} |
| GET /api/textbooks/:id/units | ✅ | 404 | 13ms | {"success":false,"error":"课本不存在"} |

### ✅ upload 模块 (3/3) - 100.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/upload/textbook | ✅ | 400 | 29ms | {"error":"缺少必要参数"} |
| POST /api/upload/avatar | ✅ | 400 | 21ms | {"error":"缺少用户 ID"} |
| POST /api/upload/attachment | ✅ | 400 | 28ms | {"error":"缺少实体类型或 ID"} |

### ⚠️ ai-gateway 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/ai-gateway/generate | ❌ | 404 | 17ms | {"error":"接口不存在"} |
| POST /api/ai-gateway/parse | ❌ | 404 | 22ms | {"error":"接口不存在"} |
| POST /api/ai-gateway/analyze | ❌ | 404 | 14ms | {"error":"接口不存在"} |
| GET /api/ai-gateway/models | ❌ | 404 | 15ms | {"error":"接口不存在"} |

### ⚠️ health 模块 (1/4) - 25.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/health | ✅ | 200 | 14ms | {"status":"ok","timestamp":"2026-03-17T12:34:33.33... |
| GET /api/health/db | ❌ | 404 | 15ms | {"error":"接口不存在"} |
| GET /api/health/redis | ❌ | 404 | 20ms | {"error":"接口不存在"} |
| GET /api/health/uptime | ❌ | 404 | 15ms | {"error":"接口不存在"} |

## 🔍 失败详情

### ❌ ai - POST /api/ai/ask
- 状态码：500
- 响应时间：10364ms
- 错误：{"error":"服务器错误"}

### ❌ ai - GET /api/ai/search
- 状态码：400
- 响应时间：14ms
- 错误：{"error":"搜索关键词不能为空"}

### ❌ knowledge - GET /api/knowledge/search
- 状态码：400
- 响应时间：25ms
- 错误：{"error":"搜索关键词不能为空"}

### ❌ progress - POST /api/progress/upsert
- 状态码：400
- 响应时间：16ms
- 错误：{"error":"知识点 ID 不能为空"}

### ❌ progress - POST /api/progress/log
- 状态码：400
- 响应时间：15ms
- 错误：{"error":"知识点 ID 和学习时长不能为空"}

### ❌ points - GET /api/points/balance
- 状态码：404
- 响应时间：13ms
- 错误：{"error":"接口不存在"}

### ❌ points - GET /api/points/ledger
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

### ❌ points - POST /api/points/earn
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

### ❌ points - GET /api/points/rank
- 状态码：404
- 响应时间：13ms
- 错误：{"error":"接口不存在"}

### ❌ weakness - GET /api/weakness/analysis
- 状态码：404
- 响应时间：19ms
- 错误：{"error":"接口不存在"}

### ❌ weakness - GET /api/weakness/recommendations
- 状态码：404
- 响应时间：18ms
- 错误：{"error":"接口不存在"}

### ❌ weakness - POST /api/weakness/practice
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

### ❌ weakness - GET /api/weakness/stats
- 状态码：404
- 响应时间：16ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/total
- 状态码：404
- 响应时间：14ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/weekly
- 状态码：404
- 响应时间：20ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/monthly
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/subject/:subject
- 状态码：404
- 响应时间：14ms
- 错误：{"error":"接口不存在"}

### ❌ textbooks - POST /api/textbooks
- 状态码：404
- 响应时间：18ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - POST /api/ai-gateway/generate
- 状态码：404
- 响应时间：17ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - POST /api/ai-gateway/parse
- 状态码：404
- 响应时间：22ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - POST /api/ai-gateway/analyze
- 状态码：404
- 响应时间：14ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - GET /api/ai-gateway/models
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

### ❌ health - GET /api/health/db
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

### ❌ health - GET /api/health/redis
- 状态码：404
- 响应时间：20ms
- 错误：{"error":"接口不存在"}

### ❌ health - GET /api/health/uptime
- 状态码：404
- 响应时间：15ms
- 错误：{"error":"接口不存在"}

## 📝 测试说明

- 测试环境：本地开发环境
- 测试模式：自动化集成测试
- 认证方式：JWT Token
- 数据清理：测试数据已隔离

---
*报告由 api-full-test.js 自动生成*
