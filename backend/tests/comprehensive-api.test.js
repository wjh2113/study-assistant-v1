/**
 * 学习助手 - 综合 API 测试脚本
 * 测试所有核心接口功能
 */

const request = require('supertest');
const app = require('../src/server');

// 测试配置
const TEST_CONFIG = {
  phone: '13800138001',
  code: '123456',
  nickname: '测试用户',
  grade: '高一',
  school_name: '测试中学'
};

// 全局状态
let authToken = null;
let userId = null;

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 辅助函数
function logResult(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${error}`);
  }
  testResults.details.push({ testName, passed, error, timestamp: new Date().toISOString() });
}

describe('学习助手 - 综合 API 测试', () => {
  
  beforeAll(() => {
    console.log('\n🧪 开始综合 API 测试...\n');
  });

  afterAll(() => {
    console.log('\n===========================================');
    console.log(`📊 测试结果汇总:`);
    console.log(`   总计：${testResults.total}`);
    console.log(`   通过：${testResults.passed}`);
    console.log(`   失败：${testResults.failed}`);
    console.log(`   通过率：${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log('===========================================\n');
  });

  // ==================== 认证模块 ====================
  describe('🔐 认证模块', () => {
    
    describe('POST /api/auth/send-code', () => {
      it('应该成功发送验证码', async () => {
        const res = await request(app)
          .post('/api/auth/send-code')
          .send({ phone: TEST_CONFIG.phone });
        
        const passed = res.statusCode === 200 && res.body.message === '验证码已发送';
        logResult('发送验证码 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });

      it('应该拒绝无效手机号', async () => {
        const res = await request(app)
          .post('/api/auth/send-code')
          .send({ phone: '12345' });
        
        const passed = res.statusCode === 400;
        logResult('发送验证码 - 无效手机号', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('POST /api/auth/register', () => {
      it('应该成功注册新用户', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            phone: TEST_CONFIG.phone,
            code: TEST_CONFIG.code,
            role: 'student',
            nickname: TEST_CONFIG.nickname,
            grade: TEST_CONFIG.grade,
            school_name: TEST_CONFIG.school_name
          });
        
        const passed = res.statusCode === 201 && res.body.token;
        logResult('用户注册 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
        
        if (passed) {
          authToken = res.body.token;
          userId = res.body.user.id;
        }
      });

      it('应该拒绝重复注册', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            phone: TEST_CONFIG.phone,
            code: TEST_CONFIG.code,
            role: 'student'
          });
        
        const passed = res.statusCode === 400 && res.body.error === '该手机号已注册';
        logResult('用户注册 - 重复注册', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('POST /api/auth/login', () => {
      it('应该成功登录', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ phone: TEST_CONFIG.phone, code: TEST_CONFIG.code });
        
        const passed = res.statusCode === 200 && res.body.token;
        logResult('用户登录 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
        
        if (passed) {
          authToken = res.body.token;
        }
      });

      it('应该拒绝错误验证码', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ phone: TEST_CONFIG.phone, code: '999999' });
        
        const passed = res.statusCode === 401;
        logResult('用户登录 - 错误验证码', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('GET /api/auth/me', () => {
      it('应该获取当前用户信息', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.user.id === userId;
        logResult('获取用户信息 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });

      it('应该拒绝未授权访问', async () => {
        const res = await request(app)
          .get('/api/auth/me');
        
        const passed = res.statusCode === 401;
        logResult('获取用户信息 - 未授权', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== AI 出题模块 ====================
  describe('🤖 AI 出题模块', () => {
    
    describe('POST /api/ai/generate-questions', () => {
      it('应该成功生成题目', async () => {
        const res = await request(app)
          .post('/api/ai/generate-questions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            textbookId: 1,
            textbookContent: '测试课本文本',
            grade: '三年级',
            subject: '数学',
            unit: '第一单元',
            questionCount: 3,
            difficulty: 'medium',
            questionType: 'choice'
          });
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('AI 出题 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });

      it('应该拒绝未授权请求', async () => {
        const res = await request(app)
          .post('/api/ai/generate-questions')
          .send({ textbookId: 1 });
        
        const passed = res.statusCode === 401;
        logResult('AI 出题 - 未授权', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('GET /api/ai/task-logs', () => {
      it('应该获取任务日志', async () => {
        const res = await request(app)
          .get('/api/ai/task-logs?page=1&pageSize=10')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('获取任务日志 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 薄弱点分析模块 ====================
  describe('📊 薄弱点分析模块', () => {
    
    describe('GET /api/weakness/analyze', () => {
      it('应该分析薄弱点', async () => {
        const res = await request(app)
          .get('/api/weakness/analyze?subject=数学')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('薄弱点分析 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('GET /api/weakness/mastery', () => {
      it('应该获取知识点掌握度', async () => {
        const res = await request(app)
          .get('/api/weakness/mastery?subject=数学')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('获取掌握度 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 积分系统模块 ====================
  describe('💰 积分系统模块', () => {
    
    describe('GET /api/points/me', () => {
      it('应该获取我的积分', async () => {
        const res = await request(app)
          .get('/api/points/me')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('获取我的积分 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('GET /api/points/check-in/status', () => {
      it('应该获取打卡状态', async () => {
        const res = await request(app)
          .get('/api/points/check-in/status')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('获取打卡状态 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('POST /api/points/check-in', () => {
      it('应该成功打卡', async () => {
        const res = await request(app)
          .post('/api/points/check-in')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('打卡 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('POST /api/points/practice', () => {
      it('应该记录练习积分', async () => {
        const res = await request(app)
          .post('/api/points/practice')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questions: [
              { isCorrect: true },
              { isCorrect: true },
              { isCorrect: false }
            ],
            practiceId: 1
          });
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('记录练习积分 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 排行榜模块 ====================
  describe('🏆 排行榜模块', () => {
    
    describe('GET /api/leaderboard/total', () => {
      it('应该获取总排行榜', async () => {
        const res = await request(app)
          .get('/api/leaderboard/total?page=1&pageSize=10')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('获取总排行榜 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });

    describe('GET /api/leaderboard/me/rank', () => {
      it('应该获取我的排名', async () => {
        const res = await request(app)
          .get('/api/leaderboard/me/rank?type=total')
          .set('Authorization', `Bearer ${authToken}`);
        
        const passed = res.statusCode === 200 && res.body.success;
        logResult('获取我的排名 - 成功', passed, passed ? null : res.body);
        expect(passed).toBe(true);
      });
    });
  });

  // ==================== 健康检查 ====================
  describe('🏥 健康检查', () => {
    
    it('应该返回服务健康状态', async () => {
      // BUG-API-002 修复：使用正确的健康检查路径 /api/health
      const res = await request(app)
        .get('/api/health');
      
      const passed = res.statusCode === 200;
      logResult('健康检查 - 成功', passed, passed ? null : res.body);
      expect(passed).toBe(true);
    });
  });
});
