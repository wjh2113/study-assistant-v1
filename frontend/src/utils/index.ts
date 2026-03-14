import Taro from '@tarojs/taro'
import { getToken, removeToken, removeUser } from './storage'

/**
 * 检查登录状态
 */
export function checkLogin(): boolean {
  const token = getToken()
  
  if (!token) {
    Taro.showToast({
      title: '请先登录',
      icon: 'none',
    })
    
    // 跳转到登录页
    setTimeout(() => {
      Taro.redirectTo({
        url: '/pages/login/login',
      })
    }, 1500)
    
    return false
  }
  
  return true
}

/**
 * 退出登录
 */
export function logout() {
  removeToken()
  removeUser()
  
  Taro.showToast({
    title: '已退出登录',
    icon: 'success',
  })
  
  setTimeout(() => {
    Taro.redirectTo({
      url: '/pages/login/login',
    })
  }, 1500)
}

/**
 * 格式化时间
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else {
    return `${Math.floor(diff / day)}天前`
  }
}
