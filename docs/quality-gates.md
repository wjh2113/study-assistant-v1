# 质量门禁文档 (Quality Gates)

## 📊 质量目标

| 指标 | 目标值 | 当前状态 |
|------|--------|----------|
| 测试通过率 | >90% | 🟡 待验证 |
| 代码覆盖率 | >80% | 🟡 待验证 |
| 关键路径覆盖率 | 100% | 🟡 待验证 |

---

## ✅ 测试通过标准

### 1. 单元测试 (Unit Tests)
- **通过率要求**: ≥90%
- **执行命令**: `npm test`
- **超时阈值**: 30 秒/测试

### 2. 集成测试 (Integration Tests)
- **API 端点覆盖率**: ≥85%
- **数据库操作测试**: 100% 覆盖
- **认证授权测试**: 100% 覆盖

### 3. 端到端测试 (E2E Tests)
- **核心流程**: 登录→学习→答题→积分
- **关键用户路径**: 100% 覆盖

---

## 📈 代码覆盖率标准

### 全局覆盖率阈值 (jest.config.js)
```javascript
coverageThreshold: {
  global: {
    branches: 70,    // 分支覆盖率
    functions: 80,   // 函数覆盖率
    lines: 80,       // 行覆盖率
    statements: 80   // 语句覆盖率
  }
}
```

### 关键模块覆盖率要求
| 模块 | 覆盖率要求 | 优先级 |
|------|------------|--------|
| 认证模块 (auth) | 95% | P0 |
| AI 网关 (ai-gateway) | 90% | P0 |
| 知识点管理 (knowledge) | 85% | P1 |
| 积分系统 (points) | 85% | P1 |
| 排行榜 (leaderboard) | 80% | P2 |

---

## 🔄 CI/CD 测试流程

### 1. 提交前检查 (Pre-commit)
```bash
# 运行 lint 检查
npm run lint

# 运行单元测试
npm test -- --coverage
```

### 2. CI 流水线 (GitHub Actions)
```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Check Coverage
        run: |
          # 检查覆盖率是否达标
          node scripts/check-coverage.js
```

### 3. 质量门禁检查点
| 阶段 | 检查项 | 失败处理 |
|------|--------|----------|
| 代码提交 | Lint 检查 | 阻止提交 |
| PR 创建 | 单元测试 | 阻止合并 |
| PR 合并 | 覆盖率检查 | 需要审批 |
| 部署前 | E2E 测试 | 阻止部署 |

---

## 📋 测试报告格式

### 测试执行报告
```markdown
## 测试执行报告 - [日期]

### 概览
- 总测试数：XX
- 通过：XX (XX%)
- 失败：XX (XX%)
- 跳过：XX

### 覆盖率
- 语句覆盖率：XX%
- 分支覆盖率：XX%
- 函数覆盖率：XX%
- 行覆盖率：XX%

### 失败测试详情
| 测试名称 | 错误信息 | 优先级 |
|----------|----------|--------|
| XXX | ... | P0 |
```

---

## 🚨 质量门禁违规处理

### 违规级别
| 级别 | 条件 | 处理 |
|------|------|------|
| 🟢 通过 | 所有指标达标 | 自动合并 |
| 🟡 警告 | 覆盖率 70-80% | 需要说明 |
| 🔴 失败 | 覆盖率<70% 或 通过率<90% | 阻止合并 |

### 例外处理流程
1. 提交质量门禁例外申请
2. 说明原因和补救计划
3. 技术负责人审批
4. 记录到技术债务清单

---

## 📚 相关文档

- [测试基础设施配置](./test-infrastructure.md)
- [测试用例编写规范](./test-scenarios/)
- [Bug 修复日志](./bug-fix-log.md)

---

*最后更新：2026-03-15*
*负责人：QA 团队*
