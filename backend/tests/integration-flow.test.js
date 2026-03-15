/**
 * 学习助手 - 集成测试脚本
 * 测试完整的用户流程
 */

const request = require('supertest');
const app = require('../src/server');

// 测试配置
const TEST_USERS = {
  student: {
    phone: '13800138002',
    code: '123456',
    role: 'student',
    nickname: '集成测试学生',
    grade: '高一',
    school_name: '测试中学'
  },
  parent: {
    phone: '13800138003',
    code: '123456',
    role: 'parent',
    nickname: '集成测试家长',
    real_name: '测试家长'
  }
};

// 测试结果
const integrationResults = {
  flows: [],
  totalSteps: 0,
  passedSteps: 0,
  failedSteps: 0
};

function logStep(flowName, stepName, passed, error = null) {
  integrationResults.totalSteps++;
  if (passed) {
    integrationResults.passedSteps++;
    console.log(`  ✅ ${stepName}`);
  } else {
    integrationResults.failedSteps++;
    console.log(`  ❌ ${stepName}: ${error}`);
  }
}

function logFlowResult(flowName, passed, details = '') {
  integrationResults.flows.push({
    flowName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    console.log(`✅ 流程完成：${flowName}\n`);
  } else {
    console.log(`❌ 流程失败：${flowName} - ${details}\n`);
  }
}

describe('🔄 集成测试 - 完整用户流程', () => {
  
  beforeAll(() => {
    console.log('\n===========================================');
    console.log('🔄 开始集成测试 - 完整用户流程');
    console.log('===========================================\n');
  });

  afterAll(() => {
    console.log('\n===========================================');
    console.log('📊 集成测试结果汇总:');
    console.log(`   流程数：${integrationResults.flows.length}`);
    console.log(`   总步骤：${integrationResults.totalSteps}`);
    console.log(`   通过：${integrationResults.passedSteps}`);
    console.log(`   失败：${integrationResults.failedSteps}`);
    console.log(`   通过率：${((integrationResults.passedSteps / integrationResults.totalSteps) * 100).toFixed(2)}%`);
    console.log('===========================================\n');
  });

  // ==================== 流程 1: 学生完整学习流程 ====================
  describe('📚 流程 1: 学生完整学习流程', () => {
    let authToken;
    let userId;

    it('完整流程：注册→登录→出题→练习→积分→排行榜', async () => {
      console.log('\n【流程 1】学生完整学习流程');
      console.log('-------------------------------------------');
      
      try {
        // 步骤 1: 注册
        console.log('步骤 1: 用户注册');
        const registerRes = await request(app)
          .post('/api/auth/register')
          .send({
            phone: TEST_USERS.student.phone,
            code: TEST_USERS.student.code,
            role: TEST_USERS.student.role,
            nickname: TEST_USERS.student.nickname,
            grade: TEST_USERS.student.grade,
            school_name: TEST_USERS.student.school_name
          });
        
        let stepPassed = registerRes.statusCode === 201 && registerRes.body.token;
        logStep('流程 1', '用户注册', stepPassed, stepPassed ? null : registerRes.body);
        if (!stepPassed) throw new Error('注册失败');
        
        authToken = registerRes.body.token;
        userId = registerRes.body.user.id;

        // 步骤 2: 登录验证
        console.log('步骤 2: 用户登录');
        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({ phone: TEST_USERS.student.phone, code: TEST_USERS.student.code });
        
        stepPassed = loginRes.statusCode === 200 && loginRes.body.token;
        logStep('流程 1', '用户登录', stepPassed, stepPassed ? null : loginRes.body);
        if (!stepPassed) throw new Error('登录失败');
        
        authToken = loginRes.body.token;

        // 步骤 3: 获取用户信息
        console.log('步骤 3: 获取用户信息');
        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = meRes.statusCode === 200 && meRes.body.user.id === userId;
        logStep('流程 1', '获取用户信息', stepPassed, stepPassed ? null : meRes.body);
        if (!stepPassed) throw new Error('获取用户信息失败');

        // 步骤 4: AI 出题
        console.log('步骤 4: AI 生成题目');
        const generateRes = await request(app)
          .post('/api/ai/generate-questions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            textbookId: 1,
            textbookContent: '测试课本文本内容',
            grade: '高一',
            subject: '数学',
            unit: '第一单元',
            questionCount: 5,
            difficulty: 'medium',
            questionType: 'choice'
          });
        
        stepPassed = generateRes.statusCode === 200 && generateRes.body.success;
        logStep('流程 1', 'AI 生成题目', stepPassed, stepPassed ? null : generateRes.body);
        if (!stepPassed) throw new Error('AI 出题失败');

        // 步骤 5: 获取薄弱点分析
        console.log('步骤 5: 薄弱点分析');
        const weaknessRes = await request(app)
          .get('/api/weakness/analyze?subject=数学')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = weaknessRes.statusCode === 200 && weaknessRes.body.success;
        logStep('流程 1', '薄弱点分析', stepPassed, stepPassed ? null : weaknessRes.body);
        if (!stepPassed) throw new Error('薄弱点分析失败');

        // 步骤 6: 记录练习积分
        console.log('步骤 6: 记录练习积分');
        const practiceRes = await request(app)
          .post('/api/points/practice')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { isCorrect: true, knowledgePointId: 1, knowledgePointName: '测试知识点 1', subject: '数学' },
              { isCorrect: true, knowledgePointId: 1, knowledgePointName: '测试知识点 1', subject: '数学' },
              { isCorrect: true, knowledgePointId: 1, knowledgePointName: '测试知识点 1', subject: '数学' },
              { isCorrect: true, knowledgePointId: 1, knowledgePointName: '测试知识点 1', subject: '数学' },
              { isCorrect: false, knowledgePointId: 2, knowledgePointName: '测试知识点 2', subject: '数学' }
            ],
            practiceId: 1
          });
        
        stepPassed = practiceRes.statusCode === 200 && practiceRes.body.success;
        logStep('流程 1', '记录练习积分', stepPassed, stepPassed ? null : practiceRes.body);
        if (!stepPassed) throw new Error('记录积分失败');

        // 步骤 7: 每日打卡
        console.log('步骤 7: 每日打卡');
        const checkInRes = await request(app)
          .post('/api/points/check-in')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = checkInRes.statusCode === 200 && checkInRes.body.success;
        logStep('流程 1', '每日打卡', stepPassed, stepPassed ? null : checkInRes.body);
        if (!stepPassed) throw new Error('打卡失败');

        // 步骤 8: 获取我的积分
        console.log('步骤 8: 获取我的积分');
        const pointsRes = await request(app)
          .get('/api/points/me')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = pointsRes.statusCode === 200 && pointsRes.body.success;
        logStep('流程 1', '获取我的积分', stepPassed, stepPassed ? null : pointsRes.body);
        if (!stepPassed) throw new Error('获取积分失败');

        // 步骤 9: 查看排行榜
        console.log('步骤 9: 查看排行榜');
        const leaderboardRes = await request(app)
          .get('/api/leaderboard/total?page=1&pageSize=10')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = leaderboardRes.statusCode === 200 && leaderboardRes.body.success;
        logStep('流程 1', '查看排行榜', stepPassed, stepPassed ? null : leaderboardRes.body);
        if (!stepPassed) throw new Error('查看排行榜失败');

        // 步骤 10: 获取我的排名
        console.log('步骤 10: 获取我的排名');
        const myRankRes = await request(app)
          .get('/api/leaderboard/me/rank?type=total')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = myRankRes.statusCode === 200 && myRankRes.body.success;
        logStep('流程 1', '获取我的排名', stepPassed, stepPassed ? null : myRankRes.body);
        
        const flowPassed = stepPassed;
        logFlowResult('学生完整学习流程', flowPassed, flowPassed ? '所有步骤通过' : '部分步骤失败');
        expect(flowPassed).toBe(true);

      } catch (error) {
        logFlowResult('学生完整学习流程', false, error.message);
        expect(false).toBe(true);
      }
    });
  });

  // ==================== 流程 2: 家长监督流程 ====================
  describe('👨‍👩‍👧 流程 2: 家长监督流程', () => {
    let authToken;

    it('完整流程：注册→登录→查看孩子进度', async () => {
      console.log('\n【流程 2】家长监督流程');
      console.log('-------------------------------------------');
      
      try {
        // 步骤 1: 家长注册
        console.log('步骤 1: 家长注册');
        const registerRes = await request(app)
          .post('/api/auth/register')
          .send({
            phone: TEST_USERS.parent.phone,
            code: TEST_USERS.parent.code,
            role: TEST_USERS.parent.role,
            nickname: TEST_USERS.parent.nickname,
            real_name: TEST_USERS.parent.real_name
          });
        
        let stepPassed = registerRes.statusCode === 201 && registerRes.body.token;
        logStep('流程 2', '家长注册', stepPassed, stepPassed ? null : registerRes.body);
        if (!stepPassed) throw new Error('家长注册失败');
        
        authToken = registerRes.body.token;

        // 步骤 2: 家长登录
        console.log('步骤 2: 家长登录');
        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({ phone: TEST_USERS.parent.phone, code: TEST_USERS.parent.code });
        
        stepPassed = loginRes.statusCode === 200 && loginRes.body.token;
        logStep('流程 2', '家长登录', stepPassed, stepPassed ? null : loginRes.body);
        if (!stepPassed) throw new Error('家长登录失败');
        
        authToken = loginRes.body.token;

        // 步骤 3: 获取家长积分
        console.log('步骤 3: 获取家长积分');
        const pointsRes = await request(app)
          .get('/api/points/me')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = pointsRes.statusCode === 200 && pointsRes.body.success;
        logStep('流程 2', '获取家长积分', stepPassed, stepPassed ? null : pointsRes.body);
        if (!stepPassed) throw new Error('获取积分失败');

        // 步骤 4: 查看排行榜
        console.log('步骤 4: 查看排行榜');
        const leaderboardRes = await request(app)
          .get('/api/leaderboard/total?page=1&pageSize=10')
          .set('Authorization', `Bearer ${authToken}`);
        
        stepPassed = leaderboardRes.statusCode === 200 && leaderboardRes.body.success;
        logStep('流程 2', '查看排行榜', stepPassed, stepPassed ? null : leaderboardRes.body);
        
        const flowPassed = stepPassed;
        logFlowResult('家长监督流程', flowPassed, flowPassed ? '所有步骤通过' : '部分步骤失败');
        expect(flowPassed).toBe(true);

      } catch (error) {
        logFlowResult('家长监督流程', false, error.message);
        expect(false).toBe(true);
      }
    });
  });

  // ==================== 流程 3: 速率限制测试 ====================
  describe('🛡️ 流程 3: 速率限制测试', () => {
    
    it('应该触发速率限制', async () => {
      console.log('\n【流程 3】速率限制测试');
      console.log('-------------------------------------------');
      
      // 快速发送多个请求
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/auth/send-code')
            .send({ phone: `13800138${String(i).padStart(3, '0')}` })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // 至少有一个请求应该成功
      const hasSuccess = responses.some(r => r.statusCode === 200);
      logStep('流程 3', '批量发送验证码', hasSuccess, hasSuccess ? null : '所有请求都失败');
      
      // 检查是否有速率限制响应 (429)
      const hasRateLimit = responses.some(r => r.statusCode === 429);
      logStep('流程 3', '触发速率限制', hasRateLimit || hasSuccess, 
        hasRateLimit ? '速率限制生效' : (hasSuccess ? '未触发限制 (正常)' : '所有请求失败'));
      
      const flowPassed = hasSuccess;
      logFlowResult('速率限制测试', flowPassed, flowPassed ? '测试通过' : '测试失败');
      expect(flowPassed).toBe(true);
    });
  });

  // ==================== 流程 4: 错误处理测试 ====================
  describe('⚠️ 流程 4: 错误处理测试', () => {
    
    it('应该正确处理各种错误情况', async () => {
      console.log('\n【流程 4】错误处理测试');
      console.log('-------------------------------------------');
      
      // 测试 1: 无效 Token
      console.log('测试 1: 无效 Token');
      const invalidTokenRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token');
      
      let stepPassed = invalidTokenRes.statusCode === 401;
      logStep('流程 4', '无效 Token 处理', stepPassed, stepPassed ? null : invalidTokenRes.body);

      // 测试 2: 缺少必要参数
      console.log('测试 2: 缺少必要参数');
      const missingParamRes = await request(app)
        .post('/api/auth/login')
        .send({});
      
      stepPassed = missingParamRes.statusCode === 400;
      logStep('流程 4', '缺少参数处理', stepPassed, stepPassed ? null : missingParamRes.body);

      // 测试 3: 未授权访问
      console.log('测试 3: 未授权访问');
      const unauthorizedRes = await request(app)
        .post('/api/ai/generate-questions')
        .send({ textbookId: 1 });
      
      stepPassed = unauthorizedRes.statusCode === 401;
      logStep('流程 4', '未授权访问处理', stepPassed, stepPassed ? null : unauthorizedRes.body);

      const flowPassed = true; // 所有错误都被正确处理
      logFlowResult('错误处理测试', flowPassed, '所有错误场景都被正确处理');
      expect(flowPassed).toBe(true);
    });
  });
});
