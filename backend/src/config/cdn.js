/**
 * CDN 配置文件
 * 支持多种 CDN 服务商
 */

// CDN 配置
const cdnConfig = {
  // 是否启用 CDN
  enabled: process.env.CDN_ENABLED === 'true',
  
  // CDN 基础 URL
  baseUrl: process.env.CDN_URL || 'https://cdn.example.com',
  
  // CDN 服务商类型
  provider: process.env.CDN_PROVIDER || 'generic',
  
  // 静态资源路径映射
  paths: {
    images: '/static/images',
    js: '/static/js',
    css: '/static/css',
    fonts: '/static/fonts',
    uploads: '/uploads'
  },
  
  // 缓存配置
  cache: {
    // 浏览器缓存时间 (秒)
    browserMaxAge: 31536000, // 1 年
    // CDN 缓存时间 (秒)
    cdnMaxAge: 86400, // 1 天
    // 版本化资源 (带 hash 的文件)
    versioned: true
  },
  
  // 服务商特定配置
  providers: {
    // 阿里云 OSS
    aliyun: {
      bucket: process.env.ALIYUN_OSS_BUCKET,
      region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
      endpoint: `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou'}.aliyuncs.com`
    },
    
    // 腾讯云 COS
    tencent: {
      bucket: process.env.TENCENT_COS_BUCKET,
      region: process.env.TENCENT_COS_REGION,
      secretId: process.env.TENCENT_COS_SECRET_ID,
      secretKey: process.env.TENCENT_COS_SECRET_KEY,
      endpoint: `https://${process.env.TENCENT_COS_BUCKET}.cos.${process.env.TENCENT_COS_REGION}.myqcloud.com`
    },
    
    // 七牛云
    qiniu: {
      bucket: process.env.QINIU_BUCKET,
      domain: process.env.QINIU_DOMAIN,
      accessKey: process.env.QINIU_ACCESS_KEY,
      secretKey: process.env.QINIU_SECRET_KEY
    },
    
    // Cloudflare
    cloudflare: {
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      baseUrl: process.env.CLOUDFLARE_CDN_URL
    },
    
    // 通用 CDN (简单 URL 替换)
    generic: {
      baseUrl: process.env.CDN_URL
    }
  }
};

/**
 * 生成 CDN URL
 * @param {string} localPath - 本地路径
 * @returns {string} CDN URL
 */
function getCdnUrl(localPath) {
  if (!cdnConfig.enabled) {
    return localPath;
  }

  // 移除路径中的重复斜杠
  const normalizedPath = localPath.replace(/\/+/g, '/');
  
  // 如果是 uploads 目录
  if (normalizedPath.startsWith('/uploads')) {
    return `${cdnConfig.baseUrl}${normalizedPath}`;
  }
  
  // 如果是静态资源
  for (const [key, prefix] of Object.entries(cdnConfig.paths)) {
    if (normalizedPath.startsWith(prefix)) {
      return `${cdnConfig.baseUrl}${normalizedPath}`;
    }
  }
  
  // 默认返回本地路径
  return localPath;
}

/**
 * 获取资源 URL (带版本控制)
 * @param {string} path - 资源路径
 * @param {string} version - 版本号 (hash)
 * @returns {string} 版本化 CDN URL
 */
function getVersionedAssetUrl(path, version) {
  if (!cdnConfig.enabled || !cdnConfig.cache.versioned) {
    return path;
  }

  // 在文件名前插入版本号
  const extIndex = path.lastIndexOf('.');
  if (extIndex === -1) return path;
  
  const name = path.substring(0, extIndex);
  const ext = path.substring(extIndex);
  
  return `${cdnConfig.baseUrl}${name}.${version}${ext}`;
}

/**
 * 获取 CDN 配置信息
 */
function getCdnInfo() {
  return {
    enabled: cdnConfig.enabled,
    provider: cdnConfig.provider,
    baseUrl: cdnConfig.baseUrl,
    paths: cdnConfig.paths,
    cache: cdnConfig.cache
  };
}

/**
 * 预加载关键资源到 CDN
 * @param {Array<string>} paths - 资源路径列表
 */
async function preloadToCdn(paths) {
  if (!cdnConfig.enabled) {
    console.log('[CDN] CDN 未启用，跳过预加载');
    return;
  }

  console.log(`[CDN] 预加载 ${paths.length} 个资源到 CDN`);
  
  // 根据服务商实现不同的预加载逻辑
  switch (cdnConfig.provider) {
    case 'aliyun':
      // 阿里云 OSS 预加载实现
      break;
    case 'tencent':
      // 腾讯云 COS 预加载实现
      break;
    case 'qiniu':
      // 七牛云预加载实现
      break;
    case 'cloudflare':
      // Cloudflare Purge Cache
      break;
    default:
      console.log('[CDN] 通用 CDN 模式，无需预加载');
  }
}

/**
 * 清除 CDN 缓存
 * @param {Array<string>} paths - 要清除的路径
 */
async function purgeCdnCache(paths) {
  if (!cdnConfig.enabled) {
    return;
  }

  console.log(`[CDN] 清除 ${paths.length} 个路径的 CDN 缓存`);
  
  // 根据服务商实现不同的清除逻辑
  switch (cdnConfig.provider) {
    case 'cloudflare':
      // Cloudflare Purge API
      break;
    default:
      console.log('[CDN] 当前服务商不支持缓存清除');
  }
}

module.exports = {
  cdnConfig,
  getCdnUrl,
  getVersionedAssetUrl,
  getCdnInfo,
  preloadToCdn,
  purgeCdnCache
};
