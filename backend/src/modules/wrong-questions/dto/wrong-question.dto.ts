import { IsInt, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateWrongQuestionDto {
  @IsInt()
  @IsNotEmpty()
  exerciseId: number;

  @IsString()
  @IsNotEmpty()
  wrongAnswer: string;
}

export class UpdateWrongQuestionDto {
  @IsOptional()
  @IsBoolean()
  isMastered?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
