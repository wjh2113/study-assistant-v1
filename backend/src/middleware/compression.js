/**
 * 压缩中间件
 * 支持 Gzip 和 Brotli 压缩
 */

const zlib = require('zlib');
const path = require('path');

// 可压缩的 MIME 类型
const COMPRESSIBLE_TYPES = [
  'text/html',
  'text/plain',
  'text/css',
  'text/xml',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'image/svg+xml',
  'application/x-javascript'
];

// 最小压缩大小 (字节)
const MIN_COMPRESS_SIZE = 1024;

/**
 * 检查是否应该压缩响应
 */
function shouldCompress(req, res) {
  const type = res.getHeader('Content-Type');
  
  if (!type || !COMPRESSIBLE_TYPES.some(t => type.includes(t))) {
    return false;
  }
  
  const encoding = req.headers['accept-encoding'];
  if (!encoding) {
    return false;
  }
  
  return true;
}

/**
 * 获取客户端支持的压缩编码
 */
function getEncoding(req) {
  const encoding = req.headers['accept-encoding'];
  if (!encoding) return null;
  
  // 优先使用 Brotli
  if (encoding.includes('br')) {
    return 'br';
  }
  // 其次 Gzip
  if (encoding.includes('gzip')) {
    return 'gzip';
  }
  // 最后 Deflate
  if (encoding.includes('deflate')) {
    return 'deflate';
  }
  
  return null;
}

/**
 * 压缩中间件
 */
function compressionMiddleware() {
  return (req, res, next) => {
    if (!shouldCompress(req, res)) {
      return next();
    }

    const encoding = getEncoding(req);
    if (!encoding) {
      return next();
    }

    // 保存原始方法
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    
    let chunks = [];
    let totalLength = 0;
    let compressed = false;

    // 选择压缩算法
    let compressStream;
    switch (encoding) {
      case 'br':
        compressStream = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: 4
          }
        });
        res.setHeader('Content-Encoding', 'br');
        break;
      case 'gzip':
        compressStream = zlib.createGzip({ level: 6 });
        res.setHeader('Content-Encoding', 'gzip');
        break;
      case 'deflate':
        compressStream = zlib.createDeflate();
        res.setHeader('Content-Encoding', 'deflate');
        break;
      default:
        return next();
    }

    // 拦截 write
    res.write = (chunk, encoding, callback) => {
      if (chunk) {
        if (typeof chunk === 'string') {
          chunk = Buffer.from(chunk, encoding);
        }
        chunks.push(chunk);
        totalLength += chunk.length;
      }
      if (callback) callback();
    };

    // 拦截 end
    res.end = (chunk, encoding, callback) => {
      if (chunk) {
        if (typeof chunk === 'string') {
          chunk = Buffer.from(chunk, encoding);
        }
        chunks.push(chunk);
        totalLength += chunk.length;
      }

      // 如果数据太小，不压缩
      if (totalLength < MIN_COMPRESS_SIZE) {
        res.setHeader('Content-Encoding', 'identity');
        for (const c of chunks) {
          originalWrite(c);
        }
        if (callback) callback();
        return originalEnd();
      }

      compressed = true;
      
      // 压缩数据
      const buffer = Buffer.concat(chunks);
      
      compressStream.on('data', (compressedChunk) => {
        originalWrite(compressedChunk);
      });

      compressStream.on('end', () => {
        if (callback) callback();
        originalEnd();
      });

      compressStream.on('error', (err) => {
        console.error('[Compression] 压缩失败:', err.message);
        // 压缩失败，发送原始数据
        res.setHeader('Content-Encoding', 'identity');
        for (const c of chunks) {
          originalWrite(c);
        }
        if (callback) callback();
        originalEnd();
      });

      compressStream.end(buffer);
    };

    // 添加 Vary 头
    res.setHeader('Vary', 'Accept-Encoding');

    next();
  };
}

/**
 * 静态资源缓存中间件
 * 为静态文件设置合适的缓存头
 */
function staticCacheMiddleware(options = {}) {
  const {
    maxAge = 31536000, // 1 年
    immutable = true,
    etag = true
  } = options;

  return (req, res, next) => {
    // 仅处理静态资源
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
    const url = req.path.toLowerCase();
    
    if (!staticExtensions.some(ext => url.endsWith(ext))) {
      return next();
    }

    // 设置缓存头
    const cacheControl = immutable 
      ? `public, max-age=${maxAge}, immutable`
      : `public, max-age=${maxAge}`;
    
    res.setHeader('Cache-Control', cacheControl);
    
    if (etag) {
      // ETag 将在发送响应时自动设置
      res.setHeader('ETag', `"${path.basename(url)}"`);
    }

    // 如果客户端有缓存，返回 304
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    if (ifNoneMatch || ifModifiedSince) {
      res.setHeader('X-Cache-Status', 'HIT');
    } else {
      res.setHeader('X-Cache-Status', 'MISS');
    }

    next();
  };
}

/**
 * CDN 代理中间件
 * 将静态资源请求代理到 CDN
 */
function cdnProxyMiddleware(cdnUrl) {
  if (!cdnUrl) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    // 仅处理静态资源
    const staticExtensions = ['/static/', '/assets/', '/images/', '/js/', '/css/'];
    const url = req.path.toLowerCase();
    
    if (!staticExtensions.some(prefix => url.startsWith(prefix))) {
      return next();
    }

    // 重定向到 CDN
    const cdnPath = cdnUrl + url;
    res.setHeader('X-CDN-Redirect', cdnPath);
    res.redirect(302, cdnPath);
  };
}

module.exports = {
  compressionMiddleware,
  staticCacheMiddleware,
  cdnProxyMiddleware,
  COMPRESSIBLE_TYPES,
  MIN_COMPRESS_SIZE
};
