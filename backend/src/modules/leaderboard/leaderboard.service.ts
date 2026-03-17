import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 排行榜类型
export enum LeaderboardType {
  POINTS = 'POINTS', // 积分榜
  PRACTICE = 'PRACTICE', // 练习榜
  CONTINUOUS = 'CONTINUOUS', // 连续学习榜
}

// 时间范围
export enum TimeRange {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取积分排行榜
   */
  async getPointsLeaderboard(
    timeRange: TimeRange = TimeRange.ALL_TIME,
    limit: number = 10,
  ) {
    const now = new Date();
    let startDate: Date | undefined = undefined;

    if (timeRange === TimeRange.DAILY) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === TimeRange.WEEKLY) {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === TimeRange.MONTHLY) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 获取用户积分流水
    const ledgers = await this.prisma.pointsLedger.findMany({
      where: startDate
        ? {
            createdAt: { gte: startDate },
          }
        : {},
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            grade: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 按用户聚合积分
    const userPoints = new Map<number, { userId: number; username: string; avatar: string; grade: number; points: number }>();

    for (const ledger of ledgers) {
      const existing = userPoints.get(ledger.userId);
      if (existing) {
        existing.points += ledger.points;
      } else {
        userPoints.set(ledger.userId, {
          userId: ledger.userId,
          username: ledger.user.username || `用户${ledger.userId}`,
          avatar: ledger.user.avatar || '',
          grade: ledger.user.grade || 1,
          points: ledger.points,
        });
      }
    }

    // 转换为数组并排序
    const leaderboard = Array.from(userPoints.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    return {
      type: LeaderboardType.POINTS,
      timeRange,
      updatedAt: now,
      leaderboard,
    };
  }

  /**
   * 获取练习排行榜（按完成题目数）
   */
  async getPracticeLeaderboard(
    timeRange: TimeRange = TimeRange.ALL_TIME,
    limit: number = 10,
  ) {
    const now = new Date();
    let startDate: Date | undefined = undefined;

    if (timeRange === TimeRange.DAILY) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === TimeRange.WEEKLY) {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === TimeRange.MONTHLY) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 获取练习会话
    const sessions = await this.prisma.practiceSession.findMany({
      where: {
        status: 'COMPLETED',
        ...(startDate && { finishedAt: { gte: startDate } }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            grade: true,
          },
        },
      },
    });

    // 按用户聚合练习数据
    const userStats = new Map<
      number,
      { userId: number; username: string; avatar: string; grade: number; totalQuestions: number; correctAnswers: number; sessions: number }
    >();

    for (const session of sessions) {
      const existing = userStats.get(session.userId);
      if (existing) {
        existing.totalQuestions += session.totalQuestions || 0;
        existing.correctAnswers += session.correctAnswers || 0;
        existing.sessions += 1;
      } else {
        userStats.set(session.userId, {
          userId: session.userId,
          username: session.user.username || `用户${session.userId}`,
          avatar: session.user.avatar || '',
          grade: session.user.grade || 1,
          totalQuestions: session.totalQuestions || 0,
          correctAnswers: session.correctAnswers || 0,
          sessions: 1,
        });
      }
    }

    // 转换为数组并排序（按完成题目数）
    const leaderboard = Array.from(userStats.values())
      .sort((a, b) => b.totalQuestions - a.totalQuestions)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
        accuracy: item.totalQuestions > 0 
          ? Math.round((item.correctAnswers / item.totalQuestions) * 100) 
          : 0,
      }));

    return {
      type: LeaderboardType.PRACTICE,
      timeRange,
      updatedAt: now,
      leaderboard,
    };
  }

  /**
   * 获取连续学习排行榜
   */
  async getContinuousLearningLeaderboard(limit: number = 10) {
    const now = new Date();
    
    // 获取所有用户（简化实现，实际应该从学习记录中获取）
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatar: true,
        grade: true,
        learningRecords: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // 计算每个用户的连续学习天数
    const userStreaks = users.map((user) => {
      const streak = this.calculateStreak(user.learningRecords.map((r) => r.createdAt));
      return {
        userId: user.id,
        username: user.username || `用户${user.id}`,
        avatar: user.avatar || '',
        grade: user.grade || 1,
        streak,
      };
    });

    // 排序并返回
    const leaderboard = userStreaks
      .sort((a, b) => b.streak - a.streak)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    return {
      type: LeaderboardType.CONTINUOUS,
      timeRange: TimeRange.ALL_TIME,
      updatedAt: now,
      leaderboard,
    };
  }

  /**
   * 计算连续学习天数
   */
  private calculateStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    const uniqueDays = new Set<string>();
    for (const date of dates) {
      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      uniqueDays.add(dayKey);
    }

    const sortedDays = Array.from(uniqueDays).sort((a, b) => {
      const [aYear, aMonth, aDay] = a.split('-').map(Number);
      const [bYear, bMonth, bDay] = b.split('-').map(Number);
      return new Date(aYear, aMonth - 1, aDay).getTime() - new Date(bYear, bMonth - 1, bDay).getTime();
    });

    let streak = 0;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

    // 检查今天或昨天是否有学习记录
    if (!sortedDays.includes(todayKey) && !sortedDays.includes(yesterdayKey)) {
      return 0;
    }

    // 从最近一天开始计算连续天数
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      const currentDate = new Date(sortedDays[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - (sortedDays.length - 1 - i));

      if (
        currentDate.getFullYear() === expectedDate.getFullYear() &&
        currentDate.getMonth() === expectedDate.getMonth() &&
        currentDate.getDate() === expectedDate.getDate()
      ) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * 获取用户在排行榜中的排名
   */
  async getUserRank(
    userId: number,
    type: LeaderboardType = LeaderboardType.POINTS,
    timeRange: TimeRange = TimeRange.ALL_TIME,
  ) {
    if (type === LeaderboardType.POINTS) {
      const leaderboard = await this.getPointsLeaderboard(timeRange, 1000);
      const userEntry = leaderboard.leaderboard.find((entry) => entry.userId === userId);
      return userEntry || { rank: null, userId, points: 0 };
    } else if (type === LeaderboardType.PRACTICE) {
      const leaderboard = await this.getPracticeLeaderboard(timeRange, 1000);
      const userEntry = leaderboard.leaderboard.find((entry) => entry.userId === userId);
      return userEntry || { rank: null, userId, totalQuestions: 0 };
    } else {
      const leaderboard = await this.getContinuousLearningLeaderboard(1000);
      const userEntry = leaderboard.leaderboard.find((entry) => entry.userId === userId);
      return userEntry || { rank: null, userId, streak: 0 };
    }
  }

  /**
   * 刷新排行榜缓存（当前为内存实现，无需特殊处理）
   */
  async refreshCache(): Promise<{ success: boolean; message: string }> {
    // 当前实现为实时查询，无需缓存刷新
    // 未来可以使用 Redis 缓存时实现此方法
    return {
      success: true,
      message: '排行榜已刷新',
    };
  }
}
