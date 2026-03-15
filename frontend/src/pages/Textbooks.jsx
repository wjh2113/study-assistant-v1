import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { textbooksAPI } from '../services'

export default function TextbooksPage() {
  const [textbooks, setTextbooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedTextbook, setSelectedTextbook] = useState(null)
  const [units, setUnits] = useState([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    loadTextbooks()
  }, [])

  const loadTextbooks = async () => {
    try {
      const res = await textbooksAPI.getList()
      setTextbooks(res.data.data || [])
    } catch (error) {
      console.error('加载课本失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('请上传 PDF 格式的课本文件')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setShowUploadModal(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace('.pdf', ''))

      const res = await textbooksAPI.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })

      alert('上传成功！')
      setShowUploadModal(false)
      loadTextbooks()
    } catch (error) {
      console.error('上传失败:', error)
      alert('上传失败：' + (error.response?.data?.error || '未知错误'))
      setShowUploadModal(false)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const loadUnits = async (textbook) => {
    setSelectedTextbook(textbook)
    setUnitsLoading(true)
    try {
      const res = await textbooksAPI.getUnits(textbook.id)
      setUnits(res.data.data || [])
    } catch (error) {
      console.error('加载单元失败:', error)
      alert('加载单元列表失败')
    } finally {
      setUnitsLoading(false)
    }
  }

  const closeUnitsModal = () => {
    setSelectedTextbook(null)
    setUnits([])
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个课本吗？')) return
    try {
      await textbooksAPI.delete(id)
      loadTextbooks()
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
              <h1 className="ml-4 text-xl font-bold text-gray-900">课本管理</h1>
            </div>
            <label className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 cursor-pointer">
              📤 上传 PDF 课本
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">加载中...</p>
              </div>
            ) : textbooks.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-lg">暂无课本</p>
                <p className="text-sm mt-2">点击右上角上传第一个 PDF 课本</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {textbooks.map(textbook => (
                  <div key={textbook.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-4xl mb-2">📖</div>
                        <h3 className="text-lg font-medium text-gray-900">{textbook.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {textbook.units_count || 0} 个单元
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          上传时间：{new Date(textbook.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => loadUnits(textbook)}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        查看单元
                      </button>
                      <a
                        href={textbook.file_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        下载
                      </a>
                      <button
                        onClick={() => handleDelete(textbook.id)}
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

      {/* Upload Progress Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              {uploading ? '上传中...' : '上传完成'}
            </h3>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                {uploadProgress}%
              </p>
            </div>
            {!uploading && (
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      )}

      {/* Units Modal */}
      {selectedTextbook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                📖 {selectedTextbook.title} - 单元列表
              </h3>
              <button
                onClick={closeUnitsModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            {unitsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">加载单元中...</p>
              </div>
            ) : units.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>暂无单元数据</p>
                <p className="text-sm mt-1">系统正在解析课本内容，请稍后再试</p>
              </div>
            ) : (
              <div className="space-y-2">
                {units.map((unit, index) => (
                  <div
                    key={unit.id || index}
                    className="border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <span className="text-primary-600 font-medium mr-3">
                        {unit.unit_number ? `第${unit.unit_number}单元` : `单元 ${index + 1}`}
                      </span>
                      <span className="text-gray-900 flex-1">{unit.title}</span>
                    </div>
                    {unit.description && (
                      <p className="text-sm text-gray-600 mt-1 ml-2">
                        {unit.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
