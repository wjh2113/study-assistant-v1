import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { knowledgeAPI } from '../services'

export default function KnowledgePage() {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: ''
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadPoints()
  }, [])

  const loadPoints = async () => {
    try {
      const res = await knowledgeAPI.getList()
      setPoints(res.data.data)
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (editingId) {
        await knowledgeAPI.update(editingId, data)
      } else {
        await knowledgeAPI.create(data)
      }

      setFormData({ title: '', content: '', category: '', tags: '' })
      setEditingId(null)
      setShowForm(false)
      loadPoints()
    } catch (error) {
      alert(error.response?.data?.error || '操作失败')
    }
  }

  const handleEdit = (point) => {
    setFormData({
      title: point.title,
      content: point.content || '',
      category: point.category || '',
      tags: Array.isArray(point.tags) ? point.tags.join(', ') : ''
    })
    setEditingId(point.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个知识点吗？')) return
    try {
      await knowledgeAPI.delete(id)
      loadPoints()
    } catch (error) {
      alert('删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-primary-600 hover:text-primary-700">← 返回</Link>
              <h1 className="ml-4 text-xl font-bold text-gray-900">知识点管理</h1>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setFormData({ title: '', content: '', category: '', tags: '' })
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              {showForm ? '取消' : '+ 新增知识点'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">{editingId ? '编辑知识点' : '新增知识点'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">标题</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">内容</label>
                <textarea
                  rows="4"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">分类</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    placeholder="例如：数学、英语、编程"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">标签</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    placeholder="用逗号分隔，例如：重点，难点"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
              >
                {editingId ? '更新' : '创建'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center">加载中...</div>
            ) : points.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                暂无知识点，点击右上角添加第一个知识点
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {points.map(point => (
                  <div key={point.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900">{point.title}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {point.category || '未分类'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                      {point.content || '无内容'}
                    </p>
                    {point.tags && point.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {point.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(point)}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(point.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
