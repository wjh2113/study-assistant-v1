/**
 * AI 题目生成 Worker
 * 根据课本内容和知识点生成练习题
 */

const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

/**
 * 调用 AI 生成题目
 * @param {Object} job - BullMQ 任务对象
 * @returns {Promise<Object>} 生成的题目
 */
async function generateQuestions(job) {
  const { sessionId, textbookId, unitId, questionCount = 5 } = job.data;
  
  console.log(`🤖 开始生成题目：会话 ${sessionId}, 单元 ${unitId}`);
  
  try {
    // 1. 获取课本和单元信息
    const textbook = await prisma.textbook.findUnique({
      where: { id: textbookId },
    });
    
    if (!textbook) {
      throw new Error('课本不存在');
    }
    
    const parseResult = textbook.parse_result;
    const unit = parseResult?.chapters?.find(ch => 
      ch.sections?.some(s => s.id === unitId) || ch.id === unitId
    );
    
    if (!unit) {
      throw new Error('单元不存在');
    }
    
    // 2. 构建 AI 提示词
    const prompt = `
请为${textbook.subject || '数学'}${textbook.grade || ''}年级${unit.title}生成${questionCount}道练习题。

要求：
1. 题型包括：单选题、填空题、判断题
2. 每道题包含：题干、选项（选择题）、正确答案、解析
3. 难度适中，符合${textbook.grade || '小学'}学生水平
4. 返回严格的 JSON 格式

返回格式：
{
  "questions": [
    {
      "type": "single_choice|fill_blank|true_false",
      "question": "题目内容",
      "options": ["A. 选项 1", "B. 选项 2", ...], // 仅选择题需要
      "answer": "正确答案",
      "explanation": "解析"
    }
  ]
}
`.trim();
    
    // 3. 调用 AI API（示例，需替换为实际 API）
    const aiResponse = await axios.post(
      process.env.AI_API_URL || 'https://api.example.com/v1/chat',
      {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    // 4. 解析 AI 响应
    const aiContent = aiResponse.data.choices?.[0]?.message?.content;
    let questions;
    
    try {
      const parsed = JSON.parse(aiContent);
      questions = parsed.questions || [];
    } catch (e) {
      // AI 返回的不是 JSON，使用备用方案
      console.warn('AI 返回非 JSON 格式，使用备用题目');
      questions = generateFallbackQuestions(questionCount, unit);
    }
    
    // 5. 保存题目到数据库
    const savedQuestions = await Promise.all(
      questions.map(async (q, index) => {
        return await prisma.question.create({
          data: {
            session_id: sessionId,
            type: q.type,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            order: index,
          },
        });
      })
    );
    
    console.log(`✅ 题目生成完成：${savedQuestions.length}道`);
    
    return {
      success: true,
      sessionId,
      questionsCount: savedQuestions.length,
    };
    
  } catch (error) {
    console.error(`❌ 题目生成失败：${sessionId}`, error);
    throw error;
  }
}

/**
 * 备用题目生成器（当 AI 不可用时）
 */
function generateFallbackQuestions(count, unit) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push({
      type: 'single_choice',
      question: `关于${unit.title}的第${i + 1}题`,
      options: ['A. 选项 1', 'B. 选项 2', 'C. 选项 3', 'D. 选项 4'],
      answer: 'B',
      explanation: '这是备用题目的解析',
    });
  }
  return questions;
}

/**
 * 创建 AI 题目生成 Worker
 */
function createAIGeneratorWorker() {
  const worker = new Worker(
    'ai-generate',
    async (job) => {
      return await generateQuestions(job);
    },
    {
      connection,
      concurrency: 3, // 同时处理 3 个任务
    }
  );
  
  worker.on('completed', (job) => {
    console.log(`🎉 AI 题目生成完成：${job.id}`, job.returnvalue);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`💥 AI 题目生成失败：${job?.id}`, err);
  });
  
  worker.on('error', (err) => {
    console.error(`⚠️ AI Worker 错误:`, err);
  });
  
  console.log('🚀 AI 题目生成 Worker 已启动');
  
  return worker;
}

// 如果直接运行此文件，则启动 Worker
if (require.main === module) {
  const worker = createAIGeneratorWorker();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭 AI 题目生成 Worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = {
  generateQuestions,
  createAIGeneratorWorker,
};
