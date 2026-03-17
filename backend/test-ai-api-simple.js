/**
 * AI API 集成测试脚本 - 阿里云百炼兼容模式
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');

async function testAIAPI() {
  console.log('🧪 开始测试阿里云 AI API（兼容模式）...\n');
  
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const model = 'qwen-plus';
  
  console.log('📋 配置信息:');
  console.log('   API Key:', apiKey?.substring(0, 10) + '...');
  console.log('   API URL:', apiUrl);
  console.log('   Model:', model);
  console.log('\n');
  
  // 测试 1: 简单问答
  console.log('📝 测试 1: 简单数学问题');
  try {
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个友好的学习助手。'
          },
          {
            role: 'user',
            content: '1+1 等于几？请用中文回答。'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 测试 1 通过');
    console.log('   回复:', response.data.choices[0].message.content);
  } catch (error) {
    console.log('❌ 测试 1 失败:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  console.log('\n');
  
  // 测试 2: 学习助手问答
  console.log('📝 测试 2: 什么是勾股定理？');
  try {
    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的数学老师。'
          },
          {
            role: 'user',
            content: '什么是勾股定理？请用简单易懂的语言解释。'
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 测试 2 通过');
    console.log('   回复:', response.data.choices[0].message.content);
  } catch (error) {
    console.log('❌ 测试 2 失败:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  console.log('\n');
  console.log('🎉 测试完成！');
}

testAIAPI().catch(console.error);
