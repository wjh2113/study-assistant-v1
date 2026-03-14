import { useState } from 'react'
import { View, Text, Input, Button, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { textbookApi, filesApi } from '../../services/api'
import './upload.scss'

export default function TextbooksUpload() {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState(1)
  const [version, setVersion] = useState('')
  const [uploading, setUploading] = useState(false)

  const subjects = ['语文', '数学', '英语', '科学', '道德与法治', '历史', '地理', '物理', '化学', '生物']

  const handleUpload = async () => {
    if (!title || !subject) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    setUploading(true)

    try {
      // 模拟上传（实际应调用 FTP 上传）
      const filename = `${title}.pdf`
      const policy = await filesApi.getUploadPolicy(filename, 'application/pdf')
      
      // TODO: 实际上传到 FTP
      
      // 创建课本记录
      await textbookApi.create({
        title,
        subject,
        grade,
        version: version || undefined,
        pdfUrl: policy.uploadUrl,
        pdfPath: policy.ftpPath,
      })

      Taro.showToast({ title: '上传成功', icon: 'success' })
      
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '上传失败', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <View className='upload-page'>
      <View className='form'>
        <View className='form-item'>
          <Text className='label'>课本标题 *</Text>
          <Input
            className='input'
            type='text'
            placeholder='例如：三年级上册数学'
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='label'>科目 *</Text>
          <Picker
            mode='selector'
            range={subjects}
            value={subjects.indexOf(subject)}
            onChange={(e) => setSubject(subjects[e.detail.value])}
          >
            <View className='picker'>
              {subject || '请选择科目'}
            </View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='label'>年级</Text>
          <Picker
            mode='selector'
            range={[1, 2, 3, 4, 5, 6].map(g => `${g}年级`)}
            value={grade - 1}
            onChange={(e) => setGrade(e.detail.value + 1)}
          >
            <View className='picker'>
              {grade}年级
            </View>
          </Picker>
        </View>

        <View className='form-item'>
          <Text className='label'>版本</Text>
          <Input
            className='input'
            type='text'
            placeholder='例如：人教版、北师大版'
            value={version}
            onInput={(e) => setVersion(e.detail.value)}
          />
        </View>

        <View className='form-item'>
          <Text className='label'>PDF 文件</Text>
          <Button className='upload-file-btn' type='default'>
            选择文件（功能开发中）
          </Button>
        </View>

        <Button
          className='submit-btn'
          type='primary'
          loading={uploading}
          onClick={handleUpload}
        >
          上传课本
        </Button>
      </View>
    </View>
  )
}
