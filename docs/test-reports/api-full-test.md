# 后端 API 全量测试报告

> 生成时间：2026-03-15T00:39:56.453Z
> 测试执行时间：883ms (0.88秒)
> 俊哥指令：测试进度严重落后，立即加速！

## 📊 测试结果汇总

| 指标 | 数值 |
|------|------|
| 总接口数 | 49 |
| 通过 | 6 |
| 失败 | 43 |
| 通过率 | 12.24% |
| 执行时间 | 0.88秒 |
| 平均响应时间 | 18.02ms |

## 📋 各模块测试结果

### ⚠️ auth 模块 (2/6) - 33.33%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/auth/send-code | ✅ | 200 | 119ms | {"message":"验证码已发送","hint":"验证码 5 分钟内有效"} |
| POST /api/auth/register | ❌ | 500 | 23ms | {"error":"服务器错误"} |
| POST /api/auth/login | ❌ | 500 | 22ms | {"error":"服务器错误"} |
| POST /api/auth/refresh | ✅ | 401 | 25ms | {"error":"未授权"} |
| GET /api/auth/me | ❌ | 401 | 15ms | {"error":"无效的令牌"} |
| PUT /api/auth/me | ❌ | 401 | 15ms | {"error":"无效的令牌"} |

### ⚠️ ai 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/ai/ask | ❌ | 401 | 17ms | {"error":"无效的令牌"} |
| GET /api/ai/history | ❌ | 401 | 15ms | {"error":"无效的令牌"} |
| GET /api/ai/search | ❌ | 401 | 18ms | {"error":"无效的令牌"} |
| DELETE /api/ai/:id | ❌ | 401 | 26ms | {"error":"无效的令牌"} |

### ⚠️ knowledge 模块 (0/6) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/knowledge | ❌ | 401 | 15ms | {"error":"无效的令牌"} |
| GET /api/knowledge/:id | ❌ | 401 | 15ms | {"error":"无效的令牌"} |
| POST /api/knowledge | ❌ | 401 | 15ms | {"error":"无效的令牌"} |
| PUT /api/knowledge/:id | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| DELETE /api/knowledge/:id | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| GET /api/knowledge/search | ❌ | 401 | 21ms | {"error":"无效的令牌"} |

### ⚠️ progress 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/progress | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| GET /api/progress/stats | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| POST /api/progress/upsert | ❌ | 401 | 13ms | {"error":"无效的令牌"} |
| POST /api/progress/log | ❌ | 401 | 12ms | {"error":"无效的令牌"} |

### ⚠️ points 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/points/balance | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| GET /api/points/ledger | ❌ | 401 | 14ms | {"error":"无效的令牌"} |
| POST /api/points/earn | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| GET /api/points/rank | ❌ | 401 | 18ms | {"error":"无效的令牌"} |

### ⚠️ weakness 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/weakness/analysis | ❌ | 401 | 15ms | {"error":"无效的令牌"} |
| GET /api/weakness/recommendations | ❌ | 401 | 11ms | {"error":"无效的令牌"} |
| POST /api/weakness/practice | ❌ | 401 | 11ms | {"error":"无效的令牌"} |
| GET /api/weakness/stats | ❌ | 401 | 11ms | {"error":"无效的令牌"} |

### ⚠️ leaderboard 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/leaderboards/total | ❌ | 404 | 12ms | {"error":"接口不存在"} |
| GET /api/leaderboards/weekly | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| GET /api/leaderboards/monthly | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| GET /api/leaderboards/subject/:subject | ❌ | 404 | 12ms | {"error":"接口不存在"} |

### ⚠️ textbooks 模块 (0/6) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/textbooks | ❌ | 401 | 14ms | {"error":"无效的令牌"} |
| GET /api/textbooks/:id | ❌ | 401 | 11ms | {"error":"无效的令牌"} |
| POST /api/textbooks | ❌ | 401 | 11ms | {"error":"无效的令牌"} |
| PUT /api/textbooks/:id | ❌ | 401 | 12ms | {"error":"无效的令牌"} |
| DELETE /api/textbooks/:id | ❌ | 401 | 11ms | {"error":"无效的令牌"} |
| GET /api/textbooks/:id/units | ❌ | 401 | 11ms | {"error":"无效的令牌"} |

### ✅ upload 模块 (3/3) - 100.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/upload/textbook | ✅ | 400 | 26ms | {"error":"缺少必要参数"} |
| POST /api/upload/avatar | ✅ | 400 | 16ms | {"error":"缺少用户 ID"} |
| POST /api/upload/attachment | ✅ | 400 | 19ms | {"error":"缺少实体类型或 ID"} |

