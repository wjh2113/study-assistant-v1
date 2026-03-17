import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { aiPlanningAPI } from '../services'

export default function LearningPlanPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [dailyTasks, setDailyTasks] = useState([])
  const [error, setError] = useState('')

  // 表单数据
  const [formData, setFormData] = useState({
    subject: 'math',
    totalDays: 30,
    startDate: new Date().toISOString().split('T')[0],
    goals: [],
    dailyTimeLimit: 60,
    includeWeekend: true,
    learningStyle: 'visual'
  })

  // 当前目标输入
  const [currentGoal, setCurrentGoal] = useState({
    knowledgePointName: '',
    currentMastery: 30,
    targetMastery: 80,
    priority: 'medium'
  })

  // 加载今日任务
  useEffect(() => {
    loadDailyTasks()
  }, [])

  const loadDailyTasks = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await aiPlanningAPI.getDailyTasks(today)
      setDailyTasks(res.data.tasks || [])
    } catch (err) {
      console.error('加载任务失败:', err)
    }
  }

  const handleAddGoal = () => {
    if (!currentGoal.knowledgePointName.trim()) {
      setError('请输入知识点名称')
      return
    }

    setFormData({
      ...formData,
      goals: [...formData.goals, { ...currentGoal }]
    })

    setCurrentGoal({
      knowledgePointName: '',
      currentMastery: 30,
      targetMastery: 80,
      priority: 'medium'
    })
    setError('')
  }

  const handleRemoveGoal = (index) => {
    const newGoals = formData.goals.filter((_, i) => i !== index)
    setFormData({ ...formData, goals: newGoals })
  }

  const handleGeneratePlan = async () => {
    if (formData.goals.length === 0) {
      setError('请至少添加一个学习目标')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await aiPlanningAPI.generatePlan({
        subject: formData.subject,
        timeframe: {
          totalDays: formData.totalDays,
          startDate: formData.startDate,
          endDate: new Date(Date.now() + formData.totalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        goals: formData.goals.map(g => ({
          knowledgePointName: g.knowledgePointName,
          currentMastery: g.currentMastery,
          targetMastery: g.targetMastery,
          priority: g.priority
        })),
        preferences: {
          dailyTimeLimit: formData.dailyTimeLimit,
          includeWeekend: formData.includeWeekend,
          learningStyle: formData.learningStyle
        }
      })

      if (res.data.success) {
        setPlan(res.data.plan)
        setStep(3)
      } else {
        setError(res.data.reason || '计划生成失败')
      }
    } catch (err) {
      setError('计划生成失败，请稍后重试')
      console.error('生成计划失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSubjectName = (subject) => {
    const map = {
      math: '数学',
      chinese: '语文',
      english: '英语',
      physics: '物理',
      chemistry: '化学',
      biology: '生物',
      history: '历史',
      geography: '地理',
      politics: '政治'
    }
    return map[subject] || subject
  }

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-800'
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800'
    return 'bg-blue-100 text-blue-800'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-primary-600 hover:text-primary-700">← 返回</Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900">📅 AI 学习规划</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-6 px-4">
        {/* 步骤指示器 */}
        <div className="mb-6">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${step > s ? 'bg-primary-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-sm text-gray-600">
            <span className={step >= 1 ? 'text-primary-600' : ''}>基本信息</span>
            <span className="mx-4">→</span>
            <span className={step >= 2 ? 'text-primary-600' : ''}>设定目标</span>
            <span className="mx-4">→</span>
            <span className={step >= 3 ? 'text-primary-600' : ''}>查看计划</span>
          </div>
        </div>

        {/* 步骤 1: 基本信息 */}
        {step === 1 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">📚 基本信息</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  科目
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="math">数学</option>
                  <option value="chinese">语文</option>
                  <option value="english">英语</option>
                  <option value="physics">物理</option>
                  <option value="chemistry">化学</option>
                  <option value="biology">生物</option>
                  <option value="history">历史</option>
                  <option value="geography">地理</option>
                  <option value="politics">政治</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计划周期（天）
                </label>
                <input
                  type="number"
                  value={formData.totalDays}
                  onChange={(e) => setFormData({ ...formData, totalDays: parseInt(e.target.value) || 7 })}
                  min="7"
                  max="90"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始日期
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每日学习时长（分钟）
                </label>
                <input
                  type="number"
                  value={formData.dailyTimeLimit}
                  onChange={(e) => setFormData({ ...formData, dailyTimeLimit: parseInt(e.target.value) || 30 })}
                  min="15"
                  max="180"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeWeekend"
                  checked={formData.includeWeekend}
                  onChange={(e) => setFormData({ ...formData, includeWeekend: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="includeWeekend" className="ml-2 text-sm text-gray-700">
                  包含周末
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学习风格
                </label>
                <select
                  value={formData.learningStyle}
                  onChange={(e) => setFormData({ ...formData, learningStyle: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="visual">视觉型（图表、图像）</option>
                  <option value="auditory">听觉型（讲解、讨论）</option>
                  <option value="kinesthetic">动觉型（实践、操作）</option>
                  <option value="reading">阅读型（文字、资料）</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-6 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
            >
              下一步：设定目标
            </button>
          </div>
        )}

        {/* 步骤 2: 设定目标 */}
        {step === 2 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">🎯 设定学习目标</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  知识点名称
                </label>
                <input
                  type="text"
                  value={currentGoal.knowledgePointName}
                  onChange={(e) => setCurrentGoal({ ...currentGoal, knowledgePointName: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  placeholder="例如：二次函数、三角函数、定语从句"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    当前掌握程度 (%)
                  </label>
                  <input
                    type="number"
                    value={currentGoal.currentMastery}
                    onChange={(e) => setCurrentGoal({ ...currentGoal, currentMastery: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标掌握程度 (%)
                  </label>
                  <input
                    type="number"
                    value={currentGoal.targetMastery}
                    onChange={(e) => setCurrentGoal({ ...currentGoal, targetMastery: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优先级
                </label>
                <select
                  value={currentGoal.priority}
                  onChange={(e) => setCurrentGoal({ ...currentGoal, priority: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleAddGoal}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                添加目标
              </button>
            </div>

            {/* 已添加的目标列表 */}
            {formData.goals.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">已添加的学习目标</h3>
                <div className="space-y-2">
                  {formData.goals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{goal.knowledgePointName}</div>
                        <div className="text-sm text-gray-600">
                          掌握度：{goal.currentMastery}% → {goal.targetMastery}%
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(goal.priority)}`}>
                          {goal.priority === 'high' && '高优先级'}
                          {goal.priority === 'medium' && '中优先级'}
                          {goal.priority === 'low' && '低优先级'}
                        </span>
                        <button
                          onClick={() => handleRemoveGoal(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                上一步
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={loading || formData.goals.length === 0}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '生成中...' : '生成学习计划'}
              </button>
            </div>
          </div>
        )}

        {/* 步骤 3: 查看计划 */}
        {step === 3 && plan && (
          <div className="space-y-6">
            {/* 计划概览 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📊 学习计划概览</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{plan.totalDays}天</div>
                  <div className="text-sm text-gray-600">总周期</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{plan.goals?.length || 0}个</div>
                  <div className="text-sm text-gray-600">学习目标</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{formData.dailyTimeLimit}分钟</div>
                  <div className="text-sm text-gray-600">每日学习</div>
                </div>
              </div>

              {/* 学习路径 */}
              {plan.learningPath && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">📚 学习路径</h3>
                  <div className="space-y-2">
                    {plan.learningPath.map((week, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-gray-900">第{week.week}周</div>
                        <div className="text-sm text-gray-600 mt-1">{week.focus}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          目标：{week.targetMastery}% 掌握度
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 今日任务 */}
            {dailyTasks.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">📋 今日任务</h2>
                <div className="space-y-3">
                  {dailyTasks.map((task, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {task.type || '学习任务'}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              预计{task.estimatedTime || 30}分钟
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {new Date(task.date).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep(2)
                  setPlan(null)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                重新规划
              </button>
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
              >
                新建计划
              </button>
            </div>
          </div>
        )}

        {!plan && step === 3 && (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">请先完成学习计划生成</p>
            <button
              onClick={() => setStep(2)}
              className="mt-4 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
            >
              返回设定目标
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
