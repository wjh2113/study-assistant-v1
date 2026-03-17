# Prometheus + Grafana 监控部署指南

## 概述

本方案为 StudyAss AI 系统提供完整的监控告警能力，包括：
- **Prometheus**: 指标收集和存储
- **Grafana**: 可视化仪表盘
- **Alertmanager**: 告警通知
- **PrometheusExporter**: Node.js 应用指标导出

## 架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Application   │────▶│   Prometheus     │────▶│    Grafana      │
│   (Node.js)     │     │   (Metrics DB)   │     │   (Dashboard)   │
│  Port: 9090     │     │   Port: 9091     │     │   Port: 3001    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Alertmanager    │
                        │  Port: 9093      │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Notification    │
                        │  (Email/Slack)   │
                        └──────────────────┘
```

## 快速部署

### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 确保在后端目录安装了 prom-client
cd backend
npm install prom-client

# 2. 返回项目根目录，启动所有服务（包括监控栈）
cd ..
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f backend
```

### 方式二：仅启动监控服务

```bash
# 如果后端已在运行，只启动监控组件
docker-compose up -d prometheus grafana alertmanager
```

## 访问地址

| 服务 | 地址 | 凭证 |
|------|------|------|
| 应用服务 | http://localhost:3000 | - |
| 应用指标 | http://localhost:9090/metrics | - |
| Prometheus | http://localhost:9091 | - |
| Grafana | http://localhost:3001 | admin / admin |
| Alertmanager | http://localhost:9093 | - |

## 配置说明

### 1. Prometheus 配置 (`backend/monitoring/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s      # 抓取间隔
  evaluation_interval: 15s  # 规则评估间隔

scrape_configs:
  - job_name: 'nodejs'      # Node.js 应用
    static_configs:
      - targets: ['backend:9090']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### 2. 告警规则 (`backend/monitoring/alerts.yml`)

已配置的告警规则：

| 告警名称 | 触发条件 | 严重级别 |
|---------|---------|---------|
| HighAIErrorRate | AI 错误率 > 10% (5 分钟) | critical |
| HighAILatency | P95 响应时间 > 10 秒 (5 分钟) | warning |
| HighTokenUsage | 每小时 Token > 10 万 (30 分钟) | warning |
| LowCacheHitRate | 缓存命中率 < 30% (30 分钟) | info |
| BudgetExceeded | 预算使用率 > 90% (1 小时) | critical |
| ProviderDown | 服务不可用 (2 分钟) | critical |

### 3. Alertmanager 配置 (`backend/monitoring/alertmanager.yml`)

配置通知渠道（需修改为实际配置）：

```yaml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'password'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'team@example.com'
```

### 4. Grafana 仪表盘

预置仪表盘：
- **AI 系统概览** (`ai-overview.json`): 包含 8 个核心面板
  - AI 请求总数
  - 错误率
  - 缓存命中率
  - 活跃连接数
  - Token 使用趋势
  - 响应时间 P95
  - 各提供商请求分布
  - 各模型成本分布

## 核心监控指标

### AI 服务指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `ai_requests_total` | Counter | AI 请求总数（按 provider/model/task_type/status 标签） |
| `ai_request_duration_seconds` | Histogram | 请求延迟分布（秒） |
| `ai_request_errors_total` | Counter | 错误请求数（按 error_type 标签） |
| `ai_tokens_total` | Counter | Token 使用量（按 type: prompt/completion/total） |
| `ai_cache_hits_total` | Counter | 缓存命中数 |
| `ai_cache_misses_total` | Counter | 缓存未命中数 |

### 系统指标

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `http_response_time_seconds` | Histogram | HTTP 响应时间 |
| `active_connections` | Gauge | 活跃连接数 |
| `queue_size` | Gauge | 队列大小（按 queue_name 标签） |
| `nodejs_heap_size_bytes` | Gauge | Node.js 堆内存 |
| `nodejs_eventloop_lag_seconds` | Gauge | 事件循环延迟 |
| `questions_generated_total` | Counter | 生成的题目数 |
| `active_users` | Gauge | 活跃用户数 |
| `practice_sessions_completed_total` | Counter | 完成的练习会话数 |

## 在代码中使用监控

### 记录 AI 请求

