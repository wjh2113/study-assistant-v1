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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiGradingService } from './ai-grading.service';
import {
  GradeEssayDto,
  GradeSubjectiveDto,
  GenerateReportDto,
  EssayGradeResultDto,
  SubjectiveGradeResultDto,
} from '../dto/grading.dto';

@ApiTags('AI 批改服务')
@Controller('ai/grading')
export class AiGradingController {
  constructor(private readonly aiGradingService: AiGradingService) {}

  /**
   * 作文智能评分
   */
  @Post('essay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '作文智能评分', description: '对作文进行 4 维度加权评分' })
  @ApiResponse({
    status: 200,
    description: '评分成功',
    type: EssayGradeResultDto,
  })
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
  @ApiOperation({ summary: '主观题批改', description: '对主观题进行智能批改' })
  @ApiResponse({
    status: 200,
    description: '批改成功',
    type: SubjectiveGradeResultDto,
  })
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
  @ApiOperation({ summary: '生成评分报告', description: '根据练习会话生成详细评分报告' })
  @ApiResponse({
    status: 200,
    description: '报告生成成功',
  })
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
  @ApiOperation({ summary: '获取评分报告', description: '根据会话 ID 获取评分报告' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
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
