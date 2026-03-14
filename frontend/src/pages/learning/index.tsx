import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { learningApi } from '../../services/api'
import './index.scss'

export default function LearningIndex() {
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const data = await learningApi.getRecords({ limit: 50 })
      setRecords(data)
    } catch (error) {
      console.error('加载记录失败', error)
    }
  }

  return (
    <View className='learning-page'>
      <View className='header'>
        <Text className='title'>📊 学习记录</Text>
      </View>

      <ScrollView className='records-list' scrollY>
        {records.length === 0 ? (
          <View className='empty'>暂无学习记录</View>
        ) : (
          records.map((record) => (
            <View key={record.id} className='record-card'>
              <View className='record-header'>
                <Text className='record-type'>{record.actionType}</Text>
                <Text className='record-date'>
                  {new Date(record.createdAt).toLocaleString()}
                </Text>
              </View>
              <View className='record-details'>
                {record.textbook && (
                  <Text className='record-textbook'>{record.textbook.title}</Text>
                )}
                {record.unit && (
                  <Text className='record-unit'>{record.unit.title}</Text>
                )}
                {record.score !== null && (
                  <Text className='record-score'>得分：{record.score}</Text>
                )}
                {record.duration && (
                  <Text className='record-duration'>
                    时长：{Math.floor(record.duration / 60)}分钟
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
