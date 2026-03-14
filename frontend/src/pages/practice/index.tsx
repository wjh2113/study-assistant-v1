import { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { practiceApi, textbookApi } from '../../services/api'
import './index.scss'

export default function PracticeIndex() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [textbooks, setTextbooks] = useState<any[]>([])
  const [selectedTextbook, setSelectedTextbook] = useState<number | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [units, setUnits] = useState<any[]>([])

  useEffect(() => {
    loadTextbooks()
    loadSessions()
  }, [])

  useEffect(() => {
    if (selectedTextbook) {
      loadUnits(selectedTextbook)
    }
  }, [selectedTextbook])

  const loadTextbooks = async () => {
    try {
      const data = await textbookApi.getList({ status: 'READY' })
      setTextbooks(data)
    } catch (error) {
      console.error('加载课本失败', error)
    }
  }

  const loadUnits = async (textbookId: number) => {
    try {
      const data = await textbookApi.getUnits(textbookId)
      setUnits(data)
    } catch (error) {
      console.error('加载单元失败', error)
    }
  }

  const loadSessions = async () => {
    try {
      const data = await practiceApi.getSessions()
      setSessions(data)
    } catch (error) {
      console.error('加载会话失败', error)
    }
  }

  const handleStartPractice = async () => {
    if (!selectedTextbook) {
      Taro.showToast({ title: '请选择课本', icon: 'none' })
      return
    }

    try {
      const session = await practiceApi.createSession({
        textbookId: selectedTextbook || undefined,
        unitId: selectedUnit || undefined,
        questionCount: 10,
      })

      // 跳转到答题页面
      Taro.navigateTo({
        url: `/pages/practice/answer?id=${session.id}`,
      })
    } catch (error: any) {
      Taro.showToast({ title: error.message || '创建失败', icon: 'none' })
    }
  }

  const handleContinuePractice = (sessionId: number) => {
    Taro.navigateTo({
      url: `/pages/practice/answer?id=${sessionId}`,
    })
  }

  const handleViewResult = (sessionId: number) => {
    Taro.navigateTo({
      url: `/pages/practice/result?id=${sessionId}`,
    })
  }

  return (
    <View className='practice-page'>
      <View className='header'>
        <Text className='title'>✏️ 开始练习</Text>
      </View>

      {/* 选择课本 */}
      <View className='section'>
        <Text className='section-title'>选择课本</Text>
        <ScrollView className='textbook-scroll' scrollX>
          <View className='textbook-options'>
            <View
              className={`textbook-option ${!selectedTextbook ? 'active' : ''}`}
              onClick={() => {
                setSelectedTextbook(null)
                setSelectedUnit(null)
              }}
            >
              不限
            </View>
            {textbooks.map((tb) => (
              <View
                key={tb.id}
                className={`textbook-option ${selectedTextbook === tb.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTextbook(tb.id)
                  setSelectedUnit(null)
                }}
              >
                {tb.subject}·{tb.grade}年级
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 选择单元 */}
      {selectedTextbook && units.length > 0 && (
        <View className='section'>
          <Text className='section-title'>选择单元</Text>
          <ScrollView className='unit-scroll' scrollX>
            <View className='unit-options'>
              <View
                className={`unit-option ${!selectedUnit ? 'active' : ''}`}
                onClick={() => setSelectedUnit(null)}
              >
                全部
              </View>
              {units.map((unit) => (
                <View
                  key={unit.id}
                  className={`unit-option ${selectedUnit === unit.id ? 'active' : ''}`}
                  onClick={() => setSelectedUnit(unit.id)}
                >
                  {unit.unitNumber || unit.title}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* 开始按钮 */}
      <Button className='start-btn' onClick={handleStartPractice}>
        开始练习
      </Button>

      {/* 练习历史 */}
      <View className='section'>
        <Text className='section-title'>练习历史</Text>
        {sessions.length === 0 ? (
          <View className='empty'>暂无练习记录</View>
        ) : (
          sessions.map((session) => (
            <View key={session.id} className='session-card'>
              <View className='session-info'>
                <Text className='session-subject'>
                  {session.textbook?.subject || '综合练习'}
                </Text>
                <Text className='session-date'>
                  {new Date(session.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View className='session-stats'>
                <Text className='score'>{session.correctAnswers}/{session.totalQuestions}</Text>
                {session.status === 'COMPLETED' ? (
                  <Button size='mini' onClick={() => handleViewResult(session.id)}>
                    查看结果
                  </Button>
                ) : (
                  <Button size='mini' type='primary' onClick={() => handleContinuePractice(session.id)}>
                    继续
                  </Button>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  )
}
