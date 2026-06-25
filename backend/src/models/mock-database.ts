import { PrismaClient } from '@prisma/client';

/**
 * Mock 数据库工具类
 * 用于单元测试中模拟数据库操作
 */

/**
 * 创建 Mock Prisma Client
 * @returns 模拟的 Prisma Client
 */
export function createMockPrismaClient(): MockPrismaClient {
  return new MockPrismaClient();
}

/**
 * Mock Prisma Client 类
 * 提供内存中的数据库模拟
 */
export class MockPrismaClient {
  private users: any[] = [];
  private subjects: any[] = [];
  private knowledgePoints: any[] = [];
  private exercises: any[] = [];
  private wrongQuestions: any[] = [];
  private studyPlans: any[] = [];
  private exerciseRecords: any[] = [];
  private learningRecords: any[] = [];
  private pointsLedgers: any[] = [];
  private textbooks: any[] = [];
  private textbookUnits: any[] = [];
  private practiceSessions: any[] = [];
  private practiceQuestions: any[] = [];
  private practiceAnswers: any[] = [];
  private familyBindings: any[] = [];
  private aiChats: any[] = [];
  private uploadFiles: any[] = [];

  user = {
    create: async (data: any) => this.createRecord('users', data),
    findUnique: async (params: any) => this.findUnique('users', params),
    findMany: async (params: any) => this.findMany('users', params),
    update: async (params: any) => this.update('users', params),
    delete: async (params: any) => this.delete('users', params),
    count: async (params: any) => this.count('users', params),
    groupBy: async (params: any) => this.groupBy('users', params),
    aggregate: async (params: any) => this.aggregate('users', params),
  };

  subject = {
    create: async (data: any) => this.createRecord('subjects', data),
    findUnique: async (params: any) => this.findUnique('subjects', params),
    findMany: async (params: any) => this.findMany('subjects', params),
    update: async (params: any) => this.update('subjects', params),
    delete: async (params: any) => this.delete('subjects', params),
  };

  knowledgePoint = {
    create: async (data: any) => this.createRecord('knowledgePoints', data),
    findUnique: async (params: any) => this.findUnique('knowledgePoints', params),
    findMany: async (params: any) => this.findMany('knowledgePoints', params),
    update: async (params: any) => this.update('knowledgePoints', params),
    delete: async (params: any) => this.delete('knowledgePoints', params),
  };

  exercise = {
    create: async (data: any) => this.createRecord('exercises', data),
    findUnique: async (params: any) => this.findUnique('exercises', params),
    findMany: async (params: any) => this.findMany('exercises', params),
    update: async (params: any) => this.update('exercises', params),
    delete: async (params: any) => this.delete('exercises', params),
  };

  wrongQuestion = {
    create: async (data: any) => this.createRecord('wrongQuestions', data),
    findUnique: async (params: any) => this.findUnique('wrongQuestions', params),
    findMany: async (params: any) => this.findMany('wrongQuestions', params),
    update: async (params: any) => this.update('wrongQuestions', params),
    delete: async (params: any) => this.delete('wrongQuestions', params),
  };

  studyPlan = {
    create: async (data: any) => this.createRecord('studyPlans', data),
    findUnique: async (params: any) => this.findUnique('studyPlans', params),
    findMany: async (params: any) => this.findMany('studyPlans', params),
    update: async (params: any) => this.update('studyPlans', params),
    delete: async (params: any) => this.delete('studyPlans', params),
  };

  exerciseRecord = {
    create: async (data: any) => this.createRecord('exerciseRecords', data),
    findUnique: async (params: any) => this.findUnique('exerciseRecords', params),
    findMany: async (params: any) => this.findMany('exerciseRecords', params),
    update: async (params: any) => this.update('exerciseRecords', params),
    delete: async (params: any) => this.delete('exerciseRecords', params),
    count: async (params: any) => this.count('exerciseRecords', params),
    groupBy: async (params: any) => this.groupBy('exerciseRecords', params),
  };

  learningRecord = {
    create: async (data: any) => this.createRecord('learningRecords', data),
    findUnique: async (params: any) => this.findUnique('learningRecords', params),
    findMany: async (params: any) => this.findMany('learningRecords', params),
    update: async (params: any) => this.update('learningRecords', params),
    delete: async (params: any) => this.delete('learningRecords', params),
    count: async (params: any) => this.count('learningRecords', params),
    groupBy: async (params: any) => this.groupBy('learningRecords', params),
    aggregate: async (params: any) => this.aggregate('learningRecords', params),
  };

  pointsLedger = {
    create: async (data: any) => this.createRecord('pointsLedgers', data),
    findUnique: async (params: any) => this.findUnique('pointsLedgers', params),
    findMany: async (params: any) => this.findMany('pointsLedgers', params),
    update: async (params: any) => this.update('pointsLedgers', params),
    delete: async (params: any) => this.delete('pointsLedgers', params),
    count: async (params: any) => this.count('pointsLedgers', params),
    groupBy: async (params: any) => this.groupBy('pointsLedgers', params),
    aggregate: async (params: any) => this.aggregate('pointsLedgers', params),
  };

