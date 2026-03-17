import api from './api'

/**
 * AI Gateway V2 API - 支持多 AI 服务路由
 * 后端路由：/api/ai/v2/*
 */
export const aiGatewayV2API = {
  /**
   * 智能对话
   * @param {Array} messages - 对话消息数组 [{role: 'user'|'assistant', content: string}]
   * @param {Object} options - 可选参数 {taskType, temperature, maxTokens}
   */
  chat: (messages, options = {}) => api.post('/ai/v2/chat', {
    messages,
    taskType: options.taskType || 'chat',
    temperature: options.temperature || 0.7,
    maxTokens: options.maxTokens || 2048
  }),

  /**
   * 生成题目
   * @param {Object} params - 生成参数
   */
  generateQuestions: (params) => api.post('/ai/v2/generate-questions', params),

  /**
   * 健康检查
   */
  health: () => api.get('/ai/v2/health'),

  /**
   * 获取服务状态
   */
  status: () => api.get('/ai/v2/status'),

  /**
   * 获取 Token 使用统计
   */
  getTokenUsage: (date) => api.get('/ai/v2/token-usage', { params: { date } }),

  /**
   * 获取任务日志
   */
  getTaskLogs: (params) => api.get('/ai/v2/task-logs', { params })
}

/**
 * AI 批改服务 API
 * 后端路由：/api/ai/grading/*
 */
export const aiGradingAPI = {
  /**
   * 批改主观题
   * @param {Object} params - 批改参数 {questionId, question, userAnswer, rubric}
   */
  gradeSubjective: (params) => api.post('/ai/grading/subjective', params),

  /**
   * 批改作文
   * @param {Object} params - 批改参数 {essay, subject, grade, topic, wordLimit, criteria}
   */
  gradeEssay: (params) => api.post('/ai/grading/essay', params),

  /**
   * 批量批改
   * @param {Array} submissions - 提交列表
   */
  batchGrade: (submissions) => api.post('/ai/grading/batch', { submissions }),

  /**
   * 获取批改历史
   */
  getHistory: (params) => api.get('/ai/grading/history', { params })
}

/**
 * AI 学习规划 API
 * 后端路由：/api/ai/planning/*
 */
export const aiPlanningAPI = {
  /**
   * 生成个性化学习计划
   * @param {Object} params - 计划参数 {subject, timeframe, goals, preferences}
   */
  generatePlan: (params) => api.post('/ai/planning/generate', params),

  /**
   * 获取用户学习画像
   */
  getUserProfile: (subject) => api.get('/ai/planning/user-profile', { params: { subject } }),

  /**
   * 获取每日任务
   * @param {String} date - 日期 YYYY-MM-DD
   */
  getDailyTasks: (date, options = {}) => api.get(`/ai/planning/daily-tasks/${date}`, { params: options }),

  /**
   * 更新任务状态
   */
  updateTaskStatus: (taskId, status, data = {}) => 
    api.put(`/ai/planning/tasks/${taskId}/status`, { status, ...data }),

  /**
   * 获取任务统计
   */
  getTaskStatistics: (params) => api.get('/ai/planning/tasks/statistics', { params }),

  /**
   * 获取计划进度
   */
  getPlanProgress: (planId) => api.get(`/ai/planning/${planId}/progress`),

  /**
   * 跟踪计划执行情况
   */
  trackPlanExecution: (planId) => api.get(`/ai/planning/${planId}/track`),

  /**
   * 获取计划执行报告
   */
  getExecutionReport: (planId) => api.get(`/ai/planning/${planId}/report`),

  /**
   * 获取推荐行动
   */
  getRecommendations: (planId) => api.get(`/ai/planning/${planId}/recommendations`),

  /**
   * 调整学习计划
   */
  adjustPlan: (planId, adjustmentType, reason, changes) => 
    api.post(`/ai/planning/${planId}/adjust`, { adjustmentType, reason, changes })
}
