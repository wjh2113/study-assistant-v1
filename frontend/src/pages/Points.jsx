import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pointsAPI } from '../services'

export default function Points() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [balance, setBalance] = useState(null)
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [balanceRes, ledgerRes] = await Promise.all([
        pointsAPI.getBalance(),
        pointsAPI.getLedger()
      ])
      setBalance(balanceRes.data.data)
      setLedger(ledgerRes.data.data || [])
    } catch (error) {
      console.error('加载积分数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWaysToEarnPoints = () => [
    { title: '📖 学习知识点', desc: '每学习一个知识点 +10 积分', icon: '📖' },
    { title: '✅ 完成练习', desc: '每完成一次练习 +20 积分', icon: '✅' },
    { title: '🎯 连续签到', desc: '每日签到 +5 积分，连续签到额外奖励', icon: '🎯' },
    { title: '🏆 成就奖励', desc: '解锁成就获得高额积分', icon: '🏆' },
    { title: '💬 参与讨论', desc: '在社区分享经验 +15 积分', icon: '💬' }
  ]

  const waysToEarn = getWaysToEarnPoints()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← 返回
              </button>
              <h1 className="text-xl font-bold text-primary-600">💰 积分中心</h1>
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
            {/* 积分余额卡片 */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm font-medium opacity-90">当前积分余额</div>
              <div className="mt-2 text-5xl font-bold">{balance?.points || 0}</div>
              <div className="mt-2 text-sm opacity-80">
                {balance?.last_updated ? `更新于：${new Date(balance.last_updated).toLocaleString()}` : ''}
              </div>
            </div>

            {/* 获取积分方式 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🎁 如何获取积分</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {waysToEarn.map((way, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="text-2xl mb-2">{way.icon}</div>
                      <div className="font-medium text-gray-900">{way.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{way.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 积分流水 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📋 积分流水</h3>
                {ledger.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暂无积分流水记录</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">积分变化</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">余额</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ledger.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(record.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                record.change > 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {record.type || '变动'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{record.description || '-'}</td>
                            <td className={`px-4 py-3 text-sm font-medium text-right ${
                              record.change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {record.change > 0 ? '+' : ''}{record.change}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{record.balance_after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
