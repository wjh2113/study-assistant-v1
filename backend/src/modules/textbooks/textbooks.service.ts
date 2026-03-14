import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTextbookDto, UpdateTextbookDto, QueryTextbooksDto, CreateUnitDto, UpdateUnitDto, TextbookStatus } from './textbooks.dto';

@Injectable()
export class TextbooksService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建课本记录
   */
  async create(userId: number, createTextbookDto: CreateTextbookDto) {
    return this.prisma.textbook.create({
      data: {
        userId,
        ...createTextbookDto,
        status: TextbookStatus.PENDING,
      },
    });
  }

  /**
   * 查询课本列表
   */
  async findAll(queryDto: QueryTextbooksDto, userId?: number, role?: string) {
    const where: any = {};

    if (queryDto.subject) {
      where.subject = queryDto.subject;
    }

    if (queryDto.grade) {
      where.grade = queryDto.grade;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    // 非管理员只能看到已就绪的课本
    if (role !== 'ADMIN') {
      where.status = TextbookStatus.READY;
    }

    // 可以添加用户过滤（只看自己的课本）
    if (userId && role !== 'ADMIN') {
      where.userId = userId;
    }

    return this.prisma.textbook.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 查询课本详情
   */
  async findOne(id: number) {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        units: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!textbook) {
      throw new NotFoundException('课本不存在');
    }

    return textbook;
  }

  /**
   * 更新课本
   */
  async update(id: number, updateTextbookDto: UpdateTextbookDto) {
    await this.findOne(id); // 验证存在

    return this.prisma.textbook.update({
      where: { id },
      data: updateTextbookDto,
    });
  }

  /**
   * 删除课本
   */
  async remove(id: number) {
    await this.findOne(id); // 验证存在

    return this.prisma.textbook.delete({
      where: { id },
    });
  }

  /**
   * 解析 PDF 并生成单元树（占位实现）
   */
  async parsePdf(textbookId: number) {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });

    if (!textbook) {
      throw new NotFoundException('课本不存在');
    }

    // 更新状态为解析中
    await this.prisma.textbook.update({
      where: { id: textbookId },
      data: { status: TextbookStatus.PROCESSING },
    });

    try {
      // TODO: 实现 PDF 解析逻辑
      // 这里简化为创建一个默认单元树
      const unitTree = [
        { title: '第一单元', unitNumber: 'Unit 1', pageStart: 1, pageEnd: 10 },
        { title: '第二单元', unitNumber: 'Unit 2', pageStart: 11, pageEnd: 20 },
        { title: '第三单元', unitNumber: 'Unit 3', pageStart: 21, pageEnd: 30 },
      ];

      // 创建单元
      for (const [index, unitData] of unitTree.entries()) {
        await this.prisma.textbookUnit.create({
          data: {
            textbookId,
            ...unitData,
            sortOrder: index,
          },
        });
      }

      // 更新状态为就绪
      await this.prisma.textbook.update({
        where: { id: textbookId },
        data: {
          status: TextbookStatus.READY,
          unitTree: JSON.stringify(unitTree),
        },
      });

      return { success: true, message: '解析完成' };
    } catch (error) {
      // 解析失败
      await this.prisma.textbook.update({
        where: { id: textbookId },
        data: { status: TextbookStatus.FAILED },
      });

      throw new BadRequestException('PDF 解析失败');
    }
  }

  /**
   * 获取单元树
   */
  async getUnits(textbookId: number) {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
      include: {
        units: {
          where: { parentId: null }, // 只获取顶级单元
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            children: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    });

    if (!textbook) {
      throw new NotFoundException('课本不存在');
    }

    return textbook.units;
  }

  /**
   * 创建单元
   */
  async createUnit(textbookId: number, createUnitDto: CreateUnitDto) {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });

    if (!textbook) {
      throw new NotFoundException('课本不存在');
    }

    // 如果指定了父单元，验证父单元存在
    if (createUnitDto.parentId) {
      const parentUnit = await this.prisma.textbookUnit.findUnique({
        where: { id: createUnitDto.parentId },
      });

      if (!parentUnit || parentUnit.textbookId !== textbookId) {
        throw new BadRequestException('父单元不存在');
      }
    }

    return this.prisma.textbookUnit.create({
      data: {
        textbookId,
        ...createUnitDto,
        sortOrder: createUnitDto.sortOrder || 0,
      },
    });
  }

  /**
   * 更新单元
   */
  async updateUnit(unitId: number, updateUnitDto: UpdateUnitDto) {
    const unit = await this.prisma.textbookUnit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new NotFoundException('单元不存在');
    }

    return this.prisma.textbookUnit.update({
      where: { id: unitId },
      data: updateUnitDto,
    });
  }

  /**
   * 删除单元
   */
  async removeUnit(unitId: number) {
    const unit = await this.prisma.textbookUnit.findUnique({
      where: { id: unitId },
      include: {
        children: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('单元不存在');
    }

    // 如果有子单元，不允许删除
    if (unit.children.length > 0) {
      throw new BadRequestException('请先删除子单元');
    }

    return this.prisma.textbookUnit.delete({
      where: { id: unitId },
    });
  }
}
