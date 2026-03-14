import { Controller, Get, Post, Body, Request, UseGuards, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { UploadPolicyDto } from './files.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  /**
   * 获取上传策略（FTP 签名）
   */
  @Post('upload-policy')
  async getUploadPolicy(
    @Request() req,
    @Body() uploadPolicyDto: UploadPolicyDto,
  ) {
    const userId = req.user.sub;
    return this.filesService.getUploadPolicy(
      userId,
      uploadPolicyDto.filename,
      uploadPolicyDto.mimetype,
      uploadPolicyDto.filesize,
    );
  }

  /**
   * 获取用户的文件列表
   */
  @Get('list')
  async getUserFiles(
    @Request() req,
    @Query('limit') limit: number = 50,
  ) {
    const userId = req.user.sub;
    return this.filesService.getUserFiles(userId, parseInt(limit as any));
  }
}
