import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { progressAPI, knowledgeAPI } from '../services'

export default function ProgressPage() {
  const [stats, setStats] = useState(null)
  const [progress, setProgress] = useState([])
  const [knowledgePoints, setKnowledgePoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState('')
  const [duration, setDuration] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, progressRes, knowledgeRes] = await Promise.all([
        progressAPI.getStats(),
        progressAPI.getList(),
        knowledgeAPI.getList()
      ])
      setStats(statsRes.data.data)
      setProgress(progressRes.data.data)
      setKnowledgePoints(knowledgeRes.data.data)
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogTime = async (e) => {
    e.preventDefault()
    if (!selectedPoint || !duration) return

    try {
      await progressAPI.logStudyTime({
        knowledgePointId: selectedPoint,
        duration: parseInt(duration) * 60 // 转换为秒
      })
      alert('学习时长记录成功！')
      setDuration('')
      loadData()
    } catch (error) {
      alert('记录失败')
    }
  }

  const handleUpdateProgress = async (pointId, completionRate) => {
    try {
      await progressAPI.upsert({
        knowledgePointId: pointId,
        completionRate: parseInt(completionRate)
      })
      loadData()
    } catch (error) {
      alert('更新失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-primary-600 hover:text-primary-700">← 返回</Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900">📊 学习进度</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {loading ? (
          <div className="text-center">加载中...</div>
        ) : (
          <div className="space-y-6">
            {/* 统计概览 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <div className="text-sm font-medium text-gray-500">总知识点</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">{stats?.totalPoints || 0}</div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <div className="text-sm font-medium text-gray-500">学习时长</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {Math.round((stats?.totalDuration || 0) / 3600)} 小时
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <div className="text-sm font-medium text-gray-500">平均完成度</div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {Math.round(stats?.avgCompletionRate || 0)}%
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg p-5">
                <div className="text-sm font-medium text-gray-500">已完成</div>
                <div className="mt-1 text-3xl font-semibold text-green-600">
                  {stats?.completedPoints || 0}
                </div>
              </div>
            </div>

            {/* 记录学习时长 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">记录学习时长</h3>
              <form onSubmit={handleLogTime} className="flex gap-4">
                <select
                  value={selectedPoint}
                  onChange={(e) => setSelectedPoint(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="">选择知识点</option>
                  {knowledgePoints.map(point => (
                    <option key={point.id} value={point.id}>{point.title}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="分钟"
                  className="w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                />
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
                >
                  记录
                </button>
              </form>
            </div>

            {/* 学习进度列表 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">学习进度详情</h3>
              {progress.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无学习记录</p>
              ) : (
                <div className="space-y-4">
                  {progress.map(item => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">
                          {item.knowledge_point_title || '已删除的知识点'}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {Math.round((item.study_duration || 0) / 60)} 分钟
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all"
                              style={{ width: `${item.completion_rate || 0}%` }}
                            />
                          </div>
                        </div>
                        <select
                          value={item.completion_rate || 0}
                          onChange={(e) => handleUpdateProgress(item.knowledge_point_id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="0">0%</option>
                          <option value="25">25%</option>
                          <option value="50">50%</option>
                          <option value="75">75%</option>
                          <option value="100">100%</option>
                        </select>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        上次学习：{new Date(item.last_studied_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
