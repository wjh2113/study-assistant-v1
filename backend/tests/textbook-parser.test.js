/**
 * Textbook Parser 模块单元测试
 * ISSUE-P1-002: 课本解析功能完善
 */

const TextbookParserService = require('../src/modules/textbook-parser/TextbookParserService');

describe('TextbookParserService', () => {
  describe('parseStructureResult', () => {
    test('应该正确解析标准 JSON 结构', () => {
      const response = `{
        "bookInfo": {
          "grade": "三年级",
          "subject": "数学",
          "version": "人教版",
          "totalPages": 120
        },
        "structure": [
          {
            "type": "unit",
            "title": "第一单元",
            "chapters": [
              {
                "title": "第 1 课",
                "keywords": ["加法", "减法"]
              }
            ]
          }
        ]
      }`;

      const result = TextbookParserService.parseStructureResult(response);

      expect(result.bookInfo.grade).toBe('三年级');
      expect(result.bookInfo.subject).toBe('数学');
      expect(result.structure).toHaveLength(1);
      expect(result.structure[0].chapters).toHaveLength(1);
    });

    test('应该处理 Markdown 代码块格式', () => {
      const response = `
\`\`\`json
{
  "bookInfo": {
    "grade": "五年级",
    "subject": "英语"
  },
  "structure": []
}
\`\`\`
      `.trim();

      const result = TextbookParserService.parseStructureResult(response);

      expect(result.bookInfo.grade).toBe('五年级');
      expect(result.bookInfo.subject).toBe('英语');
    });

    test('解析失败时应该返回默认结构', () => {
      const response = '这不是有效的 JSON';

      const result = TextbookParserService.parseStructureResult(response);

      expect(result.bookInfo.grade).toBe('未知');
      expect(result.bookInfo.subject).toBe('未知');
      expect(result.structure).toEqual([]);
    });

    test('应该规范化缺失的字段', () => {
      const response = `{
        "bookInfo": {},
        "structure": [
          {
            "title": "无章节单元"
          }
        ]
      }`;

      const result = TextbookParserService.parseStructureResult(response);

      expect(result.bookInfo.grade).toBe('未知');
      expect(result.structure[0].title).toBe('无章节单元');
      expect(result.structure[0].chapters).toEqual([]);
    });
  });

  describe('normalizeStructure', () => {
    test('应该正确规范化单元和章节数据', () => {
      const input = {
        bookInfo: {
          grade: '七年级',
          subject: '物理',
          version: '北师大版',
          totalPages: 150
        },
        structure: [
          {
            title: '第一单元 力学',
            startPage: 1,
            endPage: 30,
            chapters: [
              {
                title: '第 1 章 运动',
                keywords: ['速度', '加速度'],
                knowledgePoints: ['匀速直线运动']
              }
            ]
          }
        ],
        specialSections: [
          {
            type: 'exercise',
            title: '练习题',
            startPage: 140
          }
        ]
      };

      const result = TextbookParserService.normalizeStructure(input);

      expect(result.bookInfo.grade).toBe('七年级');
      expect(result.structure[0].type).toBe('unit');
      expect(result.structure[0].chapters[0].keywords).toEqual(['速度', '加速度']);
      expect(result.specialSections).toHaveLength(1);
    });

    test('应该处理空结构', () => {
      const input = {
        bookInfo: {},
        structure: null
      };

      const result = TextbookParserService.normalizeStructure(input);

      expect(result.structure).toEqual([]);
    });
  });

  describe('calculateMasteryScore (模拟)', () => {
    test('应该正确计算掌握度分数', () => {
      // 模拟掌握度计算逻辑
      const calculateMasteryScore = (correctCount, wrongCount, totalCount) => {
        if (totalCount === 0) return 0;
        const accuracy = correctCount / totalCount;
        const practiceFactor = Math.min(totalCount / 20, 1);
        const score = (accuracy * 0.7 + practiceFactor * 0.3) * 100;
        return Math.round(score);
      };

      expect(calculateMasteryScore(10, 0, 10)).toBeGreaterThanOrEqual(70);
      expect(calculateMasteryScore(5, 5, 10)).toBeLessThan(70);
      expect(calculateMasteryScore(0, 10, 10)).toBeLessThan(40);
      expect(calculateMasteryScore(0, 0, 0)).toBe(0);
    });
  });

  describe('extractKnowledgePoints (mock)', () => {
    test('应该返回知识点数组格式', async () => {
      // Mock AI response
      const mockPoints = [
        {
          name: '知识点 1',
          description: '描述 1',
          difficulty: 'basic',
          tags: ['标签 1'],
          prerequisites: []
        }
      ];

      // 验证知识点规范化逻辑
      const normalized = mockPoints.map(p => ({
        name: p.name || '未命名知识点',
        description: p.description || '',
        difficulty: ['basic', 'intermediate', 'advanced'].includes(p.difficulty) ? p.difficulty : 'intermediate',
        tags: Array.isArray(p.tags) ? p.tags : [],
        prerequisites: Array.isArray(p.prerequisites) ? p.prerequisites : []
      }));

      expect(normalized[0].name).toBe('知识点 1');
      expect(normalized[0].difficulty).toBe('basic');
      expect(Array.isArray(normalized[0].tags)).toBe(true);
    });
  });
});
