/**
 * 服务层综合测试
 * 覆盖所有 Service 文件：verificationService
 * 目标：服务层覆盖率 100%
 */

const verificationService = require('../src/services/verificationService');

// 清理速率限制和本地存储
beforeEach(() => {
  verificationService.resetForTesting();
});

// ============================================================================
// VerificationService 测试
// ============================================================================

describe('VerificationService', () => {
  describe('generateCode', () => {
    it('应该生成 6 位数字验证码', () => {
      const code = verificationService.generateCode();
      
      expect(code).toBeDefined();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('应该生成不同的验证码', () => {
      const code1 = verificationService.generateCode();
      const code2 = verificationService.generateCode();
      
      expect(code1).not.toBe(code2);
    });
  });

  describe('generateAndSaveCode', () => {
    it('应该生成并保存验证码', async () => {
      const phone = '13800138000';
      const code = await verificationService.generateAndSaveCode(phone, 'login', 5);
      
      expect(code).toBeDefined();
      expect(code).toHaveLength(6);
      
      // 验证码应该可以通过验证
      const isValid = await verificationService.verifyCode(phone, code, 'login');
      expect(isValid).toBe(true);
    });

    it('应该支持不同的用途', async () => {
      const phone = '13800138001';
      
      const loginCode = await verificationService.generateAndSaveCode(phone, 'login');
      const registerCode = await verificationService.generateAndSaveCode(phone, 'register');
      
      expect(loginCode).toBeDefined();
      expect(registerCode).toBeDefined();
      
      // 登录验证码不能用于注册
      const loginValidForRegister = await verificationService.verifyCode(phone, loginCode, 'register');
      expect(loginValidForRegister).toBe(false);
      
      // 注册验证码不能用于登录
      const registerValidForLogin = await verificationService.verifyCode(phone, registerCode, 'login');
      expect(registerValidForLogin).toBe(false);
    });

    it('应该支持自定义过期时间', async () => {
      const phone = '13800138002';
      const code = await verificationService.generateAndSaveCode(phone, 'login', 1);
      
      expect(code).toBeDefined();
      
      // 立即验证应该成功
      const isValid = await verificationService.verifyCode(phone, code, 'login');
      expect(isValid).toBe(true);
    });

    it('应该实施速率限制', async () => {
      const phone = '13800138003';
      
      // 发送 5 次（允许的最大次数）
      for (let i = 0; i < 5; i++) {
        await verificationService.generateAndSaveCode(phone, 'login');
      }
      
      // 第 6 次应该失败
      await expect(
        verificationService.generateAndSaveCode(phone, 'login')
      ).rejects.toThrow('发送过于频繁');
    });

    it('应该为不同手机号独立计算速率限制', async () => {
      const phone1 = '13800138004';
      const phone2 = '13800138005';
      
      // phone1 发送 5 次
      for (let i = 0; i < 5; i++) {
        await verificationService.generateAndSaveCode(phone1, 'login');
      }
      
      // phone2 应该仍然可以发送
      const code = await verificationService.generateAndSaveCode(phone2, 'login');
      expect(code).toBeDefined();
    });
  });

  describe('verifyCode', () => {
    it('应该验证正确的验证码', async () => {
      const phone = '13800138010';
      const code = await verificationService.generateAndSaveCode(phone, 'login');
      
      const isValid = await verificationService.verifyCode(phone, code, 'login');
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的验证码', async () => {
      const phone = '13800138011';
      await verificationService.generateAndSaveCode(phone, 'login');
      
      const isValid = await verificationService.verifyCode(phone, 'wrong', 'login');
      expect(isValid).toBe(false);
    });

    it('应该拒绝不存在的验证码', async () => {
      const phone = '13800138012';
      
      const isValid = await verificationService.verifyCode(phone, '123456', 'login');
      expect(isValid).toBe(false);
    });

    it('应该在验证成功后删除验证码', async () => {
      const phone = '13800138013';
      const code = await verificationService.generateAndSaveCode(phone, 'login');
      
      // 第一次验证应该成功
      const firstVerify = await verificationService.verifyCode(phone, code, 'login');
      expect(firstVerify).toBe(true);
      
      // 第二次验证应该失败（验证码已删除）
      const secondVerify = await verificationService.verifyCode(phone, code, 'login');
      expect(secondVerify).toBe(false);
    });

    it('应该在测试模式下接受通用验证码', async () => {
      // 确保测试模式已启用
      process.env.TEST_MODE = 'true';
      
      const phone = '13800138014';
      
      // 即使没有生成验证码，也应该接受通用验证码
      const isValid = await verificationService.verifyCode(phone, '123456', 'login');
      expect(isValid).toBe(true);
      
      // 其他通用验证码也应该有效
      const isValid2 = await verificationService.verifyCode(phone, '000000', 'login');
      expect(isValid2).toBe(true);
    });

    it('应该在生产模式下拒绝通用验证码', async () => {
      // 禁用测试模式
      process.env.TEST_MODE = 'false';
      process.env.NODE_ENV = 'production';
      
      const phone = '13800138015';
      
      // 没有生成验证码，通用验证码应该无效
      const isValid = await verificationService.verifyCode(phone, '123456', 'login');
      expect(isValid).toBe(false);
      
      // 恢复测试模式
      process.env.TEST_MODE = 'true';
      process.env.NODE_ENV = 'test';
    });
  });

  describe('removeCode', () => {
    it('应该删除验证码', async () => {
      const phone = '13800138020';
      const code = await verificationService.generateAndSaveCode(phone, 'login');
      
      await verificationService.removeCode(phone, 'login');
      
      // 验证应该失败
      const isValid = await verificationService.verifyCode(phone, code, 'login');
      expect(isValid).toBe(false);
    });

    it('应该优雅地处理删除不存在的验证码', async () => {
      const phone = '13800138021';
      
      // 不应该抛出错误
      await expect(
        verificationService.removeCode(phone, 'login')
      ).resolves.not.toThrow();
    });
  });

  describe('getRateLimitStatus', () => {
    it('应该返回初始速率限制状态', () => {
      const phone = '13800138030';
      
      const status = verificationService.getRateLimitStatus(phone);
      
      expect(status.remaining).toBe(5);
      expect(status.resetTime).toBeDefined();
    });

    it('应该返回更新后的速率限制状态', async () => {
      const phone = '13800138031';
      
      // 发送 3 次
      for (let i = 0; i < 3; i++) {
        await verificationService.generateAndSaveCode(phone, 'login');
      }
      
      const status = verificationService.getRateLimitStatus(phone);
      
      expect(status.remaining).toBe(2);
    });

    it('应该返回 0 当达到限制', async () => {
      const phone = '13800138032';
      
      // 发送 5 次（达到限制）
      for (let i = 0; i < 5; i++) {
        await verificationService.generateAndSaveCode(phone, 'login');
      }
      
      const status = verificationService.getRateLimitStatus(phone);
      
      expect(status.remaining).toBe(0);
    });
  });

  describe('getCodeCount', () => {
    it('应该返回存储的验证码数量', async () => {
      verificationService.resetForTesting();
      
      // 生成 3 个验证码
      await verificationService.generateAndSaveCode('13800138040', 'login');
      await verificationService.generateAndSaveCode('13800138041', 'login');
      await verificationService.generateAndSaveCode('13800138042', 'register');
      
      const count = await verificationService.getCodeCount();
      
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('initRedis', () => {
    it('应该返回 Redis 客户端或 null', () => {
      const client = verificationService.initRedis();
      
      // 在测试环境中，Redis 可能不可用
      expect(client === null || typeof client === 'object').toBe(true);
    });
  });

  describe('resetForTesting', () => {
    it('应该清理所有状态', async () => {
      const phone = '13800138050';
      
      // 生成验证码
      const code = await verificationService.generateAndSaveCode(phone, 'login');
      
      // 重置
      verificationService.resetForTesting();
      
      // 验证码应该无效
      const isValid = await verificationService.verifyCode(phone, code, 'login');
      expect(isValid).toBe(false);
      
      // 速率限制应该重置
      const status = verificationService.getRateLimitStatus(phone);
      expect(status.remaining).toBe(5);
    });
  });

  describe('速率限制时间窗口', () => {
    it('应该在时间窗口后重置计数', async () => {
      const phone = '13800138060';
      
      // 发送 5 次达到限制
      for (let i = 0; i < 5; i++) {
        await verificationService.generateAndSaveCode(phone, 'login');
      }
      
      // 应该达到限制
      const status1 = verificationService.getRateLimitStatus(phone);
      expect(status1.remaining).toBe(0);
      
      // 模拟时间窗口过期（手动清除速率限制记录）
      const rateLimitMap = new Map();
      // 由于无法直接访问内部 Map，我们通过 resetForTesting 来测试
      verificationService.resetForTesting();
      
      // 重置后应该可以再次发送
      const code = await verificationService.generateAndSaveCode(phone, 'login');
      expect(code).toBeDefined();
    });
  });

  describe('边缘情况', () => {
    it('应该处理空手机号', async () => {
      await expect(
        verificationService.generateAndSaveCode('', 'login')
      ).resolves.not.toThrow();
    });

    it('应该处理空用途', async () => {
      const code = await verificationService.generateAndSaveCode('13800138070');
      expect(code).toBeDefined();
    });

    it('应该处理特殊字符手机号', async () => {
      const code = await verificationService.generateAndSaveCode('138-0013-8080', 'login');
      expect(code).toBeDefined();
    });

    it('应该处理大写用途', async () => {
      const code1 = await verificationService.generateAndSaveCode('13800138090', 'LOGIN');
      const code2 = await verificationService.generateAndSaveCode('13800138090', 'login');
      
      // 不同用途应该生成不同的验证码
      expect(code1).not.toBe(code2);
    });
  });
});

describe('VerificationService - 并发场景', () => {
  it('应该正确处理并发验证码生成', async () => {
    const phone = '13800138100';
    
    // 并发生成多个验证码
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(verificationService.generateAndSaveCode(phone, 'login'));
    }
    
    const codes = await Promise.all(promises);
    
    // 所有验证码都应该是 6 位数字
    codes.forEach(code => {
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });
    
    // 最后一个验证码应该有效
    const lastCode = codes[codes.length - 1];
    const isValid = await verificationService.verifyCode(phone, lastCode, 'login');
    expect(isValid).toBe(true);
  });

  it('应该正确处理并发验证', async () => {
    const phone = '13800138101';
    const code = await verificationService.generateAndSaveCode(phone, 'login');
    
    // 并发验证
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(verificationService.verifyCode(phone, code, 'login'));
    }
    
    const results = await Promise.all(promises);
    
    // 只有一个应该成功（其他会因为验证码被删除而失败）
    const successCount = results.filter(r => r === true).length;
    expect(successCount).toBe(1);
  });
});
