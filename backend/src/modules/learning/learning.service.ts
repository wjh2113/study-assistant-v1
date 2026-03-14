import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLearningRecordDto, QueryLearningRecordsDto } from './learning.dto';

@Injectable()
export class LearningService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建学习记录
   */
  async createRecord(userId: number, createDto: CreateLearningRecordDto) {
    return this.prisma.learningRecord.create({
      data: {
        userId,
        ...createDto,
      } as any,
    });
  }

  /**
   * 查询学习记录列表
   */
  async getRecords(
    userId: number,
    queryDto: QueryLearningRecordsDto,
    limit: number = 50,
  ) {
    const where: any = { userId };

    if (queryDto.textbookId) {
      where.textbookId = queryDto.textbookId;
    }

    if (queryDto.unitId) {
      where.unitId = queryDto.unitId;
    }

    if (queryDto.actionType) {
      where.actionType = queryDto.actionType;
    }

    return this.prisma.learningRecord.findMany({
      where,
      include: {
        unit: {
          select: {
            id: true,
            title: true,
          },
        },
      } as any,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 获取学习统计
   */
  async getStats(userId: number) {
    // 总学习次数
    const totalRecords = await this.prisma.learningRecord.count({
      where: { userId },
    });

    // 总学习时长（秒）
    const durationStats = await this.prisma.learningRecord.aggregate({
      where: { userId, duration: { not: null } },
      _sum: { duration: true },
    });

    // 完成练习次数
    const finishedPractices = await this.prisma.learningRecord.count({
      where: { userId, actionType: 'FINISH_PRACTICE' },
    });

    // 平均得分
    const scoreStats = await this.prisma.learningRecord.aggregate({
      where: { userId, score: { not: null } },
      _avg: { score: true },
    });

    // 最近 7 天学习记录
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRecords = await this.prisma.learningRecord.count({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 按科目统计
    const subjectStats = await this.prisma.learningRecord.groupBy({
      by: ['textbookId'],
      where: { userId },
      _count: { id: true },
    });

    // 获取课本科目信息
    const subjectBreakdown = [];
    for (const stat of subjectStats) {
      const textbook = await this.prisma.textbook.findUnique({
        where: { id: stat.textbookId! },
        select: { subject: true },
      });
      if (textbook) {
        subjectBreakdown.push({
          subject: textbook.subject,
          count: stat._count.id,
        });
      }
    }

    return {
      totalRecords,
      totalDuration: durationStats._sum.duration || 0,
      finishedPractices,
      averageScore: Math.round(scoreStats._avg.score || 0),
      recentRecords,
      subjectBreakdown,
    };
  }

  /**
   * 获取学习记录（按天分组）
   */
  async getRecordsByDay(userId: number, days: number = 7) {
    const records = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const count = await this.prisma.learningRecord.count({
        where: {
          userId,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      records.push({
        date: startOfDay.toISOString().split('T')[0],
        count,
      });
    }

    return records.reverse();
  }
}
