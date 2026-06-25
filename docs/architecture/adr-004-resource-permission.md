# ADR-004: 资源权限校验方案

**状态**: 提议  
**日期**: 2026-03-15  
**决策人**: 架构师  
**影响范围**: 后端、安全

---

## 背景

当前项目存在严重越权访问漏洞:
- 练习会话可访问他人数据
- 教材可修改/删除他人资源
- 错题本无归属校验

这违反了 PRD 定义的权限边界，导致:
1. 用户隐私泄露
2. 数据被恶意篡改
3. 合规风险

---

## 决策

### 1. 权限模型

```
用户 (User)
  │
  ├── 角色权限 (Role-based)
  │     ├── STUDENT: 学生功能
  │     ├── PARENT: 家长功能 + 绑定学生数据
  │     ├── TEACHER: 教师功能 + 班级管理
  │     └── ADMIN: 全部功能
  │
  └── 资源权限 (Resource-based)
        ├── 所有者：完全控制
        ├── 绑定关系：受限访问
        └── 公开资源：只读
```

### 2. 权限守卫实现

```typescript
// owner.guard.ts
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.userId;
    const role = request.user.role;
    
    // 管理员跳过校验
    if (role === 'ADMIN') {
      return true;
    }

    const resourceId = request.params.id;
    const resourceType = this.getResourceType(context);

    // 校验资源归属
    const resource = await this.prisma[resourceType].findFirst({
      where: { 
        id: parseInt(resourceId),
        userId: userId // 关键：必须匹配当前用户
      }
    });

    if (!resource) {
      throw new ForbiddenException('无权访问该资源');
    }

    return true;
  }

  private getResourceType(context: ExecutionContext): string {
    // 根据路由映射资源类型
    const url = context.switchToHttp().getRequest().url;
    if (url.includes('/textbooks/')) return 'textbook';
    if (url.includes('/practice/sessions/')) return 'practiceSession';
    if (url.includes('/wrong-questions/')) return 'wrongQuestion';
    // ...
  }
}
```

### 3. 使用方式

```typescript
// textbook.controller.ts
@Controller('textbooks')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class TextbookController {
  
  @Get(':id')
  findOne(@Param('id') id: string) {
    // OwnerGuard 已校验归属
    return this.textbookService.findOne(+id);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTextbookDto) {
    return this.textbookService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.textbookService.remove(+id);
  }
}
```

### 4. 服务层校验

```typescript
// practice.service.ts
@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  // 创建会话
  async createSession(userId: number, dto: CreateSessionDto) {
    return this.prisma.practiceSession.create({
      data: {
        ...dto,
        userId // 确保归属当前用户
      }
    });
  }

  // 查询会话详情
  async getSessionDetail(sessionId: number, userId: number) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { 
        id: sessionId, 
        userId // 关键：必须匹配
      },
      include: {
        questions: true,
        textbook: true
      }
    });

    if (!session) {
      throw new ForbiddenException('无权访问该练习会话');
    }

    return session;
  }

  // 提交答案
  async submitAnswer(
    sessionId: number, 
    questionId: number, 
    userId: number, 
    dto: SubmitAnswerDto
  ) {
    // 先校验会话归属
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      throw new ForbiddenException('无权访问该练习会话');
    }

    // 提交答案
    return this.prisma.practiceAnswer.create({
      data: {
        sessionId,
        questionId,
        ...dto
      }
    });
  }

  // 批量查询（列表）
  async getUserSessions(userId: number, page: number, limit: number) {
    return this.prisma.practiceSession.findMany({
      where: { userId }, // 只查询当前用户的
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });
  }
}
```

### 5. 家长访问学生数据

```typescript
// family.guard.ts
@Injectable()
export class FamilyBindingGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const currentUserId = request.user.userId;
    const studentId = request.params.studentId;

    // 如果是访问自己的数据，允许
    if (currentUserId === parseInt(studentId)) {
      return true;
    }

    // 检查是否是绑定家长
    const binding = await this.prisma.familyBinding.findFirst({
      where: {
        parentId: currentUserId,
        childId: parseInt(studentId),
        status: 'ACTIVE'
      }
    });

    if (!binding) {
      throw new ForbiddenException('无权访问该学生数据');
    }

    return true;
  }
}

// 使用
@Controller('family/students')
@UseGuards(JwtAuthGuard, FamilyBindingGuard)
export class FamilyStudentController {
  @Get(':studentId/stats')
  getStudentStats(@Param('studentId') studentId: string) {
    // 已通过 FamilyBindingGuard 校验
    return this.learningService.getStats(+studentId);
  }
}
```

### 6. 错误响应标准化

```typescript
// 统一错误响应
{
  "code": 40301,
  "message": "无权访问该资源",
  "data": null
}

// 避免泄露信息
// 错误：返回 404 "资源不存在"（会暴露 ID 枚举）
// 正确：返回 403 "无权访问"
```

---

## 方案对比

### 方案 A: 手动校验（不推荐）

**优点**:
- 灵活

**缺点**:
- 容易遗漏
- 代码重复
- 难以维护

### 方案 B: 守卫 + 服务层双重校验（推荐）✅

**优点**:
- 守卫统一拦截
- 服务层兜底
- 代码清晰

**缺点**:
- 需要约定

### 方案 C: ORM 自动过滤（未来）

**优点**:
- 透明
- 不易遗漏

**缺点**:
- 实现复杂
- 灵活性低

---

## 实施计划

### 阶段 1: 守卫实现（1 天）
- [ ] OwnerGuard
- [ ] FamilyBindingGuard
- [ ] RoleGuard

### 阶段 2: 服务层加固（2 天）
- [ ] practice.service.ts
- [ ] textbook.service.ts
- [ ] wrong-questions.service.ts
- [ ] learning.service.ts

### 阶段 3: 测试验证（1 天）
- [ ] 越权访问测试
- [ ] 边界条件测试
- [ ] 回归测试

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 遗漏校验 | 高 | 守卫 + 服务层双重校验 |
| 性能影响 | 低 | 索引优化 |
| 破坏现有功能 | 中 | 全面测试 |

---

## 验收标准

- [ ] 所有资源接口有归属校验
- [ ] 越权访问返回 403
- [ ] 家长可访问绑定学生数据
- [ ] 单元测试覆盖率 > 90%
- [ ] 越权测试用例 100% 通过

---

## 参考

- NestJS Guards: https://docs.nestjs.com/guards
- OWASP IDOR: https://owasp.org/www-community/vulnerabilities/Insecure_Direct_Object_Reference

---

**批准人**: 俊哥  
**批准日期**: 待定  
**复审日期**: 2026-03-22
