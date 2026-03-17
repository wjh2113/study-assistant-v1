/**
 * BatchUpdateService 测试
 * 测试覆盖：批量操作、队列管理、事务处理
 */

const BatchUpdateService = require('../src/modules/ai-gateway/BatchUpdateService');

// Mock database
jest.mock('../../config/database', () => ({
  db: {
    exec: jest.fn(),
    prepare: jest.fn().mockReturnValue({
      run: jest.fn()
    })
  }
}));

const { db } = require('../../config/database');

describe('BatchUpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置队列和定时器
    BatchUpdateService.updateQueue.clear();
    BatchUpdateService.flushTimers.clear();
    
    // Mock db.exec
    db.exec.mockImplementation((cmd) => {
      if (cmd === 'BEGIN TRANSACTION' || cmd === 'COMMIT' || cmd === 'ROLLBACK') {
        return;
      }
    });
  });

  describe('init', () => {
    test('应该初始化批量更新服务', () => {
      BatchUpdateService.init();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('批量更新服务已启动')
      );
    });

    test('应该设置定期刷新定时器', () => {
      jest.useFakeTimers();
      
      BatchUpdateService.init();
      
      jest.advanceTimersByTime(BatchUpdateService.config.flushInterval);
      
      // 应该触发 forceFlushAll
      expect(db.exec).toHaveBeenCalledWith(expect.any(String));
      
      jest.useRealTimers();
    });
  });

  describe('queueUpdate', () => {
    test('应该添加更新到队列', async () => {
      const result = await BatchUpdateService.queueUpdate('ai_task_logs', {
        id: 1,
        status: 'completed'
      });

      expect(result).toBe(true);
      expect(BatchUpdateService.updateQueue.get('ai_task_logs')).toHaveLength(1);
    });

    test('应该按表名分队', async () => {
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.queueUpdate('learning_progress', { userId: 1 });

      expect(BatchUpdateService.updateQueue.get('ai_task_logs')).toHaveLength(1);
      expect(BatchUpdateService.updateQueue.get('learning_progress')).toHaveLength(1);
    });

    test('应该在达到批次大小时立即刷新', async () => {
      BatchUpdateService.config.batchSize = 2;
      
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 2 });

      // 队列应该被清空
      expect(BatchUpdateService.updateQueue.get('ai_task_logs')).toHaveLength(0);
      expect(db.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(db.exec).toHaveBeenCalledWith('COMMIT');
    });

    test('应该设置延迟刷新定时器', async () => {
      jest.useFakeTimers();
      
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });

      expect(BatchUpdateService.flushTimers.has('ai_task_logs')).toBe(true);
      
      jest.advanceTimersByTime(BatchUpdateService.config.flushInterval);
      
      expect(db.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
      
      jest.useRealTimers();
    });

    test('应该为每个队列项记录时间戳', async () => {
      const beforeQueue = Date.now();
      
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      
      const queue = BatchUpdateService.updateQueue.get('ai_task_logs');
      expect(queue[0].queuedAt).toBeGreaterThanOrEqual(beforeQueue);
    });
  });

  describe('flushQueue', () => {
    test('应该刷新指定队列', async () => {
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1, status: 'completed' });
      
      const result = await BatchUpdateService.flushQueue('ai_task_logs');

      expect(result).toBe(true);
      expect(db.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(db.exec).toHaveBeenCalledWith('COMMIT');
    });

    test('应该清除刷新定时器', async () => {
      jest.useFakeTimers();
      
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      
      const timer = BatchUpdateService.flushTimers.get('ai_task_logs');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      await BatchUpdateService.flushQueue('ai_task_logs');
      
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer);
      expect(BatchUpdateService.flushTimers.has('ai_task_logs')).toBe(false);
      
      clearTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    test('应该在队列为空时直接返回', async () => {
      const result = await BatchUpdateService.flushQueue('empty_queue');

      expect(result).toBe(true);
      expect(db.exec).not.toHaveBeenCalled();
    });

    test('应该在失败时将数据放回队列', async () => {
      db.exec.mockImplementationOnce((cmd) => {
        if (cmd === 'BEGIN TRANSACTION') return;
        throw new Error('数据库错误');
      });

      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      
      const result = await BatchUpdateService.flushQueue('ai_task_logs');

      expect(result).toBe(false);
      expect(BatchUpdateService.updateQueue.get('ai_task_logs')).toHaveLength(1);
    });
  });

  describe('forceFlushAll', () => {
    test('应该强制刷新所有队列', async () => {
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.queueUpdate('learning_progress', { userId: 1 });
      await BatchUpdateService.queueUpdate('practice_sessions', { id: 1 });

      await BatchUpdateService.forceFlushAll();

      expect(db.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(db.exec).toHaveBeenCalledWith('COMMIT');
      
      // 所有队列应该被清空
      expect(BatchUpdateService.updateQueue.get('ai_task_logs')).toHaveLength(0);
      expect(BatchUpdateService.updateQueue.get('learning_progress')).toHaveLength(0);
      expect(BatchUpdateService.updateQueue.get('practice_sessions')).toHaveLength(0);
    });

    test('应该在没有队列时正常返回', async () => {
      await BatchUpdateService.forceFlushAll();

      expect(db.exec).not.toHaveBeenCalled();
    });
  });

  describe('executeBatchUpdate', () => {
    test('应该批量更新 ai_task_logs 表', async () => {
      const updates = [
        { id: 1, status: 'completed', output: { data: 'test' } },
        { id: 2, status: 'completed', output: { data: 'test2' } }
      ];

      await BatchUpdateService.executeBatchUpdate('ai_task_logs', updates);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE ai_task_logs'));
    });

    test('应该批量更新 learning_progress 表', async () => {
      const updates = [
        { 
          userId: 1, 
          knowledgePointId: 1, 
          masteryLevel: 0.8,
          correctCount: 10,
          wrongCount: 2
        }
      ];

      await BatchUpdateService.executeBatchUpdate('learning_progress', updates);

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE learning_progress'));
    });
  });

  describe('batchInsert', () => {
    test('应该批量插入 ai_task_logs', async () => {
      const records = [
        {
          userId: 1,
          taskType: 'question-generation',
          input: { prompt: 'test' },
          output: { result: 'success' },
          status: 'completed'
        },
        {
          userId: 2,
          taskType: 'chat',
          input: { message: 'hello' },
          status: 'completed'
        }
      ];

      const count = await BatchUpdateService.batchInsert('ai_task_logs', records);

      expect(count).toBe(2);
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO ai_task_logs'));
    });

    test('应该在不支持的表名时返回 0', async () => {
      const records = [{ id: 1 }];

      const count = await BatchUpdateService.batchInsert('unsupported_table', records);

      expect(count).toBe(0);
    });

    test('应该在空数组时返回 0', async () => {
      const count = await BatchUpdateService.batchInsert('ai_task_logs', []);

      expect(count).toBe(0);
    });

    test('应该在插入失败时回滚', async () => {
      db.exec.mockImplementationOnce((cmd) => {
        if (cmd === 'ROLLBACK') throw new Error('回滚失败');
      });

      const records = [{ userId: 1, taskType: 'test' }];

      await expect(
        BatchUpdateService.batchInsert('ai_task_logs', records)
      ).rejects.toThrow();

      expect(db.exec).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getQueueStatus', () => {
    test('应该获取队列状态', async () => {
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 2 });
      await BatchUpdateService.queueUpdate('learning_progress', { userId: 1 });

      const status = BatchUpdateService.getQueueStatus();

      expect(status.queues.ai_task_logs.queueSize).toBe(2);
      expect(status.queues.learning_progress.queueSize).toBe(1);
      expect(status.totalQueued).toBe(3);
      expect(status.config).toBeDefined();
    });

    test('应该在空队列时返回 0', () => {
      const status = BatchUpdateService.getQueueStatus();

      expect(status.totalQueued).toBe(0);
      expect(status.queues).toEqual({});
    });

    test('应该包含队列配置信息', () => {
      const status = BatchUpdateService.getQueueStatus();

      expect(status.config.batchSize).toBeDefined();
      expect(status.config.maxQueueSize).toBeDefined();
      expect(status.config.flushInterval).toBeDefined();
    });
  });

  describe('clearAll', () => {
    test('应该清空所有队列', async () => {
      jest.useFakeTimers();
      
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.queueUpdate('learning_progress', { userId: 1 });

      await BatchUpdateService.clearAll();

      expect(BatchUpdateService.updateQueue.size).toBe(0);
      expect(BatchUpdateService.flushTimers.size).toBe(0);
      
      jest.useRealTimers();
    });

    test('应该清除所有定时器', async () => {
      jest.useFakeTimers();
      
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      await BatchUpdateService.clearAll();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('重试机制', () => {
    test('应该在更新失败时重试', async () => {
      let callCount = 0;
      
      db.exec.mockImplementation((cmd) => {
        if (cmd === 'BEGIN TRANSACTION') return;
        if (cmd === 'COMMIT') return;
        
        callCount++;
        if (callCount < 3) {
          throw new Error('临时错误');
        }
      });

      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.flushQueue('ai_task_logs');

      // 应该重试多次
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    test('应该在超过最大重试次数后抛出错误', async () => {
      db.exec.mockImplementation((cmd) => {
        if (cmd === 'BEGIN TRANSACTION') return;
        if (cmd === 'COMMIT') return;
        throw new Error('持久错误');
      });

      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      
      await expect(
        BatchUpdateService.flushQueue('ai_task_logs')
      ).resolves.toBe(false); // 失败时返回 false，数据放回队列
    });
  });

  describe('事务处理', () => {
    test('应该开启事务', async () => {
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.flushQueue('ai_task_logs');

      expect(db.exec).toHaveBeenCalledWith('BEGIN TRANSACTION');
    });

    test('应该提交事务', async () => {
      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.flushQueue('ai_task_logs');

      expect(db.exec).toHaveBeenCalledWith('COMMIT');
    });

    test('应该在失败时回滚事务', async () => {
      db.exec.mockImplementationOnce((cmd) => {
        if (cmd === 'BEGIN TRANSACTION') return;
        throw new Error('错误');
      });

      await BatchUpdateService.queueUpdate('ai_task_logs', { id: 1 });
      await BatchUpdateService.flushQueue('ai_task_logs');

      expect(db.exec).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
