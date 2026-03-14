import { Controller, Get, Post, Body, Param, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PracticeService } from './practice.service';
import { CreateSessionDto, SubmitAnswersDto } from './practice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('practice')
@UseGuards(JwtAuthGuard)
export class PracticeController {
  constructor(private practiceService: PracticeService) {}

  /**
   * 创建练习会话
   */
  @Post('sessions')
  async createSession(@Request() req, @Body() createSessionDto: CreateSessionDto) {
    const userId = req.user.sub;
    return this.practiceService.createSession(userId, createSessionDto);
  }

  /**
   * 获取会话列表
   */
  @Get('sessions')
  async getSessions(@Request() req) {
    const userId = req.user.sub;
    return this.practiceService.getSessions(userId);
  }

  /**
   * 获取会话详情
   */
  @Get('sessions/:id')
  async getSessionDetail(@Param('id', ParseIntPipe) id: number) {
    return this.practiceService.getSessionDetail(id);
  }

  /**
   * 生成题目（AI 出题）
   */
  @Post('sessions/:id/questions:generate')
  async generateQuestions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const session = await this.practiceService.getSessionDetail(id);
    const unitId = session.unitId;
    const count = session.totalQuestions || 10;
    
    return this.practiceService.generateQuestions(id, unitId, count);
  }

  /**
   * 提交答案（单题）
   */
  @Post('sessions/:id/answers')
  async submitAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { questionId: number; answer: string },
  ) {
    return this.practiceService.submitAnswer(id, body.questionId, body.answer);
  }

  /**
   * 批量提交答案
   */
  @Post('sessions/:id/answers:batch')
  async submitAnswers(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitAnswersDto: SubmitAnswersDto,
  ) {
    return this.practiceService.submitAnswers(id, submitAnswersDto.answers);
  }

  /**
   * 结束练习
   */
  @Post('sessions/:id/finish')
  async finishSession(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.practiceService.finishSession(id, userId);
  }

  /**
   * 获取练习结果
   */
  @Get('sessions/:id/result')
  async getSessionResult(@Param('id', ParseIntPipe) id: number) {
    return this.practiceService.getSessionResult(id);
  }
}
