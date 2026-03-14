import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// 积分变更
export class PointsChangeDto {
  @IsInt()
  @IsNotEmpty()
  points: number; // 正数增加，负数减少

  @IsString()
  @IsNotEmpty()
  reason: string; // 积分原因

  @IsInt()
  @IsOptional()
  referenceId?: number; // 关联记录 ID
}
