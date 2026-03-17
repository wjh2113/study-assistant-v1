/**
 * 前端 CDN 配置
 */

export const cdnConfig = {
  // 是否启用 CDN
  enabled: import.meta.env.VITE_CDN_ENABLED === 'true',
  
  // CDN 基础 URL
  baseUrl: import.meta.env.VITE_CDN_URL || 'https://cdn.example.com',
  
  // 资源版本控制
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // 缓存策略
  cache: {
    // 静态资源缓存时间
    maxAge: 31536000, // 1 年
    // 是否使用 immutable
    immutable: true
  }
};

/**
 * 获取资源 URL (带 CDN 和版本控制)
 * @param {string} path - 资源路径
 * @returns {string} 完整资源 URL
 */
export function getAssetUrl(path) {
  if (!cdnConfig.enabled) {
    return path;
  }
  
  // 添加版本参数防止缓存
  const separator = path.includes('?') ? '&' : '?';
  return `${cdnConfig.baseUrl}${path}${separator}v=${cdnConfig.version}`;
}

/**
 * 预加载关键资源
 * @param {Array<string>} resources - 资源 URL 列表
 */
export function preloadResources(resources) {
  if (typeof document === 'undefined') return;
  
  for (const resource of resources) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = getPreloadAs(resource);
    link.href = getAssetUrl(resource);
    
    if (resource.endsWith('.woff2') || resource.endsWith('.woff')) {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }
}

/**
 * 获取资源的 preload 类型
 */
function getPreloadAs(path) {
  if (path.endsWith('.js')) return 'script';
  if (path.endsWith('.css')) return 'style';
  if (path.endsWith('.woff2') || path.endsWith('.woff')) return 'font';
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(path)) return 'image';
  return 'fetch';
}

/**
 * 懒加载图片
 * @param {HTMLImageElement} img - 图片元素
 * @param {string} src - 图片源
 */
export function lazyLoadImage(img, src) {
  if ('loading' in img) {
    img.loading = 'lazy';
  }
  img.src = getAssetUrl(src);
}

export default cdnConfig;
