import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiGradingService } from './ai-grading.service';
import {
  GradeEssayDto,
  GradeSubjectiveDto,
  GenerateReportDto,
  EssayGradeResultDto,
  SubjectiveGradeResultDto,
} from './dto/grading.dto';

@Controller('ai/grading')
export class AiGradingController {
  constructor(private readonly aiGradingService: AiGradingService) {}

  /**
   * 作文智能评分
   */
  @Post('essay')
  @HttpCode(HttpStatus.OK)
  async gradeEssay(@Body() dto: GradeEssayDto): Promise<{ success: boolean; data: EssayGradeResultDto }> {
    const result = await this.aiGradingService.gradeEssay(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 主观题批改
   */
  @Post('subjective')
  @HttpCode(HttpStatus.OK)
  async gradeSubjective(@Body() dto: GradeSubjectiveDto): Promise<{ success: boolean; data: SubjectiveGradeResultDto }> {
    const result = await this.aiGradingService.gradeSubjective(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 生成评分报告
   */
  @Post('report')
  @HttpCode(HttpStatus.OK)
  async generateReport(
    @Body() dto: GenerateReportDto,
  ): Promise<{ success: boolean; data: any }> {
    const result = await this.aiGradingService.generateReport(
      dto.sessionId,
      dto.reportType || 'DETAILED',
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 获取评分报告（通过 URL 参数）
   */
  @Get('report/:sessionId')
  async getReport(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query('type') reportType: 'DETAILED' | 'SUMMARY' = 'DETAILED',
  ): Promise<{ success: boolean; data: any }> {
    const result = await this.aiGradingService.generateReport(sessionId, reportType);
    return {
      success: true,
      data: result,
    };
  }
}
