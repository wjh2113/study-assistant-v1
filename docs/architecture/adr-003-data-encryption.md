# ADR-003: 敏感数据加密方案

**状态**: 提议  
**日期**: 2026-03-15  
**决策人**: 架构师  
**影响范围**: 后端、数据库、安全

---

## 背景

当前项目敏感数据（手机号）明文存储:
- 用户手机号明文存储在 `users.phone`
- 无加密策略
- 违反个人信息保护要求

风险:
1. 数据库泄露导致用户隐私暴露
2. 违反《个人信息保护法》
3. 内部人员可访问敏感数据

---

## 决策

### 1. 加密字段范围

| 字段 | 表 | 加密方式 | 说明 |
|------|-----|----------|------|
| phone | users | AES-256-GCM | 可逆加密，需查询 |
| id_card | users (未来) | AES-256-GCM | 可逆加密 |
| password | users | bcrypt | 单向哈希 |

### 2. 加密算法选择

**AES-256-GCM** (推荐) ✅

**优点**:
- 行业标准
- 性能好
-  authenticated encryption
- Node.js 原生支持

**密钥管理**:
```typescript
// 环境变量
ENCRYPTION_KEY=32字节随机密钥（base64 编码）
ENCRYPTION_IV=16 字节初始向量（每次加密随机生成）
```

### 3. 加密服务实现

```typescript
// encryption.service.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(@Inject('CONFIG') private config: ConfigService) {
    // 从环境变量派生密钥
    const secret = this.config.get('ENCRYPTION_KEY');
    this.key = scryptSync(secret, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // 格式：iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 手机号脱敏显示
  maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}
```

### 4. Prisma 中间件（自动加密）

```typescript
// encryption.middleware.ts
@Injectable()
export class EncryptionMiddleware implements Prisma.Middleware {
  constructor(private encryptionService: EncryptionService) {}

  async use(params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) {
    // 写入时加密
    if (params.model === 'User' && params.action === 'create') {
      if (params.args.data.phone) {
        params.args.data.phone = this.encryptionService.encrypt(params.args.data.phone);
      }
    }

    if (params.model === 'User' && params.action === 'update') {
      if (params.args.data.phone) {
        params.args.data.phone = this.encryptionService.encrypt(params.args.data.phone);
      }
    }

    const result = await next(params);

    // 读取时解密
    if (params.model === 'User' && params.action === 'findFirst') {
      if (result && result.phone) {
        result.phone = this.encryptionService.decrypt(result.phone);
      }
    }

    return result;
  }
}
```

### 5. 查询加密字段

```typescript
// 问题：加密后无法直接 WHERE phone = ?
// 方案 1: 存储加密值的哈希用于查询
model User {
  phone        String // 加密值
  phoneHash    String // SHA256(phone)，用于查询
}

// 查询时
async findByPhone(phone: string) {
  const phoneHash = this.hash(phone);
  const user = await this.prisma.user.findFirst({
    where: { phoneHash }
  });
  
  if (user) {
    user.phone = this.encryptionService.decrypt(user.phone);
  }
  
  return user;
}

// 方案 2: 使用确定性加密（不推荐，安全性降低）
```

### 6. 数据迁移

```typescript
// migrate-phone-encryption.ts
async migrate() {
  const users = await this.prisma.user.findMany();
  
  for (const user of users) {
    // 如果已经是加密格式，跳过
    if (user.phone.includes(':')) {
      continue;
    }
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phone: this.encryptionService.encrypt(user.phone),
        phoneHash: this.hash(user.phone)
      }
    });
  }
}
```

### 7. 密钥轮换

```typescript
// 密钥轮换策略
async rotateKey(oldKey: Buffer, newKey: Buffer) {
  const users = await this.prisma.user.findMany();
  
  for (const user of users) {
    // 用旧密钥解密
    const decrypted = this.decryptWithKey(user.phone, oldKey);
    // 用新密钥加密
    const encrypted = this.encryptWithKey(decrypted, newKey);
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: { phone: encrypted }
    });
  }
}
```

---

## 方案对比

### 方案 A: 应用层加密（推荐）✅

**优点**:
- 数据库无感知
- 灵活控制
- 易于实现

**缺点**:
- 查询受限
- 应用负责密钥管理

### 方案 B: 数据库层加密（不推荐）

**优点**:
- 应用无感知

**缺点**:
- 数据库性能影响
- 密钥管理复杂
- 迁移困难

### 方案 C: 云服务商加密（未来）

**优点**:
- 托管密钥管理
- 合规认证

**缺点**:
- 成本增加
- 供应商锁定

---

## 实施计划

### 阶段 1: 加密服务（1 天）
- [ ] 实现 EncryptionService
- [ ] 密钥管理
- [ ] 单元测试

### 阶段 2: 集成（1 天）
- [ ] Prisma 中间件
- [ ] 查询适配
- [ ] 集成测试

### 阶段 3: 数据迁移（1 天）
- [ ] 迁移脚本
- [ ] 验证
- [ ] 回滚方案

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 密钥泄露 | 严重 | 密钥管理系统 + 定期轮换 |
| 性能下降 | 低 | 加密操作 < 1ms |
| 数据丢失 | 严重 | 备份 + 迁移验证 |
| 查询失败 | 中 | phoneHash 索引 |

---

## 验收标准

- [ ] 手机号加密存储
- [ ] 查询功能正常
- [ ] 性能影响 < 5%
- [ ] 密钥安全管理
- [ ] 迁移脚本验证通过

---

## 参考

- Node.js Crypto: https://nodejs.org/api/crypto.html
- 个人信息保护法
- OWASP 加密存储指南

---

**批准人**: 俊哥  
**批准日期**: 待定  
**复审日期**: 2026-03-29
