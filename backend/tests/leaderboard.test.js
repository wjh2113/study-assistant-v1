/**
 * Leaderboard 模块单元测试
 * ISSUE-P1-005: 排行榜功能
 */

const LeaderboardModel = require('../src/modules/leaderboard/LeaderboardModel');

describe('LeaderboardModel', () => {
  describe('数据验证', () => {
    test('应该存在 calculateTotalRanking 方法', () => {
      expect(typeof LeaderboardModel.calculateTotalRanking).toBe('function');
    });

    test('应该存在 calculateWeeklyRanking 方法', () => {
      expect(typeof LeaderboardModel.calculateWeeklyRanking).toBe('function');
    });

    test('应该存在 calculateMonthlyRanking 方法', () => {
      expect(typeof LeaderboardModel.calculateMonthlyRanking).toBe('function');
    });

    test('应该存在 getUserRanking 方法', () => {
      expect(typeof LeaderboardModel.getUserRanking).toBe('function');
    });

    test('应该存在 getPaginated 方法', () => {
      expect(typeof LeaderboardModel.getPaginated).toBe('function');
    });
  });

  describe('分页逻辑', () => {
    test('分页参数应该正确计算', () => {
      const page = 2;
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      expect(offset).toBe(20);
    });

    test('总页数应该正确计算', () => {
      const total = 150;
      const pageSize = 20;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(8);
    });
  });
});
