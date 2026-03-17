# AI Gateway V2 API 文档

## 概述

AI Gateway V2 是学习助手平台的 AI 服务网关，支持多 AI 服务商路由、健康检查、故障转移、请求限流和 Token 计数。

### 核心特性

- ✅ **多 AI 服务商支持**: 阿里云通义千问、OpenAI、Azure OpenAI、月之暗面
- ✅ **智能模型路由**: 根据任务类型自动选择最优模型
- ✅ **故障转移**: 主模型失败时自动切换到备用模型
- ✅ **健康检查**: 实时监控各 AI 服务商健康状态
- ✅ **请求限流**: 基于 Redis 的分布式限流
- ✅ **Token 计数**: 精确统计各模型 Token 使用情况

---

## 基础信息

- **Base URL**: `/api/ai/v2`
- **认证方式**: Bearer Token (JWT)
- **请求头**: `Authorization: Bearer <token>`

---

## API 端点

### 1. 生成题目

**POST** `/api/ai/v2/generate-questions`

根据课本内容生成练习题。

#### 请求参数

```json
{
  "textbookId": 123,              // 可选，课本 ID
  "textbookContent": "课本内容...", // 可选，课本内容（与 textbookId 二选一）
  "grade": "八年级",                // 必填，年级
  "subject": "物理",                // 必填，科目
  "unit": "运动和力",               // 必填，单元
  "questionCount": 5,              // 可选，题目数量，默认 5
  "difficulty": "medium",          // 可选，难度：easy/medium/hard，默认 medium
  "questionType": "choice"         // 可选，题型：choice/fill/short，默认 choice
}
```

#### 响应示例

**成功 (200)**:
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
        "question": "什么是牛顿第一定律？",
        "options": [
          "A. 物体保持静止或匀速直线运动",
          "B. 力等于质量乘以加速度",
          "C. 作用力与反作用力相等",
          "D. 重力与质量成正比"
        ],
        "answer": "A",
        "explanation": "牛顿第一定律指出，物体在不受外力作用时保持静止或匀速直线运动状态。",
        "knowledgePoint": "牛顿运动定律",
        "unit": "运动和力"
      }
    ],
    "count": 1,
    "model": "qwen-max",
    "provider": "aliyun",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 200,
      "total_tokens": 350
    },
    "latency": 1234
  }
}
```

**失败 (500)**:
```json
{
  "success": false,
  "error": "题目生成失败：API 调用超时"
}
```

**限流 (429)**:
```json
{
  "success": false,
  "error": "请求过于频繁，请稍后再试",
  "rateLimit": {
    "remaining": 0,
    "resetAt": 1710662400000
  }
}
```

---

### 2. 智能对话

**POST** `/api/ai/v2/chat`

与 AI 进行多轮对话。

#### 请求参数

```json
{
  "messages": [
    { "role": "user", "content": "什么是重力？" }
  ],
  "taskType": "chat",      // 可选，任务类型：chat/simple-question/complex-question 等
  "temperature": 0.7,      // 可选，温度，默认 0.7
  "maxTokens": 2048        // 可选，最大 Token 数，默认 2048
}
```

#### 响应示例

**成功 (200)**:
```json
{
  "success": true,
  "data": {
    "content": "重力是地球对物体的吸引力...",
    "model": "qwen-plus",
    "provider": "aliyun",
    "usage": {
      "prompt_tokens": 50,
      "completion_tokens": 100,
      "total_tokens": 150
    },
    "latency": 800
  }
}
```

---

### 3. 健康检查

**GET** `/api/ai/v2/health`

主动检测所有 AI 服务商的健康状态。

#### 响应示例

**成功 (200)**:
```json
{
  "success": true,
  "data": {
    "providers": {
      "aliyun": {
        "healthy": true,
        "latency": 120,
        "lastCheck": "2026-03-17T10:00:00.000Z"
      },
      "openai": {
        "healthy": true,
        "latency": 350,
        "lastCheck": "2026-03-17T10:00:01.000Z"
      },
      "moonshot": {
        "healthy": false,
        "error": "API Key 未配置",
        "latency": 0
      }
    },
    "tokenUsage": {
      "today": {
        "qwen-flash": 15000,
        "qwen-plus": 25000,
        "qwen-max": 10000
      },
      "date": "2026-03-17"
    },
    "timestamp": "2026-03-17T10:00:02.000Z"
  }
}
```

---

### 4. 获取状态

**GET** `/api/ai/v2/status`

获取当前健康状态（不主动检测）。

#### 响应示例

**成功 (200)**:
```json
{
  "success": true,
  "data": {
    "providers": {
      "aliyun": {
        "healthy": true,
        "lastCheck": "2026-03-17T10:00:00.000Z",
        "errorCount": 0,
        "latency": 120
      },
      "openai": {
        "healthy": true,
        "lastCheck": "2026-03-17T09:55:00.000Z",
        "errorCount": 1,
        "latency": 350
      }
    },
    "tokenUsage": {
      "today": {
        "qwen-flash": 15000,
        "qwen-plus": 25000
      },
      "date": "2026-03-17"
    },
    "timestamp": "2026-03-17T10:05:00.000Z"
  }
}
```

---

### 5. 获取 Token 使用统计

**GET** `/api/ai/v2/token-usage?date=2026-03-17`

获取指定日期的 Token 使用统计。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 否 | 日期，格式 YYYY-MM-DD，默认今天 |

#### 响应示例

**成功 (200)**:
```json
{
  "success": true,
  "data": {
    "date": "2026-03-17",
    "usage": {
      "qwen-flash": 15000,
      "qwen-plus": 25000,
      "qwen-max": 10000,
      "gpt-4": 5000
    },
    "total": 55000
  }
}
```

---

### 6. 获取任务日志

**GET** `/api/ai/v2/task-logs?page=1&pageSize=20&taskType=generate_questions_v2&status=completed`

获取用户的 AI 任务日志。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |
| taskType | string | 否 | 任务类型过滤 |
| status | string | 否 | 状态过滤：pending/processing/completed/failed |

#### 响应示例

**成功 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "user_id": 456,
      "task_type": "generate_questions_v2",
      "input": {
        "grade": "八年级",
        "subject": "物理",
        "unit": "运动和力",
        "questionCount": 5
      },
      "output": {
        "questions": [...]
      },
      "status": "completed",
      "model_used": "qwen-max",
      "provider_used": "aliyun",
      "token_usage": {
        "prompt_tokens": 150,
        "completion_tokens": 200,
        "total_tokens": 350
      },
      "duration_ms": 1234,
      "created_at": "2026-03-17T10:00:00.000Z",
      "updated_at": "2026-03-17T10:00:01.234Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

## 模型路由配置

### 任务类型与模型映射

| 任务类型 | 首选模型 | 备用模型 |
|---------|---------|---------|
| simple-question | qwen-flash | moonshot-v1-8k, gpt-3.5 |
| textbook-analysis | qwen-plus | moonshot-v1-8k, gpt-3.5 |
| weakness-analysis | qwen-plus | gpt-4, qwen-max |
| complex-question | qwen-max | gpt-4, moonshot-v1-32k |
| multi-step-reasoning | qwen-max | gpt-4-turbo, qwen-long |
| chat | qwen-plus | gpt-3.5, moonshot-v1-8k |
| embedding | aliyun-embedding | - |

---

## 支持的 AI 服务商

### 1. 阿里云通义千问 (aliyun)

**支持模型**:
- qwen-flash (qwen-turbo) - 快速响应，适合简单任务
- qwen-plus - 平衡性能和成本
- qwen-max - 最强能力，适合复杂任务
- qwen-long - 支持超长上下文

**配置环境变量**:
```bash
ALIYUN_API_KEY=your_api_key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_EMBEDDING_URL=https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding
```

### 2. OpenAI (openai)

**支持模型**:
- gpt-3.5 (gpt-3.5-turbo)
- gpt-4 (gpt-4)
- gpt-4-turbo (gpt-4-turbo-preview)

**配置环境变量**:
```bash
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 3. Azure OpenAI (azure)

