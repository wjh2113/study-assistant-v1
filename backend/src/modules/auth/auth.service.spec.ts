import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from './dto/auth.dto';

// 清理验证码存储
const clearVerificationCodes = () => {
  const verificationCodes = new Map<string, { code: string; expiresAt: number }>();
  return verificationCodes;
};

describe('AuthService - 验证码功能测试', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUsersService = {
    findByPhone: jest.fn(),
    createByPhone: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // 清理验证码存储
    clearVerificationCodes();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendCode - 发送验证码', () => {
    it('应该成功发送验证码给有效的手机号', async () => {
      const phone = '13812345678';
      const result = await authService.sendCode(phone);

      expect(result).toEqual({ message: '验证码已发送' });
    });

    it('应该拒绝无效的手机号格式 - 位数不足', async () => {
      const phone = '1381234567';
      
      await expect(authService.sendCode(phone)).rejects.toThrow(BadRequestException);
      await expect(authService.sendCode(phone)).rejects.toThrow('手机号格式不正确');
    });

    it('应该拒绝无效的手机号格式 - 位数过多', async () => {
      const phone = '138123456789';
      
      await expect(authService.sendCode(phone)).rejects.toThrow(BadRequestException);
      await expect(authService.sendCode(phone)).rejects.toThrow('手机号格式不正确');
    });

    it('应该拒绝无效的手机号格式 - 开头不正确', async () => {
      const phone = '12812345678';
      
      await expect(authService.sendCode(phone)).rejects.toThrow(BadRequestException);
      await expect(authService.sendCode(phone)).rejects.toThrow('手机号格式不正确');
    });

    it('应该接受所有有效的手机号段', async () => {
      const validPhones = [
        '13812345678',
        '13912345678',
        '15012345678',
        '15112345678',
        '15212345678',
        '15312345678',
        '15512345678',
        '15612345678',
        '15712345678',
        '15812345678',
        '15912345678',
        '17612345678',
        '17712345678',
        '17812345678',
        '18012345678',
        '18112345678',
        '18212345678',
        '18312345678',
        '18412345678',
        '18512345678',
        '18612345678',
        '18712345678',
        '18812345678',
        '18912345678',
      ];

      for (const phone of validPhones) {
        const result = await authService.sendCode(phone);
        expect(result).toEqual({ message: '验证码已发送' });
      }
    });
  });

  describe('verifyCode - 验证码验证', () => {
    it('验证码生成后应该可以立即验证', async () => {
      const phone = '13812345678';
      const code = '123456';

      // 先发送验证码
      await authService.sendCode(phone);

      // 验证码应该有效（内部方法，通过 phoneLogin 间接测试）
      mockUsersService.findByPhone.mockResolvedValue({
        id: 1,
        phone,
        username: 'testuser',
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      const result = await authService.phoneLogin({
        phone,
        code,
      });

      expect(result.access_token).toBe('access_token_mock');
      expect(result.refresh_token).toBe('refresh_token_mock');
      expect(result.user.phone).toBe(phone);
    });

    it('应该拒绝错误的验证码', async () => {
      const phone = '13812345678';
      const wrongCode = '654321';

      // 先发送验证码
      await authService.sendCode(phone);

      mockUsersService.findByPhone.mockResolvedValue(null);

      await expect(
        authService.phoneLogin({ phone, code: wrongCode }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.phoneLogin({ phone, code: wrongCode }),
      ).rejects.toThrow('验证码错误或已过期');
    });

    it('应该拒绝未发送验证码的手机号', async () => {
      const phone = '13812345678';
      const code = '123456';

      mockUsersService.findByPhone.mockResolvedValue(null);

      await expect(
        authService.phoneLogin({ phone, code }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('验证码过期后应该失效', async () => {
      const phone = '13812345678';
      const code = '123456';

      // 先发送验证码
      await authService.sendCode(phone);

      // 模拟时间流逝，让验证码过期
      jest.useFakeTimers();
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 分钟后

      mockUsersService.findByPhone.mockResolvedValue(null);

      await expect(
        authService.phoneLogin({ phone, code }),
      ).rejects.toThrow(UnauthorizedException);

      jest.useRealTimers();
    });

    it('验证码使用一次后应该失效', async () => {
      const phone = '13812345678';
      const code = '123456';

      // 先发送验证码
      await authService.sendCode(phone);

      mockUsersService.findByPhone.mockResolvedValue({
        id: 1,
        phone,
        username: 'testuser',
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      // 第一次登录应该成功
      const result1 = await authService.phoneLogin({ phone, code });
      expect(result1.access_token).toBe('access_token_mock');

      // 第二次使用同一验证码应该失败
      mockUsersService.findByPhone.mockResolvedValue({
        id: 1,
        phone,
        username: 'testuser',
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.phoneLogin({ phone, code }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('phoneLogin - 手机号登录', () => {
    it('老用户应该可以成功登录', async () => {
      const phone = '13812345678';
      const code = '123456';

      await authService.sendCode(phone);

      mockUsersService.findByPhone.mockResolvedValue({
        id: 1,
        phone,
        username: 'existinguser',
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      const result = await authService.phoneLogin({ phone, code });

      expect(result.access_token).toBe('access_token_mock');
      expect(result.user.phone).toBe(phone);
      expect(result.user.username).toBe('existinguser');
    });

    it('新用户登录时应该自动创建账户', async () => {
      const phone = '13912345678';
      const code = '123456';

      await authService.sendCode(phone);

      mockUsersService.findByPhone.mockResolvedValueOnce(null);
      mockUsersService.createByPhone.mockResolvedValue({
        id: 2,
        phone,
        username: '',
        role: 'STUDENT',
        grade: 1,
        email: '',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      const result = await authService.phoneLogin({ phone, code });

      expect(mockUsersService.createByPhone).toHaveBeenCalledWith(phone);
      expect(result.access_token).toBe('access_token_mock');
      expect(result.user.phone).toBe(phone);
      expect(result.user.role).toBe('STUDENT');
    });
  });

  describe('rateLimiting - 速率限制（基础测试）', () => {
    it('应该允许同一手机号多次发送验证码（当前实现无限制）', async () => {
      const phone = '13812345678';

      // 连续发送 3 次
      const result1 = await authService.sendCode(phone);
      const result2 = await authService.sendCode(phone);
      const result3 = await authService.sendCode(phone);

      expect(result1).toEqual({ message: '验证码已发送' });
      expect(result2).toEqual({ message: '验证码已发送' });
      expect(result3).toEqual({ message: '验证码已发送' });
    });

    it('最后一次发送的验证码应该覆盖之前的', async () => {
      const phone = '13812345678';
      const code = '123456';

      // 发送两次验证码
      await authService.sendCode(phone);
      await authService.sendCode(phone);

      mockUsersService.findByPhone.mockResolvedValue({
        id: 1,
        phone,
        username: 'testuser',
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      // 使用验证码登录应该成功（最后一次发送的有效）
      const result = await authService.phoneLogin({ phone, code });
      expect(result.access_token).toBe('access_token_mock');
    });
  });

  describe('refreshToken - 刷新 Token', () => {
    it('应该成功刷新有效的 refresh token', async () => {
      const mockPayload = {
        phone: '13812345678',
        sub: 1,
        role: 'STUDENT',
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockJwtService.sign.mockReturnValue('new_access_token');

      const result = await authService.refreshToken('valid_refresh_token');

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid_refresh_token');
      expect(result.access_token).toBe('new_access_token');
    });

    it('应该拒绝无效的 refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register - 注册功能', () => {
    it('应该成功注册新用户', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: UserRole.STUDENT,
        grade: 5,
      };

      mockUsersService.create.mockResolvedValue({
        id: 1,
        ...registerDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      const result = await authService.register(registerDto);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'STUDENT',
        grade: 5,
      });
      expect(result.access_token).toBe('access_token_mock');
      expect(result.user.username).toBe('newuser');
    });
  });

  describe('login - 用户名密码登录', () => {
    it('应该成功登录（正确密码）', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      mockUsersService.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: '$2b$10$hashedpassword', // bcrypt hash
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
      });

      // Mock bcrypt.compare
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true),
      }));

      mockJwtService.sign
        .mockReturnValueOnce('access_token_mock')
        .mockReturnValueOnce('refresh_token_mock');

      const result = await authService.login(loginDto);

      expect(result.access_token).toBe('access_token_mock');
      expect(result.user.username).toBe('testuser');
    });

    it('应该拒绝错误密码', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockUsersService.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: '$2b$10$hashedpassword',
        role: 'STUDENT',
        grade: 5,
        email: 'test@example.com',
      });

      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(false),
      }));

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
