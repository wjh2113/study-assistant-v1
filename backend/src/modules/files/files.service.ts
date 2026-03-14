import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 生成 FTP 上传签名
   */
  async getUploadPolicy(userId: number, filename: string, mimetype: string, filesize?: number) {
    const ftpHost = this.configService.get('FTP_HOST', 'localhost');
    const ftpPort = this.configService.get('FTP_PORT', '21');
    const ftpUser = this.configService.get('FTP_USER', 'uploader');
    const ftpPass = this.configService.get('FTP_PASS', 'uploader123');
    const ftpBaseUrl = this.configService.get('FTP_BASE_URL', 'http://localhost:21');

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = filename.split('.').pop() || 'pdf';
    const uniqueFilename = `${timestamp}_${randomStr}.${ext}`;
    
    // FTP 路径
    const ftpPath = `/uploads/${uniqueFilename}`;
    
    // 生成签名（简化实现，生产环境应使用更安全的签名算法）
    const signature = crypto
      .createHmac('sha256', this.configService.get('JWT_SECRET', 'secret'))
      .update(`${userId}:${uniqueFilename}:${timestamp}`)
      .digest('hex');

    // 上传策略
    const policy = {
      ftpHost,
      ftpPort: parseInt(ftpPort),
      ftpUser,
      ftpPass,
      filename: uniqueFilename,
      originalName: filename,
      mimetype,
      filesize: filesize || 0,
      ftpPath,
      uploadUrl: `${ftpBaseUrl}${ftpPath}`,
      signature,
      expiresAt: timestamp + 3600000, // 1 小时过期
    };

    return policy;
  }

  /**
   * 记录文件上传
   */
  async recordUpload(
    userId: number,
    filename: string,
    originalName: string,
    mimetype: string,
    size: number,
    url: string,
    ftpPath: string,
  ) {
    return this.prisma.uploadFile.create({
      data: {
        userId,
        filename,
        originalName,
        mimetype,
        size,
        url,
        ftpPath,
      },
    });
  }

  /**
   * 获取用户的文件列表
   */
  async getUserFiles(userId: number, limit: number = 50) {
    return this.prisma.uploadFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
