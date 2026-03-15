import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储的 token
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // 获取用户信息
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => {
          // 测试模式：如果后端不可用，使用本地存储的模拟用户
          const mockUser = localStorage.getItem('mockUser')
          if (mockUser) {
            setUser(JSON.parse(mockUser))
          } else {
            localStorage.removeItem('token')
            delete api.defaults.headers.common['Authorization']
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // 发送验证码 - 修复 BUG-002：支持指定用途
  const sendCode = async (phone, purpose = 'login') => {
    const res = await api.post('/auth/send-code', { phone, purpose })
    return res.data
  }

  // 验证码登录
  const verifyLogin = async (phone, code) => {
    const res = await api.post('/auth/login', { phone, code })
    const { user, token } = res.data
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  // 验证码注册
  const verifyRegister = async (data) => {
    const res = await api.post('/auth/register', data)
    const { user, token } = res.data
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  // 刷新 token
  const refreshToken = async () => {
    try {
      const res = await api.post('/auth/refresh')
      const { token } = res.data
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      return token
    } catch (error) {
      // 刷新失败，清除登录状态
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  // 兼容旧的登录/注册方法
  const login = {
    sendCode,
    verify: verifyLogin
  }

  const register = {
    sendCode,
    verify: verifyRegister
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      refreshToken,
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
