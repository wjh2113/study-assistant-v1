/**
 * 学习助手 - 前端 E2E 测试
 * 测试所有主要页面功�? */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// 测试配置
const TEST_CONFIG = {
  phone: '13800138001',
  code: '123456',
  nickname: '测试用户'
};

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function logResult(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`�?${testName}`);
  } else {
    testResults.failed++;
    console.log(`�?${testName}: ${error}`);
  }
  testResults.details.push({ testName, passed, error, timestamp: new Date().toISOString() });
}

// BUG-002 修复：添�?AuthProvider wrapper
import { AuthProvider } from '../src/context/AuthContext';

// 辅助组件包装�?- BUG-002 修复：使�?AuthProvider
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

describe('🌐 前端 E2E 测试', () => {
  
  beforeAll(() => {
    console.log('\n🧪 开始前�?E2E 测试...\n');
  });

  afterAll(() => {
    console.log('\n===========================================');
    console.log(`📊 测试结果汇�?`);
    console.log(`   总计�?{testResults.total}`);
    console.log(`   通过�?{testResults.passed}`);
    console.log(`   失败�?{testResults.failed}`);
    console.log(`   通过率：${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log('===========================================\n');
  });

  // ==================== 登录页面测试 ====================
  describe('📄 登录页面 (Login)', () => {
    
    it('应该渲染登录表单', async () => {
      const Login = (await import('../src/pages/Login')).default;
      renderWithAuth(<Login />);
      
      const phoneInput = screen.getByPlaceholderText(/手机�?i);
      const codeInput = screen.getByPlaceholderText(/验证�?i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      const passed = phoneInput && codeInput && submitButton;
      logResult('登录页面 - 渲染表单', passed, passed ? null : '表单元素缺失');
      expect(passed).toBe(true);
    });

    it('应该验证手机号格�?, async () => {
      const Login = (await import('../src/pages/Login')).default;
      renderWithAuth(<Login />);
      
      const phoneInput = screen.getByPlaceholderText(/手机�?i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(phoneInput, { target: { value: '12345' } });
      fireEvent.click(submitButton);
      
      // 等待错误提示
      await waitFor(() => {
        const error = screen.getByText(/手机号格式无�?i);
        const passed = error !== null;
        logResult('登录页面 - 手机号验�?, passed, passed ? null : '未显示错误提�?);
        expect(passed).toBe(true);
      });
    });

    it('应该成功提交登录表单', async () => {
      const Login = (await import('../src/pages/Login')).default;
      renderWithAuth(<Login />);
      
      // Mock API 响应
      axios.post.mockResolvedValue({
        data: {
          success: true,
          token: 'mock_token',
          user: { id: 1, phone: TEST_CONFIG.phone, role: 'student' }
        }
      });
      
      const phoneInput = screen.getByPlaceholderText(/手机�?i);
      const codeInput = screen.getByPlaceholderText(/验证�?i);
      const submitButton = screen.getByRole('button', { name: /登录/i });
      
      fireEvent.change(phoneInput, { target: { value: TEST_CONFIG.phone } });
      fireEvent.change(codeInput, { target: { value: TEST_CONFIG.code } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/auth/login', {
          phone: TEST_CONFIG.phone,
          code: TEST_CONFIG.code
        });
        const passed = true;
        logResult('登录页面 - 成功提交', passed, passed ? null : 'API 调用失败');
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 注册页面测试 ====================
  describe('📄 注册页面 (Register)', () => {
    
    it('应该渲染注册表单', async () => {
      const Register = (await import('../src/pages/Register')).default;
      renderWithAuth(<Register />);
      
      const phoneInput = screen.getByPlaceholderText(/手机�?i);
      const nicknameInput = screen.getByPlaceholderText(/昵称/i);
      const submitButton = screen.getByRole('button', { name: /注册/i });
      
      const passed = phoneInput && nicknameInput && submitButton;
      logResult('注册页面 - 渲染表单', passed, passed ? null : '表单元素缺失');
      expect(passed).toBe(true);
    });

    it('应该验证必填字段', async () => {
      const Register = (await import('../src/pages/Register')).default;
      renderWithAuth(<Register />);
      
      const submitButton = screen.getByRole('button', { name: /注册/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const error = screen.getByText(/请填写完整信�?i);
        const passed = error !== null;
        logResult('注册页面 - 必填验证', passed, passed ? null : '未显示错误提�?);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 仪表盘页面测�?====================
  describe('📄 仪表盘页�?(Dashboard)', () => {
    
    it('应该显示用户信息', async () => {
      const Dashboard = (await import('../src/pages/Dashboard')).default;
      
      // Mock 用户数据
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            totalPoints: 100,
            streak: 7,
            weakPoints: []
          }
        }
      });
      
      renderWithAuth(<Dashboard />);
      
      await waitFor(() => {
        const pointsDisplay = screen.getByText(/积分/i);
        const passed = pointsDisplay !== null;
        logResult('仪表�?- 显示用户信息', passed, passed ? null : '用户信息未显�?);
        expect(passed).toBe(true);
      });
    });

    it('应该显示快捷功能入口', async () => {
      const Dashboard = (await import('../src/pages/Dashboard')).default;
      renderWithAuth(<Dashboard />);
      
      await waitFor(() => {
        const aiChatLink = screen.getByText(/AI 答疑/i);
        const practiceLink = screen.getByText(/开始练�?i);
        const passed = aiChatLink && practiceLink;
        logResult('仪表�?- 显示功能入口', passed, passed ? null : '功能入口缺失');
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== AI 答疑页面测试 ====================
  describe('📄 AI 答疑页面 (AIChat)', () => {
    
    it('应该渲染聊天界面', async () => {
      const AIChat = (await import('../src/pages/AIChat')).default;
      renderWithAuth(<AIChat />);
      
      const inputBox = screen.getByPlaceholderText(/输入问题/i);
      const sendButton = screen.getByRole('button', { name: /发�?i });
      
      const passed = inputBox && sendButton;
      logResult('AI 答疑 - 渲染聊天界面', passed, passed ? null : '聊天界面元素缺失');
      expect(passed).toBe(true);
    });

    it('应该发送消息并显示回复', async () => {
      const AIChat = (await import('../src/pages/AIChat')).default;
      renderWithAuth(<AIChat />);
      
      // Mock API 响应
      axios.post.mockResolvedValue({
        data: {
          success: true,
          data: { answer: '这是 AI 的回�? }
        }
      });
      
      const inputBox = screen.getByPlaceholderText(/输入问题/i);
      const sendButton = screen.getByRole('button', { name: /发�?i });
      
      fireEvent.change(inputBox, { target: { value: '测试问题' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
        const passed = true;
        logResult('AI 答疑 - 发送消�?, passed, passed ? null : '消息发送失�?);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 知识库页面测�?====================
  describe('📄 知识库页�?(Knowledge)', () => {
    
    it('应该渲染知识库列�?, async () => {
      const Knowledge = (await import('../src/pages/Knowledge')).default;
      
      // Mock 知识库数�?      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: { textbooks: [] },
          pagination: { total: 0 }
        }
      });
      
      renderWithAuth(<Knowledge />);
      
      await waitFor(() => {
        const title = screen.getByText(/知识�?i);
        const passed = title !== null;
        logResult('知识�?- 渲染页面', passed, passed ? null : '页面标题缺失');
        expect(passed).toBe(true);
      });
    });

    it('应该支持上传课本', async () => {
      const Knowledge = (await import('../src/pages/Knowledge')).default;
      renderWithAuth(<Knowledge />);
      
      await waitFor(() => {
        const uploadButton = screen.getByText(/上传课本/i);
        const passed = uploadButton !== null;
        logResult('知识�?- 上传功能', passed, passed ? null : '上传按钮缺失');
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 路由测试 ====================
  describe('🔀 路由测试', () => {
    
    it('应该支持 /aichat 路由', async () => {
      const App = (await import('../src/App')).default;
      
      // Mock 认证状�?      localStorage.setItem('token', 'mock_token');
      
      renderWithAuth(<App />);
      
      // 模拟导航�?/aichat
      window.history.pushState({}, 'AIChat', '/aichat');
      
      await waitFor(() => {
        const aiChatComponent = screen.getByPlaceholderText(/输入问题/i);
        const passed = aiChatComponent !== null;
        logResult('路由 - /aichat', passed, passed ? null : 'AIChat 组件未加�?);
        expect(passed).toBe(true);
      });
    });

    it('应该支持 /ai-chat 路由 (兼容)', async () => {
      const App = (await import('../src/App')).default;
      renderWithAuth(<App />);
      
      window.history.pushState({}, 'AIChat', '/ai-chat');
      
      await waitFor(() => {
        const aiChatComponent = screen.getByPlaceholderText(/输入问题/i);
        const passed = aiChatComponent !== null;
        logResult('路由 - /ai-chat', passed, passed ? null : 'AIChat 组件未加�?);
        expect(passed).toBe(true);
      });
    });
  });
});

