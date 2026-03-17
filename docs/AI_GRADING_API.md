# AI 批改服务 API 文档

## 概述

AI 批改服务提供作文智能评分、主观题批改和评分报告生成功能。

### 特性

- **作文智能评分**: 4 维度加权评分（内容 40%、语言 30%、结构 20%、卷面 10%）
- **主观题批改**: 支持简答题、论述题等主观题型
- **评分报告**: 生成详细的学习报告和薄弱点分析
- **降级策略**: AI API 不可用时自动切换到规则评分

---

## 接口列表

### 1. 作文智能评分

**接口**: `POST /api/ai/grading/essay`

**描述**: 对作文进行 4 维度加权智能评分

**请求头**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**请求体**:
```json
{
  "essayContent": "这是一篇关于我的梦想的作文。我希望成为一名科学家...",
  "essayTitle": "我的梦想",
  "essayType": "NARRATIVE",
  "gradeLevel": 5,
  "requirements": "字数不少于 400 字，语句通顺，内容健康向上",
  "expectedWordCount": 400
}
```

**请求参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| essayContent | string | 是 | 作文内容 |
| essayTitle | string | 否 | 作文题目 |
| essayType | string | 是 | 作文类型：NARRATIVE(记叙文)/ARGUMENTATIVE(议论文)/EXPOSITORY(说明文)/DESCRIPTIVE(描写文)/PRACTICAL(应用文) |
| gradeLevel | number | 是 | 年级 (3-12) |
| requirements | string | 否 | 写作要求 |
| expectedWordCount | number | 否 | 期望字数 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalScore": 85,
    "dimensions": [
      {
        "dimension": "内容",
        "score": 88,
        "weight": 0.4,
        "feedback": "内容优秀，表现出色！",
        "suggestions": ["增加具体事例", "深化主题思想", "突出中心论点"]
      },
      {
        "dimension": "语言",
        "score": 82,
        "weight": 0.3,
        "feedback": "语言良好，继续保持。",
        "suggestions": ["丰富词汇量", "使用修辞手法", "注意语句通顺"]
      },
      {
        "dimension": "结构",
        "score": 85,
        "weight": 0.2,
        "feedback": "结构良好，继续保持。",
        "suggestions": ["明确段落划分", "加强过渡衔接", "完善开头结尾"]
      },
      {
        "dimension": "卷面",
        "score": 90,
        "weight": 0.1,
        "feedback": "卷面优秀，表现出色！",
        "suggestions": ["保持字迹工整", "注意标点符号", "避免涂改"]
      }
    ],
    "wordCount": 450,
    "wordCountScore": 100,
    "overallFeedback": "作文整体良好，内容完整，表达清晰，继续保持！",
    "strengths": ["内容完整", "结构清晰", "表达流畅"],
    "improvements": ["增加修辞手法", "丰富词汇"],
    "estimatedGrade": "B"
  }
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| totalScore | number | 总分 (0-100) |
| dimensions | array | 各维度评分详情 |
| dimensions[].dimension | string | 维度名称 |
| dimensions[].score | number | 维度得分 (0-100) |
| dimensions[].weight | number | 权重 |
| dimensions[].feedback | string | 反馈意见 |
| dimensions[].suggestions | array | 改进建议列表 |
| wordCount | number | 实际字数 |
| wordCountScore | number | 字数得分 (0-100) |
| overallFeedback | string | 总体评价 |
| strengths | array | 优点列表 |
| improvements | array | 需要改进的地方 |
| estimatedGrade | string | 预估等级 (A/B/C/D/E) |

---

### 2. 主观题批改

**接口**: `POST /api/ai/grading/subjective`

**描述**: 对主观题进行智能批改

**请求头**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**请求体**:
```json
{
  "questionContent": "请简述光合作用的过程和意义",
  "studentAnswer": "光合作用是植物利用光能将二氧化碳和水转化为有机物，并释放氧气的过程",
  "standardAnswer": "光合作用是绿色植物利用光能，将二氧化碳和水合成有机物，并释放氧气的过程。意义：为生物提供有机物和能量，维持大气中氧气和二氧化碳的平衡",
  "scoringCriteria": "答出光合作用定义得 5 分，答出意义得 5 分",
  "maxScore": 10,
  "knowledgePoint": "生物 - 光合作用"
}
```

