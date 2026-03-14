import { Controller, Get, Post, Body, Request, UseGuards, Query } from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateBindingDto, ConfirmBindingDto, QueryBindingsDto } from './family.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  /**
   * 创建绑定关系（家长发起）
   */
  @Post('bindings')
  async createBinding(@Request() req, @Body() createBindingDto: CreateBindingDto) {
    const userId = req.user.sub;
    return this.familyService.createBinding(userId, createBindingDto.childId);
  }

  /**
   * 查询绑定列表
   */
  @Get('bindings')
  async getBindings(
    @Request() req,
    @Query() queryDto: QueryBindingsDto,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.familyService.getBindings(userId, role, queryDto.status);
  }

  /**
   * 确认绑定（学生确认）
   */
  @Post('bindings/confirm')
  async confirmBinding(
    @Request() req,
    @Body() confirmBindingDto: ConfirmBindingDto,
  ) {
    const userId = req.user.sub;
    return this.familyService.confirmBinding(userId, confirmBindingDto.bindingId);
  }

  /**
   * 拒绝绑定
   */
  @Post('bindings/reject')
  async rejectBinding(
    @Request() req,
    @Body() confirmBindingDto: ConfirmBindingDto,
  ) {
    const userId = req.user.sub;
    return this.familyService.rejectBinding(userId, confirmBindingDto.bindingId);
  }

  /**
   * 取消绑定
   */
  @Post('bindings/cancel')
  async cancelBinding(
    @Request() req,
    @Body() confirmBindingDto: ConfirmBindingDto,
  ) {
    const userId = req.user.sub;
    return this.familyService.cancelBinding(userId, confirmBindingDto.bindingId);
  }

  /**
   * 获取绑定的学生列表（家长端）
   */
  @Get('children')
  async getChildren(@Request() req) {
    const userId = req.user.sub;
    return this.familyService.getChildren(userId);
  }

  /**
   * 获取绑定的家长列表（学生端）
   */
  @Get('parents')
  async getParents(@Request() req) {
    const userId = req.user.sub;
    return this.familyService.getParents(userId);
  }
}
