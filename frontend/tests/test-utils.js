// BUG-002 修复：测试工具 - 提供 AuthProvider wrapper
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';

/**
 * 测试用 AuthProvider - 提供可配置的 mock auth context
 */
export function TestAuthProvider({ 
  children, 
  user = null, 
  loading = false,
  login = { sendCode: async () => {}, verify: async () => {} },
  register = { sendCode: async () => {}, verify: async () => {} },
  logout = () => {},
  refreshToken = async () => {}
}) {
  // 创建一个 mock 的 AuthContext value
  const mockAuthValue = {
    user,
    loading,
    login,
    register,
    logout,
    refreshToken
  };

  return (
    <BrowserRouter>
      <AuthProvider value={mockAuthValue}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}

/**
 * 简化的测试 wrapper - 用于不需要自定义 auth 值的场景
 */
export function renderWithAuth(component, options = {}) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>,
    options
  );
}

/**
 * 带 mock 的测试 wrapper - 用于需要控制 auth 状态的场景
 */
export function renderWithMockAuth(component, authValue = {}, options = {}) {
  const defaultAuthValue = {
    user: authValue.user || null,
    loading: authValue.loading || false,
    login: {
      sendCode: authValue.login?.sendCode || (async () => {}),
      verify: authValue.login?.verify || (async () => {})
    },
    register: {
      sendCode: authValue.register?.sendCode || (async () => {}),
      verify: authValue.register?.verify || (async () => {})
    },
    logout: authValue.logout || (() => {}),
    refreshToken: authValue.refreshToken || (async () => {}),
    ...authValue
  };

  return render(
    <BrowserRouter>
      <AuthProvider value={defaultAuthValue}>
        {component}
      </AuthProvider>
    </BrowserRouter>,
    options
  );
}
