/**
 * Weakness Analysis Service - 薄弱点分析服务
 * ISSUE-P1-003: 薄弱点分析功能
 */

const KnowledgeMasteryModel = require('./KnowledgeMasteryModel');
const AiGatewayService = require('../ai-gateway/AiGatewayService');

class WeaknessAnalysisService {
  /**
   * 分析用户薄弱点
   * @param {number} userId - 用户 ID
   * @param {string} subject - 科目（可选）
   * @returns {Promise<object>} 分析结果
   */
  static async analyzeWeakPoints(userId, subject = null) {
    // 获取薄弱知识点
    const weakPoints = KnowledgeMasteryModel.getWeakPoints(userId, {
      subject,
      limit: 20
    });

    if (weakPoints.length === 0) {
      return {
        success: true,
        weakPoints: [],
        summary: {
          totalPoints: 0,
          weakCount: 0,
          recommendation: '暂无薄弱点，继续保持！'
        }
      };
    }

    // 获取统计信息
    const stats = KnowledgeMasteryModel.getStats(userId, subject);

    // 生成学习建议
    const recommendations = await this.generateRecommendations(weakPoints, subject);

    return {
      success: true,
      weakPoints,
      summary: {
        totalPoints: stats.total_points || 0,
        weakCount: weakPoints.length,
        avgMastery: stats.avg_mastery || 0,
        recommendation: recommendations
      }
    };
  }

  /**
   * 生成学习建议
   */
  static async generateRecommendations(weakPoints, subject) {
    const prompt = `请根据以下薄弱知识点生成学习建议：

【科目】${subject || '综合'}

【薄弱知识点】
${weakPoints.map((p, i) => `${i + 1}. ${p.knowledge_point_name} (掌握度：${p.mastery_score}%, 练习${p.total_count}次)`).join('\n')}

【要求】
1. 针对每个薄弱点提供具体的学习建议
2. 建议要可执行、可量化
3. 给出学习优先级排序
4. 推荐练习策略

【输出格式】
JSON 格式：
{
  "priority": ["优先级最高的知识点名称"],
  "suggestions": [
    {
      "knowledgePoint": "知识点名称",
      "suggestion": "具体建议",
      "estimatedTime": "预计所需时间",
      "resources": ["推荐资源类型"]
    }
  ],
  "studyPlan": "整体学习计划建议"
}`;

    try {
      const result = await AiGatewayService.callModel('qwen-plus', prompt, {
        systemPrompt: '你是一个专业的学习规划师，擅长分析学生的学习情况并给出个性化的学习建议。'
      });

      if (result.success) {
        const jsonMatch = result.data.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : result.data;
        return JSON.parse(jsonString);
      }
    } catch (error) {
      console.error('生成学习建议失败:', error);
    }

    // 默认建议
    return {
      priority: weakPoints.slice(0, 3).map(p => p.knowledge_point_name),
      suggestions: weakPoints.map(p => ({
        knowledgePoint: p.knowledge_point_name,
        suggestion: `重点练习${p.knowledge_point_name}相关题目，建议每天练习 5-10 道题`,
        estimatedTime: '3-5 天',
        resources: ['课本', '练习题', '视频讲解']
      })),
      studyPlan: '建议从掌握度最低的知识点开始，逐个突破。每个知识点练习到正确率达到 80% 以上再进入下一个。'
    };
  }

  /**
   * 推荐题目（基于薄弱点）
   * @param {number} userId - 用户 ID
   * @param {string} subject - 科目
   * @param {number} limit - 推荐题目数量
   * @returns {Promise<object>} 推荐结果
   */
  static async recommendQuestions(userId, subject, limit = 5) {
    const weakPoints = KnowledgeMasteryModel.getWeakPoints(userId, {
      subject,
      limit: 5
    });

    if (weakPoints.length === 0) {
      return {
        success: true,
        recommendations: [],
        reason: '暂无薄弱点，推荐综合练习'
      };
    }

    // 选择最薄弱的知识点
    const targetPoint = weakPoints[0];

    return {
      success: true,
      recommendations: [
        {
          knowledgePointId: targetPoint.knowledge_point_id,
          knowledgePointName: targetPoint.knowledge_point_name,
          currentMastery: targetPoint.mastery_score,
          reason: '这是你的薄弱知识点，建议重点练习',
          priority: 'high'
        }
      ],
      targetCount: limit
    };
  }

