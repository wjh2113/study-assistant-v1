# AI 批改服务快速开始指南

## 🚀 5 分钟快速上手

### 步骤 1: 启动后端服务

```bash
cd project/v1-prd/backend
npm install
npm run dev
```

服务将在 http://localhost:3000 启动

### 步骤 2: 测试作文评分

```bash
curl -X POST http://localhost:3000/api/ai/grading/essay \
  -H "Content-Type: application/json" \
  -d '{
    "essayContent": "我的梦想是成为一名科学家。我要研究环保技术，让地球变得更加美好。我要发明净化空气的机器，让人们呼吸新鲜空气。我还要研究新能源，减少污染。为了实现梦想，我要努力学习，打好基础。我相信只要坚持努力，梦想一定会实现。",
    "essayTitle": "我的梦想",
    "essayType": "NARRATIVE",
    "gradeLevel": 5,
    "expectedWordCount": 100
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "totalScore": 78,
    "dimensions": [
      {"dimension": "内容", "score": 80, "weight": 0.4},
      {"dimension": "语言", "score": 75, "weight": 0.3},
      {"dimension": "结构", "score": 78, "weight": 0.2},
      {"dimension": "卷面", "score": 85, "weight": 0.1}
    ],
    "wordCount": 98,
    "estimatedGrade": "C"
  }
}
```

### 步骤 3: 测试主观题批改

```bash
curl -X POST http://localhost:3000/api/ai/grading/subjective \
  -H "Content-Type: application/json" \
  -d '{
    "questionContent": "什么是光合作用？",
    "studentAnswer": "光合作用是植物利用光能将二氧化碳和水转化为有机物的过程",
    "standardAnswer": "光合作用是绿色植物利用光能，将二氧化碳和水合成有机物，并释放氧气的过程",
    "maxScore": 10
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "score": 8,
    "maxScore": 10,
    "scorePercentage": 80,
    "feedback": "回答良好，基本要点都涵盖了。"
  }
}
```

### 步骤 4: 查看 Swagger 文档

访问 http://localhost:3000/api 查看完整的 API 文档

---

## 💻 在代码中使用

### TypeScript/JavaScript

```typescript
// 作文评分
const essayResult = await fetch('http://localhost:3000/api/ai/grading/essay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    essayContent: '作文内容...',
    essayType: 'NARRATIVE',
    gradeLevel: 5,
    expectedWordCount: 400,
  }),
});

const { data } = await essayResult.json();
console.log(`总分：${data.totalScore}, 等级：${data.estimatedGrade}`);

// 主观题批改
const subjectiveResult = await fetch('http://localhost:3000/api/ai/grading/subjective', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    questionContent: '题目',
    studentAnswer: '答案',
    standardAnswer: '参考答案',
    maxScore: 10,
  }),
});

const { data: scoreData } = await subjectiveResult.json();
console.log(`得分：${scoreData.score}/${scoreData.maxScore}`);
```

### Python

```python
import requests

# 作文评分
response = requests.post('http://localhost:3000/api/ai/grading/essay', json={
    'essayContent': '作文内容...',
    'essayType': 'NARRATIVE',
    'gradeLevel': 5,
    'expectedWordCount': 400,
})

result = response.json()
print(f"总分：{result['data']['totalScore']}, 等级：{result['data']['estimatedGrade']}")

# 主观题批改
response = requests.post('http://localhost:3000/api/ai/grading/subjective', json={
    'questionContent': '题目',
    'studentAnswer': '答案',
    'standardAnswer': '参考答案',
    'maxScore': 10,
})

result = response.json()
print(f"得分：{result['data']['score']}/{result['data']['maxScore']}")
```

---

## 📊 评分标准速查

### 作文评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 内容 | 40% | 主题明确、内容充实 |
| 语言 | 30% | 语句通顺、词汇丰富 |
| 结构 | 20% | 段落清晰、过渡自然 |
| 卷面 | 10% | 字迹工整、标点正确 |

### 等级划分

| 分数范围 | 等级 | 说明 |
|---------|------|------|
| 90-100 | A | 优秀 |
| 80-89 | B | 良好 |
| 70-79 | C | 中等 |
| 60-69 | D | 及格 |
| 0-59 | E | 待提高 |

---

## 🔧 常见问题

### Q1: 为什么评分使用的是降级策略？

A: 如果没有配置 AI API，系统会自动使用规则评分（降级策略）。要使用 AI 评分，请在 `.env` 中配置：

```env
AI_API_KEY=your-api-key
AI_GRADING_API_URL=https://api.example.com/v1/grading
```

### Q2: 如何运行单元测试？

```bash
cd project/v1-prd/backend
npm test -- ai-grading.service.spec.ts
```

### Q3: 支持哪些作文类型？

- NARRATIVE - 记叙文
- ARGUMENTATIVE - 议论文
- EXPOSITORY - 说明文
- DESCRIPTIVE - 描写文
- PRACTICAL - 应用文

### Q4: 如何生成评分报告？

需要一个已有的练习会话 ID：

```bash
curl -X POST http://localhost:3000/api/ai/grading/report \
  -H "Content-Type: application/json" \
  -d '{"sessionId": 123, "reportType": "DETAILED"}'
```

---

## 📚 更多文档

- **完整 API 文档**: `project/v1-prd/docs/AI_GRADING_API.md`
- **模块说明**: `backend/src/modules/ai-grading/README.md`
- **实现总结**: `docs/ai-phase3-summary.md`

---

## 🎯 下一步

1. ✅ 测试基础功能（已完成）
2. 🔲 配置真实 AI API（可选）
3. 🔲 集成到前端应用
4. 🔲 根据反馈优化评分算法
5. 🔲 添加更多评分维度

---

**快速开始指南版本**: v1.0  
**更新时间**: 2026-03-17
