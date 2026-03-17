import '@testing-library/jest-dom';
import { vi } from 'vitest';

// BUG-TEST-002 修复：全局 Mock AuthContext
// 为所有使用 useAuth 的组件测试提供默认的 AuthProvider wrapper

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: function(key) {
    return this.store[key] || null;
  },
  setItem: function(key, value) {
    this.store[key] = value.toString();
  },
  removeItem: function(key) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  }
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 测试模式下自动 bypass 验证码
process.env.TEST_MODE = 'true';

// 创建 mock auth context
export const mockAuthContext = {
  user: null,
  loading: false,
  login: { 
    sendCode: vi.fn(() => Promise.resolve()), 
    verify: vi.fn(() => Promise.resolve()) 
  },
  register: { 
    sendCode: vi.fn(() => Promise.resolve()), 
    verify: vi.fn(() => Promise.resolve()) 
  },
  logout: vi.fn(),
  refreshToken: vi.fn(() => Promise.resolve())
};

// 全局 Mock API 模块
vi.mock('../src/services/api', () => ({
  default: {
    defaults: {
      headers: {
        common: {
          Authorization: ''
        }
      }
    },
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  },
  authAPI: {
    sendCode: vi.fn(() => Promise.resolve({ data: {} })),
    login: vi.fn(() => Promise.resolve({ data: {} })),
    register: vi.fn(() => Promise.resolve({ data: {} }))
  },
  progressAPI: {
    getStats: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  },
  knowledgeAPI: {
    getList: vi.fn(() => Promise.resolve({ data: { data: [] } }))
  },
  aiAPI: {
    chat: vi.fn(() => Promise.resolve({ data: {} })),
    ask: vi.fn(() => Promise.resolve({ data: {} })),
    getHistory: vi.fn(() => Promise.resolve({ data: { records: [] } }))
  }
}));
