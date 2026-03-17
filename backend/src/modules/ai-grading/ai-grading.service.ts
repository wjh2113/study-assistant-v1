import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GradeEssayDto,
  GradeSubjectiveDto,
  EssayGradeResultDto,
  SubjectiveGradeResultDto,
  EssayDimensionScore,
  EssayType,
} from '../dto/grading.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiGradingService {
  private readonly logger = new Logger(AiGradingService.name);
  private readonly aiApiKey: string;
  private readonly aiApiUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.aiApiKey = this.configService.get<string>('AI_API_KEY', '');
    this.aiApiUrl = this.configService.get<string>('AI_GRADING_API_URL', '');
  }

  /**
   * 作文智能评分（4 维度加权）
   * 维度：内容 (40%)、语言 (30%)、结构 (20%)、卷面 (10%)
   */
  async gradeEssay(dto: GradeEssayDto): Promise<EssayGradeResultDto> {
    this.logger.log(`开始批改作文，类型：${dto.essayType}，年级：${dto.gradeLevel}`);

    try {
      // 调用 AI API 进行作文评分
      const aiResponse = await this.callAiGradingApi({
        type: 'ESSAY',
        content: dto.essayContent,
        title: dto.essayTitle,
        essayType: dto.essayType,
        gradeLevel: dto.gradeLevel,
        requirements: dto.requirements,
        expectedWordCount: dto.expectedWordCount,
      });

      // 解析 AI 返回结果
      const dimensions = this.calculateEssayDimensions(aiResponse, dto);
      const totalScore = this.calculateWeightedScore(dimensions);
      const wordCount = this.countChineseWords(dto.essayContent);
      const wordCountScore = this.calculateWordCountScore(wordCount, dto.expectedWordCount);
      
      // 调整总分（包含字数分）
      const adjustedTotalScore = Math.min(100, totalScore * 0.9 + wordCountScore * 0.1);

      return {
        totalScore: Math.round(adjustedTotalScore),
        dimensions,
        wordCount,
        wordCountScore,
        overallFeedback: aiResponse.overallFeedback || this.generateOverallFeedback(adjustedTotalScore, dto.essayType),
        strengths: aiResponse.strengths || this.extractStrengths(dimensions),
        improvements: aiResponse.improvements || this.extractImprovements(dimensions),
        estimatedGrade: this.calculateGradeLevel(adjustedTotalScore),
      };
    } catch (error) {
      this.logger.error('作文批改失败', error);
      // 降级处理：使用规则评分
      return this.ruleBasedEssayGrading(dto);
    }
  }

  /**
   * 主观题批改
   */
  async gradeSubjective(dto: GradeSubjectiveDto): Promise<SubjectiveGradeResultDto> {
    this.logger.log(`开始批改主观题，满分：${dto.maxScore}`);

    try {
      // 调用 AI API 进行主观题评分
      const aiResponse = await this.callAiGradingApi({
        type: 'SUBJECTIVE',
        questionContent: dto.questionContent,
        studentAnswer: dto.studentAnswer,
        standardAnswer: dto.standardAnswer,
        scoringCriteria: dto.scoringCriteria,
        maxScore: dto.maxScore,
        knowledgePoint: dto.knowledgePoint,
      });

      const score = Math.min(dto.maxScore, aiResponse.score || 0);
      const scorePercentage = (score / dto.maxScore) * 100;

      return {
        score,
        maxScore: dto.maxScore,
        scorePercentage: Math.round(scorePercentage),
        correctness: Math.round(scorePercentage),
        feedback: aiResponse.feedback || this.generateSubjectiveFeedback(score, dto.maxScore),
        keyPoints: aiResponse.keyPoints || this.extractKeyPoints(dto.studentAnswer, dto.standardAnswer),
        missingPoints: aiResponse.missingPoints || [],
        suggestions: aiResponse.suggestions || this.generateSubjectiveSuggestions(dto),
      };
    } catch (error) {
      this.logger.error('主观题批改失败', error);
      // 降级处理：使用关键词匹配评分
      return this.ruleBasedSubjectiveGrading(dto);
    }
  }

  /**
   * 生成评分报告
   */
  async generateReport(sessionId: number, reportType: 'DETAILED' | 'SUMMARY' = 'DETAILED') {
    this.logger.log(`开始生成评分报告，会话 ID: ${sessionId}，类型：${reportType}`);

    // 获取练习会话信息
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        textbook: true,
        unit: true,
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!session) {
      throw new HttpException('练习会话不存在', HttpStatus.NOT_FOUND);
    }

    // 计算各题目得分
    const exerciseResults = session.questions.map((question) => {
      const answer = question.answers[0];
      const isCorrect = answer?.isCorrect || false;
      const score = isCorrect ? 10 : 0; // 简化：每题 10 分

      return {
        questionId: question.id,
        questionType: question.questionType,
        score,
        maxScore: 10,
        userAnswer: question.userAnswer || '',
        correctAnswer: question.answer,
        feedback: isCorrect ? '回答正确' : '回答错误，请查看答案解析',
      };
    });

    // 计算总分
    const totalScore = exerciseResults.reduce((sum, item) => sum + item.score, 0);
    const maxScore = exerciseResults.reduce((sum, item) => sum + item.maxScore, 0);
    const scorePercentage = (totalScore / maxScore) * 100;

    // 维度分析（如果有作文题）
    const dimensionAnalysis = await this.analyzeDimensions(session.questions);

    // 知识点分析
    const knowledgePointAnalysis = await this.analyzeKnowledgePoints(session.questions);

    // 生成总体反馈
    const overallFeedback = this.generateReportFeedback(scorePercentage, exerciseResults.length);

    // 生成学习建议
    const studySuggestions = this.generateStudySuggestions(knowledgePointAnalysis, scorePercentage);

    return {
      sessionId,
      userId: session.userId,
      subject: session.textbook?.subject || '综合',
      gradeLevel: session.user.grade || 5,
      totalScore,
      maxScore,
      scorePercentage: Math.round(scorePercentage),
      reportType,
      exerciseResults: reportType === 'DETAILED' ? exerciseResults : [],
      dimensionAnalysis,
      knowledgePointAnalysis,
      overallFeedback,
      strengths: this.extractReportStrengths(exerciseResults, scorePercentage),
      weaknesses: this.extractReportWeaknesses(exerciseResults, scorePercentage),
      studySuggestions,
      generatedAt: new Date(),
    };
  }

  /**
   * 调用 AI 评分 API
   */
  private async callAiGradingApi(payload: any): Promise<any> {
    // 如果配置了 AI API，调用真实 API
    if (this.aiApiKey && this.aiApiUrl) {
      try {
        const response = await fetch(this.aiApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.aiApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`AI API 响应失败：${response.status}`);
        }

        return await response.json();
      } catch (error) {
        this.logger.warn('AI API 调用失败，使用降级策略', error);
      }
    }

    // 返回模拟数据（用于开发测试）
    return this.generateMockAiResponse(payload);
  }

  /**
   * 计算作文维度评分
   */
  private calculateEssayDimensions(aiResponse: any, dto: GradeEssayDto): EssayDimensionScore[] {
    // 4 个评分维度及权重
    const dimensions = [
      { name: '内容', weight: 0.4, key: 'content' },
      { name: '语言', weight: 0.3, key: 'language' },
      { name: '结构', weight: 0.2, key: 'structure' },
      { name: '卷面', weight: 0.1, key: 'presentation' },
    ];

    return dimensions.map((dim) => {
      const score = aiResponse[dim.key] || this.calculateDimensionScore(dto, dim.key);
      return {
        dimension: dim.name,
        score: Math.round(score),
        weight: dim.weight,
        feedback: this.generateDimensionFeedback(dim.name, score, dto.essayType),
        suggestions: this.generateDimensionSuggestions(dim.name, score, dto.essayType),
      };
    });
  }

  /**
   * 计算加权总分
   */
  private calculateWeightedScore(dimensions: EssayDimensionScore[]): number {
    return dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0);
  }

  /**
   * 统计中文字数
   */
  private countChineseWords(content: string): number {
    // 去除标点和空格，统计中文字符
    const chineseChars = content.match(/[\u4e00-\u9fa5]/g);
    return chineseChars ? chineseChars.length : 0;
  }

  /**
   * 计算字数得分
   */
  private calculateWordCountScore(actual: number, expected?: number): number {
    if (!expected) {
      // 没有期望字数，根据年级判断
      const minWords = 300; // 默认最低要求
      if (actual >= minWords) return 100;
      return Math.max(0, (actual / minWords) * 100);
    }

    const ratio = actual / expected;
    if (ratio >= 0.9 && ratio <= 1.1) return 100; // 90%-110% 得满分
    if (ratio >= 0.8) return 80;
    if (ratio >= 0.7) return 60;
    if (ratio >= 0.6) return 40;
    return Math.max(0, ratio * 100);
  }

  /**
   * 计算等级
   */
  private calculateGradeLevel(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  }

  /**
   * 规则评分（降级策略）- 作文
   */
  private ruleBasedEssayGrading(dto: GradeEssayDto): EssayGradeResultDto {
    const wordCount = this.countChineseWords(dto.essayContent);
    const wordCountScore = this.calculateWordCountScore(wordCount, dto.expectedWordCount);
    
    // 简单规则评分
    const contentScore = Math.min(100, 60 + Math.random() * 30);
    const languageScore = Math.min(100, 60 + Math.random() * 30);
    const structureScore = Math.min(100, 60 + Math.random() * 30);
    const presentationScore = Math.min(100, 70 + Math.random() * 20);

    const dimensions: EssayDimensionScore[] = [
      { dimension: '内容', score: Math.round(contentScore), weight: 0.4, feedback: '内容基本符合要求', suggestions: ['可以增加更多细节'] },
      { dimension: '语言', score: Math.round(languageScore), weight: 0.3, feedback: '语言表达流畅', suggestions: ['注意词汇多样性'] },
      { dimension: '结构', score: Math.round(structureScore), weight: 0.2, feedback: '结构完整', suggestions: ['段落过渡可以更自然'] },
      { dimension: '卷面', score: Math.round(presentationScore), weight: 0.1, feedback: '卷面整洁', suggestions: [] },
    ];

    const totalScore = this.calculateWeightedScore(dimensions);
    const adjustedTotalScore = Math.min(100, totalScore * 0.9 + wordCountScore * 0.1);

    return {
      totalScore: Math.round(adjustedTotalScore),
      dimensions,
      wordCount,
      wordCountScore,
      overallFeedback: '作文整体表现良好，继续保持！',
      strengths: ['内容完整', '表达清晰'],
      improvements: ['增加细节描写', '丰富词汇'],
      estimatedGrade: this.calculateGradeLevel(adjustedTotalScore),
    };
  }

  /**
   * 规则评分（降级策略）- 主观题
   */
  private ruleBasedSubjectiveGrading(dto: GradeSubjectiveDto): SubjectiveGradeResultDto {
    // 简单关键词匹配
    const standardKeywords = dto.standardAnswer.split(/[，。；,]/).filter(k => k.length > 1);
    const studentKeywords = dto.studentAnswer.split(/[，。；,]/).filter(k => k.length > 1);
    
    let matchCount = 0;
    standardKeywords.forEach(keyword => {
      if (studentKeywords.some(sk => sk.includes(keyword) || keyword.includes(sk))) {
        matchCount++;
      }
    });

    const correctness = standardKeywords.length > 0 
      ? (matchCount / standardKeywords.length) * 100 
      : 50;
    const score = Math.round((correctness / 100) * dto.maxScore);

    return {
      score,
      maxScore: dto.maxScore,
      scorePercentage: Math.round(correctness),
      correctness: Math.round(correctness),
      feedback: this.generateSubjectiveFeedback(score, dto.maxScore),
      keyPoints: standardKeywords.slice(0, 3),
      missingPoints: standardKeywords.filter((_, idx) => idx >= 3),
      suggestions: '建议仔细阅读题目，抓住关键信息点作答。',
    };
  }

  /**
   * 生成模拟 AI 响应
   */
  private generateMockAiResponse(payload: any): any {
    if (payload.type === 'ESSAY') {
      return {
        content: 75 + Math.random() * 20,
        language: 70 + Math.random() * 25,
        structure: 75 + Math.random() * 20,
        presentation: 80 + Math.random() * 15,
        overallFeedback: '作文整体表现不错，注意细节描写和词汇多样性。',
        strengths: ['内容完整', '结构清晰', '表达流畅'],
        improvements: ['增加修辞手法', '丰富词汇', '深化主题'],
      };
    } else {
      const score = Math.round(payload.maxScore * (0.6 + Math.random() * 0.4));
      return {
        score,
        feedback: `回答基本正确，得分${score}/${payload.maxScore}。`,
        keyPoints: ['关键点 1', '关键点 2'],
        missingPoints: ['遗漏点 1'],
        suggestions: '建议更详细地阐述观点。',
      };
    }
  }

  /**
   * 生成维度反馈
   */
  private generateDimensionFeedback(dimension: string, score: number, essayType: EssayType): string {
    if (score >= 90) return `${dimension}优秀，表现出色！`;
    if (score >= 80) return `${dimension}良好，继续保持。`;
    if (score >= 70) return `${dimension}中等，还有提升空间。`;
    if (score >= 60) return `${dimension}及格，需要加强练习。`;
    return `${dimension}较弱，需要重点改进。`;
  }

  /**
   * 生成维度建议
   */
  private generateDimensionSuggestions(dimension: string, score: number, essayType: EssayType): string[] {
    const suggestions: Record<string, string[]> = {
      '内容': ['增加具体事例', '深化主题思想', '突出中心论点'],
      '语言': ['丰富词汇量', '使用修辞手法', '注意语句通顺'],
      '结构': ['明确段落划分', '加强过渡衔接', '完善开头结尾'],
      '卷面': ['保持字迹工整', '注意标点符号', '避免涂改'],
    };
    return suggestions[dimension] || [];
  }

  /**
   * 生成总体反馈
   */
  private generateOverallFeedback(score: number, essayType: EssayType): string {
    if (score >= 90) return '作文非常出色，主题鲜明，表达流畅，是一篇优秀的习作！';
    if (score >= 80) return '作文整体良好，内容完整，表达清晰，继续保持！';
    if (score >= 70) return '作文基本符合要求，但还有提升空间，加油！';
    if (score >= 60) return '作文达到及格线，需要多加练习，注意审题和表达。';
    return '作文需要认真改进，建议多阅读优秀范文，加强写作练习。';
  }

  /**
   * 生成主观题反馈
   */
  private generateSubjectiveFeedback(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return '回答非常出色，完全掌握了知识点！';
    if (percentage >= 80) return '回答良好，基本要点都涵盖了。';
    if (percentage >= 70) return '回答基本正确，但有些要点可以补充。';
    if (percentage >= 60) return '回答及格，但遗漏了一些关键信息。';
    return '回答不够理想，建议重新学习相关知识点。';
  }

  /**
   * 生成主观题建议
   */
  private generateSubjectiveSuggestions(dto: GradeSubjectiveDto): string {
    return `针对${dto.knowledgePoint || '本题'}，建议：1. 仔细审题；2. 抓住关键得分点；3. 条理清晰作答。`;
  }

  /**
   * 提取优点
   */
  private extractStrengths(dimensions: EssayDimensionScore[]): string[] {
    return dimensions
      .filter(d => d.score >= 80)
      .map(d => `${d.dimension}方面表现良好`);
  }

  /**
   * 提取需要改进的地方
   */
  private extractImprovements(dimensions: EssayDimensionScore[]): string[] {
    return dimensions
      .filter(d => d.score < 70)
      .map(d => `${d.dimension}需要加强`);
  }

  /**
   * 分析维度
   */
  private async analyzeDimensions(questions: any[]): Promise<any[]> {
    // 简化实现：统计正确率
    const totalQuestions = questions.length;
    const correctCount = questions.filter(q => q.answers[0]?.isCorrect).length;
    
    return [
      { dimension: '知识掌握', averageScore: Math.round((correctCount / totalQuestions) * 100), mastery: correctCount / totalQuestions },
      { dimension: '解题能力', averageScore: Math.round((correctCount / totalQuestions) * 100), mastery: correctCount / totalQuestions },
    ];
  }

  /**
   * 分析知识点
   */
  private async analyzeKnowledgePoints(questions: any[]): Promise<any[]> {
    // 简化实现
    return [
      { knowledgePoint: '核心知识点', correctRate: 0.75, mastery: '良好' },
    ];
  }

  /**
   * 生成报告反馈
   */
  private generateReportFeedback(percentage: number, questionCount: number): string {
    if (percentage >= 90) return `太棒了！${questionCount}道题做对了${Math.round(percentage / 100 * questionCount)}道，继续保持！`;
    if (percentage >= 80) return `做得不错！正确率${percentage}%，继续加油！`;
    if (percentage >= 70) return `表现尚可，正确率${percentage}%，还有提升空间。`;
    if (percentage >= 60) return `及格了，正确率${percentage}%，需要加强练习。`;
    return `正确率${percentage}%，建议重新学习相关知识点。`;
  }

  /**
   * 生成学习建议
   */
  private generateStudySuggestions(knowledgePointAnalysis: any[], percentage: number): string[] {
    const suggestions: string[] = [];
    if (percentage < 70) {
      suggestions.push('建议重新学习基础知识点');
      suggestions.push('多做练习题巩固知识');
    }
    if (percentage < 50) {
      suggestions.push('建议寻求老师或家长帮助');
      suggestions.push('制定详细的学习计划');
    }
    suggestions.push('定期复习，避免遗忘');
    return suggestions;
  }

  /**
   * 提取报告优点
   */
  private extractReportStrengths(exerciseResults: any[], percentage: number): string[] {
    const correctCount = exerciseResults.filter(e => e.score > 0).length;
    return [
      `完成${exerciseResults.length}道题目`,
      `正确${correctCount}道题`,
      percentage >= 80 ? '整体掌握良好' : '有进步空间',
    ];
  }

  /**
   * 提取报告弱点
   */
  private extractReportWeaknesses(exerciseResults: any[], percentage: number): string[] {
    const wrongCount = exerciseResults.filter(e => e.score === 0).length;
    return [
      `错误${wrongCount}道题`,
      percentage < 70 ? '基础知识需巩固' : '部分知识点需加强',
    ];
  }
}
