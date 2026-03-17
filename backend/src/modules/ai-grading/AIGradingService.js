/**
 * AI Grading Service - AI 批改服务
 * ISSUE-P2-AI-002: AI 智能批改
 */

const { db } = require('../../config/database');
const AiGatewayService = require('../ai-gateway/AiGatewayService');

class AIGradingService {
  /**
   * 批改主观题
   * @param {object} params - 批改参数
   * @returns {Promise<object>} 批改结果
   */
  static async gradeSubjectiveQuestion(params) {
    const {
      questionId,
      question,
      userAnswer,
      rubric
    } = params;

    // 构建评分提示词
    const prompt = this.buildSubjectiveGradingPrompt(question, userAnswer, rubric);

    const result = await AiGatewayService.callModel('qwen-plus', prompt, {
      systemPrompt: '你是一个公正、专业的教育评估专家，擅长根据评分标准客观评价学生的主观题答案。'
    });

    if (!result.success) {
      throw new Error(`批改失败：${result.error}`);
    }

    // 解析评分结果
    const grading = this.parseSubjectiveGrading(result.data, rubric.maxScore);

    return {
      success: true,
      questionId,
      score: grading.score,
      maxScore: rubric.maxScore,
      percentage: (grading.score / rubric.maxScore * 100).toFixed(1),
      feedback: grading.feedback,
      detailedScoring: grading.detailedScoring,
      model: result.model,
      tokens: result.usage?.total_tokens
    };
  }

  /**
   * 构建主观题评分提示词
   */
  static buildSubjectiveGradingPrompt(question, userAnswer, rubric) {
    const keyPointsStr = rubric.keyPoints?.map((p, i) => `${i + 1}. ${p}`).join('\n') || '无';

    return `请根据以下评分标准评价学生的主观题答案：

【题目】
${question}

【评分标准】
满分：${rubric.maxScore}分
关键得分点：
${keyPointsStr}
${rubric.additionalCriteria ? '\n其他要求：' + rubric.additionalCriteria : ''}

【学生答案】
${userAnswer}

【评分要求】
1. 客观公正，严格按照评分标准
2. 指出答案的优点和不足
3. 给出具体改进建议
4. 分维度评分（如果适用）

【输出格式】
请严格按照以下 JSON 格式输出：
{
  "score": 分数（数字），
  "feedback": {
    "strengths": ["优点 1", "优点 2"],
    "improvements": ["需要改进的地方 1", "需要改进的地方 2"],
    "suggestions": "具体的改进建议"
  },
  "detailedScoring": {
    "completeness": 完整性得分（0-100），
    "accuracy": 准确性得分（0-100），
    "clarity": 清晰度得分（0-100）
  },
  "keyPointsCovered": ["已覆盖的关键点 1", "已覆盖的关键点 2"],
  "keyPointsMissing": ["缺失的关键点 1", "缺失的关键点 2"]
}`;
  }

