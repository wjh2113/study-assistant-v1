import { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getUser } from '../../utils/storage'
import { learningApi, pointsApi } from '../../services/api'
import './index.scss'

export default function Index() {
  const [user, setUserState] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const u = getUser()
    setUserState(u)
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await learningApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('加载统计失败', error)
    }
  }

  const subjects = [
    { id: 1, name: '语文', icon: '📚', color: '#FF6B6B' },
    { id: 2, name: '数学', icon: '🔢', color: '#4ECDC4' },
    { id: 3, name: '英语', icon: '🔤', color: '#45B7D1' },
    { id: 4, name: '科学', icon: '🔬', color: '#96CEB4' },
  ]

  const goToPractice = () => {
    Taro.navigateTo({ url: '/pages/practice/index' })
  }

  const goToTextbooks = () => {
    Taro.navigateTo({ url: '/pages/textbooks/index' })
  }

  const goToProfile = () => {
    Taro.navigateTo({ url: '/pages/profile/index' })
  }

  return (
    <View className='container'>
      {/* 头部 */}
      <View className='header'>
        <View className='header-top'>
          <Text className='welcome'>👋 {user?.username ? `你好，${user.username}!` : '你好!'}</Text>
          <View className='profile-btn' onClick={goToProfile}>
            <Text>👤</Text>
          </View>
        </View>
        <Text className='subtitle'>今天也要加油复习哦~</Text>
      </View>

      {/* 统计卡片 */}
      {stats && (
        <View className='stats-card'>
          <View className='stat-item'>
            <Text className='stat-value'>{stats.finishedPractices || 0}</Text>
            <Text className='stat-label'>完成练习</Text>
          </View>
          <View className='stat-divider'></View>
          <View className='stat-item'>
            <Text className='stat-value'>{stats.averageScore || 0}</Text>
            <Text className='stat-label'>平均得分</Text>
          </View>
          <View className='stat-divider'></View>
          <View className='stat-item'>
            <Text className='stat-value'>{stats.recentRecords || 0}</Text>
            <Text className='stat-label'>本周学习</Text>
          </View>
        </View>
      )}

      {/* 快捷功能 */}
      <View className='quick-actions'>
        <View className='action-card primary' onClick={goToPractice}>
          <Text className='action-icon'>✏️</Text>
          <Text className='action-text'>开始练习</Text>
        </View>
        <View className='action-card' onClick={goToTextbooks}>
          <Text className='action-icon'>📖</Text>
          <Text className='action-text'>我的课本</Text>
        </View>
      </View>

      {/* 学科选择 */}
      <View className='section'>
        <Text className='section-title'>选择学科</Text>
        <View className='subject-grid'>
          {subjects.map(subject => (
            <View 
              key={subject.id} 
              className='subject-card'
              style={{ backgroundColor: subject.color }}
              onClick={goToPractice}
            >
              <Text className='subject-icon'>{subject.icon}</Text>
              <Text className='subject-name'>{subject.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* AI 助手入口 */}
      <View className='ai-assistant'>
        <View className='ai-card'>
          <Text className='ai-icon'>🤖</Text>
          <View className='ai-content'>
            <Text className='ai-title'>AI 智能辅导</Text>
            <Text className='ai-desc'>有问题随时问我哦~</Text>
          </View>
          <Button className='ai-btn' size='mini'>提问</Button>
        </View>
      </View>
    </View>
  )
}
