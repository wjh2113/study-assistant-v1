import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIChat from '../src/pages/AIChat.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';

// BUG-TEST-002 修复：添加 AuthProvider wrapper

vi.mock('../src/services/api', () => ({
  aiAPI: {
    ask: vi.fn(),
    getHistory: vi.fn()
  }
}));

// BUG-TEST-002 修复：使用 AuthProvider + AuthContext.Provider wrapper
const renderWithAuth = (component, authValue = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AuthContext.Provider value={{
          user: authValue.user || { username: '测试用户' },
          loading: false,
          login: { sendCode: vi.fn(), verify: vi.fn() },
          register: { sendCode: vi.fn(), verify: vi.fn() },
          logout: vi.fn(),
          refreshToken: vi.fn(),
          ...authValue
        }}>
          {component}
        </AuthContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AIChat Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染 AI 问答页面', () => {
    const { aiAPI } = require('../src/services/api');
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    expect(screen.getByText(/AI 问答/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入你的问题/i)).toBeInTheDocument();
  });

  it('应该显示问答历史', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.getHistory.mockResolvedValue({
      records: [
        { id: 1, question: '什么是勾股定理？', answer: '勾股定理是...', subject: '数学' }
      ]
    });

    renderWithAuth(<AIChat />);

    await waitFor(() => {
      expect(screen.getByText(/什么是勾股定理？/i)).toBeInTheDocument();
    });
  });

  it('应该可以发送问题', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.ask.mockResolvedValue({
      id: 1,
      question: '测试问题',
      answer: '这是答案',
      subject: '数学'
    });
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    const input = screen.getByPlaceholderText(/请输入你的问题/i);
    const sendBtn = screen.getByText(/发送/i);

    fireEvent.change(input, { target: { value: '测试问题' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(aiAPI.ask).toHaveBeenCalledWith('测试问题', expect.any(String));
    });
  });

  it('应该可以按 Enter 发送', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.ask.mockResolvedValue({ id: 1, question: '测试', answer: '答案' });
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    const input = screen.getByPlaceholderText(/请输入你的问题/i);

    fireEvent.change(input, { target: { value: '测试问题' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(aiAPI.ask).toHaveBeenCalled();
    });
  });

  it('应该显示加载状态', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.ask.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ id: 1, question: '测试', answer: '答案' }), 100)
    ));
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    const input = screen.getByPlaceholderText(/请输入你的问题/i);
    const sendBtn = screen.getByText(/发送/i);

    fireEvent.change(input, { target: { value: '测试问题' } });
    fireEvent.click(sendBtn);

    // 发送后应该显示加载状态
    await waitFor(() => {
      expect(sendBtn).toBeDisabled();
    });
  });

  it('应该可以清空对话', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    const clearBtn = screen.getByText(/清空/i);
    expect(clearBtn).toBeInTheDocument();
    
    fireEvent.click(clearBtn);
    // 清空操作应该被触发
  });

  it('应该可以选择科目', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.ask.mockResolvedValue({ id: 1, question: '测试', answer: '答案' });
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    const subjectSelect = screen.getByLabelText(/选择科目/i);
    fireEvent.change(subjectSelect, { target: { value: '物理' } });

    const input = screen.getByPlaceholderText(/请输入你的问题/i);
    const sendBtn = screen.getByText(/发送/i);

    fireEvent.change(input, { target: { value: '物理问题' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(aiAPI.ask).toHaveBeenCalledWith('物理问题', '物理');
    });
  });

  it('应该处理空问题', async () => {
    const { aiAPI } = await import('../src/services/api');
    aiAPI.getHistory.mockResolvedValue({ records: [] });

    renderWithAuth(<AIChat />);
    
    const sendBtn = screen.getByText(/发送/i);
    fireEvent.click(sendBtn);

    // 空问题不应该发送
    await waitFor(() => {
      expect(aiAPI.ask).not.toHaveBeenCalled();
    });
  });
});
