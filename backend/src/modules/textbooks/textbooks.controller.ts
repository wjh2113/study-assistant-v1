import { Controller, Get, Post, Body, Param, Delete, Request, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { TextbooksService } from './textbooks.service';
import { CreateTextbookDto, UpdateTextbookDto, QueryTextbooksDto, CreateUnitDto, UpdateUnitDto } from './textbooks.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('textbooks')
@UseGuards(JwtAuthGuard)
export class TextbooksController {
  constructor(private textbooksService: TextbooksService) {}

  /**
   * 创建课本
   */
  @Post()
  async create(@Request() req, @Body() createTextbookDto: CreateTextbookDto) {
    const userId = req.user.sub;
    return this.textbooksService.create(userId, createTextbookDto);
  }

  /**
   * 查询课本列表
   */
  @Get()
  async findAll(
    @Request() req,
    @Query() queryDto: QueryTextbooksDto,
  ) {
    const userId = req.user.sub;
    const role = req.user.role;
    return this.textbooksService.findAll(queryDto, userId, role);
  }

  /**
   * 查询课本详情
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.textbooksService.findOne(id);
  }

  /**
   * 更新课本
   */
  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTextbookDto: UpdateTextbookDto,
  ) {
    return this.textbooksService.update(id, updateTextbookDto);
  }

  /**
   * 删除课本
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.textbooksService.remove(id);
  }

  /**
   * 解析 PDF（生成单元树）
   */
  @Post(':id/parse')
  async parsePdf(@Param('id', ParseIntPipe) id: number) {
    return this.textbooksService.parsePdf(id);
  }

  /**
   * 获取单元树
   */
  @Get(':id/units')
  async getUnits(@Param('id', ParseIntPipe) id: number) {
    return this.textbooksService.getUnits(id);
  }

  /**
   * 创建单元
   */
  @Post(':id/units')
  async createUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() createUnitDto: CreateUnitDto,
  ) {
    return this.textbooksService.createUnit(id, createUnitDto);
  }

  /**
   * 更新单元
   */
  @Post('units/:unitId')
  async updateUnit(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    return this.textbooksService.updateUnit(unitId, updateUnitDto);
  }

  /**
   * 删除单元
   */
  @Delete('units/:unitId')
  async removeUnit(@Param('unitId', ParseIntPipe) unitId: number) {
    return this.textbooksService.removeUnit(unitId);
  }
}
