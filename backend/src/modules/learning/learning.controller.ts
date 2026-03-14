import { Controller, Get, Post, Body, Param, Request, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { LearningService } from './learning.service';
import { CreateLearningRecordDto, QueryLearningRecordsDto } from './learning.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private learningService: LearningService) {}

  /**
   * 创建学习记录
   */
  @Post('records')
  async createRecord(@Request() req, @Body() createDto: CreateLearningRecordDto) {
    const userId = req.user.sub;
    return this.learningService.createRecord(userId, createDto);
  }

  /**
   * 查询学习记录列表
   */
  @Get('records')
  async getRecords(
    @Request() req,
    @Query() queryDto: QueryLearningRecordsDto,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    const userId = req.user.sub;
    return this.learningService.getRecords(userId, queryDto, limit);
  }

  /**
   * 获取学习统计
   */
  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.sub;
    return this.learningService.getStats(userId);
  }

  /**
   * 获取按天分组的学习记录
   */
  @Get('stats/daily')
  async getRecordsByDay(
    @Request() req,
    @Query('days', ParseIntPipe) days: number = 7,
  ) {
    const userId = req.user.sub;
    return this.learningService.getRecordsByDay(userId, days);
  }
}
