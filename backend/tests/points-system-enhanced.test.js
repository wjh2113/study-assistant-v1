/**
 * Points System 增强版单元测试
 * ISSUE-P1-004: 积分系统完善
 */

// 由于 PointsSystemModel 依赖 SQLite，我们测试纯函数逻辑
// 这里模拟积分计算规则

const POINTS_RULES = {
  practice_correct: 10,
  practice_accuracy_bonus: 20,
  practice_perfect_bonus: 50,
  practice_streak_bonus: 5,
  daily_check_in: 5,
  check_in_streak_7: 20,
  check_in_streak_30: 100
};

/**
 * 计算练习积分（与模型中相同的逻辑）
 */
function calculatePracticePoints(questions, streakDays = 0) {
  if (!questions || questions.length === 0) {
    return { points: 0, breakdown: {}, accuracy: 0 };
  }

  const correctCount = questions.filter(q => q.isCorrect).length;
  const accuracy = correctCount / questions.length;
  
  let points = 0;
  const breakdown = {};

  // 1. 基础分
  const basePoints = correctCount * POINTS_RULES.practice_correct;
  points += basePoints;
  breakdown.base = basePoints;

  // 2. 正确率奖励
  if (accuracy >= 0.8) {
    points += POINTS_RULES.practice_accuracy_bonus;
    breakdown.accuracyBonus = POINTS_RULES.practice_accuracy_bonus;
  }

  // 3. 完美奖励
  if (accuracy === 1.0 && questions.length >= 3) {
    points += POINTS_RULES.practice_perfect_bonus;
    breakdown.perfectBonus = POINTS_RULES.practice_perfect_bonus;
  }

  // 4. 连续练习奖励
  if (streakDays >= 3) {
    const streakBonus = Math.floor(streakDays / 3) * POINTS_RULES.practice_streak_bonus;
    points += streakBonus;
    breakdown.streakBonus = streakBonus;
  }

  return { points, breakdown, accuracy: (accuracy * 100).toFixed(1) };
}

/**
 * 计算打卡积分
 */
function calculateCheckInPoints(streakDays) {
  let points = POINTS_RULES.daily_check_in;
  let bonusPoints = 0;
  let bonusReason = '';

  if (streakDays === 7) {
    bonusPoints = POINTS_RULES.check_in_streak_7;
    bonusReason = '连续 7 天打卡奖励';
    points += bonusPoints;
  } else if (streakDays === 30) {
    bonusPoints = POINTS_RULES.check_in_streak_30;
    bonusReason = '连续 30 天打卡奖励';
    points += bonusPoints;
  }

  return { points, bonusPoints, bonusReason };
}