  /**
   * 更新掌握度（练习后调用，增强版）
   * 集成到出题和练习流程
   */
  static updateMasteryAfterPractice(userId, questions) {
    /**
     * questions 格式：
     * [
     *   {
     *     knowledgePointId: 1,
     *     knowledgePointName: '知识点名称',
     *     subject: '数学',
     *     isCorrect: true
     *   }
     * ]
     */
    
    // 使用批量更新
    const result = KnowledgeMasteryModel.batchUpdateMastery(userId, questions);

    // 生成练习报告
    const report = this.generatePracticeReport(userId, questions);

    return {
      success: true,
      updatedCount: result.updatedCount,
      report
    };
  }

  /**
   * 生成练习报告
   */
  static generatePracticeReport(userId, questions) {
    const totalQuestions = questions.length;
    const correctCount = questions.filter(q => q.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions * 100).toFixed(1) : 0;

    // 按知识点分组统计
    const byKnowledgePoint = {};
    for (const q of questions) {
      if (!byKnowledgePoint[q.knowledgePointId]) {
        byKnowledgePoint[q.knowledgePointId] = {
          knowledgePointId: q.knowledgePointId,
          knowledgePointName: q.knowledgePointName,
          subject: q.subject,
          total: 0,
          correct: 0
        };
      }
      byKnowledgePoint[q.knowledgePointId].total++;
      if (q.isCorrect) {
        byKnowledgePoint[q.knowledgePointId].correct++;
      }
    }

    // 计算每个知识点的掌握度
    const masteryUpdates = Object.values(byKnowledgePoint).map(kp => {
      const mastery = KnowledgeMasteryModel.getByKnowledgePointId(userId, kp.knowledgePointId);
      return {
        knowledgePointId: kp.knowledgePointId,
        knowledgePointName: kp.knowledgePointName,
        practiceAccuracy: (kp.correct / kp.total * 100).toFixed(1),
        currentMastery: mastery?.mastery_score || 0,
        masteryLevel: mastery?.mastery_level || 'unknown'
      };
    });

    return {
      totalQuestions,
      correctCount,
      accuracy: parseFloat(accuracy),
      byKnowledgePoint: masteryUpdates,
      summary: this.generatePracticeSummary(accuracy, masteryUpdates)
    };
  }

  /**
   * 生成练习总结建议
   */
  static generatePracticeSummary(accuracy, masteryUpdates) {
    const weakPoints = masteryUpdates.filter(m => m.currentMastery < 60);
    const improvedPoints = masteryUpdates.filter(m => parseFloat(m.practiceAccuracy) >= 80);

    let summary = '';
    
    if (accuracy >= 90) {
      summary = '太棒了！正确率非常高，继续保持！';
    } else if (accuracy >= 80) {
      summary = '很好！正确率不错，可以继续挑战更高难度。';
    } else if (accuracy >= 60) {
      summary = '不错！已经掌握了大部分知识点，继续加油。';
    } else {
      summary = '不要气馁！建议重点复习薄弱知识点。';
    }

    if (weakPoints.length > 0) {
      summary += ` 有${weakPoints.length}个薄弱知识点需要加强练习。`;
    }

    if (improvedPoints.length > 0) {
      summary += ` ${improvedPoints.length}个知识点表现优秀！`;
    }

    return {
      message: summary,
      weakPointsCount: weakPoints.length,
      improvedPointsCount: improvedPoints.length,
      nextSuggestion: weakPoints.length > 0 
        ? `建议重点练习：${weakPoints.map(p => p.knowledgePointName).slice(0, 3).join('、')}`
        : '可以尝试更高难度的题目'
    };
  }

  /**
   * 获取知识点掌握度趋势
   */
  static getMasteryTrend(userId, knowledgePointId, days = 30) {
    // 简化实现：返回当前掌握度
    // 完整实现需要记录历史快照
    const record = KnowledgeMasteryModel.getByKnowledgePointId(userId, knowledgePointId);
    
    if (!record) {
      return {
        success: false,
        error: '未找到该知识点的掌握度记录'
      };
    }

    return {
      success: true,
      data: {
        knowledgePointId,
        knowledgePointName: record.knowledge_point_name,
        currentMastery: record.mastery_score,
        level: record.mastery_level,
        totalPractices: record.total_count,
        trend: 'stable' // 简化：实际应该计算趋势
      }
    };
  }
}

module.exports = WeaknessAnalysisService;
