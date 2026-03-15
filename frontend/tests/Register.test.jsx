import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../src/pages/Register.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';

// BUG-002 修复：添�?AuthProvider wrapper

vi.mock('../src/services/api', () => ({
  authAPI: {
    sendCode: vi.fn(),
    register: vi.fn()
  }
}));

// BUG-002 修复：使�?AuthProvider wrapper
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

describe('Register Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染注册页面', () => {
    renderWithAuth(<Register />);
    
    expect(screen.getByText(/注册账号/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入手机号/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入验证码/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入昵�?i)).toBeInTheDocument();
  });

  it('应该可以选择角色', async () => {
    renderWithAuth(<Register />);
    
    const studentRadio = screen.getByLabelText(/学生/i);
    const parentRadio = screen.getByLabelText(/家长/i);

    expect(studentRadio).toBeInTheDocument();
    expect(parentRadio).toBeInTheDocument();

    fireEvent.click(parentRadio);
    expect(parentRadio).toBeChecked();
  });

  it('应该验证必填字段', async () => {
    const { authAPI } = await import('../src/services/api');
    authAPI.register.mockRejectedValue({ error: '手机号、验证码和角色不能为�? });

    renderWithAuth(<Register />);
    
    const registerBtn = screen.getByText(/注册/i);
    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(screen.getByText(/手机号、验证码和角色不能为�?i)).toBeInTheDocument();
    });
  });

  it('应该成功注册学生账号', async () => {
    const { authAPI } = await import('../src/services/api');
    authAPI.register.mockResolvedValue({
      token: 'mock_token',
      user: { id: 1, role: 'student' }
    });

    renderWithAuth(<Register />);
    
    const phoneInput = screen.getByPlaceholderText(/请输入手机号/i);
    const codeInput = screen.getByPlaceholderText(/请输入验证码/i);
    const nicknameInput = screen.getByPlaceholderText(/请输入昵�?i);
    const studentRadio = screen.getByLabelText(/学生/i);
    const registerBtn = screen.getByText(/注册/i);

    fireEvent.change(phoneInput, { target: { value: '13900139000' } });
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.change(nicknameInput, { target: { value: '测试学生' } });
    fireEvent.click(studentRadio);
    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(authAPI.register).toHaveBeenCalledWith(expect.objectContaining({
        phone: '13900139000',
        role: 'student'
      }));
    });
  });

  it('应该显示注册错误', async () => {
    const { authAPI } = await import('../src/services/api');
    authAPI.register.mockRejectedValue({ error: '该手机号已注�? });

    renderWithAuth(<Register />);
    
    const phoneInput = screen.getByPlaceholderText(/请输入手机号/i);
    const codeInput = screen.getByPlaceholderText(/请输入验证码/i);
    const nicknameInput = screen.getByPlaceholderText(/请输入昵�?i);
    const registerBtn = screen.getByText(/注册/i);

    fireEvent.change(phoneInput, { target: { value: '13800138000' } });
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.change(nicknameInput, { target: { value: '测试' } });
    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(screen.getByText(/该手机号已注�?i)).toBeInTheDocument();
    });
  });

  it('应该可以跳转到登录页�?, () => {
    renderWithAuth(<Register />);
    
    const loginLink = screen.getByText(/已有账号？立即登�?i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});

