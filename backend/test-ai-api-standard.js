/**
 * 阿里云百炼 API 测试 - 标准格式
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');

async function testAIAPI() {
  console.log('🧪 开始测试阿里云百炼 API（标准格式）...\n');
  
  const apiKey = process.env.AI_API_KEY;
  
  // 阿里云百炼标准 API 格式
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  const model = 'qwen-plus';
  
  console.log('📋 配置信息:');
  console.log('   API Key:', apiKey?.substring(0, 15) + '...');
  console.log('   API URL:', apiUrl);
  console.log('   Model:', model);
  console.log('\n');
  
  // 测试：简单问答（使用阿里云标准格式）
  console.log('📝 测试：简单问答');
  try {
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个友好的学习助手。'
            },
            {
              role: 'user',
              content: '1+1 等于几？请用中文回答。'
            }
          ]
        },
        parameters: {
          max_tokens: 100,
          temperature: 0.7,
          result_format: 'message'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 测试通过');
    console.log('   回复:', response.data.output.choices[0].message.content);
  } catch (error) {
    console.log('❌ 测试失败:', error.response?.status);
    console.log('   错误信息:', error.response?.data);
    console.log('   Headers:', JSON.stringify(error.response?.headers, null, 2));
  }
  
  console.log('\n');
  console.log('🎉 测试完成！');
}

testAIAPI().catch(console.error);
