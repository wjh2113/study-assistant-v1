# AI Gateway V2 - 多 AI 服务路由网关

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env，配置至少一个 AI 服务商
# ALIYUN_API_KEY=your_key_here
```

### 3. 数据库迁移

```bash
# V1 迁移（如果未执行）
node src/modules/ai-gateway/migration.js

# V2 迁移
node src/modules/ai-gateway/migration-v2.js
```

### 4. 启动服务

```bash
npm start
```

### 5. 验证部署

```bash
# 健康检查
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/ai/v2/health
```

---

## 📚 功能特性

- ✅ **多 AI 服务商**: 阿里云、OpenAI、Azure、月之暗面
- ✅ **智能路由**: 根据任务类型自动选择最优模型
- ✅ **故障转移**: 主模型失败自动切换备用模型
- ✅ **健康检查**: 实时监控 AI 服务商状态
- ✅ **请求限流**: 基于 Redis 的分布式限流
- ✅ **Token 计数**: 精确统计各模型使用情况

---

## 📖 文档

- [API 文档](./AI_GATEWAY_V2_API.md) - 完整的 API 接口说明
- [部署指南](./AI_GATEWAY_V2_DEPLOYMENT.md) - 详细部署步骤和故障排查
- [完成报告](./AI_GATEWAY_V2_COMPLETION_REPORT.md) - 实施总结和验收报告

---

## 🔧 核心文件

```
backend/src/modules/ai-gateway/
├── AiGatewayServiceV2.js      # 核心服务（多 AI 路由、健康检查、故障转移）
├── AiGatewayControllerV2.js   # API 控制器
├── AiTaskLogModel.js          # 任务日志模型
├── migration-v2.js            # 数据库迁移脚本

backend/src/routes/
└── ai-gateway-v2.js           # V2 路由定义

backend/tests/
└── ai-gateway-v2.test.js      # 单元测试（16 个测试用例）

docs/
├── AI_GATEWAY_V2_API.md       # API 文档
├── AI_GATEWAY_V2_DEPLOYMENT.md # 部署指南
└── AI_GATEWAY_V2_COMPLETION_REPORT.md # 完成报告
```

---

## 🧪 运行测试

```bash
cd backend
npm test -- ai-gateway-v2.test.js
```

---

## 🌐 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/ai/v2/generate-questions` | POST | 生成题目 |
| `/api/ai/v2/chat` | POST | 智能对话 |
| `/api/ai/v2/health` | GET | 健康检查 |
| `/api/ai/v2/status` | GET | 获取状态 |
| `/api/ai/v2/token-usage` | GET | Token 统计 |
| `/api/ai/v2/task-logs` | GET | 任务日志 |

---

## 📊 支持的 AI 模型

| 服务商 | 模型 | 用途 |
|--------|------|------|
| 阿里云 | qwen-flash/plus/max/long | 全场景 |
| OpenAI | gpt-3.5/4/4-turbo | 全场景 |
| Azure | azure-gpt-35/4 | 全场景 |
| 月之暗面 | moonshot-v1-8k/32k/128k | 长文本 |

---

## 📈 性能指标

- 响应时间：< 2s（简单任务），< 5s（复杂任务）
- 可用性：> 99%（带故障转移）
- 限流：20 次/分钟（生成题目），30 次/分钟（对话）

---

## 🔒 安全特性

- JWT 认证
- 请求限流（防 DDoS）
- API Key 环境变量隔离
- 输入参数验证
- 日志审计追踪

---

## 📞 技术支持

遇到问题请查看：
1. [部署指南](./AI_GATEWAY_V2_DEPLOYMENT.md) 第 7 节「故障排查」
2. 应用日志：`logs/app.log`
3. 错误日志：`logs/error.log`

---

**版本**: V2.0.0  
**更新日期**: 2026-03-17  
**维护者**: AI 团队
