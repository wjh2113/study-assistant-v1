/**
 * FilesController 单元测试
 * 测试覆盖率目标：80%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { UploadPolicyDto } from './files.dto';

// Mock FilesService
const mockFilesService = {
  getUploadPolicy: jest.fn(),
  getUserFiles: jest.fn(),
};

describe('FilesController', () => {
  let controller: FilesController;
  let service: FilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    service = module.get<FilesService>(FilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUploadPolicy', () => {
    it('应该成功获取上传策略', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const uploadPolicyDto: UploadPolicyDto = {
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        filesize: 1024 * 1024 * 5, // 5MB
      };
      const expectedResult = {
        uploadUrl: 'https://ftp.example.com/upload',
        token: 'upload-token-xyz',
        key: 'user-1/test.pdf',
        expire: 3600,
      };

      mockFilesService.getUploadPolicy.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUploadPolicy(req as any, uploadPolicyDto);

      expect(result).toEqual(expectedResult);
      expect(service.getUploadPolicy).toHaveBeenCalledWith(
        mockUser.sub,
        uploadPolicyDto.filename,
        uploadPolicyDto.mimetype,
        uploadPolicyDto.filesize,
      );
    });

    it('应该处理不带 filesize 的上传策略请求', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const uploadPolicyDto: UploadPolicyDto = {
        filename: 'image.jpg',
        mimetype: 'image/jpeg',
      };
      const expectedResult = {
        uploadUrl: 'https://ftp.example.com/upload',
        token: 'upload-token-abc',
        key: 'user-1/image.jpg',
        expire: 3600,
      };

      mockFilesService.getUploadPolicy.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUploadPolicy(req as any, uploadPolicyDto);

      expect(result).toEqual(expectedResult);
      expect(service.getUploadPolicy).toHaveBeenCalledWith(
        mockUser.sub,
        uploadPolicyDto.filename,
        uploadPolicyDto.mimetype,
        undefined,
      );
    });

    it('应该处理不同文件类型的上传策略', async () => {
      const mockUser = { sub: 2, role: 'USER' };
      const uploadPolicyDto: UploadPolicyDto = {
        filename: 'audio.mp3',
        mimetype: 'audio/mpeg',
        filesize: 1024 * 1024 * 10, // 10MB
      };
      const expectedResult = {
        uploadUrl: 'https://ftp.example.com/upload',
        token: 'upload-token-audio',
        key: 'user-2/audio.mp3',
        expire: 3600,
      };

      mockFilesService.getUploadPolicy.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUploadPolicy(req as any, uploadPolicyDto);

      expect(result).toEqual(expectedResult);
      expect(service.getUploadPolicy).toHaveBeenCalledWith(
        mockUser.sub,
        uploadPolicyDto.filename,
        uploadPolicyDto.mimetype,
        uploadPolicyDto.filesize,
      );
    });
  });

  describe('getUserFiles', () => {
    it('应该成功获取用户文件列表（默认 limit）', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const expectedResult = [
        {
          id: 1,
          filename: 'test.pdf',
          mimetype: 'application/pdf',
          filesize: 1024 * 1024 * 5,
          url: 'https://ftp.example.com/user-1/test.pdf',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 2,
          filename: 'image.jpg',
          mimetype: 'image/jpeg',
          filesize: 1024 * 500,
          url: 'https://ftp.example.com/user-1/image.jpg',
          createdAt: new Date('2024-01-16'),
        },
      ];

      mockFilesService.getUserFiles.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUserFiles(req as any);

      expect(result).toEqual(expectedResult);
      expect(service.getUserFiles).toHaveBeenCalledWith(mockUser.sub, 50);
    });

    it('应该支持自定义 limit 参数', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const limit = 100;
      const expectedResult = [
        { id: 1, filename: 'file1.pdf' },
        { id: 2, filename: 'file2.pdf' },
      ];

      mockFilesService.getUserFiles.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUserFiles(req as any, limit);

      expect(result).toEqual(expectedResult);
      expect(service.getUserFiles).toHaveBeenCalledWith(mockUser.sub, 100);
    });

    it('应该返回空的文件列表', async () => {
      const mockUser = { sub: 999, role: 'USER' };
      const expectedResult: any[] = [];

      mockFilesService.getUserFiles.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUserFiles(req as any);

      expect(result).toEqual(expectedResult);
      expect(service.getUserFiles).toHaveBeenCalledWith(mockUser.sub, 50);
    });

    it('应该返回按类型过滤的文件列表', async () => {
      const mockUser = { sub: 1, role: 'USER' };
      const expectedResult = [
        {
          id: 1,
          filename: 'doc1.pdf',
          mimetype: 'application/pdf',
          filesize: 1024 * 1024 * 2,
          url: 'https://ftp.example.com/user-1/doc1.pdf',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 3,
          filename: 'doc2.pdf',
          mimetype: 'application/pdf',
          filesize: 1024 * 1024 * 3,
          url: 'https://ftp.example.com/user-1/doc2.pdf',
          createdAt: new Date('2024-01-17'),
        },
      ];

      mockFilesService.getUserFiles.mockResolvedValue(expectedResult);

      const req = { user: mockUser };
      const result = await controller.getUserFiles(req as any);

      expect(result).toEqual(expectedResult);
      expect(service.getUserFiles).toHaveBeenCalledWith(mockUser.sub, 50);
    });
  });
});
