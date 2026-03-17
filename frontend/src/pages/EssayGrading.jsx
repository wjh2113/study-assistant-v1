import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aiGradingAPI } from '../services'

export default function EssayGradingPage() {
  const [essay, setEssay] = useState('')
  const [subject, setSubject] = useState('chinese')
  const [grade, setGrade] = useState('9')
  const [topic, setTopic] = useState('')
  const [wordLimit, setWordLimit] = useState({ min: 600, max: 800 })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const canSubmit = essay.trim().length > 0 && topic.trim().length > 0 && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!essay.trim()) {
      setError('请输入作文内容')
      return
    }

    if (!topic.trim()) {
      setError('请输入作文题目')
      return
    }

    setLoading(true)
    try {
      const res = await aiGradingAPI.gradeEssay({
        essay,
        subject,
        grade,
        topic,
        wordLimit
      })

      setResult(res.data)
    } catch (err) {
      setError('批改失败，请稍后重试')
      console.error('批改失败:', err)
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
              <h1 className="ml-4 text-xl font-bold text-gray-900">📝 AI 作文评分</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-6 px-4">
        {/* 作文输入区域 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  科目
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="chinese">语文</option>
                  <option value="english">英语</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年级
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                >
                  <option value="7">七年级</option>
                  <option value="8">八年级</option>
                  <option value="9">九年级</option>
                  <option value="10">高一</option>
                  <option value="11">高二</option>
                  <option value="12">高三</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作文题目
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  placeholder="例如：我的梦想"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作文字数要求
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={wordLimit.min}
                  onChange={(e) => setWordLimit({ ...wordLimit, min: parseInt(e.target.value) || 0 })}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  placeholder="最小字数"
                />
                <span className="flex items-center">-</span>
                <input
                  type="number"
                  value={wordLimit.max}
                  onChange={(e) => setWordLimit({ ...wordLimit, max: parseInt(e.target.value) || 0 })}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  placeholder="最大字数"
                />
                <span className="flex items-center text-gray-500">字</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作文内容
              </label>
              <textarea
                rows="10"
                value={essay}
                onChange={(e) => {
                  setEssay(e.target.value)
                  if (error) setError('')
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-3"
                placeholder="请在此输入你的作文内容..."
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '正在批改中...' : '提交作文'}
            </button>
          </form>
        </div>

        {/* 批改结果 */}
        {result && result.success && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 批改结果</h3>

            {/* 总分 */}
            <div className="mb-6 text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">
                {result.totalScore}
              </div>
              <div className="text-gray-500">总分（满分 100）</div>
            </div>

            {/* 各维度得分 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(result.scores || {}).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600">{value}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {key === 'content' && '内容'}
                    {key === 'structure' && '结构'}
                    {key === 'language' && '语言'}
                    {key === 'creativity' && '创意'}
                  </div>
                </div>
              ))}
            </div>

            {/* 总体评语 */}
            {result.overallFeedback && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2">👨‍🏫 总体评语</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{result.overallFeedback}</p>
              </div>
            )}

            {/* 各维度评价 */}
            {result.feedback && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-800 mb-3">📝 详细评价</h4>
                <div className="space-y-3">
                  {Object.entries(result.feedback).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-700 mb-1">
                        {key === 'content' && '内容'}
                        {key === 'structure' && '结构'}
                        {key === 'language' && '语言'}
                        {key === 'creativity' && '创意'}
                      </div>
                      <p className="text-sm text-gray-600">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 改进建议 */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-800 mb-3">💡 改进建议</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 错误统计 */}
            {result.errors && result.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-3">⚠️ 发现的错误</h4>
                <div className="space-y-2">
                  {result.errors.map((err, index) => (
                    <div key={index} className="bg-red-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-medium text-red-600">
                          {err.type === 'grammar' && '语法错误'}
                          {err.type === 'spelling' && '拼写错误'}
                          {err.type === 'punctuation' && '标点错误'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="text-red-600 line-through">{err.original}</span>
                        {err.suggestion && (
                          <span className="text-green-600 ml-2">→ {err.suggestion}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 字数统计 */}
            {result.wordCount && (
              <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
                实际字数：{result.wordCount}字
                {wordLimit && `（要求：{wordLimit.min}-{wordLimit.max}字）`}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
