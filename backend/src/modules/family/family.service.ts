import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 绑定状态常量（SQLite 兼容）
const BindingStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建绑定关系（家长发起）
   */
  async createBinding(parentId: number, childId: number) {
    // 验证孩子是否存在
    const child = await this.prisma.user.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new NotFoundException('学生不存在');
    }

    // 验证孩子角色
    if (child.role !== 'STUDENT') {
      throw new BadRequestException('只能绑定学生账号');
    }

    // 检查是否已存在绑定
    const existing = await this.prisma.familyBinding.findUnique({
      where: {
        parentId_childId: {
          parentId,
          childId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('已存在绑定关系');
    }

    // 创建绑定（状态为待确认）
    return this.prisma.familyBinding.create({
      data: {
        parentId,
        childId,
        status: BindingStatus.PENDING,
      },
      include: {
        parent: {
          select: {
            id: true,
            username: true,
            phone: true,
          },
        },
        child: {
          select: {
            id: true,
            username: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * 确认绑定（学生确认）
   */
  async confirmBinding(childId: number, bindingId: number) {
    const binding = await this.prisma.familyBinding.findUnique({
      where: { id: bindingId },
    });

    if (!binding) {
      throw new NotFoundException('绑定关系不存在');
    }

    if (binding.childId !== childId) {
      throw new BadRequestException('无权确认此绑定');
    }

    if (binding.status !== BindingStatus.PENDING) {
      throw new BadRequestException('绑定状态不正确');
    }

    return this.prisma.familyBinding.update({
      where: { id: bindingId },
      data: { status: BindingStatus.ACTIVE },
      include: {
        parent: {
          select: {
            id: true,
            username: true,
            phone: true,
          },
        },
        child: {
          select: {
            id: true,
            username: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * 拒绝绑定
   */
  async rejectBinding(childId: number, bindingId: number) {
    const binding = await this.prisma.familyBinding.findUnique({
      where: { id: bindingId },
    });

    if (!binding) {
      throw new NotFoundException('绑定关系不存在');
    }

    if (binding.childId !== childId) {
      throw new BadRequestException('无权拒绝此绑定');
    }

    return this.prisma.familyBinding.update({
      where: { id: bindingId },
      data: { status: BindingStatus.REJECTED },
    });
  }

  /**
   * 取消绑定
   */
  async cancelBinding(userId: number, bindingId: number) {
    const binding = await this.prisma.familyBinding.findUnique({
      where: { id: bindingId },
    });

    if (!binding) {
      throw new NotFoundException('绑定关系不存在');
    }

    if (binding.parentId !== userId && binding.childId !== userId) {
      throw new BadRequestException('无权取消此绑定');
    }

    return this.prisma.familyBinding.update({
      where: { id: bindingId },
      data: { status: BindingStatus.CANCELLED },
    });
  }

  /**
   * 查询用户的绑定列表
   */
  async getBindings(userId: number, role: string, status?: string) {
    const where: any = {};

    if (role === 'PARENT') {
      where.parentId = userId;
    } else {
      where.childId = userId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.familyBinding.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatar: true,
          },
        },
        child: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatar: true,
            grade: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 获取绑定的学生列表（家长端）
   */
  async getChildren(parentId: number) {
    const bindings = await this.prisma.familyBinding.findMany({
      where: {
        parentId,
        status: BindingStatus.ACTIVE,
      },
      include: {
        child: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatar: true,
            grade: true,
          },
        },
      },
    });

    return bindings.map((b) => b.child);
  }

  /**
   * 获取绑定的家长列表（学生端）
   */
  async getParents(childId: number) {
    const bindings = await this.prisma.familyBinding.findMany({
      where: {
        childId,
        status: BindingStatus.ACTIVE,
      },
      include: {
        parent: {
          select: {
            id: true,
            username: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    return bindings.map((b) => b.parent);
  }
}
