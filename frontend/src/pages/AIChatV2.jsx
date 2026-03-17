import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { aiGatewayV2API } from '../services'

export default function AIChatV2Page() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const canSubmit = input.trim().length > 0 && !loading

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!input.trim()) {
      setError('请输入问题内容')
      return
    }

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await aiGatewayV2API.chat(newMessages, {
        taskType: 'chat',
        temperature: 0.7,
        maxTokens: 2048
      })

      if (res.data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: res.data.data.content
        }
        setMessages([...newMessages, assistantMessage])
      } else {
        setError('回答失败，请稍后重试')
      }
    } catch (err) {
      setError('连接失败，请稍后重试')
      console.error('对话失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = () => {
    setMessages([])
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-primary-600 hover:text-primary-700">← 返回</Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900">🤖 AI 智能答疑</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleClearHistory}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                清空历史
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">你好！我是你的 AI 学习助手</h2>
              <p className="text-gray-600 mb-6">有任何学习问题都可以问我哦～</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <div className="bg-white p-4 rounded-lg shadow-sm text-left">
                  <div className="font-medium text-gray-900 mb-1">💡 概念解释</div>
                  <div className="text-sm text-gray-600">什么是勾股定理？如何证明？</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-left">
                  <div className="font-medium text-gray-900 mb-1">📝 解题指导</div>
                  <div className="text-sm text-gray-600">这道数学题应该怎么解？</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-left">
                  <div className="font-medium text-gray-900 mb-1">📚 知识点总结</div>
                  <div className="text-sm text-gray-600">帮我总结三角函数的所有公式</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-left">
                  <div className="font-medium text-gray-900 mb-1">🎯 学习方法</div>
                  <div className="text-sm text-gray-600">如何提高英语阅读理解能力？</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto py-4 px-4">
          {error && (
            <div className="mb-3 text-sm text-red-600 text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (error) setError('')
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-3"
              placeholder="输入你的问题..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '思考中...' : '发送'}
            </button>
          </form>
          <div className="text-xs text-gray-500 mt-2 text-center">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>
    </div>
  )
}
