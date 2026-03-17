import { IsString, IsInt, IsOptional, IsArray, IsEnum, Min, Max } from 'class-validator';

/**
 * 作文类型枚举
 */
export enum EssayType {
  NARRATIVE = 'NARRATIVE', // 记叙文
  ARGUMENTATIVE = 'ARGUMENTATIVE', // 议论文
  EXPOSITORY = 'EXPOSITORY', // 说明文
  DESCRIPTIVE = 'DESCRIPTIVE', // 描写文
  PRACTICAL = 'PRACTICAL', // 应用文
}

/**
 * 年级枚举
 */
export enum GradeLevel {
  GRADE_3 = 3,
  GRADE_4 = 4,
  GRADE_5 = 5,
  GRADE_6 = 6,
  GRADE_7 = 7,
  GRADE_8 = 8,
  GRADE_9 = 9,
  GRADE_10 = 10,
  GRADE_11 = 11,
  GRADE_12 = 12,
}

/**
 * 作文评分请求 DTO
 */
export class GradeEssayDto {
  @IsString()
  essayContent: string; // 作文内容

  @IsString()
  essayTitle?: string; // 作文题目

  @IsEnum(EssayType)
  essayType: EssayType; // 作文类型

  @IsInt()
  @Min(3)
  @Max(12)
  gradeLevel: number; // 年级

  @IsString()
  requirements?: string; // 写作要求

  @IsInt()
  @Min(0)
  expectedWordCount?: number; // 期望字数
}

/**
 * 主观题批改请求 DTO
 */
export class GradeSubjectiveDto {
  @IsString()
  questionContent: string; // 题目内容

  @IsString()
  studentAnswer: string; // 学生答案

  @IsString()
  standardAnswer: string; // 参考答案

  @IsString()
  scoringCriteria?: string; // 评分标准

  @IsInt()
  @Min(0)
  maxScore: number; // 满分值

  @IsString()
  knowledgePoint?: string; // 知识点
}

/**
 * 评分报告生成请求 DTO
 */
export class GenerateReportDto {
  @IsInt()
  sessionId: number; // 练习会话 ID

  @IsString()
  @IsOptional()
  reportType?: 'DETAILED' | 'SUMMARY'; // 报告类型
}

/**
 * 作文维度评分
 */
export class EssayDimensionScore {
  dimension: string; // 维度名称
  score: number; // 得分 (0-100)
  weight: number; // 权重
  feedback: string; // 反馈意见
  suggestions: string[]; // 改进建议
}

/**
 * 作文评分结果 DTO
 */
export class EssayGradeResultDto {
  totalScore: number; // 总分 (0-100)
  dimensions: EssayDimensionScore[]; // 各维度评分
  wordCount: number; // 实际字数
  wordCountScore: number; // 字数得分
  overallFeedback: string; // 总体评价
  strengths: string[]; // 优点
  improvements: string[]; // 需要改进的地方
  estimatedGrade: string; // 预估等级 (A/B/C/D/E)
}

/**
 * 主观题评分结果 DTO
 */
export class SubjectiveGradeResultDto {
  score: number; // 得分
  maxScore: number; // 满分
  scorePercentage: number; // 得分率
  correctness: number; // 正确率 (0-100)
  feedback: string; // 反馈意见
  keyPoints: string[]; // 关键得分点
  missingPoints: string[]; // 遗漏的要点
  suggestions: string; // 改进建议
}

/**
 * 评分报告 DTO
 */
export class GradingReportDto {
  sessionId: number;
  userId: number;
  subject: string;
  gradeLevel: number;
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  reportType: 'DETAILED' | 'SUMMARY';
  exerciseResults: Array<{
    questionId: number;
    questionType: string;
    score: number;
    maxScore: number;
    userAnswer: string;
    correctAnswer: string;
    feedback: string;
  }>;
  dimensionAnalysis?: Array<{
    dimension: string;
    averageScore: number;
    mastery: number;
  }>;
  knowledgePointAnalysis?: Array<{
    knowledgePoint: string;
    correctRate: number;
    mastery: string;
  }>;
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  studySuggestions: string[];
  generatedAt: Date;
}
