import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

// 获取上传策略
export class UploadPolicyDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsInt()
  @IsOptional()
  filesize?: number;
}
