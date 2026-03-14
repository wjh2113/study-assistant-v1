import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsArray, IsEnum } from 'class-validator';

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_BLANK = 'FILL_IN_BLANK',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export class CreateExerciseDto {
  @IsInt()
  @Min(1)
  subjectId: number;

  @IsOptional()
  @IsInt()
  knowledgePointId?: number;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  options?: any;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @IsInt()
  @Min(1)
  @Max(6)
  grade: number;

  @IsOptional()
  @IsString()
  tags?: string; // 逗号分隔的标签

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  options?: any;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class FilterExerciseDto {
  @IsOptional()
  @IsInt()
  subjectId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @IsInt()
  knowledgePointId?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}
