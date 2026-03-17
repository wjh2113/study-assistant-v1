import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Knowledge from '../src/pages/Knowledge.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';

// BUG-TEST-002 修复：添加 AuthProvider wrapper

vi.mock('../src/services/api', () => ({
  knowledgeAPI: {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn()
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

describe('Knowledge Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染知识点页面', () => {
    const { knowledgeAPI } = require('../src/services/api');
    knowledgeAPI.getList.mockResolvedValue({ knowledgePoints: [] });

    renderWithAuth(<Knowledge />);
    
    expect(screen.getByText(/知识点/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索知识点/i)).toBeInTheDocument();
  });

  it('应该显示知识点列表', async () => {
    const { knowledgeAPI } = await import('../src/services/api');
    knowledgeAPI.getList.mockResolvedValue({
      knowledgePoints: [
        { id: 1, subject: '数学', title: '勾股定理', content: '测试内容' },
        { id: 2, subject: '物理', title: '牛顿定律', content: '测试内容' }
      ]
    });

    renderWithAuth(<Knowledge />);

    await waitFor(() => {
      expect(screen.getByText(/勾股定理/i)).toBeInTheDocument();
      expect(screen.getByText(/牛顿定律/i)).toBeInTheDocument();
    });
  });

  it('应该可以搜索知识点', async () => {
    const { knowledgeAPI } = await import('../src/services/api');
    knowledgeAPI.search.mockResolvedValue({
      knowledgePoints: [{ id: 1, subject: '数学', title: '勾股定理', content: '测试' }]
    });

    renderWithAuth(<Knowledge />);
    
    const searchInput = screen.getByPlaceholderText(/搜索知识点/i);
    fireEvent.change(searchInput, { target: { value: '勾股' } });

    await waitFor(() => {
      expect(knowledgeAPI.search).toHaveBeenCalledWith('勾股');
    });
  });

  it('应该可以创建新知识点', async () => {
    const { knowledgeAPI } = await import('../src/services/api');
    knowledgeAPI.create.mockResolvedValue({ id: 1, title: '新知识点' });
    knowledgeAPI.getList.mockResolvedValue({ knowledgePoints: [] });

    renderWithAuth(<Knowledge />);
    
    const addBtn = screen.getByText(/新增/i);
    fireEvent.click(addBtn);

    // 等待模态框打开
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/标题/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/标题/i);
    const contentInput = screen.getByPlaceholderText(/内容/i);
    const subjectSelect = screen.getByLabelText(/科目/i);
    const submitBtn = screen.getByText(/保存/i);

    fireEvent.change(titleInput, { target: { value: '测试知识点' } });
    fireEvent.change(contentInput, { target: { value: '测试内容' } });
    fireEvent.change(subjectSelect, { target: { value: '数学' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(knowledgeAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        title: '测试知识点'
      }));
    });
  });

  it('应该可以编辑知识点', async () => {
    const { knowledgeAPI } = await import('../src/services/api');
    knowledgeAPI.getList.mockResolvedValue({
      knowledgePoints: [{ id: 1, subject: '数学', title: '原知识点', content: '原内容' }]
    });
    knowledgeAPI.update.mockResolvedValue({ id: 1, title: '更新后' });

    renderWithAuth(<Knowledge />);

    await waitFor(() => {
      expect(screen.getByText(/原知识点/i)).toBeInTheDocument();
    });

    const editBtn = screen.getByText(/编辑/i);
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/标题/i)).toHaveValue('原知识点');
    });
  });

  it('应该可以删除知识点', async () => {
    const { knowledgeAPI } = await import('../src/services/api');
    knowledgeAPI.getList.mockResolvedValue({
      knowledgePoints: [{ id: 1, subject: '数学', title: '待删除', content: '测试' }]
    });
    knowledgeAPI.delete.mockResolvedValue({ message: '删除成功' });

    renderWithAuth(<Knowledge />);

    await waitFor(() => {
      expect(screen.getByText(/待删除/i)).toBeInTheDocument();
    });

    const deleteBtn = screen.getByText(/删除/i);
    fireEvent.click(deleteBtn);

    // 确认删除
    const confirmBtn = screen.getByText(/确认/i);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(knowledgeAPI.delete).toHaveBeenCalledWith(1);
    });
  });
});
