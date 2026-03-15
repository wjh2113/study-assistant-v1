# ADR-002: 审计日志实现方案

**状态**: 提议  
**日期**: 2026-03-15  
**决策人**: 架构师  
**影响范围**: 后端、安全、运维

---

## 背景

当前项目缺少完整的审计日志系统:
- 无操作审计日志
- 登录日志不完整
- 异常日志非结构化
- 无法追溯安全事件

这导致:
1. 安全事件无法调查
2. 问题排查困难
3. 合规风险（个人信息保护法）
4. 无法分析用户行为

---

## 决策

### 1. 审计日志数据模型

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     // 操作用户 ID
  action    String   // 操作类型：USER_LOGIN, RESOURCE_UPDATE, etc.
  resource  String?  // 资源类型：User, Textbook, PracticeSession
  resourceId Int?    // 资源 ID
  method    String   // HTTP 方法
  path      String   // 请求路径
  statusCode Int     // 响应状态码
  duration  Int      // 执行时长 (ms)
  ip        String?  // IP 地址
  userAgent String?  // User-Agent
  payload   Json?    // 请求/操作详情（脱敏）
  error     String?  // 错误信息
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@index([resource, resourceId])
  @@index([createdAt])
}
```

### 2. 审计日志中间件

```typescript
// audit-logger.middleware.ts
@Injectable()
export class AuditLoggerMiddleware implements NestMiddleware {
  constructor(
    private auditService: AuditLogService,
    private logger: Logger
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, url, user, ip } = req;

    // 收集响应数据
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // 跳过静态资源和健康检查
      if (this.shouldSkip(url)) {
        return;
      }

      // 脱敏处理
      const sanitizedPayload = this.sanitizePayload(req.body);

      this.auditService.log({
        userId: user?.userId,
        action: this.extractAction(method, url),
        resource: this.extractResource(url),
        resourceId: this.extractResourceId(url),
        method,
        path: url,
        statusCode: res.statusCode,
        duration,
        ip: this.getIp(req),
        userAgent: req.headers['user-agent'],
        payload: sanitizedPayload,
        error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
      });
    });

    next();
  }

  private sanitizePayload(payload: any): any {
    if (!payload) return null;
    
    const sensitive = ['password', 'phone', 'code', 'token', 'secret'];
    const sanitized = { ...payload };
    
    sensitive.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }

  private shouldSkip(url: string): boolean {
    const skipPatterns = [
      '/health',
      '/favicon.ico',
      '/static/',
      '/api/files/'
    ];
    return skipPatterns.some(pattern => url.includes(pattern));
  }
}
```

### 3. 关键操作审计

```typescript
// auth.service.ts
async login(loginDto: LoginDto, ip: string, userAgent: string) {
  const user = await this.validateUser(loginDto);
  
  // 审计登录成功
  await this.auditService.log({
    userId: user.id,
    action: 'USER_LOGIN',
    resource: 'User',
    resourceId: user.id,
    method: 'POST',
    path: '/api/auth/login',
    statusCode: 200,
    duration: 0,
    ip,
    userAgent,
    payload: { phone: this.maskPhone(loginDto.phone) }
  });
  
  return this.generateToken(user);
}

async loginFailed(phone: string, ip: string, userAgent: string) {
  // 审计登录失败
  await this.auditService.log({
    action: 'USER_LOGIN_FAILED',
    resource: 'User',
    method: 'POST',
    path: '/api/auth/login',
    statusCode: 401,
    ip,
    userAgent,
    payload: { phone: this.maskPhone(phone) }
  });
}
```

### 4. 审计日志查询接口

```typescript
// admin.controller.ts
@Get('audit-logs')
@Roles('ADMIN')
async getAuditLogs(
  @Query('userId') userId?: number,
  @Query('action') action?: string,
  @Query('startDate') startDate?: Date,
  @Query('endDate') endDate?: Date,
  @Query('page') page = 1,
  @Query('limit') limit = 20
) {
  return this.auditService.query({
    userId,
    action,
    startDate,
    endDate,
    page,
    limit
  });
}
```

### 5. 日志存储策略

| 日志类型 | 存储位置 | 保留期限 |
|----------|----------|----------|
| 审计日志 | MySQL | 180 天 |
| 应用日志 | 文件系统 | 30 天 |
| 错误日志 | 文件系统 + MySQL | 90 天 |
| AI 调用日志 | MySQL | 90 天 |

### 6. 日志归档

```typescript
// archive-audit-logs.cron.ts
@Cron('0 2 * * *') // 每天凌晨 2 点
async archiveOldLogs() {
  const cutoffDate = subDays(new Date(), 180);
  
  // 导出到文件
  const oldLogs = await this.prisma.auditLog.findMany({
    where: { createdAt: { lt: cutoffDate } }
  });
  
  await this.fileService.writeJson(
    `audit-logs-${format(cutoffDate, 'yyyy-MM-dd')}.json`,
    oldLogs
  );
  
  // 删除旧数据
  await this.prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoffDate } }
  });
}
```

---

## 方案对比

### 方案 A: 文件系统日志（不推荐）

**优点**:
- 简单
- 无需额外存储

**缺点**:
- 查询困难
- 无法关联用户
- 难以分析

### 方案 B: 数据库存储（推荐）✅

**优点**:
- 易于查询分析
- 可关联用户和资源
- 支持复杂筛选

**缺点**:
- 数据库压力
- 需要归档策略

### 方案 C: 专用日志服务（ELK）（未来）

**优点**:
- 强大搜索能力
- 可视化
- 告警

**缺点**:
- 复杂度高
- 成本增加

---

## 实施计划

### 阶段 1: 基础实现（2 天）
- [ ] 创建 AuditLog 模型
- [ ] 实现 AuditLoggerMiddleware
- [ ] 集成到应用

### 阶段 2: 关键操作审计（1 天）
- [ ] 登录/注册审计
- [ ] 资源 CRUD 审计
- [ ] 权限变更审计

### 阶段 3: 查询与归档（1 天）
- [ ] 管理后台查询接口
- [ ] 归档 Cron 任务
- [ ] 导出功能

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 性能影响 | 中 | 异步写入 + 批量处理 |
| 存储膨胀 | 中 | 定期归档 + 清理 |
| 敏感信息泄露 | 高 | 严格脱敏 + 访问控制 |
| 日志丢失 | 中 | 事务保证 + 备份 |

---

## 验收标准

- [ ] 所有 HTTP 请求记录审计日志
- [ ] 敏感字段脱敏
- [ ] 管理后台可查询审计日志
- [ ] 自动归档超过 180 天的日志
- [ ] 审计日志不可篡改（只增不改）
- [ ] 性能影响 < 5%

---

## 参考

- 个人信息保护法
- 网络安全法
- NestJS Middleware: https://docs.nestjs.com/middleware

---

**批准人**: 俊哥  
**批准日期**: 待定  
**复审日期**: 2026-03-29
