import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

// 绑定状态枚举（SQLite 兼容）
export enum BindingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// 创建绑定关系
export class CreateBindingDto {
  @IsInt()
  @IsNotEmpty()
  childId: number; // 学生 ID
}

// 确认绑定
export class ConfirmBindingDto {
  @IsInt()
  @IsNotEmpty()
  bindingId: number;
}

// 查询绑定列表
export class QueryBindingsDto {
  @IsOptional()
  @IsEnum(BindingStatus)
  status?: BindingStatus;
}
