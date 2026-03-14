import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建用户（用户名密码）
   */
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        grade: true,
        createdAt: true,
      },
    });
  }

  /**
   * 通过手机号创建用户（自动注册）
   */
  async createByPhone(phone: string) {
    // 生成默认用户名
    const username = `user_${phone.slice(-6)}`;
    
    return this.prisma.user.create({
      data: {
        username,
        phone,
        email: `${username}@example.com`,
        password: '', // 手机号登录不需要密码
        role: 'STUDENT', // 默认学生角色
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        password: true,
        role: true,
        grade: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 查询所有用户
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        grade: true,
        createdAt: true,
      },
    });
  }

  /**
   * 根据 ID 查询用户
   */
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        grade: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }

    return user;
  }

  /**
   * 更新用户
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // 验证用户存在

    // 如果要更新密码，需要加密
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        grade: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 根据用户名查询
   */
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * 根据手机号查询
   */
  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * 根据 ID 查询用户（包含敏感信息，仅内部使用）
   */
  async findByIdWithSensitive(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
