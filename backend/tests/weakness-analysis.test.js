/**
 * Weakness Analysis 模块单元测试
 * ISSUE-P1-003: 薄弱点分析功能
 */

const KnowledgeMasteryModel = require('../src/modules/weakness-analysis/KnowledgeMasteryModel');

describe('KnowledgeMasteryModel', () => {
  describe('calculateMasteryScore', () => {
    test('应该计算 100% 正确率的掌握度', () => {
      const score = KnowledgeMasteryModel.calculateMasteryScore(10, 0, 10);
      expect(score).toBeGreaterThanOrEqual(70); // 100% 正确率 + 足够练习次数
    });

    test('应该计算 50% 正确率的掌握度', () => {
      const score = KnowledgeMasteryModel.calculateMasteryScore(5, 5, 10);
      expect(score).toBeLessThan(70);
    });

    test('应该计算 0 正确率的掌握度', () => {
      const score = KnowledgeMasteryModel.calculateMasteryScore(0, 10, 10);
      expect(score).toBeLessThan(40);
    });

    test('练习次数为 0 时应该返回 0', () => {
      const score = KnowledgeMasteryModel.calculateMasteryScore(0, 0, 0);
      expect(score).toBe(0);
    });
  });

  describe('getMasteryLevel', () => {
    test('应该返回 mastered 等级（≥80 分）', () => {
      expect(KnowledgeMasteryModel.getMasteryLevel(80)).toBe('mastered');
      expect(KnowledgeMasteryModel.getMasteryLevel(100)).toBe('mastered');
    });

    test('应该返回 proficient 等级（60-79 分）', () => {
      expect(KnowledgeMasteryModel.getMasteryLevel(60)).toBe('proficient');
      expect(KnowledgeMasteryModel.getMasteryLevel(79)).toBe('proficient');
    });

    test('应该返回 learning 等级（40-59 分）', () => {
      expect(KnowledgeMasteryModel.getMasteryLevel(40)).toBe('learning');
      expect(KnowledgeMasteryModel.getMasteryLevel(59)).toBe('learning');
    });

    test('应该返回 weak 等级（<40 分）', () => {
      expect(KnowledgeMasteryModel.getMasteryLevel(0)).toBe('weak');
      expect(KnowledgeMasteryModel.getMasteryLevel(39)).toBe('weak');
    });
  });
});
