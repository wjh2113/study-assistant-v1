import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { learningApi, pointsApi, authApi } from '../../services/api'
import { getUser, removeToken, removeUser } from '../../utils/storage'
import './index.scss'

export default function ProfileIndex() {
  const [user, setUserState] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [pointsStats, setPointsStats] = useState<any>(null)
  const [dailyRecords, setDailyRecords] = useState<any[]>([])

  useEffect(() => {
    const u = getUser()
    setUserState(u)
    loadStats()
    loadPointsStats()
    loadDailyRecords()
  }, [])

  const loadStats = async () => {
    try {
      const data = await learningApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('加载学习统计失败', error)
    }
  }

  const loadPointsStats = async () => {
    try {
      const data = await pointsApi.getStats()
      setPointsStats(data)
    } catch (error) {
      console.error('加载积分统计失败', error)
    }
  }

  const loadDailyRecords = async () => {
    try {
      const data = await learningApi.getDailyStats(7)
      setDailyRecords(data)
    } catch (error) {
      console.error('加载学习记录失败', error)
    }
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          removeToken()
          removeUser()
          Taro.reLaunch({ url: '/pages/login/index' })
        }
      },
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  return (
    <View className='profile-page'>
      {/* 用户信息卡片 */}
      <View className='user-card'>
        <View className='avatar'>
          <Text>👤</Text>
        </View>
        <View className='user-info'>
          <Text className='username'>{user?.username || '用户'}</Text>
          <Text className='user-role'>{user?.role === 'STUDENT' ? '学生' : '家长'}</Text>
          {user?.grade && <Text className='user-grade'>{user.grade}年级</Text>}
        </View>
        <View className='logout-btn' onClick={handleLogout}>
          <Text>退出</Text>
        </View>
      </View>

      {/* 统计卡片 */}
      <View className='stats-grid'>
        <View className='stat-card'>
          <Text className='stat-value'>{stats?.totalRecords || 0}</Text>
          <Text className='stat-label'>学习次数</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{formatDuration(stats?.totalDuration || 0)}</Text>
          <Text className='stat-label'>学习时长</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{stats?.finishedPractices || 0}</Text>
          <Text className='stat-label'>完成练习</Text>
        </View>
        <View className='stat-card'>
          <Text className='stat-value'>{stats?.averageScore || 0}</Text>
          <Text className='stat-label'>平均得分</Text>
        </View>
      </View>

      {/* 积分卡片 */}
      {pointsStats && (
        <View className='points-card'>
          <View className='points-header'>
            <Text className='points-title'>🪙 我的积分</Text>
            <Text className='points-balance'>{pointsStats.balance}分</Text>
          </View>
          <View className='points-details'>
            <View className='points-item'>
              <Text className='points-label'>累计获得</Text>
              <Text className='points-value'>+{pointsStats.totalEarned}</Text>
            </View>
            <View className='points-item'>
              <Text className='points-label'>累计消耗</Text>
              <Text className='points-value'>-{pointsStats.totalSpent}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 学习趋势 */}
      <View className='section'>
        <Text className='section-title'>最近 7 天学习</Text>
        <View className='daily-chart'>
          {dailyRecords.map((record) => (
            <View key={record.date} className='day-bar'>
              <View
                className='bar'
                style={{ height: `${Math.min(record.count * 20, 100)}px` }}
              ></View>
              <Text className='day-label'>
                {new Date(record.date).toLocaleDateString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </Text>
              <Text className='day-count'>{record.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 学习记录 */}
      <View className='section'>
        <Text className='section-title'>学习记录</Text>
        <Text className='empty-tip'>更多功能开发中...</Text>
      </View>
    </View>
  )
}
