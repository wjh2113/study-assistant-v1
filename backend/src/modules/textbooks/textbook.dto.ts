import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';

// 课本状态枚举（SQLite 兼容）
export enum TextbookStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

// 创建课本
export class CreateTextbookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsInt()
  @Min(1)
  @Max(6)
  grade: number;

  @IsOptional()
  @IsString()
  version?: string;

  @IsString()
  @IsNotEmpty()
  pdfUrl: string;

  @IsString()
  @IsNotEmpty()
  pdfPath: string;
}

// 更新课本
export class UpdateTextbookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsEnum(TextbookStatus)
  status?: TextbookStatus;
}

// 查询课本列表
export class QueryTextbooksDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @IsOptional()
  @IsEnum(TextbookStatus)
  status?: TextbookStatus;
}

// 创建单元
export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  unitNumber?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  pageStart?: number;

  @IsOptional()
  @IsInt()
  pageEnd?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// 更新单元
export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  unitNumber?: string;

  @IsOptional()
  @IsInt()
  pageStart?: number;

  @IsOptional()
  @IsInt()
  pageEnd?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
