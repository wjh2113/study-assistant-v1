import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Leaderboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('total')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [currentUserRank, setCurrentUserRank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjectList, setSubjectList] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [pointsBalance, setPointsBalance] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const tabs = [
    { id: 'total', label: '总榜', api: '/api/leaderboards/total' },
    { id: 'weekly', label: '周榜', api: '/api/leaderboards/weekly' },
    { id: 'monthly', label: '月榜', api: '/api/leaderboards/monthly' },
    { id: 'subject', label: '科目榜', api: '/api/leaderboards/subject' }
  ]

  useEffect(() => {
    loadLeaderboard()
    loadSubjects()
    loadPoints()
  }, [activeTab, selectedSubject])

  const loadPoints = async () => {
    try {
      const res = await api.get('/points/balance')
      setPointsBalance(res.data.data)
    } catch (error) {
      console.error('加载积分失败:', error)
    }
  }

  const loadSubjects = async () => {
    try {
      const res = await api.get('/knowledge/categories')
      if (res.data.data && Array.isArray(res.data.data)) {
        setSubjectList(res.data.data)
        if (res.data.data.length > 0 && !selectedSubject) {
          setSelectedSubject(res.data.data[0])
        }
      }
    } catch (error) {
      console.error('加载科目列表失败:', error)
    }
  }

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const currentTab = tabs.find(t => t.id === activeTab)
      let url = currentTab.api
      if (activeTab === 'subject' && selectedSubject) {
        url = `${url}/${encodeURIComponent(selectedSubject)}`
      }
      const res = await api.get(url)
      const data = res.data.data || []
      setLeaderboardData(data)
      
      // 查找当前用户排名
      if (user?.id) {
        const userRank = data.find(item => item.user_id === user.id || item.userId === user.id)
        setCurrentUserRank(userRank || null)
      }
    } catch (error) {
      console.error('加载排行榜失败:', error)
      setLeaderboardData([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadLeaderboard()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const renderAvatar = (userItem) => {
    const avatarUrl = userItem.avatar || userItem.avatar_url
    const nickname = userItem.nickname || userItem.username || '用户'
    
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={nickname}
          className="w-10 h-10 rounded-full object-cover"
        />
      )
    }
    return (
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
        {nickname.charAt(0).toUpperCase()}
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
                  onClick={() => navigate('/knowledge')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  📖 知识点
                </button>
                <button
                  onClick={() => navigate('/practice')}
                  className="text-gray-600 hover:text-primary-600"
                >
                  📝 智能练习
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
                  onClick={() => navigate('/leaderboard')}
                  className="text-primary-600 font-medium"
                >
                  🏆 排行榜
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
              <span className="text-gray-600">你好，{user?.nickname || user?.username || '用户'}</span>
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
        <div className="bg-white shadow rounded-lg">
          {/* 页面标题和刷新按钮 */}
          <div className="px-4 py-5 sm:p-6 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">🏆 排行榜</h3>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
          </div>

          {/* 标签页 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex space-x-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* 科目选择器（仅科目榜显示） */}
            {activeTab === 'subject' && (
              <div className="mt-3">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {subjectList.map((subject, index) => (
                    <option key={index} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 排行榜列表 */}
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-gray-600">加载中...</p>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无排名数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardData.map((item, index) => {
                  const rank = index + 1
                  const isCurrentUser = (item.user_id === user?.id || item.userId === user?.id)
                  
                  return (
                    <div
                      key={item.user_id || item.userId || index}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isCurrentUser
                          ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-500'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        {/* 排名 */}
                        <div className="w-12 text-center">
                          <span className="text-2xl">{getRankIcon(rank)}</span>
                        </div>
                        
                        {/* 头像 */}
                        {renderAvatar(item)}
                        
                        {/* 用户信息 */}
                        <div>
                          <p className={`font-medium ${isCurrentUser ? 'text-primary-700' : 'text-gray-900'}`}>
                            {item.nickname || item.username || '用户'}
                            {isCurrentUser && <span className="ml-2 text-xs text-primary-600">(我)</span>}
                          </p>
                          {item.school && (
                            <p className="text-sm text-gray-500">{item.school}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* 积分 */}
                      <div className="text-right">
                        <p className={`text-xl font-bold ${isCurrentUser ? 'text-primary-600' : 'text-gray-900'}`}>
                          {item.points || item.score || 0}
                        </p>
                        <p className="text-sm text-gray-500">积分</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* 当前用户排名（如果不在前几名） */}
            {currentUserRank && !leaderboardData.some(item => 
              item.user_id === user?.id || item.userId === user?.id
            ) && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">我的排名</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {renderAvatar(currentUserRank)}
                    <span className="font-medium text-gray-900">
                      {currentUserRank.nickname || currentUserRank.username || '用户'} (我)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {currentUserRank.rank || 'N/A'}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">名</span>
                    <span className="text-gray-600 ml-3">
                      {currentUserRank.points || currentUserRank.score || 0} 积分
                    </span>
                  </div>
                </div>
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
