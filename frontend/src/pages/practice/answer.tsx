import { useState, useEffect } from 'react'
import { View, Text, Button, Radio, RadioGroup, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { practiceApi, learningApi } from '../../services/api'
import './answer.scss'

export default function PracticeAnswer() {
  const router = useRouter()
  const sessionId = parseInt(router.params.id || '0')
  
  const [session, setSession] = useState<any>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSession()
  }, [])

  const loadSession = async () => {
    try {
      const data = await practiceApi.getSessionDetail(sessionId)
      setSession(data)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '加载失败', icon: 'none' })
    }
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) {
      Taro.showToast({ title: '请选择答案', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const question = session.questions[currentQuestionIndex]
      const result = await practiceApi.submitAnswer(sessionId, question.id, selectedAnswer)

      // 更新本地状态
      const updatedQuestions = [...session.questions]
      updatedQuestions[currentQuestionIndex] = {
        ...question,
        userAnswer: selectedAnswer,
        isCorrect: result.isCorrect,
      }
      setSession({ ...session, questions: updatedQuestions })

      // 显示结果
      Taro.showToast({
        title: result.isCorrect ? '回答正确！✅' : '回答错误❌',
        icon: 'none',
        duration: 1500,
      })

      // 下一题或结束
      setTimeout(() => {
        if (currentQuestionIndex < session.questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1)
          setSelectedAnswer('')
        } else {
          // 所有题目完成
          finishPractice()
        }
      }, 1500)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '提交失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const finishPractice = async () => {
    try {
      const result = await practiceApi.finishSession(sessionId)
      
      // 创建学习记录
      await learningApi.createRecord({
        sessionId,
        textbookId: session.textbookId,
        unitId: session.unitId,
        actionType: 'FINISH_PRACTICE',
        score: result.score,
        duration: result.timeSpent,
      })

      // 跳转到结果页面
      Taro.redirectTo({
        url: `/pages/practice/result?id=${sessionId}`,
      })
    } catch (error: any) {
      Taro.showToast({ title: error.message || '结束失败', icon: 'none' })
    }
  }

  if (!session) {
    return <View className='answer-page'>加载中...</View>
  }

  const question = session.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100

  return (
    <View className='answer-page'>
      {/* 进度条 */}
      <View className='progress-bar'>
        <View className='progress' style={{ width: `${progress}%` }}></View>
      </View>

      <View className='progress-text'>
        {currentQuestionIndex + 1} / {session.questions.length}
      </View>

      {/* 题目 */}
      <View className='question-card'>
        <View className='question-type'>
          {question.questionType === 'SINGLE_CHOICE' ? '单选题' : 
           question.questionType === 'TRUE_FALSE' ? '判断题' : '问答题'}
        </View>
        <Text className='question-text'>{question.question}</Text>

        {/* 选项 */}
        {question.options && (
          <RadioGroup className='options' onChange={(e) => setSelectedAnswer(e.detail.value)}>
            {question.options.map((opt: any) => (
              <View
                key={opt.key}
                className={`option-item ${selectedAnswer === opt.key ? 'selected' : ''}`}
                onClick={() => setSelectedAnswer(opt.key)}
              >
                <Radio value={opt.key} color='#667eea' />
                <Text className='option-text'>{opt.key}. {opt.value}</Text>
              </View>
            ))}
          </RadioGroup>
        )}

        {/* 问答题输入框 */}
        {!question.options && (
          <Input
            className='answer-input'
            type='text'
            placeholder='请输入你的答案'
            value={selectedAnswer}
            onInput={(e) => setSelectedAnswer(e.detail.value)}
          />
        )}
      </View>

      {/* 提交按钮 */}
      <Button
        className='submit-btn'
        type='primary'
        loading={loading}
        onClick={handleSubmitAnswer}
      >
        {currentQuestionIndex < session.questions.length - 1 ? '提交并继续' : '提交并完成'}
      </Button>
    </View>
  )
}
