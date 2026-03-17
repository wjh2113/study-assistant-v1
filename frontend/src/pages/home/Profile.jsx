import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { pointsAPI } from '../../services'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [pointsBalance, setPointsBalance] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPoints()
  }, [])

  const loadPoints = async () => {
    try {
      const res = await pointsAPI.getBalance()
      setPointsBalance(res.data.data)
    } catch (error) {
      console.error('加载积分失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { icon: '📚', title: '我的课本', path: '/textbooks', show: true },
    { icon: '📊', title: '学习记录', path: '/learning/records', show: true },
    { icon: '📈', title: '学习统计', path: '/learning/stats', show: true },
    { icon: '🏆', title: '我的排名', path: '/leaderboard', show: true },
    { icon: '👨‍👩‍👧', title: '家庭绑定', path: '/family/bind', show: user?.role === 'parent' },
    { icon: '⚙️', title: '设置', path: '/settings', show: true },
  ]

  // 脱敏手机号
  const maskPhone = (phone) => {
    if (!phone || phone.length !== 11) return phone
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </button>
            <h1 className="text-xl font-bold text-gray-900">个人中心</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-6">
            {/* 用户信息卡片 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-8">
                <div className="flex items-center space-x-4">
                  {/* 头像 */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                      {user?.nickname?.charAt(0).toUpperCase() || '👤'}
                    </div>
                  </div>
                  
                  {/* 用户信息 */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {user?.nickname || '用户'}
                      {user?.role === 'student' && (
                        <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">学生</span>
                      )}
                      {user?.role === 'parent' && (
                        <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">家长</span>
                      )}
                    </h2>
                    <div className="mt-2 space-y-1 text-gray-600">
                      {user?.grade && (
                        <p className="text-sm">
                          {user.grade}年级 {user.school || ''}
                        </p>
                      )}
                      {user?.phone && (
                        <p className="text-sm">手机号：{maskPhone(user.phone)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 编辑资料按钮 */}
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/profile/edit')}
                    className="w-full sm:w-auto px-6 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition-colors"
                  >
                    编辑资料
                  </button>
                </div>
              </div>
            </div>

            {/* 积分卡片 */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow text-white overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 text-sm">💰 我的积分</p>
                    <p className="mt-1 text-4xl font-bold">
                      {pointsBalance?.points !== undefined ? pointsBalance.points.toLocaleString() : '0'}
                    </p>
                    <p className="mt-1 text-primary-100 text-sm">分</p>
                  </div>
                  <div className="text-6xl opacity-30">💰</div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary-400">
                  <button
                    onClick={() => navigate('/points/ledger')}
                    className="text-primary-100 hover:text-white text-sm flex items-center"
                  >
                    查看积分明细
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 功能列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">功能列表</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {menuItems.filter(item => item.show).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(item.path)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-gray-900 font-medium">{item.title}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* 退出登录按钮 */}
            <div className="pt-4">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3 px-4 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 退出登录确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-2">确认退出登录？</h3>
            <p className="text-gray-600 mb-6">退出后需要重新登录才能继续使用。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
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