**请求参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| questionContent | string | 是 | 题目内容 |
| studentAnswer | string | 是 | 学生答案 |
| standardAnswer | string | 是 | 参考答案 |
| scoringCriteria | string | 否 | 评分标准 |
| maxScore | number | 是 | 满分值 |
| knowledgePoint | string | 否 | 知识点 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "score": 8,
    "maxScore": 10,
    "scorePercentage": 80,
    "correctness": 80,
    "feedback": "回答良好，基本要点都涵盖了。",
    "keyPoints": ["光合作用定义", "利用光能", "合成有机物"],
    "missingPoints": ["维持大气平衡"],
    "suggestions": "针对生物 - 光合作用，建议：1. 仔细审题；2. 抓住关键得分点；3. 条理清晰作答。"
  }
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| score | number | 得分 |
| maxScore | number | 满分 |
| scorePercentage | number | 得分率 (0-100) |
| correctness | number | 正确率 (0-100) |
| feedback | string | 反馈意见 |
| keyPoints | array | 关键得分点列表 |
| missingPoints | array | 遗漏的要点列表 |
| suggestions | string | 改进建议 |

---

### 3. 生成评分报告

**接口**: `POST /api/ai/grading/report`

**描述**: 根据练习会话生成详细评分报告

**请求头**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**请求体**:
```json
{
  "sessionId": 123,
  "reportType": "DETAILED"
}
```

**请求参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | number | 是 | 练习会话 ID |
| reportType | string | 否 | 报告类型：DETAILED(详细)/SUMMARY(简要)，默认 DETAILED |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sessionId": 123,
    "userId": 456,
    "subject": "MATH",
    "gradeLevel": 5,
    "totalScore": 80,
    "maxScore": 100,
    "scorePercentage": 80,
    "reportType": "DETAILED",
    "exerciseResults": [
      {
        "questionId": 1,
        "questionType": "SINGLE_CHOICE",
        "score": 10,
        "maxScore": 10,
        "userAnswer": "A",
        "correctAnswer": "A",
        "feedback": "回答正确"
      },
      {
        "questionId": 2,
        "questionType": "SINGLE_CHOICE",
        "score": 0,
        "maxScore": 10,
        "userAnswer": "B",
        "correctAnswer": "A",
        "feedback": "回答错误，请查看答案解析"
      }
    ],
    "dimensionAnalysis": [
      {
        "dimension": "知识掌握",
        "averageScore": 80,
        "mastery": 0.8
      },
      {
        "dimension": "解题能力",
        "averageScore": 80,
        "mastery": 0.8
      }
    ],
    "knowledgePointAnalysis": [
      {
        "knowledgePoint": "核心知识点",
        "correctRate": 0.75,
        "mastery": "良好"
      }
    ],
    "overallFeedback": "做得不错！正确率 80%，继续加油！",
    "strengths": ["完成 10 道题目", "正确 8 道题", "整体掌握良好"],
    "weaknesses": ["错误 2 道题", "部分知识点需加强"],
    "studySuggestions": ["定期复习，避免遗忘"],
    "generatedAt": "2026-03-17T12:00:00.000Z"
  }
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| sessionId | number | 练习会话 ID |
| userId | number | 用户 ID |
| subject | string | 科目 |
| gradeLevel | number | 年级 |
| totalScore | number | 总分 |
| maxScore | number | 满分 |
| scorePercentage | number | 得分率 (0-100) |
| reportType | string | 报告类型 |
| exerciseResults | array | 各题目结果（仅 DETAILED 模式） |
| dimensionAnalysis | array | 维度分析 |
| knowledgePointAnalysis | array | 知识点分析 |
| overallFeedback | string | 总体反馈 |
| strengths | array | 优点列表 |
| weaknesses | array | 弱点列表 |
| studySuggestions | array | 学习建议列表 |
| generatedAt | string | 生成时间 |

---

### 4. 获取评分报告（GET）

**接口**: `GET /api/ai/grading/report/:sessionId`

**描述**: 根据会话 ID 获取评分报告

**请求头**:
```
Authorization: Bearer <jwt-token>
```