```javascript
const PrometheusExporter = require('./modules/monitoring/PrometheusExporter');

// 记录请求开始时间
const startTime = Date.now();

try {
  // 执行业务逻辑
  const result = await aiService.generate();
  
  // 记录成功请求
  PrometheusExporter.recordAIRequest(provider, model, taskType, 'success');
  PrometheusExporter.recordAIDuration(provider, model, taskType, (Date.now() - startTime) / 1000);
  PrometheusExporter.recordTokenUsage(provider, model, promptTokens, completionTokens, totalTokens);
  
} catch (error) {
  // 记录错误
  PrometheusExporter.recordAIRequest(provider, model, taskType, 'error');
  PrometheusExporter.recordAIError(provider, model, taskType, error.code);
}
```

### 记录缓存

```javascript
if (cached) {
  PrometheusExporter.recordCacheHit(taskType);
} else {
  PrometheusExporter.recordCacheMiss(taskType);
}
```

### 更新队列状态

```javascript
PrometheusExporter.setQueueSize('ai-queue', queueLength);
```

### 更新活跃用户

```javascript
PrometheusExporter.setActiveUsers(activeUserCount);
```

## 故障排查

### Prometheus 无法抓取指标

```bash
# 1. 检查应用是否正常导出指标
curl http://localhost:9090/metrics

# 2. 检查 Prometheus 配置
docker-compose exec prometheus cat /etc/prometheus/prometheus.yml

# 3. 查看 Prometheus 日志
docker-compose logs prometheus

# 4. 在 Prometheus UI 查看 Targets 状态
# 访问 http://localhost:9091/targets
```

### Grafana 无法连接 Prometheus

```bash
# 1. 检查网络连通性
docker-compose exec grafana wget -qO- http://prometheus:9090/-/healthy

# 2. 查看数据源配置
docker-compose exec grafana cat /etc/grafana/provisioning/datasources/prometheus.yml

# 3. 重启 Grafana
docker-compose restart grafana
```

### 告警不触发

```bash
# 1. 检查告警规则是否加载
curl http://localhost:9091/api/v1/rules

# 2. 检查 Alertmanager 状态
curl http://localhost:9093/api/v2/status

# 3. 查看 Alertmanager 日志
docker-compose logs alertmanager

# 4. 在 Prometheus 查看告警状态
curl http://localhost:9091/api/v1/alerts
```

### 指标数据为空

```bash
# 1. 确认 PrometheusExporter 已初始化
# 检查 server.js 中是否有：
# PrometheusExporter.init();
# PrometheusExporter.startServer();

# 2. 查看应用日志
docker-compose logs backend | grep -i prometheus

# 3. 直接访问指标端点
curl http://localhost:9090/metrics | grep ai_requests
```

## 最佳实践

### 1. 指标命名规范

- 使用小写字母和下划线
- 使用基本单位（秒、字节）
- Counter 类型以 `_total` 结尾
- 包含有意义的标签

### 2. 告警配置

- 使用 `for` 子句避免瞬时告警
- 设置合理的严重级别（critical/warning/info）
- 为每个告警编写 Runbook

### 3. 资源管理

- 根据存储容量调整 `storage.tsdb.retention.time`
- 定期备份 Prometheus 数据
- 监控 Prometheus 自身资源使用

### 4. 安全配置

- 修改默认密码（Grafana admin/admin）
- 配置网络隔离
- 使用 HTTPS（生产环境）

## 扩展配置

### 添加新的告警规则

在 `backend/monitoring/alerts.yml` 中添加：

```yaml
- alert: NewAlertName
  expr: your_expression > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "告警摘要"
    description: "详细描述 {{ $value }}"
```

### 添加新的仪表盘

1. 在 Grafana UI 中创建仪表盘
2. 导出为 JSON
3. 保存到 `backend/monitoring/grafana/dashboards/`
4. 重启 Grafana 或等待自动刷新

### 配置 Slack 通知

在 `alertmanager.yml` 中添加：

```yaml
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
        channel: '#alerts'
        send_resolved: true
```

## 清理与卸载

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v

# 查看数据卷
docker volume ls | grep studyass
```

## 相关文件

```
backend/monitoring/
├── README.md                 # 本文档
├── prometheus.yml            # Prometheus 配置
├── alerts.yml                # 告警规则
├── alertmanager.yml          # Alertmanager 配置
└── grafana/
    ├── datasources/
    │   └── prometheus.yml    # 数据源配置
    └── dashboards/
        ├── dashboard.yml     # 仪表盘配置
        └── ai-overview.json  # AI 概览仪表盘
```

## 更新日志

- **2026-03-17**: 完善 PrometheusExporter 初始化，添加 Docker Compose 监控栈配置