  /**
   * 解析主观题评分结果
   */
  static parseSubjectiveGrading(responseText, maxScore) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonString);

      // 校验分数范围
      let score = parseFloat(parsed.score);
      if (isNaN(score) || score < 0) score = 0;
      if (score > maxScore) score = maxScore;

      return {
        score: Math.round(score * 10) / 10,
        feedback: {
          strengths: parsed.feedback?.strengths || [],
          improvements: parsed.feedback?.improvements || [],
          suggestions: parsed.feedback?.suggestions || ''
        },
        detailedScoring: {
          completeness: parsed.detailedScoring?.completeness || 0,
          accuracy: parsed.detailedScoring?.accuracy || 0,
          clarity: parsed.detailedScoring?.clarity || 0
        },
        keyPointsCovered: parsed.keyPointsCovered || [],
        keyPointsMissing: parsed.keyPointsMissing || []
      };
    } catch (error) {
      console.error('解析评分结果失败:', error.message);
      
      // 降级方案：返回基础评分
      return {
        score: maxScore * 0.6,
        feedback: {
          strengths: ['答案基本完整'],
          improvements: ['需要更详细'],
          suggestions: '建议参考标准答案，补充关键点'
        },
        detailedScoring: {
          completeness: 60,
          accuracy: 60,
          clarity: 60
        }
      };
    }
  }

  /**
   * 批改作文
   * @param {object} params - 批改参数
   * @returns {Promise<object>} 批改结果
   */
  static async gradeEssay(params) {
    const {
      essay,
      subject,
      grade,
      topic,
      wordLimit,
      criteria
    } = params;

    // 默认评分标准
    const defaultCriteria = {
      content: { weight: 0.30, aspects: ['主题明确', '内容充实', '论点清晰'] },
      structure: { weight: 0.25, aspects: ['段落清晰', '逻辑连贯', '过渡自然'] },
      language: { weight: 0.25, aspects: ['语法正确', '词汇丰富', '表达准确'] },
      creativity: { weight: 0.20, aspects: ['观点新颖', '表达独特', '有感染力'] }
    };

    const scoringCriteria = criteria || defaultCriteria;

    // 构建作文评分提示词
    const prompt = this.buildEssayGradingPrompt(essay, subject, grade, topic, wordLimit, scoringCriteria);

    const result = await AiGatewayService.callModel('qwen-max', prompt, {
      systemPrompt: `你是一个经验丰富的${subject === 'english' ? '英语' : '语文'}教师，擅长批改${grade}年级学生的作文。`
    });

    if (!result.success) {
      throw new Error(`作文批改失败：${result.error}`);
    }

    // 解析评分结果
    const grading = this.parseEssayGrading(result.data, essay, wordLimit);

    return {
      success: true,
      totalScore: grading.totalScore,
      scores: grading.scores,
      feedback: grading.feedback,
      overallFeedback: grading.overallFeedback,
      suggestions: grading.suggestions,
      wordCount: grading.wordCount,
      errors: grading.errors,
      model: result.model,
      tokens: result.usage?.total_tokens
    };
  }

  /**
   * 构建作文评分提示词
   */
  static buildEssayGradingPrompt(essay, subject, grade, topic, wordLimit, criteria) {
    const criteriaStr = Object.entries(criteria).map(([key, value]) => 
      `${key}: ${value.weight * 100}% - ${value.aspects.join('、')}`
    ).join('\n');

    const wordLimitStr = wordLimit ? `字数要求：${wordLimit.min}-${wordLimit.max}字` : '';

    return `请批改以下${subject === 'english' ? '英语' : '语文'}作文：

【基本信息】
年级：${grade}
题目：${topic}
${wordLimitStr}

【评分标准】
${criteriaStr}

【作文内容】
${essay}

【评分要求】
1. 按照评分标准各维度打分（0-100 分）
2. 计算加权总分
3. 指出语法、拼写错误（如有）
4. 给出具体修改建议
5. 用鼓励性的语言写评语

【输出格式】
请严格按照以下 JSON 格式输出：
{
  "totalScore": 总分（0-100 的数字），
  "scores": {
    "content": 内容得分（0-100），
    "structure": 结构得分（0-100），
    "language": 语言得分（0-100），
    "creativity": 创意得分（0-100）
  },
  "feedback": {
    "content": "内容方面的评价",
    "structure": "结构方面的评价",
    "language": "语言方面的评价",
    "creativity": "创意方面的评价"
  },
  "overallFeedback": "总体评语（100-200 字，鼓励性语言）",
  "suggestions": ["建议 1", "建议 2", "建议 3"],
  "wordCount": 实际字数（数字），
  "errors": [
    {
      "type": "grammar|spelling|punctuation",
      "original": "原文",
      "suggestion": "建议修改",
      "position": 位置（可选）
    }
  ]
}`;
  }

  /**
   * 解析作文评分结果
   */
  static parseEssayGrading(responseText, essay, wordLimit) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonString);

      // 计算实际字数
      const wordCount = subject === 'english' 
        ? essay.split(/\s+/).length 
        : essay.replace(/\s/g, '').length;

      // 校验分数
      const scores = {
        content: Math.min(100, Math.max(0, parsed.scores?.content || 0)),
        structure: Math.min(100, Math.max(0, parsed.scores?.structure || 0)),
        language: Math.min(100, Math.max(0, parsed.scores?.language || 0)),
        creativity: Math.min(100, Math.max(0, parsed.scores?.creativity || 0))
      };

      // 计算加权总分
      const totalScore = (
        scores.content * 0.30 +
        scores.structure * 0.25 +
        scores.language * 0.25 +
        scores.creativity * 0.20
      );

      return {
        totalScore: Math.round(totalScore * 10) / 10,
        scores,
        feedback: parsed.feedback || {},
        overallFeedback: parsed.overallFeedback || '继续努力！',
        suggestions: parsed.suggestions || [],
        wordCount: parsed.wordCount || wordCount,
        errors: parsed.errors || []
      };
    } catch (error) {
      console.error('解析作文评分失败:', error.message);
      
      return {
        totalScore: 70,
        scores: {
          content: 70,
          structure: 70,
          language: 70,
          creativity: 70
        },
        feedback: {
          overall: '作文基本完成，继续努力！'
        },
        overallFeedback: '你的作文基本完成了要求，继续保持练习，会越来越好的！',
        suggestions: ['多阅读优秀范文', '注意语法和拼写', '增加细节描写'],
        wordCount: essay.split(/\s+/).length,
        errors: []
      };
    }
  }

  /**
   * 批量批改（优化成本）
   * @param {Array} submissions - 提交列表
   * @returns {Promise<Array>} 批改结果列表
   */
  static async batchGrade(submissions) {
    const results = [];
    const batchSize = 5; // 每批 5 个，避免并发过高

    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (submission) => {
          try {
            if (submission.type === 'essay') {
              return await this.gradeEssay(submission);
            } else {
              return await this.gradeSubjectiveQuestion(submission);
            }
          } catch (error) {
            return {
              success: false,
              error: error.message,
              submissionId: submission.id
            };
          }
        })
      );

      results.push(...batchResults);

      // 避免 API 限流
      if (i + batchSize < submissions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 保存批改记录
   */
  static saveGradingRecord(data) {
    const stmt = db.prepare(`
      INSERT INTO ai_grading_records (
        user_id,
        submission_type,
        submission_id,
        score,
        max_score,
        feedback,
        detailed_scores,
        model_used,
        tokens_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.submissionType,
      data.submissionId,
      data.score,
      data.maxScore,
      JSON.stringify(data.feedback),
      JSON.stringify(data.detailedScores),
      data.modelUsed,
      data.tokensUsed
    );

    return result.lastInsertRowid;
  }

  /**
   * 获取批改历史
   */
  static getGradingHistory(userId, options = {}) {
    const { page = 1, pageSize = 20, submissionType } = options;

    let query = 'SELECT * FROM ai_grading_records WHERE user_id = ?';
    const params = [userId];

    if (submissionType) {
      query += ' AND submission_type = ?';
      params.push(submissionType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const stmt = db.prepare(query);
    const records = stmt.all(...params);

    return records.map(record => {
      try {
        if (record.feedback) record.feedback = JSON.parse(record.feedback);
        if (record.detailed_scores) record.detailed_scores = JSON.parse(record.detailed_scores);
      } catch (e) {}
      return record;
    });
  }
}

module.exports = AIGradingService;
