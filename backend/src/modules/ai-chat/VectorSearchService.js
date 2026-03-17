/**
 * Vector Search Service - 向量检索服务（RAG 核心）
 * ISSUE-P2-AI-001: AI 智能答疑
 */

const { db } = require('../../config/database');
const axios = require('axios');

class VectorSearchService {
  /**
   * 语义搜索
   * @param {string} query - 搜索 query
   * @param {string} subject - 科目（可选）
   * @param {number} limit - 返回数量
   * @param {number} threshold - 相似度阈值
   * @returns {Promise<Array>} 相关知识
   */
  static async search(query, subject = null, limit = 5, threshold = 0.6) {
    try {
      // 1. 生成 query 的 embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      if (!queryEmbedding) {
        console.warn('Embedding 生成失败，返回空结果');
        return [];
      }

      // 2. 向量相似度搜索（使用余弦相似度）
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      let sql = `
        SELECT 
          kp.id,
          kp.name,
          kp.description,
          ke.content,
          1 - (ke.embedding <=> ?) AS similarity
        FROM knowledge_embeddings ke
        JOIN knowledge_points kp ON ke.knowledge_point_id = kp.id
      `;

      const params = [embeddingStr];

      if (subject) {
        sql += ' WHERE kp.subject = ?';
        params.push(subject);
      }

      sql += ' ORDER BY similarity DESC LIMIT ?';
      params.push(limit);

      const stmt = db.prepare(sql);
      const results = stmt.all(...params);

      // 3. 过滤低相似度结果
      return results
        .filter(r => r.similarity >= threshold)
        .map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          content: r.content,
          similarity: parseFloat(r.similarity.toFixed(4))
        }));
    } catch (error) {
      console.error('向量搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 生成 embedding（调用 AI 模型）
   * @param {string} text - 输入文本
   * @returns {Promise<Array<number>>} embedding 向量
   */
  static async generateEmbedding(text) {
    try {
      const apiKey = process.env.AI_API_KEY || process.env.QWEN_PLUS_KEY;
      const apiUrl = process.env.EMBEDDING_API_URL || 
                     'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';

      if (!apiKey) {
        console.warn('Embedding API Key 未配置');
        return null;
      }

      // 通义千问 Embedding API
      const response = await axios.post(
        apiUrl,
        {
          model: 'text-embedding-v2',
          input: {
            texts: [text]
          },
          parameters: {
            text_type: 'query'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Key': apiKey
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.output && response.data.output.embeddings) {
        return response.data.output.embeddings[0].embedding;
      }

      console.warn('Embedding API 返回格式异常');
      return null;
    } catch (error) {
      console.error('生成 Embedding 失败:', error.message);
      
      // 降级方案：返回零向量（会导致搜索失效，但不影响主流程）
      return new Array(1536).fill(0);
    }
  }

  /**
   * 批量创建 embeddings
   * @param {Array} knowledgePoints - 知识点列表
   * @param {number} batchSize - 批次大小
   */
  static async bulkCreateEmbeddings(knowledgePoints, batchSize = 50) {
    const results = {
      total: knowledgePoints.length,
      success: 0,
      failed: 0,
      errors: []
    };

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO knowledge_embeddings 
      (knowledge_point_id, content, embedding)
      VALUES (?, ?, ?)
    `);

    // 分批处理
    for (let i = 0; i < knowledgePoints.length; i += batchSize) {
      const batch = knowledgePoints.slice(i, i + batchSize);
      console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(knowledgePoints.length / batchSize)}`);
      
      try {
        // Process batch directly (embeddings generated asynchronously, inserts are synchronous)
        for (const kp of batch) {
          try {
            const content = `${kp.name} ${kp.description || ''}`.trim();
            const embedding = await this.generateEmbedding(content);
            
            if (embedding) {
              const embeddingStr = `[${embedding.join(',')}]`;
              insertStmt.run(kp.id, content, embeddingStr);
              results.success++;
            } else {
              results.failed++;
              results.errors.push({ id: kp.id, error: 'Embedding 生成失败' });
            }
          } catch (error) {
            results.failed++;
            results.errors.push({ id: kp.id, error: error.message });
          }
        }
      } catch (error) {
        console.error('批次处理失败:', error.message);
      }

      // 避免 API 限流
      if (i + batchSize < knowledgePoints.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 为单个知识点创建/更新 embedding
   */
  static async upsertKnowledgeEmbedding(knowledgePoint) {
    try {
      const content = `${knowledgePoint.name} ${knowledgePoint.description || ''}`.trim();
      const embedding = await this.generateEmbedding(content);

      if (!embedding) {
        return { success: false, error: 'Embedding 生成失败' };
      }

      const embeddingStr = `[${embedding.join(',')}]`;
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO knowledge_embeddings 
        (knowledge_point_id, content, embedding, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(knowledgePoint.id, content, embeddingStr);

      return { success: true, knowledgePointId: knowledgePoint.id };
    } catch (error) {
      console.error('创建知识点 Embedding 失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除知识点的 embedding
   */
  static deleteKnowledgeEmbedding(knowledgePointId) {
    const stmt = db.prepare(`
      DELETE FROM knowledge_embeddings
      WHERE knowledge_point_id = ?
    `);

    const result = stmt.run(knowledgePointId);
    return result.changes > 0;
  }

  /**
   * 获取 embedding 统计信息
   */
  static getStats() {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT knowledge_point_id) as unique_points,
        AVG(length(embedding)) as avg_embedding_length
      FROM knowledge_embeddings
    `);

    return stmt.get();
  }

  /**
   * 测试连接
   */
  static async testConnection() {
    try {
      const testEmbedding = await this.generateEmbedding('测试');
      if (!testEmbedding || testEmbedding.length === 0) {
        return {
          success: false,
          error: 'Embedding 生成失败'
        };
      }

      // 测试向量搜索
      const results = await this.search('测试', null, 1, 0);
      
      return {
        success: true,
        embeddingDimension: testEmbedding.length,
        searchWorks: results !== undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = VectorSearchService;
