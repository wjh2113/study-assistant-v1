export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/index/index',
    'pages/textbooks/index',
    'pages/textbooks/upload',
    'pages/textbooks/detail',
    'pages/practice/index',
    'pages/practice/answer',
    'pages/practice/result',
    'pages/learning/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#4A90D9',
    navigationBarTitleText: '小学生全科智能复习助手',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#4A90D9',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
      },
      {
        pagePath: 'pages/textbooks/index',
        text: '课本',
      },
      {
        pagePath: 'pages/practice/index',
        text: '练习',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
})
