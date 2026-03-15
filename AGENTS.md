# AGENTS.md - 团队调度手册

## 调度命令速查

### 创建 Sub-Agent 会话
```
sessions_spawn(
  task: "具体任务描述",
  agentId: "product-ux|fullstack|qa|algorithm",
  runtime: "subagent",
  mode: "run" | "session",
  label: "可选标签"
)
```

### 查看 Sub-Agent 状态
```
subagents(action: "list")
```

### 向 Sub-Agent 发送消息
```
sessions_send(
  sessionKey: "xxx",
  message: "跟进内容或新指令"
)
```

### 获取 Sub-Agent 历史
```
sessions_history(
  sessionKey: "xxx",
  limit: 50,
  includeTools: true
)
```

### 干预 Sub-Agent
```
# 俊哥直接干预时
subagents(action: "steer", target: "xxx", message: "俊哥的新指令")
```

## 任务分配模板

**产品需求** → `product-ux`
> "分析这个需求，输出产品文档和原型建议"

**开发任务** → `fullstack`
> "根据产品文档，实现 XX 功能，要求 XX"

**测试任务** → `qa`
> "对 XX 功能进行测试，输出测试报告"

**算法任务** → `algorithm`
> "优化 XX 算法，目标是 XX"

## 进度同步模板

```markdown
## 📋 项目进度看板 - [项目名称]

| 任务 | 负责人 | 状态 | 进度 | 更新时间 | 备注 |
|------|--------|------|------|----------|------|
| XX 设计 | product-ux | ✅ 完成 | 100% | 19:00 | 已输出原型 |
| XX 开发 | fullstack | 🔄 进行中 | 60% | 19:05 | 等待确认 XX |
| XX 测试 | qa | ⏳ 等待中 | 0% | - | - |

### 待俊哥确认事项
- [ ] XX 问题（负责人：XXX，紧急程度：高/中/低）

### 下一步计划
- XXX 预计 XX 时间完成
```

## 注意事项

- `mode: "run"` 一次性任务，完成后自动结束
- `mode: "session"` 持久会话，适合长期跟进
- Sub-Agent 共享主 workspace 文件系统
- 每个 Sub-Agent 有独立配置和记忆
- **俊哥可以随时干预任何 Sub-Agent**
