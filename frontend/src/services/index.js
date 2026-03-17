import api from './api'
import { aiGatewayV2API, aiGradingAPI, aiPlanningAPI } from './aiServices'

// 知识点 API
export const knowledgeAPI = {
  // 获取列表
  getList: (params) => api.get('/knowledge', { params }),
  
  // 获取单个
  getOne: (id) => api.get(`/knowledge/${id}`),
  
  // 创建
  create: (data) => api.post('/knowledge', data),
  
  // 更新
  update: (id, data) => api.put(`/knowledge/${id}`, data),
  
  // 删除
  delete: (id) => api.delete(`/knowledge/${id}`),
  
  // 搜索
  search: (keyword) => api.get('/knowledge/search', { params: { keyword } })
}

// 学习进度 API
export const progressAPI = {
  // 获取列表
  getList: () => api.get('/progress'),
  
  // 获取统计
  getStats: () => api.get('/progress/stats'),
  
  // 更新进度
  upsert: (data) => api.post('/progress/upsert', data),
  
  // 记录学习时长
  logStudyTime: (data) => api.post('/progress/log', data)
}

// AI 答疑 API
export const aiAPI = {
  // 提问
  ask: (data) => api.post('/ai/ask', data),
  
  // 获取历史
  getHistory: (params) => api.get('/ai/history', { params }),
  
  // 搜索
  search: (keyword) => api.get('/ai/search', { params: { keyword } }),
  
  // 删除
  delete: (id) => api.delete(`/ai/${id}`)
}

// 课本 API
export const textbooksAPI = {
  // 获取列表
  getList: () => api.get('/textbooks'),
  
  // 上传课本
  upload: (formData, config) => api.post('/textbooks/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
  }),
  
  // 获取单元列表
  getUnits: (id) => api.get(`/textbooks/${id}/units`),
  
  // 删除
  delete: (id) => api.delete(`/textbooks/${id}`)
}

// 积分 API
export const pointsAPI = {
  // 获取积分余额
  getBalance: () => api.get('/points/balance'),
  
  // 获取积分流水
  getLedger: (params) => api.get('/points/ledger', { params }),
  
  // 获取积分统计
  getStats: () => api.get('/points/stats')
}

// 家长监控 API
export const familyAPI = {
  // 获取绑定列表
  getBindings: () => api.get('/family/bindings'),
  
  // 创建绑定
  createBinding: (data) => api.post('/family/bindings', data),
  
  // 删除绑定
  deleteBinding: (id) => api.delete(`/family/bindings/${id}`),
  
  // 获取学生统计
  getStudentStats: (studentId) => api.get(`/family/students/${studentId}/stats`),
  
  // 获取学生学习进度
  getStudentProgress: (studentId) => api.get(`/family/students/${studentId}/progress`),
  
  // 获取积分排行
  getPointsRanking: (params) => api.get('/family/rankings', { params })
}

// AI Gateway V2 API - 多 AI 服务路由
export { aiGatewayV2API, aiGradingAPI, aiPlanningAPI }
