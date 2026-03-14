import Taro from '@tarojs/taro'
import { getToken } from '../utils/storage'

// API 基础 URL
const BASE_URL = '/api'

// 请求封装
async function request<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
): Promise<T> {
  const token = getToken()

  const res = await Taro.request({
    url: `${BASE_URL}${url}`,
    method,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data,
  })

  if (res.statusCode >= 200 && res.statusCode < 300) {
    return res.data as T
  } else {
    const errorData = res.data as any
    throw new Error(errorData.message || '请求失败')
  }
}

// ==================== 认证接口 ====================

export const authApi = {
  // 发送验证码
  sendCode: (phone: string) =>
    request<{ message: string }>('/auth/send-code', 'POST', { phone }),

  // 手机号登录
  phoneLogin: (phone: string, code: string) =>
    request<{
      access_token: string
      refresh_token: string
      user: { id: number; phone: string; username: string; role: string; grade?: number }
    }>('/auth/phone-login', 'POST', { phone, code }),

  // 用户名密码登录
  login: (username: string, password: string) =>
    request<{
      access_token: string
      refresh_token: string
      user: { id: number; username: string; email: string; role: string; grade?: number }
    }>('/auth/login', 'POST', { username, password }),

  // 注册
  register: (username: string, password: string, email: string, role?: string, grade?: number) =>
    request('/auth/register', 'POST', { username, password, email, role, grade }),

  // 刷新 Token
  refresh: (refresh_token: string) =>
    request<{ access_token: string }>('/auth/refresh', 'POST', { refresh_token }),

  // 获取用户信息
  getProfile: () => request('/auth/profile', 'GET'),
}

// ==================== 家庭绑定接口 ====================

export const familyApi = {
  // 创建绑定
  createBinding: (childId: number) =>
    request('/family/bindings', 'POST', { childId }),

  // 查询绑定列表
  getBindings: (status?: string) =>
    request('/family/bindings', 'GET', { status }),

  // 确认绑定
  confirmBinding: (bindingId: number) =>
    request('/family/bindings/confirm', 'POST', { bindingId }),

  // 拒绝绑定
  rejectBinding: (bindingId: number) =>
    request('/family/bindings/reject', 'POST', { bindingId }),

  // 取消绑定
  cancelBinding: (bindingId: number) =>
    request('/family/bindings/cancel', 'POST', { bindingId }),

  // 获取孩子列表
  getChildren: () => request('/family/children', 'GET'),

  // 获取家长列表
  getParents: () => request('/family/parents', 'GET'),
}

// ==================== 课本管理接口 ====================

export const textbookApi = {
  // 创建课本
  create: (data: { title: string; subject: string; grade: number; version?: string; pdfUrl: string; pdfPath: string }) =>
    request('/textbooks', 'POST', data),

  // 查询课本列表
  getList: (params?: { subject?: string; grade?: number; status?: string }) =>
    request('/textbooks', 'GET', params),

  // 查询课本详情
  getDetail: (id: number) =>
    request(`/textbooks/${id}`, 'GET'),

  // 更新课本
  update: (id: number, data: any) =>
    request(`/textbooks/${id}`, 'POST', data),

  // 删除课本
  delete: (id: number) =>
    request(`/textbooks/${id}`, 'DELETE'),

  // 解析 PDF
  parsePdf: (id: number) =>
    request(`/textbooks/${id}/parse`, 'POST'),

  // 获取单元树
  getUnits: (id: number) =>
    request(`/textbooks/${id}/units`, 'GET'),

  // 创建单元
  createUnit: (textbookId: number, data: any) =>
    request(`/textbooks/${textbookId}/units`, 'POST', data),

  // 更新单元
  updateUnit: (unitId: number, data: any) =>
    request(`/textbooks/units/${unitId}`, 'POST', data),

  // 删除单元
  deleteUnit: (unitId: number) =>
    request(`/textbooks/units/${unitId}`, 'DELETE'),
}

// ==================== 练习接口 ====================

export const practiceApi = {
  // 创建练习会话
  createSession: (data: { textbookId?: number; unitId?: number; questionCount?: number }) =>
    request('/practice/sessions', 'POST', data),

  // 获取会话列表
  getSessions: () =>
    request('/practice/sessions', 'GET'),

  // 获取会话详情
  getSessionDetail: (id: number) =>
    request(`/practice/sessions/${id}`, 'GET'),

  // 生成题目
  generateQuestions: (id: number) =>
    request(`/practice/sessions/${id}/questions:generate`, 'POST'),

  // 提交答案（单题）
  submitAnswer: (sessionId: number, questionId: number, answer: string) =>
    request(`/practice/sessions/${sessionId}/answers`, 'POST', { questionId, answer }),

  // 批量提交答案
  submitAnswersBatch: (sessionId: number, answers: { questionId: number; answer: string }[]) =>
    request(`/practice/sessions/${sessionId}/answers:batch`, 'POST', { answers }),

  // 结束练习
  finishSession: (id: number) =>
    request(`/practice/sessions/${id}/finish`, 'POST'),

  // 获取练习结果
  getSessionResult: (id: number) =>
    request(`/practice/sessions/${id}/result`, 'GET'),
}

// ==================== 学习记录接口 ====================

export const learningApi = {
  // 创建学习记录
  createRecord: (data: { sessionId?: number; textbookId?: number; unitId?: number; actionType?: string; duration?: number; score?: number; metadata?: any }) =>
    request('/learning/records', 'POST', data),

  // 查询学习记录
  getRecords: (params?: { textbookId?: number; unitId?: number; actionType?: string; limit?: number }) =>
    request('/learning/records', 'GET', params),

  // 获取学习统计
  getStats: () =>
    request('/learning/stats', 'GET'),

  // 获取按天分组的学习记录
  getDailyStats: (days?: number) =>
    request('/learning/stats/daily', 'GET', { days }),
}

// ==================== 积分接口 ====================

export const pointsApi = {
  // 获取积分余额
  getBalance: () =>
    request<{ balance: number }>('/points/balance', 'GET'),

  // 获取积分流水
  getLedger: (limit?: number) =>
    request('/points/ledger', 'GET', { limit }),

  // 获取积分统计
  getStats: () =>
    request('/points/stats', 'GET'),
}

// ==================== 文件上传接口 ====================

export const filesApi = {
  // 获取上传策略
  getUploadPolicy: (filename: string, mimetype: string, filesize?: number) =>
    request('/files/upload-policy', 'POST', { filename, mimetype, filesize }),

  // 获取文件列表
  getList: (limit?: number) =>
    request('/files/list', 'GET', { limit }),
}

export default {
  auth: authApi,
  family: familyApi,
  textbook: textbookApi,
  practice: practiceApi,
  learning: learningApi,
  points: pointsApi,
  files: filesApi,
}