### ⚠️ ai-gateway 模块 (0/4) - 0.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| POST /api/ai-gateway/generate | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| POST /api/ai-gateway/parse | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| POST /api/ai-gateway/analyze | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| GET /api/ai-gateway/models | ❌ | 404 | 10ms | {"error":"接口不存在"} |

### ⚠️ health 模块 (1/4) - 25.00%

| 接口 | 状态 | 响应码 | 响应时间 | 错误信息 |
|------|------|--------|----------|----------|
| GET /api/health | ✅ | 200 | 12ms | {"status":"ok","timestamp":"2026-03-15T00:39:56.40... |
| GET /api/health/db | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| GET /api/health/redis | ❌ | 404 | 11ms | {"error":"接口不存在"} |
| GET /api/health/uptime | ❌ | 404 | 14ms | {"error":"接口不存在"} |

## 🔍 失败详情

### ❌ auth - POST /api/auth/register
- 状态码：500
- 响应时间：23ms
- 错误：{"error":"服务器错误"}

### ❌ auth - POST /api/auth/login
- 状态码：500
- 响应时间：22ms
- 错误：{"error":"服务器错误"}

### ❌ auth - GET /api/auth/me
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ auth - PUT /api/auth/me
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ ai - POST /api/ai/ask
- 状态码：401
- 响应时间：17ms
- 错误：{"error":"无效的令牌"}

### ❌ ai - GET /api/ai/history
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ ai - GET /api/ai/search
- 状态码：401
- 响应时间：18ms
- 错误：{"error":"无效的令牌"}

### ❌ ai - DELETE /api/ai/:id
- 状态码：401
- 响应时间：26ms
- 错误：{"error":"无效的令牌"}

### ❌ knowledge - GET /api/knowledge
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ knowledge - GET /api/knowledge/:id
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ knowledge - POST /api/knowledge
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ knowledge - PUT /api/knowledge/:id
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ knowledge - DELETE /api/knowledge/:id
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ knowledge - GET /api/knowledge/search
- 状态码：401
- 响应时间：21ms
- 错误：{"error":"无效的令牌"}

### ❌ progress - GET /api/progress
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ progress - GET /api/progress/stats
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ progress - POST /api/progress/upsert
- 状态码：401
- 响应时间：13ms
- 错误：{"error":"无效的令牌"}

### ❌ progress - POST /api/progress/log
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ points - GET /api/points/balance
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ points - GET /api/points/ledger
- 状态码：401
- 响应时间：14ms
- 错误：{"error":"无效的令牌"}

### ❌ points - POST /api/points/earn
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ points - GET /api/points/rank
- 状态码：401
- 响应时间：18ms
- 错误：{"error":"无效的令牌"}

### ❌ weakness - GET /api/weakness/analysis
- 状态码：401
- 响应时间：15ms
- 错误：{"error":"无效的令牌"}

### ❌ weakness - GET /api/weakness/recommendations
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ weakness - POST /api/weakness/practice
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ weakness - GET /api/weakness/stats
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ leaderboard - GET /api/leaderboards/total
- 状态码：404
- 响应时间：12ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/weekly
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/monthly
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ leaderboard - GET /api/leaderboards/subject/:subject
- 状态码：404
- 响应时间：12ms
- 错误：{"error":"接口不存在"}

### ❌ textbooks - GET /api/textbooks
- 状态码：401
- 响应时间：14ms
- 错误：{"error":"无效的令牌"}

### ❌ textbooks - GET /api/textbooks/:id
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ textbooks - POST /api/textbooks
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ textbooks - PUT /api/textbooks/:id
- 状态码：401
- 响应时间：12ms
- 错误：{"error":"无效的令牌"}

### ❌ textbooks - DELETE /api/textbooks/:id
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ textbooks - GET /api/textbooks/:id/units
- 状态码：401
- 响应时间：11ms
- 错误：{"error":"无效的令牌"}

### ❌ ai-gateway - POST /api/ai-gateway/generate
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - POST /api/ai-gateway/parse
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - POST /api/ai-gateway/analyze
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ ai-gateway - GET /api/ai-gateway/models
- 状态码：404
- 响应时间：10ms
- 错误：{"error":"接口不存在"}

### ❌ health - GET /api/health/db
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ health - GET /api/health/redis
- 状态码：404
- 响应时间：11ms
- 错误：{"error":"接口不存在"}

### ❌ health - GET /api/health/uptime
- 状态码：404
- 响应时间：14ms
- 错误：{"error":"接口不存在"}

## 📝 测试说明

- 测试环境：本地开发环境
- 测试模式：自动化集成测试
- 认证方式：JWT Token
- 数据清理：测试数据已隔离

---
*报告由 api-full-test.js 自动生成*
