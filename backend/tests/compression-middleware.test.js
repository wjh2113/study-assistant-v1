/**
 * Compression Middleware Tests
 * 测试 Gzip 和 Brotli 压缩中间件功能
 */

const { 
  compressionMiddleware, 
  staticCacheMiddleware, 
  cdnProxyMiddleware,
  COMPRESSIBLE_TYPES,
  MIN_COMPRESS_SIZE
} = require('../src/middleware/compression');

// Mock zlib
jest.mock('zlib', () => {
  const EventEmitter = require('events');
  
  class MockCompressionStream extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
    }
    
    end(data) {
      setImmediate(() => {
        this.emit('data', data);
        this.emit('end');
      });
    }
  }
  
  return {
    createBrotliCompress: jest.fn((options) => new MockCompressionStream(options)),
    createGzip: jest.fn((options) => new MockCompressionStream(options)),
    createDeflate: jest.fn(() => new MockCompressionStream()),
    constants: {
      BROTLI_PARAM_MODE: 'mode',
      BROTLI_MODE_TEXT: 'text',
      BROTLI_PARAM_QUALITY: 'quality'
    }
  };
});

const zlib = require('zlib');

describe('Compression Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // 可压缩 MIME 类型测试
  // ============================================================================

  describe('可压缩的 MIME 类型', () => {
    it('应该压缩 text/html 响应', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip, br'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Accept-Encoding');
    });

    it('应该压缩 application/json 响应', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('application/json'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });

    it('应该压缩 text/css 响应', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/css'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      const next = jest.fn();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('应该压缩 application/javascript 响应', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('application/javascript'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });
  });

  // ============================================================================
  // 不可压缩 MIME 类型测试
  // ============================================================================

  describe('不可压缩的 MIME 类型', () => {
    it('应该跳过 image/png 的压缩', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('image/png'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });

    it('应该跳过 image/jpeg 的压缩', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('image/jpeg'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });

    it('应该跳过缺少 Content-Type 的响应', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue(undefined),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });
  });

  // ============================================================================
  // 客户端压缩编码支持测试
  // ============================================================================

  describe('客户端压缩编码支持', () => {
    it('应该优先使用 Brotli 压缩', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'br, gzip, deflate'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(zlib.createBrotliCompress).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'br');
    });

    it('应该在没有 Brotli 时使用 Gzip', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip, deflate'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(zlib.createGzip).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });

    it('应该在前两者都没有时使用 Deflate', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'deflate'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(zlib.createDeflate).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'deflate');
    });

    it('应该在没有支持编码时跳过压缩', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': ''
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });

    it('应该在缺少 accept-encoding 头时跳过压缩', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {}
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Encoding', expect.anything());
    });
  });

  // ============================================================================
  // 静态资源缓存中间件测试
  // ============================================================================

  describe('静态资源缓存中间件', () => {
    it('应该为 JS 文件设置缓存头', () => {
      const middleware = staticCacheMiddleware({ maxAge: 31536000, immutable: true });
      
      const req = {
        path: '/static/app.js',
        headers: {}
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      );
      expect(next).toHaveBeenCalled();
    });

    it('应该为 CSS 文件设置缓存头', () => {
      const middleware = staticCacheMiddleware({ maxAge: 31536000, immutable: true });
      
      const req = {
        path: '/static/style.css',
        headers: {}
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=31536000')
      );
    });

    it('应该为图片文件设置缓存头', () => {
      const middleware = staticCacheMiddleware();
      
      const req = {
        path: '/images/logo.png',
        headers: {}
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('max-age=')
      );
    });

    it('应该为非静态资源跳过缓存', () => {
      const middleware = staticCacheMiddleware();
      
      const req = {
        path: '/api/users',
        headers: {}
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(res.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.anything());
      expect(next).toHaveBeenCalled();
    });

    it('应该设置 ETag 头', () => {
      const middleware = staticCacheMiddleware({ etag: true });
      
      const req = {
        path: '/static/app.js',
        headers: {}
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith('ETag', '"app.js"');
    });

    it('应该处理 If-None-Match 头', () => {
      const middleware = staticCacheMiddleware();
      
      const req = {
        path: '/static/app.js',
        headers: {
          'if-none-match': '"app.js"'
        }
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Status', 'HIT');
    });

    it('应该处理 If-Modified-Since 头', () => {
      const middleware = staticCacheMiddleware();
      
      const req = {
        path: '/static/app.js',
        headers: {
          'if-modified-since': 'Mon, 01 Jan 2024 00:00:00 GMT'
        }
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Status', 'HIT');
    });
  });

  // ============================================================================
  // CDN 代理中间件测试
  // ============================================================================

  describe('CDN 代理中间件', () => {
    it('应该将静态资源重定向到 CDN', () => {
      const middleware = cdnProxyMiddleware('https://cdn.example.com');
      
      const req = {
        path: '/static/app.js'
      };
      
      const res = {
        setHeader: jest.fn(),
        redirect: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-CDN-Redirect',
        'https://cdn.example.com/static/app.js'
      );
      expect(res.redirect).toHaveBeenCalledWith(
        302,
        'https://cdn.example.com/static/app.js'
      );
    });

    it('应该处理 /assets/ 路径', () => {
      const middleware = cdnProxyMiddleware('https://cdn.example.com');
      
      const req = {
        path: '/assets/logo.png'
      };
      
      const res = {
        setHeader: jest.fn(),
        redirect: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.redirect).toHaveBeenCalledWith(
        302,
        'https://cdn.example.com/assets/logo.png'
      );
    });

    it('应该跳过 API 路径', () => {
      const middleware = cdnProxyMiddleware('https://cdn.example.com');
      
      const req = {
        path: '/api/users'
      };
      
      const res = {
        setHeader: jest.fn(),
        redirect: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('应该在没有 CDN URL 时跳过', () => {
      const middleware = cdnProxyMiddleware(null);
      
      const req = {
        path: '/static/app.js'
      };
      
      const res = {
        setHeader: jest.fn(),
        redirect: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 边界测试
  // ============================================================================

  describe('边界测试', () => {
    it('应该处理空的 accept-encoding', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': ''
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('text/html'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('应该处理包含多个 MIME 类型的 Content-Type', () => {
      const middleware = compressionMiddleware();
      
      const req = {
        headers: {
          'accept-encoding': 'gzip'
        }
      };
      
      const res = {
        getHeader: jest.fn().mockReturnValue('application/json; charset=utf-8'),
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };
      
      middleware(req, res, jest.fn());
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    });
  });

  // ============================================================================
  // 常量导出测试
  // ============================================================================

  describe('导出常量', () => {
    it('应该导出可压缩 MIME 类型列表', () => {
      expect(COMPRESSIBLE_TYPES).toBeInstanceOf(Array);
      expect(COMPRESSIBLE_TYPES.length).toBeGreaterThan(0);
      expect(COMPRESSIBLE_TYPES).toContain('text/html');
      expect(COMPRESSIBLE_TYPES).toContain('application/json');
    });

    it('应该导出最小压缩大小', () => {
      expect(MIN_COMPRESS_SIZE).toBe(1024);
    });
  });
});