  textbook = {
    create: async (data: any) => this.createRecord('textbooks', data),
    findUnique: async (params: any) => this.findUnique('textbooks', params),
    findMany: async (params: any) => this.findMany('textbooks', params),
    update: async (params: any) => this.update('textbooks', params),
    delete: async (params: any) => this.delete('textbooks', params),
  };

  textbookUnit = {
    create: async (data: any) => this.createRecord('textbookUnits', data),
    findUnique: async (params: any) => this.findUnique('textbookUnits', params),
    findMany: async (params: any) => this.findMany('textbookUnits', params),
    update: async (params: any) => this.update('textbookUnits', params),
    delete: async (params: any) => this.delete('textbookUnits', params),
  };

  practiceSession = {
    create: async (data: any) => this.createRecord('practiceSessions', data),
    findUnique: async (params: any) => this.findUnique('practiceSessions', params),
    findMany: async (params: any) => this.findMany('practiceSessions', params),
    update: async (params: any) => this.update('practiceSessions', params),
    delete: async (params: any) => this.delete('practiceSessions', params),
  };

  practiceQuestion = {
    create: async (data: any) => this.createRecord('practiceQuestions', data),
    findUnique: async (params: any) => this.findUnique('practiceQuestions', params),
    findMany: async (params: any) => this.findMany('practiceQuestions', params),
    update: async (params: any) => this.update('practiceQuestions', params),
    delete: async (params: any) => this.delete('practiceQuestions', params),
  };

  practiceAnswer = {
    create: async (data: any) => this.createRecord('practiceAnswers', data),
    findUnique: async (params: any) => this.findUnique('practiceAnswers', params),
    findMany: async (params: any) => this.findMany('practiceAnswers', params),
    update: async (params: any) => this.update('practiceAnswers', params),
    delete: async (params: any) => this.delete('practiceAnswers', params),
  };

  familyBinding = {
    create: async (data: any) => this.createRecord('familyBindings', data),
    findUnique: async (params: any) => this.findUnique('familyBindings', params),
    findMany: async (params: any) => this.findMany('familyBindings', params),
    update: async (params: any) => this.update('familyBindings', params),
    delete: async (params: any) => this.delete('familyBindings', params),
  };

  aiChat = {
    create: async (data: any) => this.createRecord('aiChats', data),
    findUnique: async (params: any) => this.findUnique('aiChats', params),
    findMany: async (params: any) => this.findMany('aiChats', params),
    update: async (params: any) => this.update('aiChats', params),
    delete: async (params: any) => this.delete('aiChats', params),
  };

  uploadFile = {
    create: async (data: any) => this.createRecord('uploadFiles', data),
    findUnique: async (params: any) => this.findUnique('uploadFiles', params),
    findMany: async (params: any) => this.findMany('uploadFiles', params),
    update: async (params: any) => this.update('uploadFiles', params),
    delete: async (params: any) => this.delete('uploadFiles', params),
  };

  $disconnect = async () => {
    // No-op for mock
  };

  $connect = async () => {
    // No-op for mock
  };

  private getCollection(collection: string): any[] {
    return (this as any)[collection] || [];
  }

  private async createRecord(collection: string, data: any) {
    const collectionData = this.getCollection(collection);
    const id = collectionData.length > 0 ? Math.max(...collectionData.map((r: any) => r.id)) + 1 : 9000;
    const now = new Date();
    
    const record = {
      id,
      createdAt: now,
      updatedAt: now,
      ...data.data,
    };

    collectionData.push(record);
    return record;
  }

  private async findUnique(collection: string, params: any) {
    const collectionData = this.getCollection(collection);
    
    if (params.where?.id) {
      return collectionData.find((r: any) => r.id === params.where.id) || null;
    }
    
    if (params.where?.username) {
      return collectionData.find((r: any) => r.username === params.where.username) || null;
    }
    
    if (params.where?.email) {
      return collectionData.find((r: any) => r.email === params.where.email) || null;
    }
    
    if (params.where?.phone) {
      return collectionData.find((r: any) => r.phone === params.where.phone) || null;
    }

    return null;
  }