describe('Points System Enhanced', () => {
  describe('calculatePracticePoints', () => {
    test('全对且正确率 100% 应该获得基础分 + 准确率奖励 + 完美奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true }
      ];
      
      const result = calculatePracticePoints(questions);
      
      expect(result.points).toBe(120); // 5*10 + 20 + 50
      expect(result.breakdown.base).toBe(50);
      expect(result.breakdown.accuracyBonus).toBe(20);
      expect(result.breakdown.perfectBonus).toBe(50);
      expect(result.accuracy).toBe('100.0');
    });

    test('正确率 80% 应该获得基础分 + 准确率奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false }
      ];
      
      const result = calculatePracticePoints(questions);
      
      expect(result.points).toBe(60); // 4*10 + 20
      expect(result.breakdown.base).toBe(40);
      expect(result.breakdown.accuracyBonus).toBe(20);
      expect(result.breakdown.perfectBonus).toBeUndefined();
      expect(result.accuracy).toBe('80.0');
    });

    test('正确率<80% 应该只获得基础分', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: false }
      ];
      
      const result = calculatePracticePoints(questions);
      
      expect(result.points).toBe(30); // 3*10
      expect(result.breakdown.base).toBe(30);
      expect(result.breakdown.accuracyBonus).toBeUndefined();
      expect(result.accuracy).toBe('60.0');
    });

    test('全错应该得 0 分', () => {
      const questions = [
        { isCorrect: false },
        { isCorrect: false }
      ];
      
      const result = calculatePracticePoints(questions);
      
      expect(result.points).toBe(0);
      expect(result.accuracy).toBe('0.0');
    });

    test('空数组应该返回 0 分', () => {
      const result = calculatePracticePoints([]);
      expect(result.points).toBe(0);
    });

    test('连续练习 3 天应该获得额外奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true }
      ];
      
      const result = calculatePracticePoints(questions, 3);
      
      // 2*10 + 20(准确率≥80%) + 5(连续奖励) = 45
      expect(result.points).toBe(45);
      expect(result.breakdown.streakBonus).toBe(5);
      expect(result.breakdown.accuracyBonus).toBe(20);
    });

    test('连续练习 6 天应该获得更多奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true }
      ];
      
      const result = calculatePracticePoints(questions, 6);
      
      // 2*10 + 20(准确率≥80%) + 10(连续奖励 2 个周期) = 50
      expect(result.points).toBe(50);
      expect(result.breakdown.streakBonus).toBe(10);
    });

    test('2 题全对应该有准确率奖励但无完美奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true }
      ];
      
      const result = calculatePracticePoints(questions);
      
      // 2*10 + 20(准确率奖励) = 40，完美奖励需要≥3 题
      expect(result.points).toBe(40);
      expect(result.breakdown.accuracyBonus).toBe(20);
      expect(result.breakdown.perfectBonus).toBeUndefined();
    });
  });

  describe('calculateCheckInPoints', () => {
    test('普通打卡应该获得 5 分', () => {
      const result = calculateCheckInPoints(1);
      expect(result.points).toBe(5);
      expect(result.bonusPoints).toBe(0);
      expect(result.bonusReason).toBe('');
    });

    test('连续 7 天应该获得额外 20 分奖励', () => {
      const result = calculateCheckInPoints(7);
      expect(result.points).toBe(25); // 5 + 20
      expect(result.bonusPoints).toBe(20);
      expect(result.bonusReason).toBe('连续 7 天打卡奖励');
    });

    test('连续 30 天应该获得额外 100 分奖励', () => {
      const result = calculateCheckInPoints(30);
      expect(result.points).toBe(105); // 5 + 100
      expect(result.bonusPoints).toBe(100);
      expect(result.bonusReason).toBe('连续 30 天打卡奖励');
    });

    test('连续 15 天没有额外奖励', () => {
      const result = calculateCheckInPoints(15);
      expect(result.points).toBe(5);
      expect(result.bonusPoints).toBe(0);
    });
  });

  describe('积分规则验证', () => {
    test('POINTS_RULES 应该包含所有规则', () => {
      expect(POINTS_RULES.practice_correct).toBe(10);
      expect(POINTS_RULES.practice_accuracy_bonus).toBe(20);
      expect(POINTS_RULES.practice_perfect_bonus).toBe(50);
      expect(POINTS_RULES.daily_check_in).toBe(5);
      expect(POINTS_RULES.check_in_streak_7).toBe(20);
      expect(POINTS_RULES.check_in_streak_30).toBe(100);
    });
  });

  describe('边界情况', () => {
    test('1 题答对应该有基础分 + 准确率奖励', () => {
      const questions = [{ isCorrect: true }];
      const result = calculatePracticePoints(questions);
      // 1*10 + 20(准确率 100%≥80%) = 30
      expect(result.points).toBe(30);
    });

    test('3 题全对应该有完美奖励', () => {
      const questions = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true }
      ];
      const result = calculatePracticePoints(questions);
      expect(result.points).toBe(100); // 3*10 + 20 + 50
    });

    test('连续练习 2 天没有奖励', () => {
      const questions = [{ isCorrect: true }];
      const result = calculatePracticePoints(questions, 2);
      expect(result.breakdown.streakBonus).toBeUndefined();
    });
  });
});
