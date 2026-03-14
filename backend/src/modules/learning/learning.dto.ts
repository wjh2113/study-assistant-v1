import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';

// 创建学习记录
export class CreateLearningRecordDto {
  @IsInt()
  @IsOptional()
  sessionId?: number;

  @IsInt()
  @IsOptional()
  textbookId?: number;

  @IsInt()
  @IsOptional()
  unitId?: number;

  @IsString()
  @IsOptional()
  actionType?: string; // START_PRACTICE, FINISH_PRACTICE, VIEW_TEXTBOOK, etc.

  @IsInt()
  @IsOptional()
  duration?: number; // 时长（秒）

  @IsInt()
  @IsOptional()
  score?: number;

  @IsOptional()
  metadata?: any; // 额外数据
}

// 查询学习记录
export class QueryLearningRecordsDto {
  @IsInt()
  @IsOptional()
  textbookId?: number;

  @IsInt()
  @IsOptional()
  unitId?: number;

  @IsString()
  @IsOptional()
  actionType?: string;
}
