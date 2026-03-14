import { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { practiceApi, pointsApi } from '../../services/api'
import './result.scss'

export default function PracticeResult() {
  const router = useRouter()
  const sessionId = parseInt(router.params.id || '0')
  
  const [result, setResult] = useState<any>(null)
  const [pointsReward, setPointsReward] = useState<any>(null)

  useEffect(() => {
    loadResult()
    loadPointsReward()
  }, [])

  const loadResult = async () => {
    try {
      const data = await practiceApi.getSessionResult(sessionId)
      setResult(data)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  }

  const loadPointsReward = async () => {
    try {
      const data = await pointsApi.getStats()
      setPointsReward(data)
    } catch (error) {
      console.error('加载积分失败', error)
    }
  }

  const handleBack = () => {
    Taro.switchTab({ url: '/pages/practice/index' })
  }

  if (!result) {
    return <View className='result-page'>加载中...</View>
  }

  const correctRate = result.correctRate || 0
  const isExcellent = correctRate >= 90
  const isGood = correctRate >= 70

  return (
    <View className='result-page'>
      {/* 结果头部 */}
      <View className='result-header'>
        <Text className='emoji'>{isExcellent ? '🏆' : isGood ? '🎉' : '💪'}</Text>
        <Text className='result-title'>
          {isExcellent ? '太棒了！' : isGood ? '做得不错！' : '继续加油！'}
        </Text>
      </View>

      {/* 得分卡片 */}
      <View className='score-card'>
        <View className='score-circle'>
          <Text className='score'>{result.score || 0}</Text>
          <Text className='score-label'>总分</Text>
        </View>
        <View className='score-details'>
          <View className='score-item'>
            <Text className='score-value'>{result.correctAnswers}</Text>
            <Text className='score-label'>正确</Text>
          </View>
          <View className='score-item'>
            <Text className='score-value'>{result.totalQuestions - result.correctAnswers}</Text>
            <Text className='score-label'>错误</Text>
          </View>
          <View className='score-item'>
            <Text className='score-value'>{correctRate}%</Text>
            <Text className='score-label'>正确率</Text>
          </View>
        </View>
      </View>

      {/* 用时 */}
      {result.timeSpent && (
        <View className='time-card'>
          <Text className='time-label'>⏱️ 用时</Text>
          <Text className='time-value'>
            {Math.floor(result.timeSpent / 60)}分{result.timeSpent % 60}秒
          </Text>
        </View>
      )}

      {/* 积分奖励 */}
      {pointsReward && (
        <View className='points-card'>
          <Text className='points-icon'>🪙</Text>
          <Text className='points-text'>当前积分：{pointsReward.balance}</Text>
        </View>
      )}

      {/* 题目解析 */}
      <View className='section'>
        <Text className='section-title'>题目解析</Text>
        <ScrollView className='questions-list' scrollY>
          {result.questions?.map((q: any, index: number) => (
            <View key={q.id} className='question-item'>
              <View className='question-header'>
                <Text className='question-index'>第{index + 1}题</Text>
                <Text className={`question-status ${q.isCorrect ? 'correct' : 'wrong'}`}>
                  {q.isCorrect ? '✓ 正确' : '✗ 错误'}
                </Text>
              </View>
              <Text className='question-text'>{q.question}</Text>
              <View className='answer-row'>
                <Text className='answer-label'>你的答案：</Text>
                <Text className={`answer-value ${q.isCorrect ? 'correct' : 'wrong'}`}>
                  {q.userAnswer || '未作答'}
                </Text>
              </View>
              {!q.isCorrect && (
                <View className='answer-row'>
                  <Text className='answer-label'>正确答案：</Text>
                  <Text className='answer-value correct'>{q.answer}</Text>
                </View>
              )}
              {q.explanation && (
                <View className='explanation'>
                  <Text className='explanation-label'>💡 解析：</Text>
                  <Text className='explanation-text'>{q.explanation}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 按钮 */}
      <Button className='back-btn' type='primary' onClick={handleBack}>
        返回练习
      </Button>
    </View>
  )
}
