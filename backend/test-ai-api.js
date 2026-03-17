/**
 * AI API 集成测试脚本
 * 测试 AI 网关是否正常工作
 */

require('dotenv').config({ path: '.env' });
const AiGatewayService = require('./src/modules/ai-gateway/AiGatewayService');

async function testAIAPI() {
  console.log('🧪 开始测试 AI API 集成...\n');
  
  // 测试 1: 简单问答
  console.log('📝 测试 1: 简单数学问题');
  try {
    const result1 = await AiGatewayService.callModel('qwen-plus', '1+1 等于几？请用中文回答。', {
      systemPrompt: '你是一个友好的学习助手。'
    });
    
    if (result1.success) {
      console.log('✅ 测试 1 通过');
      console.log('   回复:', result1.data.substring(0, 100) + '...');
    } else {
      console.log('❌ 测试 1 失败:', result1.error);
    }
  } catch (error) {
    console.log('❌ 测试 1 异常:', error.message);
  }
  
  console.log('\n');
  
  // 测试 2: 题目生成
  console.log('📝 测试 2: 生成数学题目');
  try {
    const result2 = await AiGatewayService.generateQuestions({
      textbookContent: '小学数学 - 加减法基础',
      grade: '三年级',
      subject: '数学',
      unit: '第一单元',
      questionCount: 2,
      difficulty: 'easy',
      questionType: 'choice'
    });
    
    if (result2.success) {
      console.log('✅ 测试 2 通过');
      console.log('   生成题目数量:', result2.questions.length);
      console.log('   使用模型:', result2.model);
      console.log('   第一题:', result2.questions[0]?.question?.substring(0, 50) + '...');
    } else {
      console.log('❌ 测试 2 失败:', result2.error);
    }
  } catch (error) {
    console.log('❌ 测试 2 异常:', error.message);
  }
  
  console.log('\n');
  
  // 测试 3: 错误处理
  console.log('📝 测试 3: 测试错误处理（无效模型）');
  try {
    const result3 = await AiGatewayService.callModel('invalid-model', 'test');
    console.log('❌ 测试 3 失败：应该抛出错误');
  } catch (error) {
    console.log('✅ 测试 3 通过：正确捕获错误 -', error.message);
  }
  
  console.log('\n');
  console.log('🎉 测试完成！');
}

testAIAPI().catch(console.error);
