import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PhoneLoginDto, RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

// 内测固定验证码
const TEST_VERIFICATION_CODE = '123456';

// 验证码存储（内存，生产环境应使用 Redis）
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 发送验证码（内测简化为固定验证码）
   */
  async sendCode(phone: string): Promise<{ message: string }> {
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号格式不正确');
    }

    // 生成验证码（内测使用固定验证码）
    const code = TEST_VERIFICATION_CODE;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟过期

    // 存储验证码
    verificationCodes.set(phone, { code, expiresAt });

    // TODO: 生产环境调用短信服务发送
    console.log(`【复习助手】验证码：${code}，5 分钟内有效`);

    return { message: '验证码已发送' };
  }

  /**
   * 验证验证码
   */
  private verifyCode(phone: string, code: string): boolean {
    const stored = verificationCodes.get(phone);
    
    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(phone);
      return false;
    }

    if (stored.code !== code) {
      return false;
    }

    // 验证成功后删除验证码
    verificationCodes.delete(phone);
    return true;
  }

  /**
   * 手机号验证码登录
   */
  async phoneLogin(loginDto: PhoneLoginDto) {
    const { phone, code } = loginDto;

    // 验证验证码
    if (!this.verifyCode(phone, code)) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 查找或创建用户
    let user = await this.usersService.findByPhone(phone);
    
    if (!user) {
      // 自动创建新用户（学生角色）
      user = await this.usersService.createByPhone(phone);
    }

    // 签发 Token
    const payload = { phone: user.phone, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username || '',
        role: user.role,
        grade: user.grade || 1,
        email: user.email || '',
        avatar: user.avatar || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt || user.createdAt,
      },
    };
  }

  /**
   * 传统用户名密码登录
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { username: user.username, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        grade: user.grade,
      },
    };
  }

  /**
   * 注册
   */
  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
      role: registerDto.role,
      grade: registerDto.grade,
    });

    const payload = { username: user.username, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        grade: user.grade,
      },
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const newPayload = { 
        phone: payload.phone, 
        username: payload.username,
        sub: payload.sub, 
        role: payload.role 
      };
      
      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      
      return {
        access_token: newAccessToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Refresh token 无效');
    }
  }

  /**
   * 验证用户（用户名密码）
   */
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }
}
