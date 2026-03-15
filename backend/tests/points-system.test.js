/**
 * Points System 模块单元测试
 * ISSUE-P1-004: 积分系统
 */

const PointsSystemModel = require('../src/modules/points-system/PointsSystemModel');

describe('PointsSystemModel', () => {
  describe('calculatePracticePoints', () => {
    test('应该计算全对且正确率≥80% 的积分', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true }
      ];
      const points = PointsSystemModel.calculatePracticePoints(questions);
      expect(points).toBe(70); // 5*10 + 20 奖励
    });

    test('应该计算 80% 正确率的积分', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false }
      ];
      const points = PointsSystemModel.calculatePracticePoints(questions);
      expect(points).toBe(60); // 4*10 + 20 奖励
    });

    test('应该计算<80% 正确率的积分（无奖励）', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: false }
      ];
      const points = PointsSystemModel.calculatePracticePoints(questions);
      expect(points).toBe(30); // 3*10，无奖励
    });

    test('应该计算全错的积分', () => {
      const questions = [
        { isCorrect: false },
        { isCorrect: false }
      ];
      const points = PointsSystemModel.calculatePracticePoints(questions);
      expect(points).toBe(0);
    });

    test('空数组应该返回 0', () => {
      const points = PointsSystemModel.calculatePracticePoints([]);
      expect(points).toBe(0);
    });
  });
});
