import { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { textbookApi } from '../../services/api'
import './index.scss'

export default function TextbooksIndex() {
  const router = useRouter()
  const [textbooks, setTextbooks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterGrade, setFilterGrade] = useState<number | null>(null)

  useEffect(() => {
    loadTextbooks()
  }, [filterGrade])

  const loadTextbooks = async () => {
    setLoading(true)
    try {
      const params: any = { status: 'READY' }
      if (filterGrade) {
        params.grade = filterGrade
      }
      const data = await textbookApi.getList(params)
      setTextbooks(data)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = () => {
    Taro.navigateTo({ url: '/pages/textbooks/upload' })
  }

  const handleDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/textbooks/detail?id=${id}` })
  }

  return (
    <View className='textbooks-page'>
      <View className='header'>
        <Text className='title'>📖 我的课本</Text>
        <Button className='upload-btn' size='mini' onClick={handleUpload}>
          上传课本
        </Button>
      </View>

      {/* 年级筛选 */}
      <View className='filter-bar'>
        <View
          className={`filter-item ${!filterGrade ? 'active' : ''}`}
          onClick={() => setFilterGrade(null)}
        >
          全部
        </View>
        {[1, 2, 3, 4, 5, 6].map((grade) => (
          <View
            key={grade}
            className={`filter-item ${filterGrade === grade ? 'active' : ''}`}
            onClick={() => setFilterGrade(grade)}
          >
            {grade}年级
          </View>
        ))}
      </View>

      {/* 课本列表 */}
      <ScrollView className='textbook-list' scrollY>
        {loading ? (
          <View className='loading'>加载中...</View>
        ) : textbooks.length === 0 ? (
          <View className='empty'>暂无课本</View>
        ) : (
          textbooks.map((textbook) => (
            <View
              key={textbook.id}
              className='textbook-card'
              onClick={() => handleDetail(textbook.id)}
            >
              <View className='textbook-info'>
                <Text className='textbook-title'>{textbook.title}</Text>
                <View className='textbook-meta'>
                  <Text className='tag'>{textbook.subject}</Text>
                  <Text className='tag'>{textbook.grade}年级</Text>
                  {textbook.version && <Text className='tag'>{textbook.version}</Text>}
                </View>
              </View>
              <View className='textbook-stats'>
                <Text>{textbook._count?.units || 0}个单元</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
