import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsChangeDto } from './points.dto';

// 积分规则
const POINTS_RULES = {
  FINISH_PRACTICE: 10, // 完成一次练习
  PERFECT_SCORE: 20,   // 满分奖励
  DAILY_LOGIN: 5,      // 每日登录
  CONTINUE_STREAK: 10, // 连续学习奖励
};

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户当前积分余额
   */
  async getBalance(userId: number): Promise<number> {
    const ledgers = await this.prisma.pointsLedger.findMany({
      where: { userId },
      select: { points: true },
      orderBy: { createdAt: 'asc' },
    });

    return ledgers.reduce((sum, ledger) => sum + ledger.points, 0);
  }

  /**
   * 获取积分流水
   */
  async getLedger(userId: number, limit: number = 50) {
    return this.prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 积分变更
   */
  async changePoints(
    userId: number,
    changeDto: PointsChangeDto,
  ) {
    const { points, reason, referenceId } = changeDto;

    // 获取当前余额
    const currentBalance = await this.getBalance(userId);
    const newBalance = currentBalance + points;

    // 创建流水记录
    const ledger = await this.prisma.pointsLedger.create({
      data: {
        userId,
        points,
        balance: newBalance,
        reason,
        referenceId,
      },
    });

    return ledger;
  }

  /**
   * 练习完成奖励积分
   */
  async rewardForPractice(
    userId: number,
    sessionId: number,
    score: number,
    totalQuestions: number,
  ) {
    // 基础奖励：完成练习
    let totalPoints = POINTS_RULES.FINISH_PRACTICE;
    let reasons = ['完成练习'];

    // 满分奖励
    if (totalQuestions > 0 && score === totalQuestions * 10) {
      totalPoints += POINTS_RULES.PERFECT_SCORE;
      reasons.push('满分奖励');
    }

    // 创建积分流水
    const ledger = await this.changePoints(userId, {
      points: totalPoints,
      reason: reasons.join(' + '),
      referenceId: sessionId,
    });

    return {
      points: totalPoints,
      balance: ledger.balance,
      reasons,
    };
  }

  /**
   * 每日登录奖励
   */
  async rewardForDailyLogin(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已领取
    const existing = await this.prisma.pointsLedger.findFirst({
      where: {
        userId,
        reason: '每日登录',
        createdAt: { gte: today },
      },
    });

    if (existing) {
      return { points: 0, message: '今日已领取' };
    }

    const ledger = await this.changePoints(userId, {
      points: POINTS_RULES.DAILY_LOGIN,
      reason: '每日登录',
    });

    return {
      points: POINTS_RULES.DAILY_LOGIN,
      balance: ledger.balance,
    };
  }

  /**
   * 获取积分统计
   */
  async getStats(userId: number) {
    const balance = await this.getBalance(userId);

    const totalEarned = await this.prisma.pointsLedger.aggregate({
      where: { userId, points: { gt: 0 } },
      _sum: { points: true },
    });

    const totalSpent = await this.prisma.pointsLedger.aggregate({
      where: { userId, points: { lt: 0 } },
      _sum: { points: true },
    });

    // 获取最近 7 天积分变化
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLedgers = await this.prisma.pointsLedger.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 7,
    });

    return {
      balance,
      totalEarned: totalEarned._sum.points || 0,
      totalSpent: Math.abs(totalSpent._sum.points || 0),
      recentLedgers,
    };
  }
}
