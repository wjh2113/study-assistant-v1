import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { knowledgeAPI, progressAPI, aiAPI, pointsAPI } from '../services'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [stats, setStats] = useState(null)
  const [knowledgePoints, setKnowledgePoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [pointsBalance, setPointsBalance] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, knowledgeRes, pointsRes] = await Promise.all([
        progressAPI.getStats(),
        knowledgeAPI.getList({ limit: 5 }),
        pointsAPI.getBalance()
      ])
      setStats(statsRes.data.data)
      setKnowledgePoints(knowledgeRes.data.data)
      setPointsBalance(pointsRes.data.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
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
                  onClick={() => navigate('/knowledge')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  📖 知识点
                </button>
                <button
                  onClick={() => navigate('/textbooks')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  📚 课本管理
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
                  className="text-gray-600 hover:text-primary-600 font-medium"
                >
                  💰 积分{pointsBalance?.points !== undefined ? `(${pointsBalance.points})` : ''}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">你好，{user?.username}</span>
              <button
                onClick={logout}
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
        {loading ? (
          <div className="text-center py-12">加载中...</div>
        ) : (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">知识点总数</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">{stats?.totalPoints || 0}</div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">学习时长 (分钟)</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">{Math.round((stats?.totalDuration || 0) / 60)}</div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">平均完成度</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">{Math.round(stats?.avgCompletionRate || 0)}%</div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">已完成</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">{stats?.completedPoints || 0}</div>
                </div>
              </div>
            </div>

            {/* 最近知识点 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">最近知识点</h3>
                {knowledgePoints.length === 0 ? (
                  <p className="text-gray-500">暂无知识点，快去添加第一个吧！</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {knowledgePoints.map(point => (
                      <li key={point.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-primary-600">{point.title}</p>
                            <p className="text-sm text-gray-500">{point.category || '未分类'}</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(point.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
