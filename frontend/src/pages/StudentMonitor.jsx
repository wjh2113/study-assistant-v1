import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { familyAPI } from '../services'

export default function StudentMonitor() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { studentId } = useParams()
  const [bindings, setBindings] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [stats, setStats] = useState(null)
  const [progress, setProgress] = useState(null)
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    loadBindings()
  }, [])

  useEffect(() => {
    if (selectedStudent) {
      loadStudentData()
    }
  }, [selectedStudent])

  const loadBindings = async () => {
    try {
      const res = await familyAPI.getBindings()
      const activeBindings = (res.data.data || []).filter(b => b.status === 'active')
      setBindings(activeBindings)
      if (activeBindings.length > 0 && !selectedStudent) {
        setSelectedStudent(activeBindings[0])
      }
    } catch (error) {
      console.error('加载绑定列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudentData = async () => {
    if (!selectedStudent) return

    setLoading(true)
    try {
      const [statsRes, progressRes, rankingsRes] = await Promise.all([
        familyAPI.getStudentStats(selectedStudent.studentId),
        familyAPI.getStudentProgress(selectedStudent.studentId),
        familyAPI.getPointsRanking()
      ])
      setStats(statsRes.data.data)
      setProgress(progressRes.data.data)
      setRankings(rankingsRes.data.data || [])
    } catch (error) {
      console.error('加载学生数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-primary-600">📚 学习助手 - 家长监控</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/parent/bind')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  🔗 绑定管理
                </button>
                <button
                  onClick={() => navigate('/parent/monitor')}
                  className="text-primary-600 font-medium"
                >
                  📊 学生监控
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">你好，{user?.nickname || user?.username || '家长用户'}</span>
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
        {/* 学生选择器 */}
        {bindings.length > 1 && (
          <div className="mb-6 bg-white shadow rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择学生：</label>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const binding = bindings.find(b => b.id === e.target.value)
                setSelectedStudent(binding)
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              {bindings.map(binding => (
                <option key={binding.id} value={binding.id}>
                  {binding.studentName || binding.studentPhone}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : !selectedStudent ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">暂无绑定的学生</p>
            <button
              onClick={() => navigate('/parent/bind')}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              去绑定学生账号 →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 学习统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">总学习时长</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">
                    {Math.round((stats?.totalDuration || 0) / 60)} <span className="text-sm font-normal text-gray-500">分钟</span>
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">总答题数</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats?.totalQuestions || 0} <span className="text-sm font-normal text-gray-500">题</span>
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">正确率</div>
                  <div className="mt-1 text-3xl font-semibold text-green-600">
                    {Math.round(stats?.accuracy || 0)}%
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="text-sm font-medium text-gray-500">掌握知识点</div>
                  <div className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats?.masteredPoints || 0} <span className="text-sm font-normal text-gray-500">个</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 学习进度趋势图 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📈 学习进度趋势</h3>
                {progress?.trend && progress.trend.length > 0 ? (
                  <div className="h-64">
                    <div className="flex items-end justify-between h-full space-x-2">
                      {progress.trend.map((item, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-primary-200 rounded-t"
                            style={{ height: `${(item.duration / Math.max(...progress.trend.map(t => t.duration))) * 100}%` }}
                          ></div>
                          <span className="text-xs text-gray-500 mt-2">{formatDate(item.date)}</span>
                          <span className="text-xs text-gray-600">{Math.round(item.duration / 60)}min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无学习记录</p>
                )}
              </div>
            </div>

            {/* 知识点掌握度 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📚 知识点掌握度</h3>
                {progress?.knowledgePoints && progress.knowledgePoints.length > 0 ? (
                  <div className="space-y-4">
                    {progress.knowledgePoints.map((point, index) => (
                      <div key={point.id || index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{point.title}</span>
                          <span className="text-sm text-gray-500">{point.mastery || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              point.mastery >= 80 ? 'bg-green-600' :
                              point.mastery >= 60 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${point.mastery || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无知识点数据</p>
                )}
              </div>
            </div>

            {/* 积分排行 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 积分排行榜</h3>
                {rankings.length > 0 ? (
                  <div className="space-y-3">
                    {rankings.slice(0, 10).map((item, index) => (
                      <div
                        key={item.userId || index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          item.userId === selectedStudent.studentId ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-400 text-gray-900' :
                            index === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900">
                            {item.username || `用户${item.userId}`}
                            {item.userId === selectedStudent.studentId && ' (当前学生)'}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-primary-600">
                          💰 {item.points || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无排行数据</p>
                )}
              </div>
            </div>
          </div>
        )}
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
