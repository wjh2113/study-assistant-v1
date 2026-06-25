import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 薄弱点类型
export enum WeaknessType {
  KNOWLEDGE_POINT = 'KNOWLEDGE_POINT', // 知识点薄弱
  QUESTION_TYPE = 'QUESTION_TYPE', // 题型薄弱
  SUBJECT = 'SUBJECT', // 科目薄弱
}

// 薄弱点分析结果
export interface WeaknessAnalysisResult {
  type: WeaknessType;
  name: string;
  errorCount: number;
  masteryLevel: number; // 0-100
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

@Injectable()
export class WeaknessAnalysisService {
  constructor(private prisma: PrismaService) {}

  /**
   * 分析用户薄弱点
   */
  async analyzeWeaknesses(userId: number): Promise<{
    knowledgePoints: WeaknessAnalysisResult[];
    questionTypes: WeaknessAnalysisResult[];
    subjects: WeaknessAnalysisResult[];
    overallMastery: number;
  }> {
    // 获取用户的错题记录
    const wrongQuestions = await this.prisma.wrongQuestion.findMany({
      where: { userId },
      include: {
        exercise: {
          include: {
            subject: true,
            knowledgePoint: true,
          },
        },
      },
    });

    // 获取用户的练习记录
    const practiceSessions = await this.prisma.practiceSession.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        questions: {
          select: {
            questionType: true,
            isCorrect: true,
          },
        },
      },
    });

    // 分析知识点薄弱点
    const knowledgePointsAnalysis = this.analyzeKnowledgePoints(wrongQuestions);

    // 分析题型薄弱点
    const questionTypesAnalysis = this.analyzeQuestionTypes(practiceSessions);

    // 分析科目薄弱点
    const subjectsAnalysis = this.analyzeSubjects(wrongQuestions);

    // 计算总体掌握程度
    const overallMastery = this.calculateOverallMastery(
      knowledgePointsAnalysis,
      questionTypesAnalysis,
      subjectsAnalysis,
    );

    return {
      knowledgePoints: knowledgePointsAnalysis,
      questionTypes: questionTypesAnalysis,
      subjects: subjectsAnalysis,
      overallMastery,
    };
  }

  /**
   * 分析知识点薄弱点
   */
  private analyzeKnowledgePoints(
    wrongQuestions: any[],
  ): WeaknessAnalysisResult[] {
    const knowledgePointStats = new Map<
      number,
      { name: string; errorCount: number; totalQuestions: number }
    >();

    for (const wq of wrongQuestions) {
      const kp = wq.exercise.knowledgePoint;
      if (!kp) continue;

      const existing = knowledgePointStats.get(kp.id);
      if (existing) {
        existing.errorCount += wq.timesWrong;
      } else {
        knowledgePointStats.set(kp.id, {
          name: kp.name || '未知知识点',
          errorCount: wq.timesWrong,
          totalQuestions: 1,
        });
      }
    }

    const results: WeaknessAnalysisResult[] = Array.from(
      knowledgePointStats.entries(),
    ).map(([id, stats]) => {
      const masteryLevel = Math.max(0, 100 - stats.errorCount * 10);
      const priority = this.determinePriority(stats.errorCount);

      return {
        type: WeaknessType.KNOWLEDGE_POINT,
        name: stats.name,
        errorCount: stats.errorCount,
        masteryLevel,
        priority,
        recommendations: this.generateKnowledgePointRecommendations(
          stats.name,
          stats.errorCount,
        ),
      };
    });

    return results.sort((a, b) => b.errorCount - a.errorCount);
  }

  /**
   * 分析题型薄弱点
   */
  private analyzeQuestionTypes(
    practiceSessions: any[],
  ): WeaknessAnalysisResult[] {
    const questionTypeStats = new Map<
      string,
      { correctCount: number; totalCount: number }
    >();

    for (const session of practiceSessions) {
      for (const question of session.questions) {
        const qType = question.questionType;
        const existing = questionTypeStats.get(qType);

        if (existing) {
          existing.totalCount++;
          if (question.isCorrect) {
            existing.correctCount++;
          }
        } else {
          questionTypeStats.set(qType, {
            correctCount: question.isCorrect ? 1 : 0,
            totalCount: 1,
          });
        }
      }
    }

    const results: WeaknessAnalysisResult[] = Array.from(
      questionTypeStats.entries(),
    ).map(([type, stats]) => {
      const accuracy =
        stats.totalCount > 0
          ? (stats.correctCount / stats.totalCount) * 100
          : 0;
      const errorCount = stats.totalCount - stats.correctCount;
      const masteryLevel = accuracy;
      const priority = this.determinePriority(errorCount);

      return {
        type: WeaknessType.QUESTION_TYPE,
        name: this.getQuestionTypeName(type),
        errorCount,
        masteryLevel,
        priority,
        recommendations: this.generateQuestionTypeRecommendations(
          type,
          accuracy,
        ),
      };
    });

    return results.sort((a, b) => a.masteryLevel - b.masteryLevel);
  }

  /**
   * 分析科目薄弱点
   */
  private analyzeSubjects(wrongQuestions: any[]): WeaknessAnalysisResult[] {
    const subjectStats = new Map<
      number,
      { name: string; errorCount: number }
    >();

    for (const wq of wrongQuestions) {
      const subject = wq.exercise.subject;
      if (!subject) continue;

      const existing = subjectStats.get(subject.id);
      if (existing) {
        existing.errorCount += wq.timesWrong;
      } else {
        subjectStats.set(subject.id, {
          name: subject.name || '未知科目',
          errorCount: wq.timesWrong,
        });
      }
    }

    const results: WeaknessAnalysisResult[] = Array.from(
      subjectStats.entries(),
    ).map(([id, stats]) => {
      const masteryLevel = Math.max(0, 100 - stats.errorCount * 5);
      const priority = this.determinePriority(stats.errorCount);

      return {
        type: WeaknessType.SUBJECT,
        name: stats.name,
        errorCount: stats.errorCount,
        masteryLevel,
        priority,
        recommendations: this.generateSubjectRecommendations(
          stats.name,
          stats.errorCount,
        ),
      };
    });

    return results.sort((a, b) => b.errorCount - a.errorCount);
  }

  /**
   * 计算总体掌握程度
   */
  private calculateOverallMastery(
    knowledgePoints: WeaknessAnalysisResult[],
    questionTypes: WeaknessAnalysisResult[],
    subjects: WeaknessAnalysisResult[],
  ): number {
    const allMasteryLevels = [
      ...knowledgePoints.map((kp) => kp.masteryLevel),
      ...questionTypes.map((qt) => qt.masteryLevel),
      ...subjects.map((s) => s.masteryLevel),
    ];

    if (allMasteryLevels.length === 0) return 100;

    const sum = allMasteryLevels.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / allMasteryLevels.length);
  }

  /**
   * 确定优先级
   */
  private determinePriority(errorCount: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (errorCount >= 5) return 'HIGH';
    if (errorCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 获取题型名称
   */
  private getQuestionTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      SINGLE_CHOICE: '单选题',
      MULTIPLE_CHOICE: '多选题',
      TRUE_FALSE: '判断题',
      FILL_BLANK: '填空题',
      CALCULATION: '计算题',
      APPLICATION: '应用题',
      ESSAY: '作文',
    };
    return typeNames[type] || type;
  }

  /**
   * 生成知识点推荐
   */
  private generateKnowledgePointRecommendations(
    knowledgePoint: string,
    errorCount: number,
  ): string[] {
    const recommendations: string[] = [];

    if (errorCount >= 5) {
      recommendations.push(
        `建议重新学习"${knowledgePoint}"相关知识点`,
        `完成至少 10 道"${knowledgePoint}"专项练习题`,
        `观看"${knowledgePoint}"教学视频加深理解`,
      );
    } else if (errorCount >= 3) {
      recommendations.push(
        `复习"${knowledgePoint}"的核心概念`,
        `完成 5 道"${knowledgePoint}"基础练习题`,
      );
    } else {
      recommendations.push(
        `巩固"${knowledgePoint}"知识点`,
        `适当练习相关题目`,
      );
    }

    return recommendations;
  }

  /**
   * 生成题型推荐
   */
  private generateQuestionTypeRecommendations(
    questionType: string,
    accuracy: number,
  ): string[] {
    const recommendations: string[] = [];
    const typeName = this.getQuestionTypeName(questionType);

    if (accuracy < 50) {
      recommendations.push(
        `加强${typeName}的解题技巧训练`,
        `学习${typeName}的答题模板和方法`,
        `进行${typeName}专项突破练习`,
      );
    } else if (accuracy < 70) {
      recommendations.push(
        `提高${typeName}的答题准确率`,
        `注意${typeName}的常见陷阱`,
      );
    } else {
      recommendations.push(
        `保持${typeName}的练习频率`,
        `挑战更高难度的${typeName}`,
      );
    }

    return recommendations;
  }

  /**
   * 生成科目推荐
   */
  private generateSubjectRecommendations(
    subject: string,
    errorCount: number,
  ): string[] {
    const recommendations: string[] = [];

    if (errorCount >= 10) {
      recommendations.push(
        `建议增加${subject}的学习时间`,
        `系统复习${subject}的知识体系`,
        `寻求老师或家长的帮助`,
      );
    } else if (errorCount >= 5) {
      recommendations.push(
        `加强${subject}的薄弱环节`,
        `制定${subject}专项提升计划`,
      );
    } else {
      recommendations.push(
        `保持${subject}的学习状态`,
        `适当拓展${subject}知识`,
      );
    }

    return recommendations;
  }

  /**
   * 获取个性化推荐题目
   */
  async getRecommendedExercises(
    userId: number,
    limit: number = 10,
  ): Promise<any[]> {
    const analysis = await this.analyzeWeaknesses(userId);

    // 获取最薄弱的知识点
    const weakestKnowledgePoint = analysis.knowledgePoints[0];

    if (!weakestKnowledgePoint) {
      return [];
    }

    // 查找相关练习题目（简化实现）
    const exercises = await this.prisma.exercise.findMany({
      where: {
        knowledgePoint: {
          name: weakestKnowledgePoint.name,
        },
      },
      take: limit,
      include: {
        subject: true,
        knowledgePoint: true,
      },
    });

    return exercises;
  }

  /**
   * 生成学习报告
   */
  async generateLearningReport(userId: number): Promise<{
    overallMastery: number;
    strengths: WeaknessAnalysisResult[];
    weaknesses: WeaknessAnalysisResult[];
    studyPlan: string[];
  }> {
    const analysis = await this.analyzeWeaknesses(userId);

    // 合并所有薄弱点
    const allWeaknesses = [
      ...analysis.knowledgePoints,
      ...analysis.questionTypes,
      ...analysis.subjects,
    ];

    // 按掌握程度排序
    const sorted = allWeaknesses.sort((a, b) => a.masteryLevel - b.masteryLevel);

    // 最薄弱的 3 项
    const weaknesses = sorted.slice(0, 3);

    // 最强的 3 项
    const strengths = sorted
      .slice(-3)
      .reverse()
      .filter((w) => w.masteryLevel >= 80);

    // 生成学习计划
    const studyPlan = this.generateStudyPlan(weaknesses);

    return {
      overallMastery: analysis.overallMastery,
      strengths,
      weaknesses,
      studyPlan,
    };
  }

  /**
   * 生成学习计划
   */
  private generateStudyPlan(weaknesses: WeaknessAnalysisResult[]): string[] {
    const plan: string[] = [];

    for (const weakness of weaknesses) {
      if (weakness.priority === 'HIGH') {
        plan.push(
          `【重点突破】${weakness.name}: ${weakness.recommendations[0]}`,
        );
      } else if (weakness.priority === 'MEDIUM') {
        plan.push(`【巩固提升】${weakness.name}: ${weakness.recommendations[0]}`);
      }
    }

    if (plan.length === 0) {
      plan.push('继续保持当前的学习状态！');
    }

    return plan;
  }
}