**支持模型**:
- azure-gpt-35 (gpt-35-turbo)
- azure-gpt-4 (gpt-4)

**配置环境变量**:
```bash
AZURE_API_KEY=your_api_key
AZURE_BASE_URL=https://your-resource.openai.azure.com
AZURE_DEPLOYMENT=your-deployment
```

### 4. 月之暗面 (moonshot)

**支持模型**:
- moonshot-v1-8k
- moonshot-v1-32k
- moonshot-v1-128k

**配置环境变量**:
```bash
MOONSHOT_API_KEY=your_api_key
MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
```

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求限流 |
| 500 | 服务器内部错误 |

---

## 限流策略

- **生成题目**: 20 次/分钟/用户
- **智能对话**: 30 次/分钟/用户
- **健康检查**: 不限流

当触发限流时，返回 429 状态码，并在响应中包含 `rateLimit` 信息。

---

## 最佳实践

### 1. 错误处理

```javascript
try {
  const response = await fetch('/api/ai/v2/generate-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      grade: '八年级',
      subject: '物理',
      unit: '运动和力',
      textbookContent: '...',
      questionCount: 5
    })
  });

  if (response.status === 429) {
    // 处理限流
    const data = await response.json();
    console.log('限流，剩余次数:', data.rateLimit.remaining);
    return;
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('题目生成成功:', data.data.questions);
} catch (error) {
  console.error('请求失败:', error);
}
```

### 2. 监控 Token 使用

定期调用 `/api/ai/v2/token-usage` 端点，监控 Token 使用情况，避免超出预算。

### 3. 健康检查

在应用启动时和运行期间定期调用 `/api/ai/v2/health`，确保 AI 服务可用。

---

## 更新日志

### V2.0.0 (2026-03-17)

- ✅ 新增多 AI 服务商支持
- ✅ 新增智能模型路由
- ✅ 新增故障转移机制
- ✅ 新增健康检查
- ✅ 新增 Token 计数
- ✅ 新增请求限流
- ✅ 优化数据库表结构

### V1.0.0 (2026-03-15)

- ✅ 初始版本
- ✅ 支持阿里云通义千问
- ✅ 基础题目生成功能
- ✅ 任务日志记录
