import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { familyAPI } from '../services'

export default function ParentBind() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [bindings, setBindings] = useState([])
  const [studentPhone, setStudentPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [bindingLoading, setBindingLoading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    loadBindings()
  }, [])

  const loadBindings = async () => {
    try {
      const res = await familyAPI.getBindings()
      setBindings(res.data.data || [])
    } catch (error) {
      console.error('加载绑定列表失败:', error)
      setMessage({ type: 'error', text: '加载绑定列表失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleBind = async (e) => {
    e.preventDefault()
    if (!studentPhone.trim()) {
      setMessage({ type: 'error', text: '请输入学生手机号' })
      return
    }

    setBindingLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await familyAPI.createBinding({ studentPhone: studentPhone.trim() })
      setMessage({ type: 'success', text: '绑定请求已发送，等待学生确认' })
      setStudentPhone('')
      loadBindings()
    } catch (error) {
      console.error('创建绑定失败:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || '绑定失败' })
    } finally {
      setBindingLoading(false)
    }
  }

  const handleCancelBinding = async (bindingId) => {
    if (!confirm('确定要取消这个绑定吗？')) return

    try {
      await familyAPI.deleteBinding(bindingId)
      setMessage({ type: 'success', text: '已取消绑定' })
      loadBindings()
    } catch (error) {
      console.error('取消绑定失败:', error)
      setMessage({ type: 'error', text: '取消绑定失败' })
    }
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
                  className="text-primary-600 font-medium"
                >
                  🔗 绑定管理
                </button>
                <button
                  onClick={() => navigate('/parent/monitor')}
                  className="text-gray-600 hover:text-primary-600"
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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 消息提示 */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* 绑定表单 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🔗 绑定学生账号</h3>
            <form onSubmit={handleBind} className="space-y-4">
              <div>
                <label htmlFor="studentPhone" className="block text-sm font-medium text-gray-700">
                  学生手机号
                </label>
                <input
                  type="tel"
                  id="studentPhone"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="请输入学生的手机号"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  pattern="[0-9]{11}"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">输入学生手机号后，系统会向学生发送绑定确认请求</p>
              </div>
              <button
                type="submit"
                disabled={bindingLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bindingLoading ? '发送中...' : '发送绑定请求'}
              </button>
            </form>
          </div>
        </div>

        {/* 绑定状态列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📋 绑定状态列表</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : bindings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无绑定记录，请先添加学生账号
              </div>
            ) : (
              <div className="space-y-4">
                {bindings.map((binding) => (
                  <div
                    key={binding.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        学生：{binding.studentName || binding.studentPhone}
                      </p>
                      <p className="text-sm text-gray-500">
                        绑定时间：{new Date(binding.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm">
                        状态：
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          binding.status === 'active' ? 'bg-green-100 text-green-800' :
                          binding.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {binding.status === 'active' ? '✅ 已生效' :
                           binding.status === 'pending' ? '⏳ 待确认' :
                           binding.status === 'rejected' ? '❌ 已拒绝' :
                           binding.status === 'cancelled' ? '🚫 已取消' : binding.status}
                        </span>
                      </p>
                    </div>
                    {(binding.status === 'active' || binding.status === 'pending') && (
                      <button
                        onClick={() => handleCancelBinding(binding.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        取消绑定
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
