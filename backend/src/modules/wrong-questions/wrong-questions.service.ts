import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWrongQuestionDto, UpdateWrongQuestionDto } from './dto/wrong-question.dto';

@Injectable()
export class WrongQuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createWrongQuestionDto: CreateWrongQuestionDto) {
    const existing = await this.prisma.wrongQuestion.findUnique({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId: createWrongQuestionDto.exerciseId,
        },
      },
    });

    if (existing) {
      // 已存在，增加错误次数
      return this.prisma.wrongQuestion.update({
        where: { id: existing.id },
        data: {
          timesWrong: { increment: 1 },
          lastWrongAt: new Date(),
          wrongAnswer: createWrongQuestionDto.wrongAnswer,
        },
        include: {
          exercise: {
            include: {
              subject: true,
            },
          },
        },
      });
    }

    // 新增错题
    return this.prisma.wrongQuestion.create({
      data: {
        userId,
        exerciseId: createWrongQuestionDto.exerciseId,
        wrongAnswer: createWrongQuestionDto.wrongAnswer,
      },
      include: {
        exercise: {
          include: {
            subject: true,
          },
        },
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.wrongQuestion.findMany({
      where: { userId },
      include: {
        exercise: {
          include: {
            subject: true,
            knowledgePoint: true,
          },
        },
      },
      orderBy: { lastWrongAt: 'desc' },
    });
  }

  async getReviewQuestions(userId: number) {
    // 获取需要复习的错题（未掌握且最近做错的）
    return this.prisma.wrongQuestion.findMany({
      where: {
        userId,
        isMastered: false,
      },
      include: {
        exercise: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { lastWrongAt: 'asc' },
      take: 20,
    });
  }

  async update(id: number, updateWrongQuestionDto: UpdateWrongQuestionDto) {
    const wrongQuestion = await this.prisma.wrongQuestion.findUnique({
      where: { id },
    });

    if (!wrongQuestion) {
      throw new NotFoundException(`错题 ${id} 不存在`);
    }

    return this.prisma.wrongQuestion.update({
      where: { id },
      data: updateWrongQuestionDto,
      include: {
        exercise: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.wrongQuestion.findUnique({
      where: { id },
    });

    return this.prisma.wrongQuestion.delete({
      where: { id },
    });
  }

  async markAsMastered(id: number) {
    return this.update(id, { isMastered: true });
  }
}
