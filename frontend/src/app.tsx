import { useEffect } from 'react'
import { useDidShow } from '@tarojs/taro'
import './app.scss'

function App({ children }: { children: any }) {
  useDidShow(() => {
    console.log('应用启动')
  })

  return children
}

export default App
