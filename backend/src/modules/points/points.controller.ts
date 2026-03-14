import { Controller, Get, Post, Body, Request, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsChangeDto } from './points.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  /**
   * 获取积分余额
   */
  @Get('balance')
  async getBalance(@Request() req) {
    const userId = req.user.sub;
    return { balance: await this.pointsService.getBalance(userId) };
  }

  /**
   * 获取积分流水
   */
  @Get('ledger')
  async getLedger(
    @Request() req,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    const userId = req.user.sub;
    return this.pointsService.getLedger(userId, limit);
  }

  /**
   * 获取积分统计
   */
  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.sub;
    return this.pointsService.getStats(userId);
  }

  /**
   * 手动变更积分（管理员功能）
   */
  @Post('change')
  async changePoints(
    @Request() req,
    @Body() changeDto: PointsChangeDto,
  ) {
    const userId = req.user.sub;
    return this.pointsService.changePoints(userId, changeDto);
  }
}
