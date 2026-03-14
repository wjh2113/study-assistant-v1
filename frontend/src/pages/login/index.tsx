import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { authApi } from '../../services/api'
import { setToken, setUser } from '../../utils/storage'
import './index.scss'

export default function Index() {
  const [loginType, setLoginType] = useState<'phone' | 'username'>('phone')
  
  // 手机号登录状态
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)

  // 用户名登录状态
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  // 注册状态
  const [isRegister, setIsRegister] = useState(false)
  const [registerRole, setRegisterRole] = useState<'STUDENT' | 'PARENT'>('STUDENT')
  const [registerGrade, setRegisterGrade] = useState(1)

  const [loading, setLoading] = useState(false)

  // 发送验证码
  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    try {
      await authApi.sendCode(phone)
      Taro.showToast({ title: '验证码已发送（123456）', icon: 'success' })
      
      // 开始倒计时
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '发送失败', icon: 'none' })
    }
  }

  // 登录/注册提交
  const handleSubmit = async () => {
    setLoading(true)

    try {
      let result

      if (isRegister) {
        // 注册
        if (loginType === 'phone') {
          // 手机号注册（自动创建）
          result = await authApi.phoneLogin(phone, code)
        } else {
          // 用户名注册
          result = await authApi.register(
            username,
            password,
            `${username}@example.com`,
            registerRole,
            registerRole === 'STUDENT' ? registerGrade : undefined,
          )
        }
      } else {
        // 登录
        if (loginType === 'phone') {
          result = await authApi.phoneLogin(phone, code)
        } else {
          result = await authApi.login(username, password)
        }
      }

      // 保存 token 和用户信息
      setToken(result.access_token)
      setUser(result.user)

      Taro.showToast({
        title: isRegister ? '注册成功' : '登录成功',
        icon: 'success',
      })

      // 跳转到首页
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-container'>
      <View className='login-header'>
        <Text className='title'>📚 小学生全科智能复习助手</Text>
        <Text className='subtitle'>
          {isRegister ? '创建新账号' : '欢迎回来'}
        </Text>
      </View>

      {/* 登录方式切换 */}
      {!isRegister && (
        <View className='login-type-switch'>
          <Text
            className={`switch-item ${loginType === 'phone' ? 'active' : ''}`}
            onClick={() => setLoginType('phone')}
          >
            手机号登录
          </Text>
          <Text
            className={`switch-item ${loginType === 'username' ? 'active' : ''}`}
            onClick={() => setLoginType('username')}
          >
            账号密码登录
          </Text>
        </View>
      )}

      <View className='login-form'>
        {loginType === 'phone' ? (
          <>
            <View className='form-item'>
              <Text className='label'>手机号</Text>
              <Input
                className='input'
                type='number'
                placeholder='请输入手机号'
                value={phone}
                onInput={(e) => setPhone(e.detail.value)}
                maxLength={11}
              />
            </View>

            <View className='form-item'>
              <Text className='label'>验证码</Text>
              <Input
                className='input'
                type='number'
                placeholder='请输入验证码'
                value={code}
                onInput={(e) => setCode(e.detail.value)}
                maxLength={6}
              />
              <Button
                className='send-code-btn'
                type='default'
                size='mini'
                disabled={countdown > 0}
                onClick={handleSendCode}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            </View>
          </>
        ) : (
          <>
            <View className='form-item'>
              <Text className='label'>用户名</Text>
              <Input
                className='input'
                type='text'
                placeholder='请输入用户名'
                value={username}
                onInput={(e) => setUsername(e.detail.value)}
              />
            </View>

            <View className='form-item'>
              <Text className='label'>密码</Text>
              <Input
                className='input'
                type='password'
                placeholder='请输入密码'
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
              />
            </View>
          </>
        )}

        {isRegister && loginType === 'username' && (
          <>
            <View className='form-item'>
              <Text className='label'>角色</Text>
              <View className='role-selector'>
                <View
                  className={`role-item ${registerRole === 'STUDENT' ? 'active' : ''}`}
                  onClick={() => setRegisterRole('STUDENT')}
                >
                  学生
                </View>
                <View
                  className={`role-item ${registerRole === 'PARENT' ? 'active' : ''}`}
                  onClick={() => setRegisterRole('PARENT')}
                >
                  家长
                </View>
              </View>
            </View>

            {registerRole === 'STUDENT' && (
              <View className='form-item'>
                <Text className='label'>年级</Text>
                <View className='grade-selector'>
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <View
                      key={g}
                      className={`grade-item ${registerGrade === g ? 'active' : ''}`}
                      onClick={() => setRegisterGrade(g)}
                    >
                      {g}年级
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <Button
          className='submit-btn'
          type='primary'
          loading={loading}
          onClick={handleSubmit}
        >
          {isRegister ? '注册' : '登录'}
        </Button>

        <View className='switch-text' onClick={() => setIsRegister(!isRegister)}>
          <Text>
            {isRegister ? '已有账号？' : '还没有账号？'}
            <Text className='link'>{isRegister ? '去登录' : '立即注册'}</Text>
          </Text>
        </View>
      </View>
    </View>
  )
}
