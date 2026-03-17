import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { knowledgeAPI, pointsAPI } from '../services'

// 智能练习页面
export default function Practice() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  // 表单状态
  const [selectedCategory, setSelectedCategory] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  
  // 练习状态
  const [practiceState, setPracticeState] = useState('form') // 'form' | 'quiz' | 'result'
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(null)
  
  // UI 状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // 分类选项
  const categories = [
    { value: 'math', label: '📐 数学' },
    { value: 'english', label: '📚 英语' },
    { value: 'physics', label: '⚛️ 物理' },
    { value: 'chemistry', label: '🧪 化学' },
    { value: 'history', label: '📜 历史' },
    { value: 'geography', label: '🌍 地理' }
  ]

  // 难度选项
  const difficulties = [
    { value: 'easy', label: '⭐ 简单' },
    { value: 'medium', label: '⭐⭐ 中等' },
    { value: 'hard', label: '⭐⭐⭐ 困难' }
  ]

  // 开始练习
  const handleStartPractice = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!selectedCategory) {
      setError('请选择科目分类')
      return
    }

    setLoading(true)
    try {
      // TODO: 调用后端 API 获取题目
      // const res = await api.post('/practice/start', {
      //   category: selectedCategory,
      //   count: questionCount,
      //   difficulty
      // })
      // setQuestions(res.data.questions)
      
      // 模拟题目数据
      const mockQuestions = Array.from({ length: questionCount }, (_, i) => ({
        id: i + 1,
        question: `第${i + 1}题：这是一个示例题目，关于${categories.find(c => c.value === selectedCategory)?.label}`,
        options: ['A. 选项一', 'B. 选项二', 'C. 选项三', 'D. 选项四'],
        correctAnswer: 0
      }))
      
      setQuestions(mockQuestions)
      setPracticeState('quiz')
      setCurrentQuestionIndex(0)
      setAnswers({})
    } catch (err) {
      setError(err.response?.data?.error || '加载题目失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 选择答案
  const handleSelectAnswer = (optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }))
  }

  // 下一题
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      handleSubmitPractice()
    }
  }

  // 上一题
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  // 提交练习
  const handleSubmitPractice = async () => {
    setLoading(true)
    try {
      // 计算分数
      let correctCount = 0
      questions.forEach((q, index) => {
        if (answers[index] === q.correctAnswer) {
          correctCount++
        }
      })
      
      const calculatedScore = Math.round((correctCount / questions.length) * 100)
      setScore({
        correct: correctCount,
        total: questions.length,
        percentage: calculatedScore,
        points: calculatedScore * 10 // 积分奖励
      })
      
      // TODO: 提交到后端
      // await api.post('/practice/submit', {
      //   answers,
      //   score: calculatedScore
      // })
      
      setPracticeState('result')
    } catch (err) {
      setError('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 退出登录处理
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 重新开始
  const handleRestart = () => {
    setPracticeState('form')
    setQuestions([])
    setAnswers({})
    setScore(null)
    setCurrentQuestionIndex(0)
  }

  // 渲染表单界面
  const renderForm = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📝 智能练习</h2>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleStartPractice} className="space-y-6">
          {/* 科目分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择科目
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedCategory === cat.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {selectedCategory && (
              <p className="mt-2 text-sm text-gray-500">
                已选择：{categories.find(c => c.value === selectedCategory)?.label}
              </p>
            )}
          </div>

          {/* 题目数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题目数量
            </label>
            <div className="flex gap-3">
              {[5, 10, 20, 30].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`px-4 py-2 rounded-md border-2 transition-all ${
                    questionCount === count
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {count}题
                </button>
              ))}
            </div>
          </div>

          {/* 难度选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              难度等级
            </label>
            <div className="flex gap-3">
              {difficulties.map(diff => (
                <button
                  key={diff.value}
                  type="button"
                  onClick={() => setDifficulty(diff.value)}
                  className={`px-4 py-2 rounded-md border-2 transition-all ${
                    difficulty === diff.value
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedCategory}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '加载中...' : '🚀 开始练习'}
          </button>
        </form>
      </div>
    </div>
  )

  // 渲染答题界面
  const renderQuiz = () => {
    const question = questions[currentQuestionIndex]
    const selectedAnswer = answers[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="max-w-3xl mx-auto">
        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>进度：{currentQuestionIndex + 1} / {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* 题目 */}
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {question.question}
          </h3>

          {/* 选项 */}
          <div className="space-y-3 mb-6">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedAnswer === idx
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← 上一题
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={selectedAnswer === undefined}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestionIndex === questions.length - 1 ? '提交试卷' : '下一题 →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染结果界面
  const renderResult = () => {
    if (!score) return null

    const scoreColor = score.percentage >= 80 ? 'text-green-600' : score.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 练习完成!</h2>
          
          <div className={`text-6xl font-bold ${scoreColor} my-8`}>
            {score.percentage}分
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{score.correct}</div>
              <div className="text-sm text-gray-600">答对题数</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{score.total - score.correct}</div>
              <div className="text-sm text-gray-600">答错题数</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary-600">+{score.points}</div>
              <div className="text-sm text-gray-600">获得积分</div>
            </div>
          </div>

          {/* 答案解析 */}
          <div className="text-left mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📋 答案解析</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questions.map((q, idx) => {
                const userAnswer = answers[idx]
                const isCorrect = userAnswer === q.correctAnswer
                return (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${
                    isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <p className="font-medium text-gray-900 mb-2">第{idx + 1}题：{q.question}</p>
                    <p className="text-sm">
                      <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                        你的答案：{q.options[userAnswer]}
                      </span>
                      {!isCorrect && (
                        <span className="text-green-700 ml-4">
                          正确答案：{q.options[q.correctAnswer]}
                        </span>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRestart}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              🔄 再练一次
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-primary-600">📚 学习助手</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  🏠 首页
                </button>
                <button
                  onClick={() => navigate('/knowledge')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  📖 知识点
                </button>
                <button
                  onClick={() => navigate('/practice')}
                  className="text-primary-600 font-medium"
                >
                  📝 智能练习
                </button>
                <button
                  onClick={() => navigate('/ai-chat')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  🤖 AI 答疑
                </button>
                <button
                  onClick={() => navigate('/progress')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  📊 学习进度
                </button>
                <button
                  onClick={() => navigate('/points')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  💰 积分
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">你好，{user?.username || user?.nickname || '用户'}</span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {practiceState === 'form' && renderForm()}
        {practiceState === 'quiz' && renderQuiz()}
        {practiceState === 'result' && renderResult()}
      </main>

      {/* 退出登录确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认退出登录？</h3>
            <p className="text-gray-600 mb-6">退出后需要重新登录才能继续使用。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
