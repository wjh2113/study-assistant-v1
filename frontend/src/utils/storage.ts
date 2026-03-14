import Taro from '@tarojs/taro'

/**
 * 存储工具函数
 */

export const storage = {
  // 设置存储
  set(key: string, value: any) {
    try {
      Taro.setStorageSync(key, value)
    } catch (e) {
      console.error('存储失败', e)
    }
  },

  // 获取存储
  get(key: string) {
    try {
      return Taro.getStorageSync(key)
    } catch (e) {
      console.error('获取存储失败', e)
      return null
    }
  },

  // 删除存储
  remove(key: string) {
    try {
      Taro.removeStorageSync(key)
    } catch (e) {
      console.error('删除存储失败', e)
    }
  },

  // 清空存储
  clear() {
    try {
      Taro.clearStorageSync()
    } catch (e) {
      console.error('清空存储失败', e)
    }
  },
}

// 快捷方法
export const setToken = (token: string) => storage.set('token', token)
export const getToken = () => storage.get('token')
export const removeToken = () => storage.remove('token')

export const setUser = (user: any) => storage.set('user', user)
export const getUser = () => storage.get('user')
export const removeUser = () => storage.remove('user')
