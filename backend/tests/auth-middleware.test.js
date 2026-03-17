/**
 * Auth Middleware Tests
 * JWT 认证中间件测试
 *
 * 测试覆盖：
 * - 有效 token 验证
 * - 无效 token 处理
 * - token 过期处理
 * - token 篡改检测
 * - 用户信息加载
 * - 边界场景测试
 */

const jwt = require('jsonwebtoken');
const authMiddleware = require('../src/middleware/auth');
const UserModel = require('../src/models/User');

// Mock UserModel
jest.mock('../src/models/User', () => ({
  getById: jest.fn()
}));

describe('Auth Middleware Tests', () => {
  const originalEnv = process.env;
  const testUserId = 'test-user-id-123';
  const testUser = {
    id: testUserId,
    phone: '13800138000',
    role: 'STUDENT',
    nickname: '测试用户'
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';

    // 清空 mock
    UserModel.getById.mockClear();
    UserModel.getById.mockReturnValue(testUser);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // 有效 Token 测试
  // ============================================================================

  describe('有效 Token 测试', () => {
    it('有效 token 应该通过验证并添加 req.user', () => {
      const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUserId);
      expect(req.user.sub).toBe(testUserId);
      expect(req.user.userId).toBe(testUserId);
    });

    it('应该支持 userId 字段', () => {
      const token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.sub).toBe(testUserId);
      expect(req.user.userId).toBe(testUserId);
    });

    it('应该优先使用 sub 字段', () => {
      const token = jwt.sign({
        sub: testUserId,
        userId: 'different-id'
      }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.sub).toBe(testUserId);
      expect(req.user.userId).toBe(testUserId);
    });

    it('应该加载用户信息', () => {
      const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(UserModel.getById).toHaveBeenCalledWith(testUserId);
      expect(req.user).toEqual(testUser);
    });
  });

  // ============================================================================
  // 缺失 Token 测试
  // ============================================================================

  describe('缺失 Token 测试', () => {
    it('Authorization header 缺失应该返回 401', () => {
      const req = {
        headers: {}
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '未授权，请登录后重试'
      });
    });

    it('空 Authorization header 应该返回 401', () => {
      const req = {
        headers: {
          authorization: ''
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('非 Bearer 格式 token 应该返回 401', () => {
      const req = {
        headers: {
          authorization: 'invalid-token'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('Basic 认证应该返回 401', () => {
      const req = {
        headers: {
          authorization: 'Basic dXNlcjpwYXNz'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('Bearer 后没有 token 应该返回 401', () => {
      const req = {
        headers: {
          authorization: 'Bearer '
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '未授权，请登录后重试'
      });
    });

    it('Bearer 后只有空格应该返回 401', () => {
      const req = {
        headers: {
          authorization: 'Bearer    '
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '未授权，请登录后重试'
      });
    });
  });

  // ============================================================================
  // Token 过期测试
  // ============================================================================

  describe('Token 过期测试', () => {
    it('过期 token 应该返回 401', () => {
      // 创建过期 token
      const token = jwt.sign(
        { sub: testUserId },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 1 小时前过期
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '登录已过期，请重新登录'
      });
    });
  });

  // ============================================================================
  // Token 无效测试
  // ============================================================================

  describe('Token 无效测试', () => {
    it('无效 token 应该返回 401', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid_token'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '无效的令牌'
      });
    });

    it('签名错误的 token 应该返回 401', () => {
      // 使用错误的密钥签名
      const fakeToken = jwt.sign(
        { sub: testUserId },
        'wrong-secret'
      );

      const req = {
        headers: {
          authorization: `Bearer ${fakeToken}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('被篡改的 token 应该返回 401', () => {
      const validToken = jwt.sign(
        { sub: testUserId },
        process.env.JWT_SECRET
      );

      // 篡改 token
      const parts = validToken.split('.');
      const tamperedToken = parts[0] + '.' + parts[1] + '.tampered';

      const req = {
        headers: {
          authorization: `Bearer ${tamperedToken}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ============================================================================
  // 用户不存在测试
  // ============================================================================

  describe('用户不存在测试', () => {
    it('用户不存在应该返回 401', () => {
      UserModel.getById.mockReturnValue(null);

      const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '用户不存在'
      });
    });
  });

  // ============================================================================
  // Token 格式测试
  // ============================================================================

  describe('Token 格式测试', () => {
    it('缺少 sub 和 userId 的 token 应该返回 401', () => {
      const token = jwt.sign({ other: 'value' }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: '无效的令牌：缺少用户标识'
      });
    });

    it('sub 为空的 token 应该返回 401', () => {
      const token = jwt.sign({ sub: '' }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('userId 为 null 的 token 应该返回 401', () => {
      const token = jwt.sign({ userId: null }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ============================================================================
  // 边界场景测试
  // ============================================================================

  describe('边界场景测试', () => {
    it('Bearer 后多余空格应该被处理', () => {
      const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer   ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      // 应该能正确解析 token
      expect(next).toHaveBeenCalled();
    });

    it('token 末尾空格应该被处理', () => {
      const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token} `
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      // JWT verify 应该能处理
      expect(next).toHaveBeenCalled();
    });

    it('大 payload token 应该被处理', () => {
      const largePayload = 'a'.repeat(1000);
      const token = jwt.sign({
        sub: testUserId,
        extra: largePayload
      }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 安全测试
  // ============================================================================

  describe('安全测试', () => {
    it('空值 token 应该被拒绝', () => {
      const maliciousToken = 'null';

      const req = {
        headers: {
          authorization: `Bearer ${maliciousToken}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('undefined token 应该被拒绝', () => {
      const req = {
        headers: {
          authorization: 'Bearer undefined'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('对象 token 应该被拒绝', () => {
      const req = {
        headers: {
          authorization: 'Bearer {}'
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ============================================================================
  // 角色测试
  // ============================================================================

  describe('角色测试', () => {
    it('应该保留用户角色信息', () => {
      const studentUser = {
        id: testUserId,
        phone: '13800138000',
        role: 'STUDENT',
        nickname: '测试学生'
      };

      UserModel.getById.mockReturnValue(studentUser);

      const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(req.user.role).toBe('STUDENT');
    });

    it('应该支持所有角色类型', () => {
      const roles = ['STUDENT', 'PARENT', 'TEACHER', 'ADMIN'];

      roles.forEach(role => {
        UserModel.getById.mockReturnValue({
          id: testUserId,
          phone: '13800138000',
          role: role,
          nickname: `${role}用户`
        });

        const token = jwt.sign({ sub: testUserId }, process.env.JWT_SECRET);

        const req = {
          headers: {
            authorization: `Bearer ${token}`
          }
        };

        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(req.user.role).toBe(role);
      });
    });
  });
});
