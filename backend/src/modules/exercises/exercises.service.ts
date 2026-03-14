import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto, UpdateExerciseDto, FilterExerciseDto } from './dto/exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async create(createExerciseDto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: createExerciseDto as any,
      include: {
        subject: true,
        knowledgePoint: true,
      },
    });
  }

  async findAll(filterDto: FilterExerciseDto) {
    const { subjectId, grade, difficulty, questionType, knowledgePointId, limit = 20, offset = 0 } = filterDto;

    const where: any = {
      isPublic: true,
    };

    if (subjectId) where.subjectId = subjectId;
    if (grade) where.grade = grade;
    if (difficulty) where.difficulty = difficulty;
    if (questionType) where.questionType = questionType;
    if (knowledgePointId) where.knowledgePointId = knowledgePointId;

    const [data, total] = await Promise.all([
      this.prisma.exercise.findMany({
        where,
        include: {
          subject: true,
          knowledgePoint: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exercise.count({ where }),
    ]);

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  async findOne(id: number) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        subject: true,
        knowledgePoint: true,
      },
    });

    if (!exercise) {
      throw new NotFoundException(`习题 ${id} 不存在`);
    }

    // 增加浏览次数
    await this.prisma.exercise.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return exercise;
  }

  async update(id: number, updateExerciseDto: UpdateExerciseDto) {
    await this.findOne(id); // 验证存在

    return this.prisma.exercise.update({
      where: { id },
      data: updateExerciseDto as any,
    });
  }

  async getRandomExercises(count: number) {
    return this.prisma.exercise.findMany({
      where: { isPublic: true },
      take: count,
      orderBy: { id: 'asc' }, // 简单随机
    });
  }
}
