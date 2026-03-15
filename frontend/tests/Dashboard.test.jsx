import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../src/pages/Dashboard.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';

// BUG-002 修复：添加 AuthProvider wrapper

vi.mock('../src/services/api', () => ({
  progressAPI: {
    getStats: vi.fn()
  },
  knowledgeAPI: {
    getList: vi.fn()
  }
}));

// BUG-002 修复：使用 AuthProvider wrapper
const renderWithAuth = (component, authValue = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={{
        user: authValue.user || { username: '测试用户' },
        loading: false,
        login: { sendCode: vi.fn(), verify: vi.fn() },
        register: { sendCode: vi.fn(), verify: vi.fn() },
        logout: vi.fn(),
        refreshToken: vi.fn(),
        ...authValue
      }}>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染 Dashboard 页面', () => {
    const { progressAPI } = require('../src/services/api');
    progressAPI.getStats.mockResolvedValue({
      totalLearned: 10,
      totalTimeMinutes: 300,
      bySubject: { '数学': 5, '英语': 3 }
    });

    renderWithAuth(<Dashboard />);
    
    expect(screen.getByText(/学习概览/i)).toBeInTheDocument();
  });

  it('应该显示学习统计数据', async () => {
    const { progressAPI } = await import('../src/services/api');
    progressAPI.getStats.mockResolvedValue({
      totalLearned: 15,
      totalTimeMinutes: 450,
      bySubject: { '数学': 8, '英语': 5, '物理': 2 }
    });

    renderWithAuth(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/15/)).toBeInTheDocument();
      expect(screen.getByText(/450/)).toBeInTheDocument();
    });
  });

  it('应该显示各科目学习情况', async () => {
    const { progressAPI } = await import('../src/services/api');
    progressAPI.getStats.mockResolvedValue({
      totalLearned: 10,
      totalTimeMinutes: 300,
      bySubject: { '数学': 5, '英语': 3, '物理': 2 }
    });

    renderWithAuth(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/数学/i)).toBeInTheDocument();
      expect(screen.getByText(/英语/i)).toBeInTheDocument();
    });
  });

  it('应该处理空数据情况', async () => {
    const { progressAPI } = await import('../src/services/api');
    progressAPI.getStats.mockResolvedValue({
      totalLearned: 0,
      totalTimeMinutes: 0,
      bySubject: {}
    });

    renderWithAuth(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });
  });

  it('应该处理加载错误', async () => {
    const { progressAPI } = await import('../src/services/api');
    progressAPI.getStats.mockRejectedValue(new Error('网络错误'));

    renderWithAuth(<Dashboard />);

    await waitFor(() => {
      // 应该显示错误状态或空状态
      expect(screen.getByText(/学习概览/i)).toBeInTheDocument();
    });
  });
});
