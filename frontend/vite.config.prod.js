import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cdnConfig, getVersionedAssetUrl } from './cdn.config.js';

/**
 * 生产环境 Vite 配置
 * 包含 CDN、压缩、缓存优化
 */
export default defineConfig({
  plugins: [react()],
  
  base: cdnConfig.enabled ? cdnConfig.baseUrl + '/static/' : '/static/',
  
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 资源目录
    assetsDir: 'assets',
    
    // 生成源码映射
    sourcemap: process.env.NODE_ENV === 'development',
    
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    },
    
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分割 chunk
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['axios']
        },
        
        // 资源文件名带 hash
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg|webp)$/.test(name ?? '')) {
            return 'images/[name].[hash][extname]';
          }
          if (/\.css$/.test(name ?? '')) {
            return 'css/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        }
      }
    },
    
    // 压缩报告
    reportCompressedSize: true,
    
    // Chunk 大小警告
    chunkSizeWarningLimit: 500,
  },
  
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.test.jsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.jsx', 'src/**/*.js'],
      exclude: ['src/main.jsx', 'node_modules/', 'tests/']
    }
  }
});
