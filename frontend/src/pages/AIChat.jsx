import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { aiAPI } from '../services'

export default function AIChatPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [submitError, setSubmitError] = useState('')
  
  // 计算按钮是否可用
  const canSubmit = question.trim().length > 0 && !loading

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await aiAPI.getHistory({ limit: 20 })
      setHistory(res.data.data)
    } catch (error) {
      console.error('加载历史失败:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    
    if (!question.trim()) {
      setSubmitError('请输入问题内容')
      return
    }

    setLoading(true)
    try {
      const res = await aiAPI.ask({ question })
      setAnswer(res.data.data.answer)
      setQuestion('')
      loadHistory()
    } catch (error) {
      setSubmitError('提问失败，请稍后重试')
      setAnswer('')
      console.error('提问失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-primary-600 hover:text-primary-700">← 返回</Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900">🤖 AI 答疑</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 px-4">
        {/* 提问区域 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请输入你的问题
              </label>
              <textarea
                rows="3"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value)
                  if (submitError) setSubmitError('')
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-3"
                placeholder="例如：什么是勾股定理？如何理解牛顿第一定律？"
              />
              {submitError && (
                <p className="mt-1 text-sm text-red-600">{submitError}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '思考中...' : '提问'}
            </button>
          </form>

          {/* AI 回答 */}
          {answer && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-2">AI 回答：</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>
            </div>
          )}
        </div>

        {/* 历史记录 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">问答历史</h3>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无问答记录</p>
          ) : (
            <div className="space-y-4">
              {history.map(record => (
                <div key={record.id} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-900">{record.question}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(record.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{record.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
