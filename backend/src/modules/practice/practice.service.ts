import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto, SubmitAnswersDto, GenerateQuestionsDto, QuestionType } from './practice.dto';

// 会话状态常量（SQLite 兼容）
const SessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// 占位题目数据（AI 出题功能待实现）
const PLACEHOLDER_QUESTIONS = [
  {
    questionType: QuestionType.SINGLE_CHOICE,
    question: '1 + 1 = ?',
    options: [
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
      { key: 'C', value: '3' },
      { key: 'D', value: '4' },
    ],
    answer: 'B',
    explanation: '基础加法：1 + 1 = 2',
  },
  {
    questionType: QuestionType.SINGLE_CHOICE,
    question: '5 - 3 = ?',
    options: [
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
      { key: 'C', value: '3' },
      { key: 'D', value: '4' },
    ],
    answer: 'B',
    explanation: '基础减法：5 - 3 = 2',
  },
  {
    questionType: QuestionType.TRUE_FALSE,
    question: '地球是平的。（判断对错）',
    options: [
      { key: 'A', value: '对' },
      { key: 'B', value: '错' },
    ],
    answer: 'B',
    explanation: '地球是球体，不是平的。',
  },
];

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建练习会话
   */
  async createSession(userId: number, createSessionDto: CreateSessionDto) {
    const { textbookId, unitId, questionCount = 10 } = createSessionDto;

    // 验证课本和单元（如果提供）
    if (textbookId) {
      const textbook = await this.prisma.textbook.findUnique({
        where: { id: textbookId },
      });
      if (!textbook) {
        throw new NotFoundException('课本不存在');
      }
    }

    if (unitId) {
      const unit = await this.prisma.textbookUnit.findUnique({
        where: { id: unitId },
      });
      if (!unit) {
        throw new NotFoundException('单元不存在');
      }
    }

    // 创建会话
    const session = await this.prisma.practiceSession.create({
      data: {
        userId,
        textbookId,
        unitId,
        status: SessionStatus.ACTIVE,
        totalQuestions: 0,
        correctAnswers: 0,
      },
    });

    // 生成题目
    await this.generateQuestions(session.id, unitId, questionCount);

    return this.getSessionDetail(session.id);
  }

  /**
   * 生成题目（AI 出题占位）
   */
  async generateQuestions(
    sessionId: number,
    unitId: number | null,
    count: number,
  ) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    // TODO: 接入 AI 出题
    // 这里使用占位题目
    const questions = [];
    for (let i = 0; i < Math.min(count, PLACEHOLDER_QUESTIONS.length); i++) {
      const q = PLACEHOLDER_QUESTIONS[i % PLACEHOLDER_QUESTIONS.length];
      questions.push({
        sessionId,
        unitId,
        questionType: q.questionType,
        question: `${i + 1}. ${q.question}`,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        score: 10, // 每题 10 分
      });
    }

    // 批量创建题目
    await this.prisma.practiceQuestion.createMany({
      data: questions,
    });

    // 更新会话题目总数
    await this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: { totalQuestions: questions.length },
    });

    return questions;
  }

  /**
   * 获取会话详情（包含题目）
   */
  async getSessionDetail(sessionId: number) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        textbook: {
          select: {
            id: true,
            title: true,
            subject: true,
          },
        },
        unit: {
          select: {
            id: true,
            title: true,
            unitNumber: true,
          },
        },
        questions: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return session;
  }

  /**
   * 获取会话列表
   */
  async getSessions(userId: number, status?: string) {
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    return this.prisma.practiceSession.findMany({
      where,
      include: {
        textbook: {
          select: {
            id: true,
            title: true,
            subject: true,
          },
        },
        unit: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 提交答案（单题）
   */
  async submitAnswer(
    sessionId: number,
    questionId: number,
    answer: string,
  ) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('会话已结束');
    }

    const question = await this.prisma.practiceQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question || question.sessionId !== sessionId) {
      throw new NotFoundException('题目不存在');
    }

    // 判分
    const isCorrect = question.answer.trim().toUpperCase() === answer.trim().toUpperCase();

    // 更新题目答案
    await this.prisma.practiceQuestion.update({
      where: { id: questionId },
      data: {
        userAnswer: answer,
        isCorrect,
        score: isCorrect ? question.score : 0,
      },
    });

    // 记录答案
    await this.prisma.practiceAnswer.create({
      data: {
        sessionId,
        questionId,
        answer,
        isCorrect,
      },
    });

    // 更新会话统计
    await this.updateSessionStats(sessionId);

    return {
      isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation,
    };
  }

  /**
   * 批量提交答案
   */
  async submitAnswers(sessionId: number, answers: { questionId: number; answer: string }[]) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('会话已结束');
    }

    // 批量处理答案
    for (const { questionId, answer } of answers) {
      await this.submitAnswer(sessionId, questionId, answer);
    }

    return this.getSessionDetail(sessionId);
  }

  /**
   * 更新会话统计
   */
  private async updateSessionStats(sessionId: number) {
    const stats = await this.prisma.practiceQuestion.aggregate({
      where: { sessionId },
      _sum: { score: true },
      _count: { id: true },
    });

    const correctCount = await this.prisma.practiceQuestion.count({
      where: { sessionId, isCorrect: true },
    });

    await this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        correctAnswers: correctCount,
        score: stats._sum.score || 0,
      },
    });
  }

  /**
   * 结束练习
   */
  async finishSession(sessionId: number, userId: number) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    if (session.userId !== userId) {
      throw new BadRequestException('无权结束此会话');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('会话已结束');
    }

    // 计算耗时
    const timeSpent = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

    // 更新会话状态
    const updatedSession = await this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        finishedAt: new Date(),
        timeSpent,
      },
      include: {
        questions: true,
      },
    });

    // 计算正确率
    const correctRate = updatedSession.totalQuestions > 0
      ? Math.round((updatedSession.correctAnswers / updatedSession.totalQuestions) * 100)
      : 0;

    return {
      ...updatedSession,
      correctRate,
    };
  }

  /**
   * 获取练习结果
   */
  async getSessionResult(sessionId: number) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    const correctRate = session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

    return {
      ...session,
      correctRate,
    };
  }
}
