# AI 批改服务模块

## 概述

AI 批改服务模块提供智能作文评分、主观题批改和评分报告生成功能。

## 功能特性

### 1. 作文智能评分

- **4 维度加权评分**:
  - 内容 (40%): 主题明确、内容充实、观点正确
  - 语言 (30%): 语句通顺、词汇丰富、表达准确
  - 结构 (20%): 段落清晰、过渡自然、首尾呼应
  - 卷面 (10%): 字迹工整、标点正确、格式规范

- **字数评分**: 自动统计字数并按比例评分
- **等级评估**: A/B/C/D/E 五个等级
- **详细反馈**: 提供优点、改进建议和总体评价

### 2. 主观题批改

- **智能匹配**: 对比学生答案和参考答案
- **关键得分点**: 识别答案中的关键信息
- **遗漏分析**: 指出遗漏的要点
- **个性化建议**: 提供针对性的改进建议

### 3. 评分报告生成

- **详细报告**: 包含每道题的详细结果
- **简要报告**: 只包含总体统计和分析
- **维度分析**: 知识掌握、解题能力等维度分析
- **知识点分析**: 各知识点掌握情况
- **学习建议**: 个性化的学习建议

## 技术实现

### 架构

```
AiGradingModule
├── AiGradingController (API 接口层)
├── AiGradingService (业务逻辑层)
└── dto/ (数据传输对象)
    └── grading.dto.ts
```

### 降级策略

系统支持 AI API 和规则评分两种模式：

1. **AI API 模式** (生产环境):
   - 配置 `AI_API_KEY` 和 `AI_GRADING_API_URL`
   - 调用外部 AI 服务进行智能评分
   - 提供更准确的评分和反馈

2. **规则评分模式** (开发/降级):
   - 基于关键词匹配、字数统计等规则
   - 无需外部 API 即可运行
   - 适合开发和测试环境

### 数据流

```
用户请求 → Controller → Service → AI API/规则引擎 → 评分结果 → 报告生成 → 响应
```

## 使用方法

### 安装依赖

```bash
cd project/v1-prd/backend
npm install
```

### 配置环境变量

在 `.env` 文件中添加：

```env
# AI API 配置（可选）
AI_API_KEY=your-api-key
AI_GRADING_API_URL=https://api.example.com/v1/grading

# 测试模式（启用降级策略）
TEST_MODE=false
```

### 启动服务

```bash
npm run dev
```

### API 调用示例

#### 作文评分

```typescript
const response = await fetch('/api/ai/grading/essay', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    essayContent: '这是一篇关于我的梦想的作文...',
    essayType: 'NARRATIVE',
    gradeLevel: 5,
    expectedWordCount: 400,
  }),
});

const result = await response.json();
console.log(result.data.totalScore); // 总分
console.log(result.data.estimatedGrade); // 等级
```

#### 主观题批改

```typescript
const response = await fetch('/api/ai/grading/subjective', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    questionContent: '请简述光合作用的过程',
    studentAnswer: '光合作用是植物...',
    standardAnswer: '光合作用是绿色植物...',
    maxScore: 10,
  }),
});

const result = await response.json();
console.log(result.data.score); // 得分
console.log(result.data.scorePercentage); // 得分率
```

#### 生成评分报告

```typescript
const response = await fetch('/api/ai/grading/report', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sessionId: 123,
    reportType: 'DETAILED',
  }),
});

const report = await response.json();
console.log(report.data.totalScore);
console.log(report.data.strengths);
console.log(report.data.studySuggestions);
```

## 测试

### 运行单元测试

```bash
npm test -- ai-grading.service.spec.ts
```

### 测试覆盖范围

- ✅ 作文评分功能测试
- ✅ 主观题批改功能测试
- ✅ 评分报告生成测试
- ✅ 辅助方法测试（字数统计、等级计算等）
- ✅ 降级策略测试

## 文件结构

```
src/modules/ai-grading/
├── ai-grading.module.ts          # 模块定义
├── ai-grading.controller.ts      # 控制器（API 接口）
├── ai-grading.service.ts         # 服务（业务逻辑）
├── ai-grading.service.spec.ts    # 单元测试
└── dto/
    └── grading.dto.ts            # 数据传输对象
```

## API 文档

详细 API 文档请查看：
- [AI_GRADING_API.md](../../docs/AI_GRADING_API.md) - 完整 API 文档
- [API.md](../../docs/API.md) - 主 API 文档（包含所有接口）

## 性能优化

1. **批量处理**: 支持批量提交多个作文/题目
2. **缓存机制**: 评分报告可缓存避免重复计算
3. **异步处理**: 大批量批改建议使用消息队列
4. **降级策略**: AI API 不可用时自动切换规则评分

## 扩展性

### 添加新的评分维度

在 `ai-grading.service.ts` 中修改 `calculateEssayDimensions` 方法：

```typescript
const dimensions = [
  { name: '内容', weight: 0.4, key: 'content' },
  { name: '语言', weight: 0.3, key: 'language' },
  { name: '结构', weight: 0.2, key: 'structure' },
  { name: '卷面', weight: 0.1, key: 'presentation' },
  // 添加新维度
  { name: '创新', weight: 0.1, key: 'creativity' },
];
```

### 集成外部 AI 服务

在 `ai-grading.service.ts` 中配置 AI API：

```typescript
private async callAiGradingApi(payload: any): Promise<any> {
  const response = await fetch(this.aiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.aiApiKey}`,
    },
    body: JSON.stringify(payload),
  });
  return await response.json();
}
```

## 常见问题

### Q: 如何切换 AI API 提供商？

A: 修改 `.env` 中的 `AI_GRADING_API_URL` 和 `AI_API_KEY` 即可。

### Q: 降级策略的评分准确度如何？

A: 降级策略使用规则评分，准确度约为 AI API 的 70-80%，适合开发和测试。

### Q: 如何自定义评分标准？

A: 在 `ai-grading.service.ts` 中修改各维度的权重和评分逻辑。

### Q: 支持哪些作文类型？

A: 目前支持：记叙文、议论文、说明文、描写文、应用文。

## 版本历史

### v1.0.0 (2026-03-17)

- ✅ 实现作文智能评分（4 维度加权）
- ✅ 实现主观题批改
- ✅ 实现评分报告生成
- ✅ 编写单元测试
- ✅ 编写 API 文档

## 维护者

俊哥的学习助手团队

## 许可证

MIT License
