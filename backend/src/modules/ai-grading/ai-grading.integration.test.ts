/**
 * AI 批改服务集成测试示例
 * 
 * 这些测试用于验证 AI 批改服务的完整功能流程
 * 运行前请确保后端服务已启动 (npm run dev)
 */

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

/**
 * 测试 1: 作文智能评分
 */
async function testEssayGrading() {
  console.log('\n=== 测试 1: 作文智能评分 ===');

  const requestBody = {
    essayContent: `我的梦想

每个人都有自己的梦想，我的梦想是成为一名科学家。

从小我就对科学充满了浓厚的兴趣。我喜欢观察大自然，喜欢问为什么。
为什么天空是蓝色的？为什么海水是咸的？为什么星星会闪烁？这些问题
一直萦绕在我的脑海中。

如果我成为一名科学家，我要研究环保技术，让地球变得更加美好。
我要发明一种能够净化空气的机器，让人们呼吸到新鲜的空气。我还要
研究新能源，减少对化石燃料的依赖，保护我们的环境。

为了实现这个梦想，我现在要努力学习，打好基础。我要认真学好每一
门功课，特别是数学和科学。我还要多读科普书籍，扩大知识面。

我相信，只要我坚持不懈地努力，我的梦想一定会实现。`,
    essayTitle: '我的梦想',
    essayType: 'NARRATIVE',
    gradeLevel: 5,
    requirements: '字数不少于 400 字，语句通顺，内容健康向上',
    expectedWordCount: 400,
  };

  try {
    const response = await fetch(`${BASE_URL}/ai/grading/essay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    console.log('✓ 请求成功');
    console.log(`总分：${result.data.totalScore}`);
    console.log(`等级：${result.data.estimatedGrade}`);
    console.log(`字数：${result.data.wordCount}`);
    console.log('\n维度评分:');
    result.data.dimensions.forEach(dim => {
      console.log(`  - ${dim.dimension}: ${dim.score}分 (权重${dim.weight * 100}%)`);
    });
    console.log(`\n总体评价：${result.data.overallFeedback}`);
    console.log(`优点：${result.data.strengths.join(', ')}`);
    console.log(`改进建议：${result.data.improvements.join(', ')}`);

    return result;
  } catch (error) {
    console.error('✗ 请求失败:', error);
    throw error;
  }
}

/**
 * 测试 2: 主观题批改
 */
async function testSubjectiveGrading() {
  console.log('\n=== 测试 2: 主观题批改 ===');

  const requestBody = {
    questionContent: '请简述光合作用的过程和意义',
    studentAnswer: '光合作用是植物利用光能将二氧化碳和水转化为有机物，并释放氧气的过程。这个过程为生物提供了食物和能量，同时维持了大气中氧气和二氧化碳的平衡。',
    standardAnswer: '光合作用是绿色植物利用光能，将二氧化碳和水合成有机物，并释放氧气的过程。意义：为生物提供有机物和能量，维持大气中氧气和二氧化碳的平衡。',
    scoringCriteria: '答出光合作用定义得 5 分，答出意义得 5 分',
    maxScore: 10,
    knowledgePoint: '生物 - 光合作用',
  };

  try {
    const response = await fetch(`${BASE_URL}/ai/grading/subjective`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    console.log('✓ 请求成功');
    console.log(`得分：${result.data.score}/${result.data.maxScore}`);
    console.log(`得分率：${result.data.scorePercentage}%`);
    console.log(`反馈：${result.data.feedback}`);
    console.log(`关键得分点：${result.data.keyPoints.join(', ')}`);
    console.log(`遗漏要点：${result.data.missingPoints.join(', ') || '无'}`);
    console.log(`建议：${result.data.suggestions}`);

    return result;
  } catch (error) {
    console.error('✗ 请求失败:', error);
    throw error;
  }
}

/**
 * 测试 3: 生成评分报告
 */
async function testReportGeneration() {
  console.log('\n=== 测试 3: 生成评分报告 ===');

  // 注意：这个测试需要一个真实的练习会话 ID
  // 在实际测试中，应该先创建一个练习会话
  const sessionId = 1; // 替换为真实的会话 ID

  const requestBody = {
    sessionId: sessionId,
    reportType: 'DETAILED',
  };

  try {
    const response = await fetch(`${BASE_URL}/ai/grading/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    console.log('✓ 请求成功');
    console.log(`会话 ID: ${result.data.sessionId}`);
    console.log(`科目：${result.data.subject}`);
    console.log(`总分：${result.data.totalScore}/${result.data.maxScore}`);
    console.log(`正确率：${result.data.scorePercentage}%`);
    console.log(`\n总体反馈：${result.data.overallFeedback}`);
    console.log(`\n优点:`);
    result.data.strengths.forEach(s => console.log(`  - ${s}`));
    console.log(`\n弱点:`);
    result.data.weaknesses.forEach(w => console.log(`  - ${w}`));
    console.log(`\n学习建议:`);
    result.data.studySuggestions.forEach(s => console.log(`  - ${s}`));

    return result;
  } catch (error) {
    console.error('✗ 请求失败:', error);
    // 如果会话不存在，这是预期的错误
    if (error.message?.includes('练习会话不存在')) {
      console.log('ℹ 提示：请先创建一个练习会话，然后使用真实的会话 ID 进行测试');
    }
    throw error;
  }
}

/**
 * 测试 4: 边界情况测试
 */
async function testEdgeCases() {
  console.log('\n=== 测试 4: 边界情况测试 ===');

  // 测试 4.1: 字数极少的作文
  console.log('\n测试 4.1: 字数极少的作文');
  try {
    const response = await fetch(`${BASE_URL}/ai/grading/essay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        essayContent: '我的梦想是当科学家。',
        essayType: 'NARRATIVE',
        gradeLevel: 5,
      }),
    });

    const result = await response.json();
    console.log(`✓ 字数：${result.data.wordCount}, 总分：${result.data.totalScore}`);
  } catch (error) {
    console.error('✗ 失败:', error);
  }

  // 测试 4.2: 完全错误的主观题答案
  console.log('\n测试 4.2: 完全错误的主观题答案');
  try {
    const response = await fetch(`${BASE_URL}/ai/grading/subjective`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        questionContent: '什么是牛顿第一定律？',
        studentAnswer: '我不知道',
        standardAnswer: '一切物体在没有受到外力作用时，总保持静止状态或匀速直线运动状态',
        maxScore: 5,
      }),
    });

    const result = await response.json();
    console.log(`✓ 得分：${result.data.score}/${result.data.maxScore}`);
  } catch (error) {
    console.error('✗ 失败:', error);
  }

  // 测试 4.3: 不存在的会话 ID
  console.log('\n测试 4.3: 不存在的会话 ID');
  try {
    const response = await fetch(`${BASE_URL}/ai/grading/report/999999`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const result = await response.json();
    console.log('✗ 应该抛出错误但没有');
  } catch (error) {
    console.log('✓ 正确抛出错误:', error.message);
  }
}

/**
 * 登录获取 Token（辅助函数）
 */
async function login() {
  console.log('正在登录...');

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'test123456',
      }),
    });

    if (response.ok) {
      const result = await response.json();
      authToken = result.data.token;
      console.log('✓ 登录成功');
    } else {
      console.log('ℹ 使用免认证模式（如果配置允许）');
      authToken = 'test-token';
    }
  } catch (error) {
    console.log('ℹ 使用测试 token');
    authToken = 'test-token';
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('========================================');
  console.log('AI 批改服务集成测试');
  console.log('========================================');

  await login();

  const tests = [
    { name: '作文智能评分', fn: testEssayGrading },
    { name: '主观题批改', fn: testSubjectiveGrading },
    { name: '生成评分报告', fn: testReportGeneration },
    { name: '边界情况测试', fn: testEdgeCases },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      failed++;
      console.error(`测试失败：${test.name}`);
    }
  }

  console.log('\n========================================');
  console.log(`测试完成：${passed}通过，${failed}失败`);
  console.log('========================================\n');
}

// 运行测试
runAllTests().catch(console.error);
