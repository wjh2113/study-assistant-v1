import { IsInt, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

// 题目类型枚举（SQLite 兼容）
export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_BLANK = 'FILL_IN_BLANK',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
  MATCHING = 'MATCHING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
}

// 创建练习会话
export class CreateSessionDto {
  @IsInt()
  @IsOptional()
  textbookId?: number;

  @IsInt()
  @IsOptional()
  unitId?: number;

  @IsInt()
  @IsOptional()
  questionCount?: number; // 题目数量（默认 10）
}

// 提交答案
export class SubmitAnswerDto {
  @IsInt()
  @IsNotEmpty()
  questionId: number;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

// 批量提交答案
export class SubmitAnswersDto {
  answers: {
    questionId: number;
    answer: string;
  }[];
}

// 生成题目（AI 出题占位）
export class GenerateQuestionsDto {
  @IsInt()
  @IsOptional()
  count?: number; // 题目数量

  @IsEnum(QuestionType)
  @IsOptional()
  questionType?: QuestionType; // 题型
}
