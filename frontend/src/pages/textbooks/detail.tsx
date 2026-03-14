import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { textbookApi, practiceApi } from '../../services/api'
import './detail.scss'

export default function TextbooksDetail() {
  const router = useRouter()
  const textbookId = parseInt(router.params.id || '0')
  
  const [textbook, setTextbook] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])

  useEffect(() => {
    loadDetail()
  }, [])

  const loadDetail = async () => {
    try {
      const data = await textbookApi.getDetail(textbookId)
      setTextbook(data)
      setUnits(data.units || [])
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  }

  const handleStartPractice = async (unitId?: number) => {
    try {
      const session = await practiceApi.createSession({
        textbookId,
        unitId,
        questionCount: 10,
      })

      Taro.navigateTo({
        url: `/pages/practice/answer?id=${session.id}`,
      })
    } catch (error: any) {
      Taro.showToast({ title: error.message || '创建失败', icon: 'none' })
    }
  }

  if (!textbook) {
    return <View className='detail-page'>加载中...</View>
  }

  return (
    <View className='detail-page'>
      {/* 课本信息 */}
      <View className='textbook-header'>
        <Text className='textbook-title'>{textbook.title}</Text>
        <View className='textbook-meta'>
          <Text className='tag'>{textbook.subject}</Text>
          <Text className='tag'>{textbook.grade}年级</Text>
          {textbook.version && <Text className='tag'>{textbook.version}</Text>}
        </View>
      </View>

      {/* 单元列表 */}
      <View className='section'>
        <Text className='section-title'>单元列表</Text>
        <ScrollView className='units-list' scrollY>
          {units.length === 0 ? (
            <View className='empty'>暂无单元</View>
          ) : (
            units.map((unit: any, index: number) => (
              <View key={unit.id} className='unit-item'>
                <View className='unit-info'>
                  <Text className='unit-number'>{unit.unitNumber || `第${index + 1}单元`}</Text>
                  <Text className='unit-title'>{unit.title}</Text>
                </View>
                <View className='unit-actions'>
                  <Text className='unit-pages'>
                    {unit.pageStart && unit.pageEnd ? `P${unit.pageStart}-${unit.pageEnd}` : ''}
                  </Text>
                  <Button
                    className='practice-btn'
                    size='mini'
                    onClick={() => handleStartPractice(unit.id)}
                  >
                    练习
                  </Button>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* 开始练习按钮 */}
      <Button
        className='start-all-btn'
        type='primary'
        onClick={() => handleStartPractice()}
      >
        开始综合练习
      </Button>
    </View>
  )
}
