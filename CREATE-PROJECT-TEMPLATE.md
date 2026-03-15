# 创建上下级 Agent 项目组 - 简洁模板

---

## 📝 使用方式

复制下方模板，替换 `【】` 中的变量，发送给招聘大姐头/公司助手即可。

---

## 📋 模板

```
######## 帮我创建一个学习助手项目团队，采用上下级 Agent 架构：

【项目信息】
- 项目名称：[填写项目名，如：学习助手项目]
- Agent ID: [填写 ID，如：Study_help]
- 飞书群 ID: [填写群 ID，如：oc_xxxxxxxxxxxxxxxxxxxxxxxxxx]
- 主 Agent 模型：[填写模型，如：modelstudio/qwen3.5-plus]
- Sub-Agent 模型：[填写模型，如：bailian/qwen3.5-plus]

【主 Agent 配置】
- 名称：[填写名称，如：项目经理小俊]
- Emoji: [填写 Emoji，如：🎯]
- 性格：统筹全局、决策果断、善于调度
- 职责：接收需求、任务拆解、指派执行、整合交付

【Sub-Agent 团队】
需要创建以下 4 个 Sub-Agent：

1. product-ux（产品+UX）
   - 名称：[如：产品设计小美]
   - Emoji: [如：📋🎨]
   - 职责：需求分析、PRD 撰写、界面设计

2. fullstack（全栈开发）
   - 名称：[如：全栈工程师小王]
   - Emoji: [如：💻]
   - 职责：前端/后端开发、技术实现

3. qa（测试）
   - 名称：[如：测试工程师小陈]
   - Emoji: [如：🧪]
   - 职责：测试用例、bug 发现、质量把控

4. algorithm（算法）
   - 名称：[如：算法工程师老周]
   - Emoji: [如：🤖]
   - 职责：NLP、意图识别、对话模型

【关键要求】

1. 在 E:\openclaw\workspace-[Agent ID]/ 目录下创建主 Agent 文件：
   - IDENTITY.md - 项目经理身份
   - SOUL.md - 包含详细工作流程和调度规则
   - AGENTS.md - 包含 sessions_spawn 调用示例（4 个 Sub-Agent 的完整路径）
   - USER.md - 俊哥
   - MEMORY.md - 项目记忆
   - README.md - 团队说明

2. 在 sub-agents/ 目录下创建 4 个子目录，每个包含：
   - IDENTITY.md
   - SOUL.md
   - MEMORY.md

3. 配置 openclaw.json：
   - agents.list 添加主 Agent 配置
   - bindings 添加飞书群路由绑定
   - channels.feishu.groups 添加群策略

4. 飞书群策略：
   - enabled: true
   - requireMention: false

5. 执行完成后返回：
   - ✅ 完整目录结构
   - ✅ AGENTS.md 中的调度示例片段
   - ✅ 配置总结
   - ✅ 重启 Gateway

```

---

## 📌 示例（已填充）

```
######## 帮我创建一个学习助手项目团队，采用上下级 Agent 架构：

【项目信息】
- 项目名称：学习助手项目
- Agent ID: Study_help
- 飞书群 ID: oc_8e5c0abf4fab8918fcc87030c29fbaa1
- 主 Agent 模型：modelstudio/qwen3.5-plus
- Sub-Agent 模型：bailian/qwen3.5-plus

【主 Agent 配置】
- 名称：项目经理小俊
- Emoji: 🎯
- 性格：统筹全局、决策果断、善于调度
- 职责：接收需求、任务拆解、指派执行、整合交付

【Sub-Agent 团队】
需要创建以下 4 个 Sub-Agent：

1. product-ux（产品+UX）
   - 名称：产品设计小美
   - Emoji: 📋🎨
   - 职责：需求分析、PRD 撰写、界面设计

2. fullstack（全栈开发）
   - 名称：全栈工程师小王
   - Emoji: 💻
   - 职责：前端/后端开发、技术实现

3. qa（测试）
   - 名称：测试工程师小陈
   - Emoji: 🧪
   - 职责：测试用例、bug 发现、质量把控

4. algorithm（算法）
   - 名称：算法工程师老周
   - Emoji: 🤖
   - 职责：NLP、意图识别、对话模型

【关键要求】

1. 在 E:\openclaw\workspace-Study_help/ 目录下创建主 Agent 文件：
   - IDENTITY.md - 项目经理身份
   - SOUL.md - 包含详细工作流程和调度规则
   - AGENTS.md - 包含 sessions_spawn 调用示例（4 个 Sub-Agent 的完整路径）
   - USER.md - 俊哥
   - MEMORY.md - 项目记忆
   - README.md - 团队说明

2. 在 sub-agents/ 目录下创建 4 个子目录，每个包含：
   - IDENTITY.md
   - SOUL.md
   - MEMORY.md

3. 配置 openclaw.json：
   - agents.list 添加主 Agent 配置
   - bindings 添加飞书群路由绑定
   - channels.feishu.groups 添加群策略

4. 飞书群策略：
   - enabled: true
   - requireMention: false

5. 执行完成后返回：
   - ✅ 完整目录结构
   - ✅ AGENTS.md 中的调度示例片段
   - ✅ 配置总结
   - ✅ 重启 Gateway

```

---

## 🚀 可用 Model 列表

| 类型 | Model | 适用场景 |
|------|-------|----------|
| 均衡 | `modelstudio/qwen3.5-plus` | 主 Agent 调度 |
| 均衡 | `bailian/qwen3.5-plus` | Sub-Agent 执行 |
| 编码 | `bailian/qwen3-coder-next` | 开发任务 |
| 长文本 | `bailian/qwen3-max-2026-01-23` | 复杂分析 |
| 快速 | `bailian/glm-5` | 简单任务 |

---

_俊哥，下次创建新项目组，直接复制模板替换变量即可。_
