import { IsString, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';

// 用户角色枚举（SQLite 兼容）
export enum UserRole {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

// 发送验证码请求
export class SendCodeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

// 手机号验证码登录
export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

// 注册请求
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsOptional()
  grade?: number;
}

// 传统用户名密码登录
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// 刷新 Token
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
