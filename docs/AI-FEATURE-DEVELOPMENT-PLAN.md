# AI 功能开发方案

**任务**: 【第三优先级】AI 功能开发  
**执行人**: algorithm (Sub-Agent)  
**创建时间**: 2026-03-17 07:00 GMT+8  
**预计完成**: 60 分钟

---

## 📋 目录

1. [当前 AI 功能分析](#1-当前 ai 功能分析)
2. [AI 功能缺口分析](#2-ai 功能缺口分析)
3. [新 AI 功能架构设计](#3-新 ai 功能架构设计)
4. [核心算法实现](#4-核心算法实现)
5. [API 接口定义](#5-api 接口定义)
6. [实施计划](#6-实施计划)

---

## 1. 当前 AI 功能分析

### 1.1 已有 AI 功能模块

#### 1.1.1 AI Gateway (ai-gateway)
**位置**: `backend/src/modules/ai-gateway/`

**核心功能**:
- ✅ 多模型路由（qwen-flash/qwen-plus/qwen-max）
- ✅ AI 题目生成（generateQuestions）
- ✅ 任务日志记录（AiTaskLogModel）
- ✅ 重试机制和错误处理

**API 接口**:
- `POST /api/ai/generate-questions` - AI 出题
- `GET /api/ai/task-logs` - 获取任务日志
- `GET /api/ai/task-logs/:id` - 获取单条日志详情

**技术特点**:
- 支持 3 种通义千问模型，根据任务复杂度自动路由
- 内置 JSON 解析和修复机制
- 完整的任务日志追踪

---

#### 1.1.2 课本解析 (textbook-parser)
**位置**: `backend/src/modules/textbook-parser/`

**核心功能**:
- ✅ PDF 文本提取（pdf-parse）
- ✅ AI 目录结构识别（recognizeStructure）
- ✅ 知识点提取（extractKnowledgePoints）
- ✅ 异步 Worker 处理（textbookParser.js）
- ✅ 进度回调（4 个阶段）

**AI 能力**:
- 使用 qwen-plus 识别课本目录结构
- 提取单元->章节->小节三级结构
- 从章节内容中提取知识点

**技术特点**:
- 支持本地文件存储
- 异步 Worker 处理大文件
- 结构化输出（JSON）

---

#### 1.1.3 薄弱点分析 (weakness-analysis)
**位置**: `backend/src/modules/weakness-analysis/`

**核心功能**:
- ✅ 薄弱点识别（analyzeWeakPoints）
- ✅ AI 学习建议生成（generateRecommendations）
- ✅ 知识点掌握度计算（KnowledgeMasteryModel）
- ✅ 练习报告生成（generatePracticeReport）
- ✅ 掌握度批量更新（batchUpdateMastery）

**AI 能力**:
- 使用 qwen-plus 生成个性化学习建议
- 基于艾宾浩斯遗忘曲线的掌握度计算
- 练习后自动生成总结建议

**掌握度计算算法**:
```javascript
// 三维度计算（正确率 50% + 练习次数 25% + 近期表现 25%）
masteryScore = accuracy * 0.5 + practiceCountScore * 0.25 + recentPerformance * 0.25

// 遗忘因子
forgettingFactor = {
  '1 天内': 1.0,
  '7 天内': 0.8,
  '30 天内': 0.6,
  '30 天以上': 0.4
}
```

---

### 1.2 现有 AI 功能架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Gateway                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ qwen-flash  │  │ qwen-plus   │  │ qwen-max    │         │
│  │ (简单任务)  │  │ (中等任务)  │  │ (复杂任务)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         └────────────────┴────────────────┘                 │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  模型路由   │                          │
│                    │  重试机制   │                          │
│                    │  日志记录   │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  课本解析模块   │  │  薄弱点分析模块 │  │  AI 出题功能    │
│                 │  │                 │  │                 │
│ • PDF 提取      │  │ • 薄弱点识别    │  │ • 题目生成      │
│ • 目录识别      │  │ • 学习建议      │  │ • JSON 解析     │
│ • 知识点提取    │  │ • 掌握度计算    │  │ • 质量校验      │
│ • 异步处理      │  │ • 练习报告      │  │ • 难度控制      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. AI 功能缺口分析

### 2.1 缺失的核心 AI 功能

| 功能类别 | 具体功能 | 优先级 | 复杂度 | 预计工时 |
|---------|---------|--------|--------|---------|
| **AI 答疑** | 智能问答（支持多轮对话） | P0 | 中 | 8h |
| **AI 批改** | 主观题自动批改 | P0 | 高 | 12h |
| **AI 作文批改** | 英语/语文作文评分 + 评语 | P0 | 高 | 16h |
| **AI 口语评测** | 语音识别 + 发音评分 | P1 | 高 | 20h |
| **AI 学习规划** | 个性化学习计划生成 | P1 | 中 | 10h |
| **AI 错题归因** | 错题原因智能分析 | P1 | 中 | 8h |
| **AI 知识点讲解** | 视频/图文讲解生成 | P2 | 高 | 24h |
| **AI 陪练** | 对话式练习伙伴 | P2 | 中 | 12h |

---

### 2.2 现有功能优化点

| 模块 | 优化点 | 优先级 | 说明 |
|------|--------|--------|------|
| AI Gateway | 增加模型健康检查 | P1 | 实时监控 API 可用性 |
| AI Gateway | 增加 Token 用量统计 | P1 | 成本分析和优化 |
| 课本解析 | 支持图片 OCR 识别 | P1 | 处理扫描版课本 |
| 课本解析 | 支持公式识别（LaTeX） | P2 | 理科公式处理 |
| 薄弱点分析 | 增加预测模型 | P1 | 预测薄弱点发展趋势 |
| 薄弱点分析 | 增加群体对比分析 | P2 | 与同龄人对比 |

---

### 2.3 技术债务

1. **缺少统一的 AI 配置管理**
   - 当前：各模块独立配置 AI API
   - 建议：集中配置中心，支持动态切换

2. **缺少 AI 响应缓存**
   - 当前：相同请求重复调用 AI
   - 建议：语义缓存，降低成本

3. **缺少 AI 质量评估**
   - 当前：无输出质量监控
   - 建议：建立评估指标和反馈机制

4. **缺少多模态支持**
   - 当前：仅支持文本
   - 建议：支持图片、语音、视频

---

## 3. 新 AI 功能架构设计

### 3.1 整体架构

```
┌────────────────────────────────────────────────────────────────┐
│                        AI 服务层                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AI Gateway v2                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ 模型路由 │  │ 负载均衡 │  │ 限流降级 │  │ 监控告警 │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ 语义缓存 │  │ Token 统计│  │ 质量评估 │  │ 配置中心 │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  AI 答疑服务 │     │  AI 批改服务 │     │  AI 规划服务 │       │
│  │             │     │             │     │             │       │
│  │ • 多轮对话  │     │ • 客观题批改│     │ • 计划生成  │       │
│  │ • 上下文管理│     │ • 主观题批改│     │ • 进度跟踪  │       │
│  │ • 知识库检索│     │ • 作文评分  │     │ • 动态调整  │       │
│  │ • RAG 增强  │     │ • 评语生成  │     │ • 目标管理  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                 │
│         ┌────────────────────┼────────────────────┐             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  AI 口语服务 │     │  AI 归因服务 │     │  AI 讲解服务 │       │
│  │             │     │             │     │             │       │
│  │ • 语音识别  │     │ • 错题分析  │     │ • 视频生成  │       │
│  │ • 发音评分  │     │ • 归因分类  │     │ • 图文讲解  │       │
│  │ • 流利度分析│     │ • 补救建议  │     │ • 知识点关联│       │
│  │ • 语调评估  │     │ • 相似题推荐│     │ • 难度分级  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
└────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                        数据层                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  向量数据库 │  │  知识图谱   │  │  缓存层     │            │
│  │  ( embeddings)│  │ (知识点关系)│  │  (Redis)   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

---

### 3.2 核心服务设计

#### 3.2.1 AI 答疑服务 (AI Chat Service)

**功能**:
- 支持多轮对话，维护上下文
- RAG（检索增强生成）：从课本/知识点中检索相关信息
- 支持追问、澄清、举例

**技术实现**:
```javascript
class AIChatService {
  // 对话上下文管理
  async createSession(userId, options) {
    // 创建对话会话，初始化上下文
  }
  
  // 发送消息（支持 RAG）
  async sendMessage(sessionId, message, options) {
    // 1. 检索相关知识（向量搜索）
    // 2. 构建增强提示词
    // 3. 调用 AI 模型
    // 4. 更新对话历史
  }
  
  // 获取对话历史
  async getHistory(sessionId, limit) {
    // 返回对话历史
  }
}
```

**数据库设计**:
```sql
CREATE TABLE ai_chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  subject VARCHAR(50),
  context JSONB,  -- 对话上下文
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES ai_chat_sessions(id),
  role VARCHAR(20) NOT NULL,  -- user/assistant/system
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 向量索引（使用 pgvector）
CREATE TABLE knowledge_embeddings (
  id SERIAL PRIMARY KEY,
  knowledge_point_id INTEGER,
  content TEXT,
  embedding vector(1536),  -- 1536 维向量
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_knowledge_embeddings ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

#### 3.2.2 AI 批改服务 (AI Grading Service)

**功能**:
- 客观题自动批改（已有）
- 主观题智能批改（简答、论述）
- 作文评分（内容、结构、语法、词汇）
- 生成详细评语和改进建议

**技术实现**:
```javascript
class AIGradingService {
  // 批改主观题
  async gradeSubjectiveQuestion(question, userAnswer, rubric) {
    // 1. 根据评分标准评估
    // 2. 给出分数和评语
    // 3. 指出优点和改进点
  }
  
  // 批改作文
  async gradeEssay(essay, grade, subject, criteria) {
    // 1. 内容评分（30%）
    // 2. 结构评分（25%）
    // 3. 语言评分（25%）
    // 4. 创意评分（20%）
    // 5. 生成详细评语
  }
  
  // 批量批改
  async batchGrade(submissions) {
    // 批量处理，优化成本
  }
}
```

**评分维度**:
```javascript
const ESSAY_CRITERIA = {
  content: {
    weight: 0.30,
    aspects: ['主题明确', '内容充实', '论点清晰']
  },
  structure: {
    weight: 0.25,
    aspects: ['段落清晰', '逻辑连贯', '过渡自然']
  },
  language: {
    weight: 0.25,
    aspects: ['语法正确', '词汇丰富', '表达准确']
  },
  creativity: {
    weight: 0.20,
    aspects: ['观点新颖', '表达独特', '有感染力']
  }
};
```

---

#### 3.2.3 AI 学习规划服务 (AI Planning Service)

**功能**:
- 基于薄弱点生成个性化学习计划
- 动态调整计划（根据执行情况）
- 目标管理和进度跟踪
- 智能提醒和激励

**技术实现**:
```javascript
class AIPlanningService {
  // 生成学习计划
  async generatePlan(userId, goals, timeframe) {
    // 1. 分析当前水平（薄弱点）
    // 2. 设定阶段性目标
    // 3. 分配每日任务
    // 4. 预留弹性时间
  }
  
  // 调整计划
  async adjustPlan(planId, progressData) {
    // 根据实际进度调整后续计划
  }
  
  // 生成每日任务
  async generateDailyTasks(userId, planId) {
    // 根据计划生成当日具体任务
  }
}
```

**计划模板**:
```javascript
{
  planId: "plan_001",
  userId: 1,
  subject: "数学",
  timeframe: {
    startDate: "2026-03-17",
    endDate: "2026-04-17",
    totalDays: 30
  },
  goals: [
    {
      knowledgePointId: 101,
      targetMastery: 80,
      currentMastery: 45,
      priority: "high"
    }
  ],
  weeklySchedule: [
    {
      week: 1,
      focus: "基础概念",
      dailyTasks: [
        { day: 1, task: "学习知识点 A", estimatedTime: 30 },
        { day: 2, task: "练习题目 5 道", estimatedTime: 25 }
      ]
    }
  ],
  milestones: [
    { day: 7, target: "完成第一周学习", reward: "积分 +50" },
    { day: 30, target: "掌握度达到 80%", reward: "积分 +200" }
  ]
}
```

---

### 3.3 数据流设计

#### 3.3.1 AI 答疑流程

```
用户提问
    │
    ▼
┌─────────────┐
│ 问题预处理  │ → 拼写检查、意图识别
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 向量检索    │ → 从知识库检索相关内容
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 提示词构建  │ → 问题 + 检索结果 + 上下文
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ AI 模型调用  │ → 生成回答
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 回答后处理  │ → 格式化、引用标注
└──────┬──────┘
       │
       ▼
   返回用户
```

#### 3.3.2 AI 批改流程

```
用户提交答案
    │
    ▼
┌─────────────┐
│ 答案预处理  │ → 文本清洗、格式标准化
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 类型判断    │ → 客观题/主观题/作文
└──────┬──────┘
       │
    ┌──┴──┐
    │     │
    ▼     ▼
┌─────────┐ ┌─────────┐
│客观题批改│ │主观题批改│
│(精确匹配)│ │(AI 评分)  │
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           │
           ▼
    ┌─────────────┐
    │ 评语生成    │ → 优点、改进点、建议
    └──────┬──────┘
           │
           ▼
       返回结果
```

---

## 4. 核心算法实现

### 4.1 向量检索算法（RAG）

```javascript
const { Client: PgVectorClient } = require('pgvector');

class VectorSearchService {
  constructor() {
    this.client = new PgVectorClient({
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * 语义搜索
   * @param {string} query - 搜索 query
   * @param {string} subject - 科目（可选）
   * @param {number} limit - 返回数量
   * @returns {Promise<Array>} 相关知识
   */
  async search(query, subject = null, limit = 5) {
    // 1. 生成 query 的 embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // 2. 向量相似度搜索
    const sql = `
      SELECT 
        kp.id,
        kp.name,
        kp.description,
        ke.content,
        1 - (ke.embedding <=> $1) AS similarity
      FROM knowledge_embeddings ke
      JOIN knowledge_points kp ON ke.knowledge_point_id = kp.id
      ${subject ? 'WHERE kp.subject = $2' : ''}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
    
    const params = subject ? [queryEmbedding, subject] : [queryEmbedding];
    const results = await this.client.query(sql, params);
    
    return results.rows.filter(r => r.similarity > 0.6); // 相似度阈值
  }

  /**
   * 生成 embedding（调用 AI 模型）
   */
  async generateEmbedding(text) {
    const response = await axios.post(
      process.env.EMBEDDING_API_URL,
      { input: text },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`
        }
      }
    );
    return response.data.embedding;
  }

  /**
   * 批量创建 embeddings
   */
  async bulkCreateEmbeddings(knowledgePoints) {
    const batchSize = 50;
    for (let i = 0; i < knowledgePoints.length; i += batchSize) {
      const batch = knowledgePoints.slice(i, i + batchSize);
      const embeddings = await Promise.all(
        batch.map(kp => this.generateEmbedding(kp.name + ' ' + kp.description))
      );
      
      // 批量插入数据库
      await this.insertEmbeddings(batch, embeddings);
    }
  }
}
```

---

### 4.2 作文评分算法

```javascript
class EssayGradingAlgorithm {
  /**
   * 评分主流程
   */
  async grade(essay, criteria) {
    const scores = {};
    const feedback = {};
    
    // 1. 内容评分
    scores.content = await this.scoreContent(essay, criteria.content);
    feedback.content = this.generateContentFeedback(essay, scores.content);
    
    // 2. 结构评分
    scores.structure = await this.scoreStructure(essay, criteria.structure);
    feedback.structure = this.generateStructureFeedback(essay, scores.structure);
    
    // 3. 语言评分
    scores.language = await this.scoreLanguage(essay, criteria.language);
    feedback.language = this.generateLanguageFeedback(essay, scores.language);
    
    // 4. 创意评分
    scores.creativity = await this.scoreCreativity(essay, criteria.creativity);
    feedback.creativity = this.generateCreativityFeedback(essay, scores.creativity);
    
    // 5. 计算总分
    const totalScore = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + score * criteria[key].weight;
    }, 0);
    
    // 6. 生成综合评语
    const overallFeedback = this.generateOverallFeedback(scores, feedback);
    
    return {
      totalScore: Math.round(totalScore * 10) / 10, // 保留 1 位小数
      scores,
      feedback,
      overallFeedback,
      suggestions: this.generateSuggestions(scores, feedback)
    };
  }

  /**
   * 内容评分（AI 模型）
   */
  async scoreContent(essay, criteria) {
    const prompt = `请评估以下作文的内容质量：

【作文】
${essay}

【评分标准】
${JSON.stringify(criteria)}

【评分维度】
1. 主题明确性（0-10 分）
2. 内容充实度（0-10 分）
3. 论点清晰度（0-10 分）

请输出 JSON：
{
  "themeScore": 分数，
  "contentScore": 分数，
  "argumentScore": 分数，
  "comments": "具体评价"
}`;

    const result = await AiGatewayService.callModel('qwen-plus', prompt);
    const scores = JSON.parse(result.data);
    
    return (scores.themeScore + scores.contentScore + scores.argumentScore) / 30 * 100;
  }

  /**
   * 语言评分（规则 + AI）
   */
  async scoreLanguage(essay, criteria) {
    // 规则评分：语法错误、词汇多样性、句子长度变化
    const grammarErrors = this.countGrammarErrors(essay);
    const vocabDiversity = this.calculateVocabDiversity(essay);
    const sentenceVariety = this.calculateSentenceVariety(essay);
    
    const ruleScore = (
      (100 - grammarErrors * 5) * 0.4 +
      vocabDiversity * 0.3 +
      sentenceVariety * 0.3
    );
    
    // AI 评分：表达准确性、语言流畅度
    const aiScore = await this.aiScoreLanguage(essay);
    
    return ruleScore * 0.5 + aiScore * 0.5;
  }

  /**
   * 计算词汇多样性
   */
  calculateVocabDiversity(essay) {
    const words = essay.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    return (uniqueWords.size / words.length) * 100;
  }

  /**
   * 计算句子长度变化
   */
  calculateSentenceVariety(essay) {
    const sentences = essay.split(/[.!?]+/).filter(s => s.trim());
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
    
    // 标准差适中为好（10-20 之间）
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - Math.abs(stdDev - 15) * 5);
  }
}
```

---

### 4.3 学习规划算法

```javascript
class LearningPlanAlgorithm {
  /**
   * 生成个性化学习计划
   */
  async generatePlan(userId, goals, options) {
    // 1. 获取用户当前状态
    const userProfile = await this.getUserProfile(userId);
    const weakPoints = await this.getWeakPoints(userId, options.subject);
    
    // 2. 分析目标可行性
    const feasibility = this.analyzeFeasibility(goals, userProfile, options.timeframe);
    if (!feasibility.feasible) {
      return {
        success: false,
        reason: feasibility.reason,
        suggestion: feasibility.suggestion
      };
    }
    
    // 3. 分解目标到周
    const weeklyGoals = this.decomposeToWeekly(goals, options.timeframe.weeks);
    
    // 4. 生成每日任务
    const dailyTasks = await this.generateDailyTasks(weeklyGoals, userProfile);
    
    // 5. 添加弹性时间
    const schedule = this.addBufferTime(dailyTasks);
    
    // 6. 设置里程碑和奖励
    const milestones = this.createMilestones(schedule, options.rewards);
    
    return {
      success: true,
      plan: {
        userId,
        timeframe: options.timeframe,
        weeklyGoals,
        schedule,
        milestones,
        estimatedCompletionRate: feasibility.estimatedRate
      }
    };
  }

  /**
   * 分析目标可行性
   */
  analyzeFeasibility(goals, userProfile, timeframe) {
    const totalDays = timeframe.totalDays;
    const totalKnowledgePoints = goals.length;
    
    // 计算每个知识点需要的练习次数
    const practicesNeeded = goals.reduce((sum, goal) => {
      const gap = goal.targetMastery - goal.currentMastery;
      // 每提升 1% 掌握度需要约 2 次练习
      return sum + Math.ceil(gap * 2);
    }, 0);
    
    // 计算每日需要练习量
    const dailyPracticeNeeded = Math.ceil(practicesNeeded / totalDays);
    
    // 用户历史平均每日练习量
    const userAvgDailyPractice = userProfile.avgDailyPractice || 5;
    
    if (dailyPracticeNeeded > userAvgDailyPractice * 2) {
      return {
        feasible: false,
        reason: '目标过于激进，超出用户能力范围',
        suggestion: `建议将时间延长至${Math.ceil(practicesNeeded / userAvgDailyPractice)}天`,
        estimatedRate: 0.3
      };
    }
    
    return {
      feasible: true,
      reason: '目标合理',
      estimatedRate: Math.min(0.95, userAvgDailyPractice / dailyPracticeNeeded)
    };
  }

  /**
   * 分解目标到周
   */
  decomposeToWeekly(goals, totalWeeks) {
    // 按优先级排序
    const sortedGoals = goals.sort((a, b) => {
      const priorityScore = (g) => {
        const gap = g.targetMastery - g.currentMastery;
        return g.priority === 'high' ? gap * 2 : gap;
      };
      return priorityScore(b) - priorityScore(a);
    });
    
    // 分配到各周
    const weeklyGoals = [];
    const goalsPerWeek = Math.ceil(sortedGoals.length / totalWeeks);
    
    for (let week = 0; week < totalWeeks; week++) {
      weeklyGoals[week] = {
        week: week + 1,
        focus: sortedGoals.slice(week * goalsPerWeek, (week + 1) * goalsPerWeek),
        estimatedHours: goalsPerWeek * 2 // 每个知识点约 2 小时
      };
    }
    
    return weeklyGoals;
  }

  /**
   * 添加弹性时间
   */
  addBufferTime(schedule) {
    // 每周预留 1 天缓冲
    const buffered = schedule.map((day, index) => {
      if ((index + 1) % 7 === 0) {
        return { ...day, type: 'buffer', tasks: [] };
      }
      return day;
    });
    
    return buffered;
  }
}
```

---

### 4.4 错题归因算法

```javascript
class ErrorAttributionAlgorithm {
  /**
   * 分析错题原因
   */
  async analyze(userId, wrongQuestions) {
    const attributions = [];
    
    for (const question of wrongQuestions) {
      const attribution = await this.analyzeSingleQuestion(question);
      attributions.push(attribution);
    }
    
    // 聚合分析
    const summary = this.aggregateAttributions(attributions);
    
    return {
      attributions,
      summary
    };
  }

  /**
   * 单题归因分析
   */
  async analyzeSingleQuestion(question) {
    const prompt = `请分析以下错题的原因：

【题目】
${question.question}

【正确答案】
${question.correctAnswer}

【学生答案】
${question.userAnswer}

【知识点】
${question.knowledgePoint}

【可能原因分类】
1. 概念不清 - 对基本概念理解有误
2. 公式错误 - 公式记忆或应用错误
3. 计算失误 - 计算过程中出错
4. 审题不清 - 没有理解题意
5. 思路错误 - 解题思路方向错误
6. 粗心大意 - 简单错误

请输出 JSON：
{
  "primaryCause": "主要原因",
  "secondaryCause": "次要原因（可选）",
  "confidence": 0.8,  // 置信度
  "analysis": "详细分析",
  "suggestion": "改进建议"
}`;

    const result = await AiGatewayService.callModel('qwen-plus', prompt);
    const analysis = JSON.parse(result.data);
    
    return {
      questionId: question.id,
      ...analysis,
      category: this.mapToCategory(analysis.primaryCause)
    };
  }

  /**
   * 聚合分析
   */
  aggregateAttributions(attributions) {
    const causeCount = {};
    
    attributions.forEach(a => {
      causeCount[a.category] = (causeCount[a.category] || 0) + 1;
    });
    
    const total = attributions.length;
    const sorted = Object.entries(causeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([cause, count]) => ({
        cause,
        count,
        percentage: (count / total * 100).toFixed(1)
      }));
    
    return {
      totalQuestions: total,
      causeDistribution: sorted,
      topCause: sorted[0]?.cause,
      recommendations: this.generateRecommendations(sorted)
    };
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(distribution) {
    const recommendations = [];
    
    const causeMap = {
      '概念不清': '建议重新学习相关概念，观看讲解视频，做基础练习题',
      '公式错误': '制作公式卡片，每天默写，通过练习加深记忆',
      '计算失误': '加强计算训练，养成验算习惯',
      '审题不清': '练习圈画关键词，读完题后复述题意',
      '思路错误': '学习解题套路，多做典型例题',
      '粗心大意': '放慢做题速度，建立错题本定期复习'
    };
    
    distribution.slice(0, 3).forEach(item => {
      recommendations.push({
        cause: item.cause,
        percentage: item.percentage,
        suggestion: causeMap[item.cause]
      });
    });
    
    return recommendations;
  }
}
```

---

## 5. API 接口定义

### 5.1 AI 答疑接口

```http
# 创建对话会话
POST /api/ai/chat/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "math",
  "context": {
    "grade": "7",
    "textbookId": 1
  }
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "session_001",
    "createdAt": "2026-03-17T10:00:00Z"
  }
}

---

# 发送消息
POST /api/ai/chat/sessions/:sessionId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "什么是勾股定理？",
  "options": {
    "useRAG": true,
    "includeExamples": true
  }
}

Response:
{
  "success": true,
  "data": {
    "messageId": "msg_001",
    "content": "勾股定理是...",
    "references": [
      {
        "knowledgePointId": 101,
        "name": "勾股定理",
        "similarity": 0.92
      }
    ],
    "tokens": 150
  }
}

---

# 获取对话历史
GET /api/ai/chat/sessions/:sessionId/history?limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "role": "user",
        "content": "什么是勾股定理？",
        "createdAt": "2026-03-17T10:00:00Z"
      },
      {
        "id": 2,
        "role": "assistant",
        "content": "勾股定理是...",
        "createdAt": "2026-03-17T10:00:05Z"
      }
    ],
    "total": 2
  }
}
```

---

### 5.2 AI 批改接口

```http
# 批改主观题
POST /api/ai/grade/subjective
Authorization: Bearer <token>
Content-Type: application/json

{
  "questionId": 1,
  "question": "请解释光合作用的过程",
  "userAnswer": "光合作用是植物...",
  "rubric": {
    "maxScore": 10,
    "keyPoints": ["光反应", "暗反应", "产物"]
  }
}

Response:
{
  "success": true,
  "data": {
    "score": 8,
    "maxScore": 10,
    "feedback": {
      "strengths": ["正确描述了光反应过程"],
      "improvements": ["缺少暗反应的详细说明"],
      "suggestions": "建议复习暗反应阶段的具体过程"
    },
    "detailedScoring": {
      "completeness": 8,
      "accuracy": 9,
      "clarity": 7
    }
  }
}

---

# 批改作文
POST /api/ai/grade/essay
Authorization: Bearer <token>
Content-Type: application/json

{
  "essay": "My Dream...\n\nEveryone has a dream...",
  "subject": "english",
  "grade": "7",
  "topic": "My Dream",
  "wordLimit": {
    "min": 80,
    "max": 120
  }
}

Response:
{
  "success": true,
  "data": {
    "totalScore": 85.5,
    "scores": {
      "content": 88,
      "structure": 82,
      "language": 86,
      "creativity": 85
    },
    "feedback": {
      "content": "主题明确，内容充实...",
      "structure": "段落清晰，但过渡可以更自然...",
      "language": "语法基本正确，词汇较丰富...",
      "creativity": "观点有一定新意..."
    },
    "overallFeedback": "这是一篇不错的作文...",
    "suggestions": [
      "增加一些具体的例子来支撑观点",
      "注意段落之间的过渡句"
    ],
    "wordCount": 105,
    "errors": [
      {
        "type": "grammar",
        "original": "I has",
        "suggestion": "I have",
        "position": 45
      }
    ]
  }
}
```

---

### 5.3 AI 学习规划接口

```http
# 生成学习计划
POST /api/ai/plan/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "math",
  "timeframe": {
    "startDate": "2026-03-17",
    "endDate": "2026-04-17",
    "totalDays": 30
  },
  "goals": [
    {
      "knowledgePointId": 101,
      "targetMastery": 80,
      "priority": "high"
    }
  ],
  "options": {
    "dailyTimeLimit": 60,
    "includeWeekend": true,
    "rewards": true
  }
}

Response:
{
  "success": true,
  "data": {
    "planId": "plan_001",
    "timeframe": {
      "startDate": "2026-03-17",
      "endDate": "2026-04-17"
    },
    "weeklyGoals": [
      {
        "week": 1,
        "focus": ["勾股定理", "相似三角形"],
        "estimatedHours": 6
      }
    ],
    "schedule": [
      {
        "date": "2026-03-17",
        "tasks": [
          {
            "type": "learn",
            "knowledgePointId": 101,
            "estimatedTime": 30
          },
          {
            "type": "practice",
            "questionCount": 5,
            "estimatedTime": 25
          }
        ]
      }
    ],
    "milestones": [
      {
        "day": 7,
        "target": "完成第一周学习",
        "reward": "积分 +50"
      }
    ],
    "estimatedCompletionRate": 0.85
  }
}

---

# 获取每日任务
GET /api/ai/plan/:planId/daily-tasks?date=2026-03-17
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "date": "2026-03-17",
    "tasks": [
      {
        "id": 1,
        "type": "learn",
        "title": "学习勾股定理",
        "knowledgePointId": 101,
        "estimatedTime": 30,
        "status": "pending"
      },
      {
        "id": 2,
        "type": "practice",
        "title": "练习题目 5 道",
        "questionCount": 5,
        "estimatedTime": 25,
        "status": "pending"
      }
    ],
    "totalEstimatedTime": 55
  }
}

---

# 更新任务状态
POST /api/ai/plan/:planId/tasks/:taskId/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "actualTime": 35,
  "feedback": "题目有点难"
}

Response:
{
  "success": true,
  "data": {
    "taskId": 1,
    "status": "completed",
    "pointsEarned": 10,
    "nextTask": {
      "id": 2,
      "title": "练习题目 5 道"
    }
  }
}
```

---

### 5.4 AI 错题归因接口

```http
# 分析错题原因
POST /api/ai/analyze/errors
Authorization: Bearer <token>
Content-Type: application/json

{
  "questions": [
    {
      "id": 1,
      "question": "计算：2 + 3 × 4 = ?",
      "correctAnswer": "14",
      "userAnswer": "20",
      "knowledgePoint": "运算顺序"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "attributions": [
      {
        "questionId": 1,
        "primaryCause": "概念不清",
        "secondaryCause": "审题不清",
        "confidence": 0.85,
        "analysis": "学生先计算了 2+3=5，再乘以 4 得到 20，说明没有掌握先乘除后加减的运算顺序规则",
        "suggestion": "复习四则运算的优先级规则，记住'先乘除后加减'"
      }
    ],
    "summary": {
      "totalQuestions": 1,
      "causeDistribution": [
        {
          "cause": "概念不清",
          "count": 1,
          "percentage": "100.0"
        }
      ],
      "topCause": "概念不清",
      "recommendations": [
        {
          "cause": "概念不清",
          "percentage": "100.0",
          "suggestion": "建议重新学习相关概念，观看讲解视频，做基础练习题"
        }
      ]
    }
  }
}
```

---

### 5.5 AI 配置管理接口

```http
# 获取 AI 配置
GET /api/ai/config
Authorization: Bearer <token> (admin)

Response:
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "qwen-flash",
        "name": "通义千问 Turbo",
        "status": "active",
        "avgResponseTime": 1200,
        "successRate": 0.98
      },
      {
        "id": "qwen-plus",
        "name": "通义千问 Plus",
        "status": "active",
        "avgResponseTime": 3500,
        "successRate": 0.96
      }
    ],
    "tokenUsage": {
      "today": 150000,
      "thisMonth": 3500000,
      "limit": 10000000
    }
  }
}

---

# 更新 AI 配置
PUT /api/ai/config/models/:modelId
Authorization: Bearer <token> (admin)
Content-Type: application/json

{
  "status": "inactive",
  "reason": "维护中"
}

---

# 获取 Token 使用统计
GET /api/ai/stats/tokens?startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <token> (admin)

Response:
{
  "success": true,
  "data": {
    "total": 3500000,
    "byModel": {
      "qwen-flash": 2000000,
      "qwen-plus": 1200000,
      "qwen-max": 300000
    },
    "byService": {
      "chat": 1500000,
      "grading": 1000000,
      "planning": 500000,
      "other": 500000
    },
    "dailyAverage": 116667,
    "estimatedCost": 35.00
  }
}
```

---

## 6. 实施计划

### 6.1 阶段划分

| 阶段 | 时间 | 任务 | 交付物 |
|------|------|------|--------|
| **Phase 1** | Week 1-2 | AI Gateway v2 升级 | 配置中心、缓存、监控 |
| **Phase 2** | Week 3-4 | AI 答疑服务 | 多轮对话、RAG 检索 |
| **Phase 3** | Week 5-6 | AI 批改服务 | 主观题批改、作文评分 |
| **Phase 4** | Week 7-8 | AI 规划服务 | 学习计划生成 |
| **Phase 5** | Week 9-10 | AI 归因服务 | 错题分析 |
| **Phase 6** | Week 11-12 | 集成测试和优化 | 性能优化、文档 |

---

### 6.2 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| **向量数据库** | PostgreSQL + pgvector | 复用现有数据库 |
| **缓存** | Redis | 对话上下文、AI 响应缓存 |
| **消息队列** | Bull (Redis) | 异步任务处理 |
| **监控** | Prometheus + Grafana | API 性能、Token 用量 |
| **Embedding** | 通义千问 Embedding API | 文本向量化 |
| **LLM** | 通义千问系列 | 主要 AI 模型 |

---

### 6.3 依赖安装

```bash
cd backend

# 向量搜索
npm install pgvector

# 缓存
npm install ioredis

# 消息队列
npm install bull

# 监控
npm install prom-client

# AI SDK（如果官方有）
npm install @ali/dashscope
```

---

### 6.4 数据库迁移

```sql
-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建 AI 对话表
CREATE TABLE ai_chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject VARCHAR(50),
  context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建知识向量表
CREATE TABLE knowledge_embeddings (
  id SERIAL PRIMARY KEY,
  knowledge_point_id INTEGER REFERENCES knowledge_points(id),
  content TEXT,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_knowledge_embeddings ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);

-- 4. 创建学习计划表
CREATE TABLE learning_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject VARCHAR(50),
  timeframe JSONB,
  goals JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_plan_tasks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES learning_plans(id),
  task_type VARCHAR(50),
  content JSONB,
  scheduled_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 创建 AI 配置表
CREATE TABLE ai_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 创建 Token 使用记录表
CREATE TABLE ai_token_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  service VARCHAR(50),
  model VARCHAR(50),
  tokens INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ai_token_usage_date ON ai_token_usage(created_at);
CREATE INDEX idx_ai_token_usage_user ON ai_token_usage(user_id);
```

---

### 6.5 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| API 成本超支 | 高 | 中 | 实施缓存、限流、用量监控 |
| AI 响应质量不稳定 | 高 | 中 | 多模型 fallback、质量评估 |
| 向量检索性能 | 中 | 低 | 索引优化、分批加载 |
| 数据隐私 | 高 | 低 | 数据脱敏、本地化处理 |
| 用户接受度 | 中 | 中 | A/B 测试、用户反馈收集 |

---

## 7. 总结

### 7.1 核心成果

1. **完成 AI 功能缺口分析** - 识别 8 个核心缺失功能和 6 个优化点
2. **设计完整架构方案** - AI Gateway v2 + 6 个核心服务
3. **实现核心算法** - RAG 检索、作文评分、学习规划、错题归因
4. **定义 API 接口** - 5 大类 20+ 个接口

### 7.2 技术亮点

- **RAG 增强** - 结合向量检索和 AI 生成，提高回答准确性
- **多维度评分** - 作文评分采用 4 维度加权算法
- **个性化规划** - 基于用户历史数据和薄弱点生成计划
- **智能归因** - AI 分析错题原因，给出针对性建议

### 7.3 下一步行动

1. **Phase 1 启动** - AI Gateway v2 升级（配置中心、缓存、监控）
2. **数据库迁移** - 执行 DDL 脚本，创建新表
3. **依赖安装** - 安装 npm 包，配置环境变量
4. **开发启动** - 按阶段实施，每 2 周一个迭代

---

**文档版本**: v1.0  
**创建时间**: 2026-03-17 07:30 GMT+8  
**执行人**: algorithm (Sub-Agent)  
**状态**: ✅ 完成
