import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../src/pages/Login.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';

// BUG-002 修复：使用 AuthProvider wrapper

// Mock API
vi.mock('../src/services/api', () => ({
  default: {
    defaults: { headers: { common: { Authorization: '' } } },
    post: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

// BUG-002 修复：使用 AuthProvider wrapper
const renderWithAuth = (component, authValue = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={{
        user: authValue.user || null,
        loading: false,
        login: { 
          sendCode: authValue.login?.sendCode || vi.fn(), 
          verify: authValue.login?.verify || vi.fn() 
        },
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

describe('Login Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染登录页面', () => {
    renderWithAuth(<Login />);
    
    expect(screen.getByText(/学习助手/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入手机号/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入验证码/i)).toBeInTheDocument();
  });

  it('应该验证手机号格式', async () => {
    renderWithAuth(<Login />);
    
    const phoneInput = screen.getByPlaceholderText(/请输入手机号/i);
    const sendCodeBtn = screen.getByText(/获取验证码/i);

    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.click(sendCodeBtn);

    await waitFor(() => {
      expect(screen.getByText(/请输入正确的手机号/i)).toBeInTheDocument();
    });
  });

  it('应该可以跳转到注册页面', () => {
    renderWithAuth(<Login />);
    
    const registerLink = screen.getByText(/没有账号？立即注册/i);
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });
});