**路径参数**:
- `sessionId`: 练习会话 ID

**查询参数**:
- `type`: 报告类型 (DETAILED | SUMMARY)，默认 DETAILED

**示例**:
```
GET /api/ai/grading/report/123?type=SUMMARY
```

**响应**: 同 POST /api/ai/grading/report

---

## 评分标准说明

### 作文评分维度

| 维度 | 权重 | 评分要点 |
|------|------|----------|
| 内容 | 40% | 主题明确、内容充实、观点正确 |
| 语言 | 30% | 语句通顺、词汇丰富、表达准确 |
| 结构 | 20% | 段落清晰、过渡自然、首尾呼应 |
| 卷面 | 10% | 字迹工整、标点正确、格式规范 |

### 字数评分标准

| 实际字数/期望字数 | 得分 |
|------------------|------|
| 90%-110% | 100 分 |
| 80%-90% | 80 分 |
| 70%-80% | 60 分 |
| 60%-70% | 40 分 |
| <60% | 按比例计算 |

### 等级划分

| 总分范围 | 等级 | 说明 |
|---------|------|------|
| 90-100 | A | 优秀 |
| 80-89 | B | 良好 |
| 70-79 | C | 中等 |
| 60-69 | D | 及格 |
| 0-59 | E | 待提高 |

---

## 错误处理

### 通用错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| NOT_FOUND | 资源不存在（如会话 ID 无效） |
| BAD_REQUEST | 请求参数错误 |
| UNAUTHORIZED | 未授权访问 |
| INTERNAL_ERROR | 服务器内部错误 |

### 错误示例

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "练习会话不存在"
  }
}
```

---

## 降级策略

当 AI API 不可用时，系统会自动切换到规则评分模式：

### 作文降级策略
- 基于字数、段落数、关键词等规则进行评分
- 分数范围控制在 60-90 分之间
- 提供通用的反馈意见

### 主观题降级策略
- 基于关键词匹配计算正确率
- 对比学生答案和参考答案的关键词重合度
- 提供基础反馈和建议

---

## 使用示例

### JavaScript/TypeScript

```typescript
// 作文评分
const essayGrade = await fetch('/api/ai/grading/essay', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    essayContent: '这是一篇作文...',
    essayType: 'NARRATIVE',
    gradeLevel: 5,
    expectedWordCount: 400,
  }),
});

const result = await essayGrade.json();
console.log('总分:', result.data.totalScore);
console.log('等级:', result.data.estimatedGrade);

// 主观题批改
const subjectiveGrade = await fetch('/api/ai/grading/subjective', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    questionContent: '题目内容',
    studentAnswer: '学生答案',
    standardAnswer: '参考答案',
    maxScore: 10,
  }),
});

// 生成报告
const report = await fetch('/api/ai/grading/report', {
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
```

### cURL

```bash
# 作文评分
curl -X POST http://localhost:3000/api/ai/grading/essay \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "essayContent": "这是一篇作文...",
    "essayType": "NARRATIVE",
    "gradeLevel": 5,
    "expectedWordCount": 400
  }'

# 主观题批改
curl -X POST http://localhost:3000/api/ai/grading/subjective \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionContent": "题目内容",
    "studentAnswer": "学生答案",
    "standardAnswer": "参考答案",
    "maxScore": 10
  }'

# 生成报告
curl -X POST http://localhost:3000/api/ai/grading/report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 123,
    "reportType": "DETAILED"
  }'
```

---

## 性能优化建议

1. **批量处理**: 对于多个作文/题目，建议批量提交而非逐个调用
2. **缓存报告**: 评分报告生成后可缓存，避免重复计算
3. **异步处理**: 大批量批改建议使用异步任务队列
4. **降级策略**: 生产环境建议配置 AI API，开发环境可使用降级策略

---

## 环境变量配置

在 `.env` 文件中配置：

```env
# AI API 配置
AI_API_KEY=your-api-key
AI_GRADING_API_URL=https://api.example.com/v1/grading

# 测试模式（启用降级策略）
TEST_MODE=false
```

---

**文档版本**: v1.0  
**最后更新**: 2026-03-17  
**维护者**: 俊哥的学习助手团队