  private async findMany(collection: string, params: any = {}) {
    let results = this.getCollection(collection);

    if (params.where) {
      results = results.filter((r: any) => {
        for (const [key, value] of Object.entries(params.where)) {
          if (typeof value === 'object' && value !== null) {
            if ('gte' in value && r[key] < value.gte) return false;
            if ('lte' in value && r[key] > value.lte) return false;
            if ('gt' in value && r[key] <= value.gt) return false;
            if ('lt' in value && r[key] >= value.lt) return false;
            if ('contains' in value && !r[key]?.includes(value.contains)) return false;
            if ('startsWith' in value && !r[key]?.startsWith(value.startsWith)) return false;
            if ('not' in value && r[key] === value.not) return false;
          } else if (value === null) {
            if (r[key] !== null) return false;
          } else if (r[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    if (params.orderBy) {
      const key = Object.keys(params.orderBy)[0];
      const direction = params.orderBy[key];
      results.sort((a: any, b: any) => {
        if (direction === 'asc') {
          return a[key] > b[key] ? 1 : -1;
        } else {
          return a[key] < b[key] ? 1 : -1;
        }
      });
    }

    if (params.include) {
      results = results.map((r: any) => ({ ...r, include: params.include }));
    }

    return results;
  }

  private async update(collection: string, params: any) {
    const collectionData = this.getCollection(collection);
    const index = collectionData.findIndex((r: any) => r.id === params.where.id);
    
    if (index === -1) {
      throw new Error(`Record not found: ${params.where.id}`);
    }

    const now = new Date();
    collectionData[index] = {
      ...collectionData[index],
      ...params.data,
      updatedAt: now,
    };

    return collectionData[index];
  }

  private async delete(collection: string, params: any) {
    const collectionData = this.getCollection(collection);
    const index = collectionData.findIndex((r: any) => r.id === params.where.id);
    
    if (index === -1) {
      throw new Error(`Record not found: ${params.where.id}`);
    }

    const deleted = collectionData.splice(index, 1)[0];
    return deleted;
  }

  private async count(collection: string, params: any = {}) {
    const results = await this.findMany(collection, params);
    return results.length;
  }

  private async groupBy(collection: string, params: any) {
    const results = await this.findMany(collection, { where: params.where });
    const groups: any = {};

    results.forEach((r: any) => {
      const key = params.by.map((k: string) => r[k]).join('|');
      if (!groups[key]) {
        groups[key] = { ...params.by.reduce((acc: any, k: string) => ({ ...acc, [k]: r[k] }), {}) };
      }
      
      if (params._count) {
        groups[key]._count = (groups[key]._count || 0) + 1;
      }
      
      if (params._sum) {
        Object.keys(params._sum).forEach((field: string) => {
          groups[key]._sum = groups[key]._sum || {};
          groups[key]._sum[field] = (groups[key]._sum[field] || 0) + (r[field] || 0);
        });
      }
    });

    return Object.values(groups);
  }

  private async aggregate(collection: string, params: any) {
    const results = await this.findMany(collection, { where: params.where });
    const result: any = {};

    if (params._sum) {
      result._sum = {};
      Object.keys(params._sum).forEach((field: string) => {
        result._sum[field] = results.reduce((sum: number, r: any) => sum + (r[field] || 0), 0);
      });
    }

    if (params._avg) {
      result._avg = {};
      Object.keys(params._avg).forEach((field: string) => {
        const values = results.map((r: any) => r[field]).filter((v: any) => v !== null);
        result._avg[field] = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
      });
    }

    if (params._count) {
      result._count = results.length;
    }

    if (params._min || params._max) {
      if (params._min) {
        result._min = {};
        Object.keys(params._min).forEach((field: string) => {
          const values = results.map((r: any) => r[field]).filter((v: any) => v !== null);
          result._min[field] = values.length > 0 ? Math.min(...values) : null;
        });
      }
      
      if (params._max) {
        result._max = {};
        Object.keys(params._max).forEach((field: string) => {
          const values = results.map((r: any) => r[field]).filter((v: any) => v !== null);
          result._max[field] = values.length > 0 ? Math.max(...values) : null;
        });
      }
    }

    return result;
  }
}

/**
 * Mock 测试数据工厂
 */
export class MockDataFactory {
  static createUser(overrides: any = {}) {
    return {
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      phone: `138${Date.now().toString().slice(-8)}`,
      password: 'hashed_password',
      role: 'STUDENT',
      grade: 5,
      ...overrides,
    };
  }

  static createSubject(overrides: any = {}) {
    return {
      name: `学科_${Date.now()}`,
      grade: 5,
      icon: '📚',
      sortOrder: 1,
      ...overrides,
    };
  }

  static createKnowledgePoint(subjectId: number, overrides: any = {}) {
    return {
      subjectId,
      name: `知识点_${Date.now()}`,
      grade: 5,
      description: '测试知识点',
      sortOrder: 1,
      parentId: null,
      ...overrides,
    };
  }

  static createExercise(subjectId: number, overrides: any = {}) {
    return {
      subjectId,
      questionType: 'SINGLE_CHOICE',
      question: '测试题目',
      answer: 'A',
      options: JSON.stringify([{ key: 'A', value: '选项 A' }]),
      difficulty: 'MEDIUM',
      grade: 5,
      tags: '测试',
      isPublic: true,
      ...overrides,
    };
  }

  static createPointsLedger(userId: number, points: number, balance: number, reason: string, overrides: any = {}) {
    return {
      userId,
      points,
      balance,
      reason,
      referenceId: null,
      ...overrides,
    };
  }

  static createLearningRecord(userId: number, actionType: string, overrides: any = {}) {
    return {
      userId,
      actionType,
      duration: 60,
      score: null,
      metadata: null,
      ...overrides,
    };
  }
}
