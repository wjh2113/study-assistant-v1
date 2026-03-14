# Study Assistant v1 代码审查报告（2026-03-15）

本次审查基于 `docs/PRD_v1.1.md` 与当前仓库代码进行静态检查，重点覆盖：鉴权一致性、资源权限边界、账号安全、接口与 PRD 对齐情况。

## 审查范围

- `backend/src/modules/**`
- `backend/prisma/schema.prisma`
- `docs/PRD_v1.1.md`

## 关键问题（按严重级别）

### P0 - JWT 用户ID字段不一致，导致大量已鉴权接口读取到空 userId

- 代码证据：
  - `backend/src/modules/auth/jwt.strategy.ts:22` 返回字段为 `userId`
  - 多个控制器读取 `req.user.sub`，例如：
    - `backend/src/modules/practice/practice.controller.ts:16`
    - `backend/src/modules/textbooks/textbook.controller.ts:16`
    - `backend/src/modules/family/family.controller.ts:16`
    - `backend/src/modules/files/files.controller.ts:19`
- 风险：
  - `req.user.sub` 为 `undefined`，下游查询/创建操作可能失败或产生脏数据；
  - 用户态接口行为不稳定，影响登录后主流程。
- PRD 偏差：
  - 与 `2.3 权限边界`、`9.1 权限控制`、`11.x 接口设计`预期不符（接口应稳定且可鉴权执行）。
- 建议：
  - 统一 JWT payload 字段（建议统一为 `userId`）；
  - 全量替换 `req.user.sub`，并补充鉴权单测。

### P0 - 练习会话存在越权访问（IDOR）

- 代码证据：
  - `backend/src/modules/practice/practice.controller.ts:33` `GET /practice/sessions/:id` 未传入当前用户上下文
  - `backend/src/modules/practice/practice.service.ts:147` `getSessionDetail(sessionId)` 仅按 ID 查会话
  - `backend/src/modules/practice/practice.service.ts:371` `getSessionResult(sessionId)` 同样未校验归属
  - `backend/src/modules/practice/practice.service.ts:216` `submitAnswer(...)` 未校验 `session.userId === currentUserId`
- 风险：
  - 已登录用户可通过枚举 sessionId 查看/操作他人练习数据。
- PRD 偏差：
  - 违反 `2.3 权限边界`、`14.1 数据安全` 中“仅本人/绑定关系可见”原则。
- 建议：
  - 所有会话读写接口强制要求 `where: { id, userId }`；
  - 服务层函数签名加入 `currentUserId`，作为必传参数；
  - 增加越权测试（他人 sessionId 应返回 403）。

### P0 - 教材模块缺少资源级权限校验，可修改/删除他人教材

- 代码证据：
  - `backend/src/modules/textbooks/textbook.controller.ts:44` `POST /textbooks/:id` 无归属校验
  - `backend/src/modules/textbooks/textbook.controller.ts:55` `DELETE /textbooks/:id` 无归属校验
  - `backend/src/modules/textbooks/textbook.service.ts:103` `update(id, dto)` 仅判断记录存在
  - `backend/src/modules/textbooks/textbook.service.ts:115` `remove(id)` 仅判断记录存在
- 风险：
  - 任意登录用户可通过 ID 修改/删除他人教材。
- PRD 偏差：
  - 与 `2.3 权限边界`、`14.1 数据安全`不符。
- 建议：
  - `update/remove/findOne/parse/reunit` 等接口增加 owner 校验，管理员走白名单放行；
  - 明确 403 错误码与审计日志记录。

### P1 - 注册接口允许直接指定高权限角色，存在权限提升风险

- 代码证据：
  - `backend/src/modules/auth/dto/auth.dto.ts:45-47` `role?: UserRole` 对外开放
  - `backend/src/modules/auth/auth.service.ts:140-147` 注册时直接写入 `registerDto.role`
- 风险：
  - 攻击者可在注册请求中传 `ADMIN` / `TEACHER` 角色。
- PRD 偏差：
  - 与 `2.1 用户角色`、`2.3 权限边界`不符。
- 建议：
  - 公共注册接口强制仅允许 `STUDENT/PARENT`；
  - `ADMIN/TEACHER` 仅后台受控创建。

### P1 - 短信验证码逻辑为固定码 + 内存存储，且日志明文输出验证码

- 代码证据：
  - `backend/src/modules/auth/auth.service.ts:9` 固定验证码 `123456`
  - `backend/src/modules/auth/auth.service.ts:12` 内存 `Map` 存储验证码
  - `backend/src/modules/auth/auth.service.ts:40` `console.log` 明文输出验证码
- 风险：
  - 几乎无账号安全性，重启即丢验证码状态，且日志泄漏敏感信息。
- PRD 偏差：
  - 与 `5.3 安全目标` 中“关键接口鉴权、限流、审计”不符。
- 建议：
  - 接入短信服务 + 随机验证码；
  - 验证码状态迁移到 Redis，增加发送频率限制与失败次数限制；
  - 移除明文日志，仅记录脱敏审计信息。

### P2 - 接口与 PRD 存在命名/语义不一致

- 代码证据：
  - PRD `11.2` 描述登录入口为 `POST /auth/login`（手机号验证码登录）
  - 当前实现拆分为：
    - `POST /auth/phone-login`（验证码登录）
    - `POST /auth/login`（用户名密码）
- 风险：
  - 前后端与测试文档协作成本升高，易导致联调误用。
- 建议：
  - 统一接口语义（按 PRD 调整或同步更新 PRD/README/测试用例）。

## 结论

当前代码已具备基础模块骨架，但存在多处高风险权限/鉴权问题（P0），建议优先修复后再进入更大范围联调或上线验证。

## 备注

- 本次为静态代码审查，未执行端到端运行测试。
