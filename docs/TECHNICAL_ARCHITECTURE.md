# 小学生全科智能复习助手 - 技术架构设计

**文档版本**: v1.0  
**生成日期**: 2026-03-14  
**基于 PRD**: v1.1

---

## 1. 后端模块设计 (NestJS 10)

### 1.1 项目整体结构

```
study-assistant-backend/
├── src/
│   ├── main.ts                          # 应用入口
│   ├── app.module.ts                    # 根模块
│   ├── common/                          # 公共模块
│   │   ├── decorators/                  # 自定义装饰器
│   │   ├── filters/                     # 异常过滤器
│   │   ├── guards/                      # 鉴权守卫
│   │   ├── interceptors/                # 拦截器
│   │   ├── pipes/                       # 管道
│   │   └── utils/                       # 工具函数
│   ├── config/                          # 配置模块
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   └── env.validation.ts
│   ├── modules/
│   │   ├── auth-family/                 # 认证与家庭模块
│   │   ├── user-profile/                # 用户档案模块
│   │   ├── textbook/                    # 教材模块
│   │   ├── practice/                    # 练习模块
│   │   ├── learning-analytics/          # 学习分析模块
│   │   ├── points-leaderboard/          # 积分与排行榜模块
│   │   ├── community/                   # 社区模块
│   │   └── ai-gateway/                  # AI 网关模块
│   ├── database/                        # 数据库相关
│   │   ├── prisma/                      # Prisma ORM (推荐)
│   │   └── seeds/                       # 种子数据
│   └── worker/                          # 后台任务
│       ├── worker.module.ts
│       ├── processors/                  # BullMQ 处理器
│       └── services/                    # 后台服务
├── test/                                # 测试文件
├── docker/                              # Docker 配置
├── scripts/                             # 部署脚本
├── .env.example                         # 环境变量模板
├── docker-compose.yml                   # Docker Compose 配置
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### 1.2 各模块详细设计

#### 1.2.1 Auth & Family Module (`auth-family`)

**职责**: 用户认证、JWT 令牌管理、家庭绑定关系

```
auth-family/
├── auth-family.module.ts
├── controllers/
│   ├── auth.controller.ts               # 认证接口
│   └── family.controller.ts             # 家庭绑定接口
├── services/
│   ├── auth.service.ts
│   ├── jwt.service.ts
│   ├── sms.service.ts                   # 短信验证码
│   └── family.service.ts
├── dto/
│   ├── send-code.dto.ts
│   ├── login.dto.ts
│   ├── refresh-token.dto.ts
│   ├── create-binding.dto.ts
│   └── update-binding.dto.ts
├── guards/
│   └── jwt-auth.guard.ts
├── strategies/
│   └── jwt.strategy.ts
└── entities/
    ├── user.entity.ts
    ├── student-profile.entity.ts
    ├── parent-profile.entity.ts
    └── family-binding.entity.ts
```

**核心接口**:
- `POST /api/v1/auth/send-code` - 发送验证码
- `POST /api/v1/auth/login` - 手机号验证码登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `POST /api/v1/auth/logout` - 退出登录
- `POST /api/v1/family/bindings` - 创建绑定关系
- `GET /api/v1/family/bindings` - 查询绑定关系
- `PATCH /api/v1/family/bindings/:id` - 修改绑定状态
- `DELETE /api/v1/family/bindings/:id` - 解绑

---

#### 1.2.2 User Profile Module (`user-profile`)

**职责**: 用户信息管理、角色权限控制

```
user-profile/
├── user-profile.module.ts
├── controllers/
│   └── user.controller.ts
├── services/
│   └── user.service.ts
├── dto/
│   ├── update-user.dto.ts
│   └── update-student-profile.dto.ts
└── entities/
    └── (复用 auth-family 的 entities)
```

**核心接口**:
- `GET /api/v1/users/me` - 获取当前用户信息
- `PATCH /api/v1/users/me` - 更新用户信息

---

#### 1.2.3 Textbook Module (`textbook`)

**职责**: 教材上传、解析、管理

```
textbook/
├── textbook.module.ts
├── controllers/
│   ├── textbook.controller.ts
│   └── file.controller.ts
├── services/
│   ├── textbook.service.ts
│   ├── file.service.ts                    # OSS 文件上传
│   ├── parsing.service.ts                 # PDF 解析
│   └── unit.service.ts
├── dto/
│   ├── create-textbook.dto.ts
│   ├── upload-policy.dto.ts
│   └── reparse-request.dto.ts
├── entities/
│   ├── textbook.entity.ts
│   ├── textbook-unit.entity.ts
│   ├── textbook-chunk.entity.ts
│   └── knowledge-point.entity.ts
└── events/
    └── textbook-parsed.event.ts
```

**核心接口**:
- `POST /api/v1/files/upload-policy` - 获取 OSS 上传签名
- `POST /api/v1/textbooks` - 创建课本记录
- `GET /api/v1/textbooks` - 获取课本列表
- `GET /api/v1/textbooks/:id` - 获取课本详情
- `DELETE /api/v1/textbooks/:id` - 删除课本
- `GET /api/v1/textbooks/:id/units` - 获取单元树
- `POST /api/v1/textbooks/:id/reparse` - 重新解析
- `GET /api/v1/textbooks/:id/parse-status` - 查询解析状态

---

#### 1.2.4 Practice Module (`practice`)

**职责**: 练习会话管理、AI 出题、答题判分

```
practice/
├── practice.module.ts
├── controllers/
│   └── practice.controller.ts
├── services/
│   ├── practice.service.ts
│   ├── session.service.ts
│   ├── question-generator.service.ts      # AI 出题
│   ├── answer-validator.service.ts        # 答案校验
│   └── weakness-engine.service.ts         # 薄弱点计算
├── dto/
│   ├── create-session.dto.ts
│   ├── generate-questions.dto.ts
│   ├── submit-answer.dto.ts
│   └── finish-session.dto.ts
├── entities/
│   ├── practice-session.entity.ts
│   ├── practice-question.entity.ts
│   └── practice-answer.entity.ts
└── validators/
    └── question-schema.validator.ts
```

**核心接口**:
- `POST /api/v1/practice/sessions` - 创建练习会话
- `POST /api/v1/practice/sessions/:id/questions:generate` - 生成题目
- `GET /api/v1/practice/sessions/:id` - 获取会话详情
- `POST /api/v1/practice/sessions/:id/answers` - 提交答案
- `POST /api/v1/practice/sessions/:id/finish` - 结束练习
- `GET /api/v1/practice/recommendations` - 推荐练习
- `GET /api/v1/practice/weaknesses` - 薄弱知识点

---

#### 1.2.5 Learning Analytics Module (`learning-analytics`)

**职责**: 学习数据统计、分析、报告生成

```
learning-analytics/
├── learning-analytics.module.ts
├── controllers/
│   └── learning.controller.ts
├── services/
│   ├── learning-record.service.ts
│   ├── stats.service.ts
│   ├── calendar.service.ts
│   ├── mastery.service.ts
│   └── report.service.ts
├── dto/
│   ├── stats-query.dto.ts
│   └── calendar-query.dto.ts
├── entities/
│   ├── learning-record.entity.ts
│   ├── knowledge-mastery.entity.ts
│   └── daily-learning-stats.entity.ts
└── schedulers/
    └── report.scheduler.ts
```

**核心接口**:
- `GET /api/v1/learning/records` - 学习记录
- `GET /api/v1/learning/stats` - 统计卡片
- `GET /api/v1/learning/calendar` - 学习日历
- `GET /api/v1/learning/knowledge-mastery` - 知识点掌握度
- `GET /api/v1/learning/reports/weekly` - 周报
- `GET /api/v1/learning/reports/monthly` - 月报

---

#### 1.2.6 Points & Leaderboard Module (`points-leaderboard`)

**职责**: 积分系统、排行榜计算

```
points-leaderboard/
├── points-leaderboard.module.ts
├── controllers/
│   ├── points.controller.ts
│   └── leaderboard.controller.ts
├── services/
│   ├── points.service.ts
│   ├── ledger.service.ts
│   └── ranking.service.ts
├── dto/
│   └── points-query.dto.ts
├── entities/
│   ├── points-ledger.entity.ts
│   └── leaderboard-snapshot.entity.ts
└── schedulers/
    └── ranking.scheduler.ts
```

**核心接口**:
- `GET /api/v1/points/balance` - 积分余额
- `GET /api/v1/points/ledger` - 积分明细
- `GET /api/v1/leaderboards/total` - 总榜
- `GET /api/v1/leaderboards/weekly` - 周榜
- `GET /api/v1/leaderboards/monthly` - 月榜
- `GET /api/v1/leaderboards/subjects/:subject` - 科目榜

---

#### 1.2.7 Community Module (`community`)

**职责**: 帖子、评论、点赞、收藏、内容审核

```
community/
├── community.module.ts
├── controllers/
│   ├── post.controller.ts
│   └── moderation.controller.ts
├── services/
│   ├── post.service.ts
│   ├── comment.service.ts
│   ├── interaction.service.ts
│   └── moderation.service.ts
├── dto/
│   ├── create-post.dto.ts
│   ├── create-comment.dto.ts
│   └── review-post.dto.ts
├── entities/
│   ├── post.entity.ts
│   ├── post-comment.entity.ts
│   ├── post-like.entity.ts
│   └── post-favorite.entity.ts
└── filters/
    └── sensitive-word.filter.ts
```

**核心接口**:
- `GET /api/v1/posts` - 帖子列表
- `POST /api/v1/posts` - 发布帖子
- `GET /api/v1/posts/:id` - 帖子详情
- `POST /api/v1/posts/:id/comments` - 发布评论
- `GET /api/v1/posts/:id/comments` - 评论列表
- `POST /api/v1/posts/:id/like` - 点赞/取消
- `POST /api/v1/posts/:id/favorite` - 收藏/取消
- `GET /api/v1/admin/posts/pending` - 待审核帖子
- `PATCH /api/v1/admin/posts/:id/review` - 审核帖子

---

#### 1.2.8 AI Gateway Module (`ai-gateway`)

**职责**: 统一 AI 模型调用、路由、日志

```
ai-gateway/
├── ai-gateway.module.ts
├── controllers/
│   └── ai.controller.ts                   # 管理接口
├── services/
│   ├── ai-gateway.service.ts              # 统一入口
│   ├── model-router.service.ts            # 模型路由
│   ├── qwen.provider.ts                   # 阿里云百炼
│   ├── deepseek.provider.ts               # DeepSeek 备用
│   └── tts.service.ts                     # 语音合成
├── dto/
│   ├── generate-request.dto.ts
│   └── parse-request.dto.ts
├── entities/
│   └── ai-task-log.entity.ts
├── strategies/
│   ├── retry.strategy.ts
│   └── fallback.strategy.ts
└── schemas/
    ├── question-output.schema.ts
    └── parse-output.schema.ts
```

**模型路由表**:

| 任务类型 | 主模型 | 备用模型 | 调用方式 |
|---------|--------|---------|---------|
| PDF 解析 | Qwen-Doc-Turbo | - | 异步 |
| OCR | Qwen-VL-OCR | - | 异步 |
| 常规出题 | qwen-flash | deepseek-chat | 同步 |
| 个性化出题 | qwen-plus | deepseek-chat | 同步 |
| 薄弱点分析 | qwen-plus | deepseek-reasoner | 异步 |
| 高质量复核 | qwen-max | deepseek-reasoner | 异步 |
| 结构修复 | qwen-flash | deepseek-chat | 同步 |
| TTS | qwen-tts | 浏览器降级 | 同步/缓存 |

---

### 1.3 Worker 模块设计

```
worker/
├── worker.module.ts
├── main.ts                              # Worker 入口
├── processors/
│   ├── textbook-parser.processor.ts     # 教材解析队列
│   ├── report-generator.processor.ts    # 报告生成队列
│   ├── ranking-calculator.processor.ts  # 排行榜计算队列
│   └── moderation.processor.ts          # 内容审核队列
├── services/
│   ├── ocr.service.ts
│   ├── embedding.service.ts             # 向量生成 (V1.2)
│   └── backup.service.ts                # 数据库备份
└── schedulers/
    ├── daily-backup.scheduler.ts
    └── cleanup.scheduler.ts
```

**BullMQ 队列定义**:

```typescript
// 队列名称常量
export const QUEUE_NAMES = {
  TEXTBOOK_PARSE: 'textbook:parse',
  REPORT_GENERATE: 'report:generate',
  RANKING_CALCULATE: 'ranking:calculate',
  MODERATION: 'content:moderation',
  BACKUP: 'database:backup',
};
```

---

## 2. 数据库 DDL (PostgreSQL 16)

### 2.1 扩展与基础设置

```sql
-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgvector";  -- V1.2 启用

-- 创建自定义类型
CREATE TYPE user_role AS ENUM ('student', 'parent', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'disabled');
CREATE TYPE binding_status AS ENUM ('active', 'pending', 'revoked');
CREATE TYPE relation_type AS ENUM ('father', 'mother', 'guardian');
CREATE TYPE textbook_source AS ENUM ('uploaded', 'platform');
CREATE TYPE parse_status AS ENUM ('pending', 'processing', 'success', 'failed');
CREATE TYPE practice_mode AS ENUM ('ai_generated', 'manual', 'weakness');
CREATE TYPE session_status AS ENUM ('started', 'finished', 'abandoned');
CREATE TYPE question_type AS ENUM ('single_choice', 'fill_blank', 'judge');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE post_visibility AS ENUM ('public', 'private');
CREATE TYPE post_status AS ENUM ('pending', 'published', 'rejected');
CREATE TYPE board_type AS ENUM ('total', 'weekly', 'monthly', 'subject');
CREATE TYPE ai_task_type AS ENUM ('parse', 'generate_question', 'analyze', 'tts');
CREATE TYPE ai_task_status AS ENUM ('success', 'failed');
CREATE TYPE points_reason AS ENUM ('question_correct', 'session_bonus', 'activity');
```

### 2.2 账号与家庭表

```sql
-- ============================================
-- 用户基础表
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    nickname VARCHAR(64),
    avatar_url TEXT,
    status user_status DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 学生档案表
-- ============================================
CREATE TABLE student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    grade VARCHAR(20) NOT NULL,
    school_name VARCHAR(128),
    gender VARCHAR(10),
    total_points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 家长档案表
-- ============================================
CREATE TABLE parent_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    real_name VARCHAR(64),
    verified_status VARCHAR(20) DEFAULT 'pending',
    relation_note VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER parent_profiles_updated_at
    BEFORE UPDATE ON parent_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 家庭绑定关系表
-- ============================================
CREATE TABLE family_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type relation_type NOT NULL,
    status binding_status DEFAULT 'pending',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uniq_parent_student_binding UNIQUE (parent_user_id, student_user_id)
);

CREATE INDEX idx_family_bindings_parent ON family_bindings(parent_user_id);
CREATE INDEX idx_family_bindings_student ON family_bindings(student_user_id);
CREATE INDEX idx_family_bindings_status ON family_bindings(status);

CREATE TRIGGER family_bindings_updated_at
    BEFORE UPDATE ON family_bindings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 教材与知识点表

```sql
-- ============================================
-- 课本表
-- ============================================
CREATE TABLE textbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type textbook_source NOT NULL DEFAULT 'uploaded',
    subject VARCHAR(20) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    term VARCHAR(20),
    publisher VARCHAR(64),
    title VARCHAR(128) NOT NULL,
    cover_url TEXT,
    pdf_url TEXT NOT NULL,
    pdf_file_key VARCHAR(255) NOT NULL,
    page_count INTEGER DEFAULT 0,
    unit_count INTEGER DEFAULT 0,
    parse_status parse_status DEFAULT 'pending',
    parse_result JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_textbooks_owner ON textbooks(owner_user_id);
CREATE INDEX idx_textbooks_subject_grade ON textbooks(subject, grade);
CREATE INDEX idx_textbooks_parse_status ON textbooks(parse_status);
CREATE INDEX idx_textbooks_owner_subject_grade ON textbooks(owner_user_id, subject, grade);

CREATE TRIGGER textbooks_updated_at
    BEFORE UPDATE ON textbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 课本单元表
-- ============================================
CREATE TABLE textbook_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
    parent_unit_id UUID REFERENCES textbook_units(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    unit_code VARCHAR(32),
    title VARCHAR(128) NOT NULL,
    sort_order INTEGER NOT NULL,
    start_page INTEGER,
    end_page INTEGER,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_textbook_units_textbook ON textbook_units(textbook_id);
CREATE INDEX idx_textbook_units_parent ON textbook_units(parent_unit_id);
CREATE INDEX idx_textbook_units_level ON textbook_units(level);

CREATE TRIGGER textbook_units_updated_at
    BEFORE UPDATE ON textbook_units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 课本分片表 (用于 RAG)
-- ============================================
CREATE TABLE textbook_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES textbook_units(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding vector(1536),  -- V1.2 启用，Qwen embedding 维度
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_textbook_chunks_textbook ON textbook_chunks(textbook_id);
CREATE INDEX idx_textbook_chunks_unit ON textbook_chunks(unit_id);
CREATE INDEX idx_textbook_chunks_chunk_index ON textbook_chunks(unit_id, chunk_index);
-- V1.2 启用向量索引
-- CREATE INDEX idx_textbook_chunks_embedding ON textbook_chunks USING ivfflat (embedding vector_cosine_ops);

-- ============================================
-- 知识点表
-- ============================================
CREATE TABLE knowledge_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    textbook_id UUID REFERENCES textbooks(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES textbook_units(id) ON DELETE SET NULL,
    subject VARCHAR(20) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    code VARCHAR(64),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    aliases JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_points_subject_grade ON knowledge_points(subject, grade);
CREATE INDEX idx_knowledge_points_textbook ON knowledge_points(textbook_id);
CREATE INDEX idx_knowledge_points_unit ON knowledge_points(unit_id);
CREATE INDEX idx_knowledge_points_name ON knowledge_points USING gin(to_tsvector('simple', name));
```

### 2.4 练习与学习表

```sql
-- ============================================
-- 练习会话表
-- ============================================
CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES textbook_units(id) ON DELETE CASCADE,
    subject VARCHAR(20) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    practice_mode practice_mode NOT NULL,
    question_count INTEGER NOT NULL,
    correct_count INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    duration_sec INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    status session_status DEFAULT 'started',
    ai_context JSONB,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_practice_sessions_student ON practice_sessions(student_user_id);
CREATE INDEX idx_practice_sessions_textbook ON practice_sessions(textbook_id);
CREATE INDEX idx_practice_sessions_unit ON practice_sessions(unit_id);
CREATE INDEX idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX idx_practice_sessions_started ON practice_sessions(started_at);

-- ============================================
-- 练习题目表
-- ============================================
CREATE TABLE practice_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    question_type question_type NOT NULL,
    stem TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT NOT NULL,
    knowledge_tags JSONB NOT NULL,
    difficulty difficulty_level NOT NULL,
    source_chunk_refs JSONB,
    model_provider VARCHAR(32),
    model_name VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_practice_questions_session ON practice_questions(session_id);
CREATE INDEX idx_practice_questions_difficulty ON practice_questions(difficulty);
CREATE INDEX idx_practice_questions_knowledge ON practice_questions USING gin(knowledge_tags);

-- ============================================
-- 练习作答表
-- ============================================
CREATE TABLE practice_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES practice_questions(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer_payload JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answer_duration_ms INTEGER NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_practice_answers_session ON practice_answers(session_id);
CREATE INDEX idx_practice_answers_question ON practice_answers(question_id);
CREATE INDEX idx_practice_answers_student ON practice_answers(student_user_id);
CREATE INDEX idx_practice_answers_correct ON practice_answers(is_correct);

-- ============================================
-- 学习记录表
-- ============================================
CREATE TABLE learning_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    subject VARCHAR(20) NOT NULL,
    textbook_title VARCHAR(128) NOT NULL,
    unit_title VARCHAR(128),
    question_count INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    correct_rate INTEGER NOT NULL CHECK (correct_rate BETWEEN 0 AND 100),
    duration_sec INTEGER NOT NULL,
    points_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_records_student ON learning_records(student_user_id);
CREATE INDEX idx_learning_records_session ON learning_records(session_id);
CREATE INDEX idx_learning_records_subject ON learning_records(subject);
CREATE INDEX idx_learning_records_created ON learning_records(created_at);

-- ============================================
-- 知识点掌握度表
-- ============================================
CREATE TABLE knowledge_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    knowledge_point_id UUID NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    total_answered INTEGER DEFAULT 0,
    correct_answered INTEGER DEFAULT 0,
    wrong_streak INTEGER DEFAULT 0,
    mastery_score NUMERIC(5,2) DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
    last_practiced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uniq_student_knowledge UNIQUE (student_user_id, knowledge_point_id)
);

CREATE INDEX idx_knowledge_mastery_student ON knowledge_mastery(student_user_id);
CREATE INDEX idx_knowledge_mastery_knowledge ON knowledge_mastery(knowledge_point_id);
CREATE INDEX idx_knowledge_mastery_score ON knowledge_mastery(mastery_score);

CREATE TRIGGER knowledge_mastery_updated_at
    BEFORE UPDATE ON knowledge_mastery
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 积分流水表
-- ============================================
CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta_points INTEGER NOT NULL,
    reason_type points_reason NOT NULL,
    related_session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
    remark VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_ledger_student ON points_ledger(student_user_id);
CREATE INDEX idx_points_ledger_reason ON points_ledger(reason_type);
CREATE INDEX idx_points_ledger_created ON points_ledger(created_at);

-- ============================================
-- 每日学习统计表
-- ============================================
CREATE TABLE daily_learning_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_duration_sec INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uniq_student_day UNIQUE (student_user_id, stat_date)
);

CREATE INDEX idx_daily_stats_student ON daily_learning_stats(student_user_id);
CREATE INDEX idx_daily_stats_date ON daily_learning_stats(stat_date);

CREATE TRIGGER daily_learning_stats_updated_at
    BEFORE UPDATE ON daily_learning_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.5 社区与运营表

```sql
-- ============================================
-- 帖子表
-- ============================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(20),
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    tags JSONB DEFAULT '[]',
    visibility post_visibility DEFAULT 'public',
    status post_status DEFAULT 'pending',
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_author ON posts(author_user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_subject ON posts(subject);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING gin(tags);
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('simple', content));

CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 评论表
-- ============================================
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status post_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_comments_post ON post_comments(post_id);
CREATE INDEX idx_post_comments_author ON post_comments(author_user_id);
CREATE INDEX idx_post_comments_parent ON post_comments(parent_comment_id);
CREATE INDEX idx_post_comments_status ON post_comments(status);

-- ============================================
-- 点赞表
-- ============================================
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uniq_post_like UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);

-- ============================================
-- 收藏表
-- ============================================
CREATE TABLE post_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uniq_post_favorite UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_favorites_post ON post_favorites(post_id);
CREATE INDEX idx_post_favorites_user ON post_favorites(user_id);

-- ============================================
-- 排行榜快照表
-- ============================================
CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_type board_type NOT NULL,
    subject VARCHAR(20),
    period_key VARCHAR(20) NOT NULL,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank_no INTEGER NOT NULL,
    score_value INTEGER NOT NULL,
    extra JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_type_period ON leaderboard_snapshots(board_type, period_key);
CREATE INDEX idx_leaderboard_student ON leaderboard_snapshots(student_user_id);
CREATE INDEX idx_leaderboard_rank ON leaderboard_snapshots(board_type, period_key, rank_no);
```

### 2.6 任务与审计表

```sql
-- ============================================
-- AI 任务日志表
-- ============================================
CREATE TABLE ai_task_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type ai_task_type NOT NULL,
    provider VARCHAR(32) NOT NULL,
    model_name VARCHAR(64) NOT NULL,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    latency_ms INTEGER,
    status ai_task_status NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_task_logs_type ON ai_task_logs(task_type);
CREATE INDEX idx_ai_task_logs_provider ON ai_task_logs(provider);
CREATE INDEX idx_ai_task_logs_status ON ai_task_logs(status);
CREATE INDEX idx_ai_task_logs_created ON ai_task_logs(created_at);

-- ============================================
-- 审计日志表
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id UUID,
    payload JSONB,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### 2.7 初始数据与视图

```sql
-- ============================================
-- 创建管理员账号 (初始密码需首次登录修改)
-- ============================================
INSERT INTO users (role, phone, password_hash, nickname, status)
VALUES ('admin', 'admin@system', '$2b$10$placeholder', '系统管理员', 'active');

-- ============================================
-- 创建常用视图：学生学习概览
-- ============================================
CREATE VIEW v_student_overview AS
SELECT 
    u.id as user_id,
    u.nickname,
    u.avatar_url,
    sp.grade,
    sp.school_name,
    sp.total_points,
    sp.streak_days,
    COUNT(DISTINCT ps.id) as total_sessions,
    COALESCE(SUM(ps.correct_count), 0) as total_correct,
    COALESCE(SUM(ps.question_count), 0) as total_questions
FROM users u
JOIN student_profiles sp ON u.id = sp.user_id
LEFT JOIN practice_sessions ps ON u.id = ps.student_user_id AND ps.status = 'finished'
WHERE u.status = 'active'
GROUP BY u.id, sp.grade, sp.school_name, sp.total_points, sp.streak_days;

-- ============================================
-- 创建视图：家长绑定学生列表
-- ============================================
CREATE VIEW v_parent_students AS
SELECT 
    fb.parent_user_id,
    fb.student_user_id,
    fb.relation_type,
    fb.is_primary,
    fb.status as binding_status,
    u.nickname as student_nickname,
    u.avatar_url as student_avatar,
    sp.grade as student_grade
FROM family_bindings fb
JOIN users u ON fb.student_user_id = u.id
JOIN student_profiles sp ON fb.student_user_id = sp.user_id
WHERE fb.status = 'active';
```

---

## 3. 项目脚手架

### 3.1 NestJS 项目初始化命令

```bash
# 创建新项目
npm install -g @nestjs/cli
nest new study-assistant-backend --package-manager npm

# 进入项目目录
cd study-assistant-backend

# 安装核心依赖
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/platform-express @nestjs/common @nestjs/core @nestjs/microservices
npm install bullmq ioredis
npm install @prisma/client
npm install axios dayjs uuid

# 安装开发依赖
npm install -D prisma
npm install -D @types/passport-jwt @types/passport @types/uuid

# 生成各模块
nest g module modules/auth-family
nest g module modules/user-profile
nest g module modules/textbook
nest g module modules/practice
nest g module modules/learning-analytics
nest g module modules/points-leaderboard
nest g module modules/community
nest g module modules/ai-gateway
nest g module worker

# 生成 Worker 应用 (独立进程)
nest g application worker --directory apps/worker
```

### 3.2 配置文件模板

#### `.env.example`

```bash
# ============================================
# 应用配置
# ============================================
NODE_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000
API_PREFIX=/api/v1

# ============================================
# 数据库配置
# ============================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=study_assistant
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?schema=public

# ============================================
# Redis 配置
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://${REDIS_PASSWORD:+${REDIS_PASSWORD}@}${REDIS_HOST}:${REDIS_PORT}

# ============================================
# JWT 配置
# ============================================
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_change_in_production
REFRESH_TOKEN_EXPIRES_IN=30d

# ============================================
# 阿里云 OSS 配置
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=study-assistant-files
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
OSS_BASE_URL=https://your-bucket.oss-cn-hangzhou.aliyuncs.com

# ============================================
# 阿里云百炼配置
# ============================================
ALIYUN_DASHSCOPE_API_KEY=your_dashscope_api_key
ALIYUN_DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# ============================================
# DeepSeek 配置 (备用)
# ============================================
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# ============================================
# 短信服务配置 (阿里云短信)
# ============================================
SMS_ACCESS_KEY_ID=your_sms_access_key_id
SMS_ACCESS_KEY_SECRET=your_sms_access_key_secret
SMS_SIGN_NAME=学习助手
SMS_TEMPLATE_CODE=SMS_123456789

# ============================================
# _worker_ 配置
# ============================================
WORKER_CONCURRENCY=5
TEXTBOOK_PARSE_QUEUE=textbook:parse
REPORT_GENERATE_QUEUE=report:generate
RANKING_CALCULATE_QUEUE=ranking:calculate
MODERATION_QUEUE=content:moderation

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=info
LOG_FILE=/var/log/study-assistant/app.log

# ============================================
# 备份配置
# ============================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=7
BACKUP_OSS_BUCKET=study-assistant-backups
```

#### `src/config/config.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';
import { ConfigService } from './config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
```

#### `src/config/env.validation.ts`

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  APP_PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('/api/v1'),
  
  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  
  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  
  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  REFRESH_TOKEN_SECRET: Joi.string().required(),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('30d'),
  
  // OSS
  OSS_REGION: Joi.string().required(),
  OSS_BUCKET: Joi.string().required(),
  OSS_ACCESS_KEY_ID: Joi.string().required(),
  OSS_ACCESS_KEY_SECRET: Joi.string().required(),
  OSS_ENDPOINT: Joi.string().required(),
  OSS_BASE_URL: Joi.string().required(),
  
  // AI
  ALIYUN_DASHSCOPE_API_KEY: Joi.string().required(),
  DEEPSEEK_API_KEY: Joi.string().optional(),
});
```

### 3.3 Prisma Schema

#### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Enums
// ============================================
enum UserRole {
  student
  parent
  admin
}

enum UserStatus {
  active
  disabled
}

enum BindingStatus {
  active
  pending
  revoked
}

enum RelationType {
  father
  mother
  guardian
}

enum TextbookSource {
  uploaded
  platform
}

enum ParseStatus {
  pending
  processing
  success
  failed
}

enum PracticeMode {
  ai_generated
  manual
  weakness
}

enum SessionStatus {
  started
  finished
  abandoned
}

enum QuestionType {
  single_choice
  fill_blank
  judge
}

enum DifficultyLevel {
  easy
  medium
  hard
}

enum PostVisibility {
  public
  private
}

enum PostStatus {
  pending
  published
  rejected
}

enum BoardType {
  total
  weekly
  monthly
  subject
}

enum AiTaskType {
  parse
  generate_question
  analyze
  tts
}

enum AiTaskStatus {
  success
  failed
}

enum PointsReason {
  question_correct
  session_bonus
  activity
}

// ============================================
// Models
// ============================================
model User {
  id            String      @id @default(uuid())
  role          UserRole
  phone         String      @unique
  passwordHash  String?     @map("password_hash")
  nickname      String?
  avatarUrl     String?     @map("avatar_url")
  status        UserStatus  @default(active)
  lastLoginAt   DateTime?   @map("last_login_at")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  studentProfile StudentProfile?
  parentProfile  ParentProfile?
  familyBindingsAsParent FamilyBinding[] @relation("ParentBindings")
  familyBindingsAsStudent FamilyBinding[] @relation("StudentBindings")
  textbooks      Textbook[]
  practiceSessions PracticeSession[]
  practiceAnswers PracticeAnswer[]
  learningRecords LearningRecord[]
  knowledgeMastery KnowledgeMastery[]
  pointsLedger   PointsLedger[]
  dailyStats     DailyLearningStats[]
  posts          Post[]
  postComments   PostComment[]
  postLikes      PostLike[]
  postFavorites  PostFavorite[]
  auditLogs      AuditLog[]

  @@map("users")
}

model StudentProfile {
  userId       String  @id @map("user_id")
  grade        String
  schoolName   String? @map("school_name")
  gender       String?
  totalPoints  Int     @default(0) @map("total_points")
  streakDays   Int     @default(0) @map("streak_days")
  settings     Json    @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("student_profiles")
}

model ParentProfile {
  userId         String   @id @map("user_id")
  realName       String?  @map("real_name")
  verifiedStatus String   @default("pending") @map("verified_status")
  relationNote   String?  @map("relation_note")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("parent_profiles")
}

model FamilyBinding {
  id           String        @id @default(uuid())
  parentUserId String        @map("parent_user_id")
  studentUserId String       @map("student_user_id")
  relationType RelationType  @map("relation_type")
  status       BindingStatus @default(pending)
  isPrimary    Boolean       @default(false) @map("is_primary")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  parent User @relation("ParentBindings", fields: [parentUserId], references: [id], onDelete: Cascade)
  student User @relation("StudentBindings", fields: [studentUserId], references: [id], onDelete: Cascade)

  @@unique([parentUserId, studentUserId])
  @@map("family_bindings")
}

model Textbook {
  id          String        @id @default(uuid())
  ownerUserId String        @map("owner_user_id")
  sourceType  TextbookSource @default(uploaded) @map("source_type")
  subject     String
  grade       String
  term        String?
  publisher   String?
  title       String
  coverUrl    String?       @map("cover_url")
  pdfUrl      String        @map("pdf_url")
  pdfFileKey  String        @map("pdf_file_key")
  pageCount   Int           @default(0) @map("page_count")
  unitCount   Int           @default(0) @map("unit_count")
  parseStatus ParseStatus   @default(pending) @map("parse_status")
  parseResult Json?         @map("parse_result")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  owner User @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  units TextbookUnit[]
  chunks TextbookChunk[]
  knowledgePoints KnowledgePoint[]
  practiceSessions PracticeSession[]

  @@map("textbooks")
}

model TextbookUnit {
  id           String   @id @default(uuid())
  textbookId   String   @map("textbook_id")
  parentUnitId String?  @map("parent_unit_id")
  level        Int
  unitCode     String?  @map("unit_code")
  title        String
  sortOrder    Int      @map("sort_order")
  startPage    Int?     @map("start_page")
  endPage      Int?     @map("end_page")
  summary      String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  textbook Textbook @relation(fields: [textbookId], references: [id], onDelete: Cascade)
  parent   TextbookUnit? @relation("UnitHierarchy", fields: [parentUnitId], references: [id])
  children TextbookUnit[] @relation("UnitHierarchy")
  chunks   TextbookChunk[]
  knowledgePoints KnowledgePoint[]
  practiceSessions PracticeSession[]

  @@map("textbook_units")
}

model TextbookChunk {
  id         String   @id @default(uuid())
  textbookId String   @map("textbook_id")
  unitId     String   @map("unit_id")
  chunkIndex Int      @map("chunk_index")
  content    String
  tokenCount Int?     @map("token_count")
  embedding  String?  // Vector type handled by extension
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at")

  textbook Textbook @relation(fields: [textbookId], references: [id], onDelete: Cascade)
  unit     TextbookUnit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@map("textbook_chunks")
}

model KnowledgePoint {
  id         String   @id @default(uuid())
  textbookId String?  @map("textbook_id")
  unitId     String?  @map("unit_id")
  subject    String
  grade      String
  code       String?
  name       String
  description String?
  aliases    Json     @default("[]")
  createdAt  DateTime @default(now()) @map("created_at")

  textbook Textbook? @relation(fields: [textbookId], references: [id], onDelete: SetNull)
  unit     TextbookUnit? @relation(fields: [unitId], references: [id], onDelete: SetNull)
  masteryRecords KnowledgeMastery[]

  @@map("knowledge_points")
}

model PracticeSession {
  id            String        @id @default(uuid())
  studentUserId String        @map("student_user_id")
  textbookId    String        @map("textbook_id")
  unitId        String        @map("unit_id")
  subject       String
  grade         String
  practiceMode  PracticeMode  @map("practice_mode")
  questionCount Int           @map("question_count")
  correctCount  Int           @default(0) @map("correct_count")
  score         Int           @default(0)
  durationSec   Int           @default(0) @map("duration_sec")
  pointsEarned  Int           @default(0) @map("points_earned")
  status        SessionStatus @default(started)
  aiContext     Json?         @map("ai_context")
  startedAt     DateTime      @default(now()) @map("started_at")
  finishedAt    DateTime?     @map("finished_at")
  createdAt     DateTime      @default(now()) @map("created_at")

  student   User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)
  textbook  Textbook @relation(fields: [textbookId], references: [id], onDelete: Cascade)
  unit      TextbookUnit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  questions PracticeQuestion[]
  answers   PracticeAnswer[]
  learningRecords LearningRecord[]
  pointsLedger PointsLedger[]

  @@map("practice_sessions")
}

model PracticeQuestion {
  id              String         @id @default(uuid())
  sessionId       String         @map("session_id")
  questionType    QuestionType   @map("question_type")
  stem            String
  options         Json?
  correctAnswer   Json           @map("correct_answer")
  explanation     String
  knowledgeTags   Json           @map("knowledge_tags")
  difficulty      DifficultyLevel
  sourceChunkRefs Json?          @map("source_chunk_refs")
  modelProvider   String?        @map("model_provider")
  modelName       String?        @map("model_name")
  createdAt       DateTime       @default(now()) @map("created_at")

  session PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  answers PracticeAnswer[]

  @@map("practice_questions")
}

model PracticeAnswer {
  id              String   @id @default(uuid())
  sessionId       String   @map("session_id")
  questionId      String   @map("question_id")
  studentUserId   String   @map("student_user_id")
  answerPayload   Json     @map("answer_payload")
  isCorrect       Boolean  @map("is_correct")
  answerDurationMs Int     @map("answer_duration_ms")
  answeredAt      DateTime @default(now()) @map("answered_at")

  session  PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question PracticeQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  student  User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)

  @@map("practice_answers")
}

model LearningRecord {
  id            String   @id @default(uuid())
  studentUserId String   @map("student_user_id")
  sessionId     String   @map("session_id")
  subject       String
  textbookTitle String   @map("textbook_title")
  unitTitle     String?  @map("unit_title")
  questionCount Int      @map("question_count")
  correctCount  Int      @map("correct_count")
  correctRate   Int      @map("correct_rate")
  durationSec   Int      @map("duration_sec")
  pointsEarned  Int      @map("points_earned")
  createdAt     DateTime @default(now()) @map("created_at")

  student User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)
  session PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("learning_records")
}

model KnowledgeMastery {
  id              String    @id @default(uuid())
  studentUserId   String    @map("student_user_id")
  knowledgePointId String   @map("knowledge_point_id")
  totalAnswered   Int       @default(0) @map("total_answered")
  correctAnswered Int       @default(0) @map("correct_answered")
  wrongStreak     Int       @default(0) @map("wrong_streak")
  masteryScore    Decimal   @default(0) @map("mastery_score")
  lastPracticedAt DateTime? @map("last_practiced_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  student      User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)
  knowledgePoint KnowledgePoint @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)

  @@unique([studentUserId, knowledgePointId])
  @@map("knowledge_mastery")
}

model PointsLedger {
  id               String        @id @default(uuid())
  studentUserId    String        @map("student_user_id")
  deltaPoints      Int           @map("delta_points")
  reasonType       PointsReason  @map("reason_type")
  relatedSessionId String?       @map("related_session_id")
  remark           String?
  createdAt        DateTime      @default(now()) @map("created_at")

  student User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)
  session PracticeSession? @relation(fields: [relatedSessionId], references: [id], onDelete: SetNull)

  @@map("points_ledger")
}

model DailyLearningStats {
  id              String   @id @default(uuid())
  studentUserId   String   @map("student_user_id")
  statDate        DateTime @map("stat_date")
  totalDurationSec Int     @default(0) @map("total_duration_sec")
  totalQuestions  Int      @default(0) @map("total_questions")
  totalCorrect    Int      @default(0) @map("total_correct")
  pointsEarned    Int      @default(0) @map("points_earned")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  student User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)

  @@unique([studentUserId, statDate])
  @@map("daily_learning_stats")
}

model Post {
  id            String         @id @default(uuid())
  authorUserId  String         @map("author_user_id")
  subject       String?
  title         String
  content       String
  tags          Json           @default("[]")
  visibility    PostVisibility @default(public)
  status        PostStatus     @default(pending)
  likeCount     Int            @default(0) @map("like_count")
  commentCount  Int            @default(0) @map("comment_count")
  favoriteCount Int            @default(0) @map("favorite_count")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  author   User @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  comments PostComment[]
  likes    PostLike[]
  favorites PostFavorite[]

  @@map("posts")
}

model PostComment {
  id              String      @id @default(uuid())
  postId          String      @map("post_id")
  authorUserId    String      @map("author_user_id")
  parentCommentId String?     @map("parent_comment_id")
  content         String
  status          PostStatus  @default(pending)
  createdAt       DateTime    @default(now()) @map("created_at")

  post    Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  author  User @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  parent  PostComment? @relation("CommentThread", fields: [parentCommentId], references: [id])
  children PostComment[] @relation("CommentThread")

  @@map("post_comments")
}

model PostLike {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@map("post_likes")
}

model PostFavorite {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@map("post_favorites")
}

model LeaderboardSnapshot {
  id            String    @id @default(uuid())
  boardType     BoardType @map("board_type")
  subject       String?
  periodKey     String    @map("period_key")
  studentUserId String    @map("student_user_id")
  rankNo        Int       @map("rank_no")
  scoreValue    Int       @map("score_value")
  extra         Json?
  createdAt     DateTime  @default(now()) @map("created_at")

  student User @relation(fields: [studentUserId], references: [id], onDelete: Cascade)

  @@map("leaderboard_snapshots")
}

model AiTaskLog {
  id             String       @id @default(uuid())
  taskType       AiTaskType   @map("task_type")
  provider       String
  modelName      String       @map("model_name")
  requestPayload Json         @map("request_payload")
  responsePayload Json?       @map("response_payload")
  latencyMs      Int?         @map("latency_ms")
  status         AiTaskStatus
  errorMessage   String?      @map("error_message")
  createdAt      DateTime     @default(now()) @map("created_at")

  @@map("ai_task_logs")
}

model AuditLog {
  id          String    @id @default(uuid())
  actorUserId String?   @map("actor_user_id")
  action      String
  targetType  String?   @map("target_type")
  targetId    String?   @map("target_id")
  payload     Json?
  ip          String?
  userAgent   String?   @map("user_agent")
  createdAt   DateTime  @default(now()) @map("created_at")

  actor User? @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
}
```

---

## 4. 部署脚本与配置

### 4.1 Docker Compose 配置

#### `docker-compose.yml` (生产环境 - 京东云)

```yaml
version: '3.8'

services:
  # ============================================
  # Nginx 反向代理
  # ============================================
  nginx:
    image: nginx:alpine
    container_name: study-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
      - ./docker/nginx/logs:/var/log/nginx
      - ./dist/apps/frontend:/usr/share/nginx/html:ro
    depends_on:
      - app-api
    networks:
      - study-network
    restart: always

  # ============================================
  # NestJS API 服务
  # ============================================
  app-api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    container_name: study-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - APP_PORT=3000
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=study_assistant
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
      - ALIYUN_DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
    volumes:
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - study-network
    restart: always
    deploy:
      resources:
        limits:
          memory: 700M

  # ============================================
  # Worker 后台任务
  # ============================================
  app-worker:
    build:
      context: .
      dockerfile: docker/worker/Dockerfile
    container_name: study-worker
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=study_assistant
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
      - ALIYUN_DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
      - WORKER_CONCURRENCY=5
    volumes:
      - ./logs/worker:/app/logs
      - ./backups:/app/backups
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - study-network
    restart: always
    deploy:
      resources:
        limits:
          memory: 700M

  # ============================================
  # PostgreSQL 数据库
  # ============================================
  postgres:
    image: postgres:16-alpine
    container_name: study-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=study_assistant
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d study_assistant"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - study-network
    restart: always
    deploy:
      resources:
        limits:
          memory: 1300M

  # ============================================
  # Redis 缓存与队列
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: study-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - study-network
    restart: always
    deploy:
      resources:
        limits:
          memory: 200M

networks:
  study-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

#### `docker-compose.staging.yml` (预发环境 - 阿里云)

```yaml
version: '3.8'

services:
  # ============================================
  # Staging API 服务
  # ============================================
  app-api-staging:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    container_name: study-api-staging
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - APP_PORT=3000
      - DATABASE_HOST=postgres-staging
      - DATABASE_PORT=5432
      - DATABASE_NAME=study_assistant_staging
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=${STAGING_DB_PASSWORD}
      - REDIS_HOST=redis-staging
      - REDIS_PORT=6379
      - JWT_SECRET=${STAGING_JWT_SECRET}
      - REFRESH_TOKEN_SECRET=${STAGING_REFRESH_TOKEN_SECRET}
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
      - ALIYUN_DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
    depends_on:
      postgres-staging:
        condition: service_healthy
      redis-staging:
        condition: service_healthy
    networks:
      - study-staging-network
    restart: always

  # ============================================
  # Staging PostgreSQL
  # ============================================
  postgres-staging:
    image: postgres:16-alpine
    container_name: study-postgres-staging
    environment:
      - POSTGRES_DB=study_assistant_staging
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${STAGING_DB_PASSWORD}
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d study_assistant_staging"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - study-staging-network
    restart: always

  # ============================================
  # Staging Redis
  # ============================================
  redis-staging:
    image: redis:7-alpine
    container_name: study-redis-staging
    command: redis-server --appendonly yes
    volumes:
      - redis_staging_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - study-staging-network
    restart: always

networks:
  study-staging-network:
    driver: bridge

volumes:
  postgres_staging_data:
  redis_staging_data:
```

### 4.2 Dockerfile

#### `docker/api/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]
```

#### `docker/worker/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

RUN npx prisma generate

# Install postgresql-client for backup
RUN apk add --no-cache postgresql-client

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

RUN chown -R nestjs:nodejs /app

USER nestjs

CMD ["node", "dist/apps/worker/main.js"]
```

### 4.3 Nginx 配置

#### `docker/nginx/nginx.conf`

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=5r/s;

    server {
        listen 80;
        server_name _;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # 静态文件
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # API 代理
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://app-api:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 60s;
            proxy_connect_timeout 60s;
        }

        # 文件上传 (更宽松的限制)
        location /api/v1/files/ {
            limit_req zone=upload_limit burst=10 nodelay;

            proxy_pass http://app-api:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            client_max_body_size 100M;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 4.4 环境变量模板

#### `.env.production`

```bash
# 生产环境配置 (京东云)
NODE_ENV=production
APP_PORT=3000

# 数据库
DB_PASSWORD=YourSecurePassword123!

# Redis
REDIS_PASSWORD=YourRedisPassword456!

# JWT
JWT_SECRET=YourSuperSecretJWTKey789!
REFRESH_TOKEN_SECRET=YourRefreshTokenSecret012!

# 阿里云 OSS
OSS_ACCESS_KEY_ID=LTAI5t...
OSS_ACCESS_KEY_SECRET=your_secret_here

# AI
DASHSCOPE_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
```

#### `.env.staging`

```bash
# 预发环境配置 (阿里云)
NODE_ENV=staging
APP_PORT=3000

# 数据库
STAGING_DB_PASSWORD=StagingPassword123!

# JWT
STAGING_JWT_SECRET=StagingJWTSecret456!
STAGING_REFRESH_TOKEN_SECRET=StagingRefreshSecret789!

# 阿里云 OSS (同生产)
OSS_ACCESS_KEY_ID=LTAI5t...
OSS_ACCESS_KEY_SECRET=your_secret_here

# AI
DASHSCOPE_API_KEY=sk-...
```

### 4.5 备份脚本

#### `scripts/backup.sh`

```bash
#!/bin/bash
set -e

# ============================================
# 数据库备份脚本
# ============================================

# 配置
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="study_assistant"
DB_USER="postgres"
DB_HOST="postgres"
DB_PORT="5432"
RETENTION_DAYS=7
OSS_BUCKET="study-assistant-backups"

# 创建备份目录
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

echo "[$(date)] 开始数据库备份..."

# 完整备份
BACKUP_FILE="${BACKUP_DIR}/daily/${DB_NAME}_${DATE}.sql.gz"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "[$(date)] 备份完成：${BACKUP_FILE}"

# 验证备份
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    echo "[$(date)] 备份文件验证通过"
else
    echo "[$(date)] 备份文件验证失败!"
    exit 1
fi

# 周备份 (每周一)
if [ "$(date +%u)" -eq 1 ]; then
    cp "${BACKUP_FILE}" "${BACKUP_DIR}/weekly/${DB_NAME}_week_$(date +%Y%V).sql.gz"
    echo "[$(date)] 已创建周备份"
fi

# 月备份 (每月 1 号)
if [ "$(date +%d)" -eq 01 ]; then
    cp "${BACKUP_FILE}" "${BACKUP_DIR}/monthly/${DB_NAME}_month_$(date +%Y%m).sql.gz"
    echo "[$(date)] 已创建月备份"
fi

# 清理过期备份 (保留最近 7 天的日备份)
echo "[$(date)] 清理过期备份..."
find "${BACKUP_DIR}/daily" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -mtime +$((RETENTION_DAYS * 4)) -delete
find "${BACKUP_DIR}/monthly" -name "*.sql.gz" -mtime +$((RETENTION_DAYS * 12)) -delete

# 同步到阿里云 OSS (如果配置了 ossutil)
if command -v ossutil &> /dev/null && [ -n "${OSS_ACCESS_KEY_ID}" ]; then
    echo "[$(date)] 同步备份到 OSS..."
    ossutil cp -r "${BACKUP_DIR}" "oss://${OSS_BUCKET}/backups/" --endpoint="oss-cn-hangzhou.aliyuncs.com"
    echo "[$(date)] OSS 同步完成"
fi

# 同步到阿里云备份主机 (通过 rsync)
if [ -n "${BACKUP_HOST}" ]; then
    echo "[$(date)] 同步到备份主机..."
    rsync -avz -e "ssh -i /root/.ssh/backup_key" "${BACKUP_DIR}/" "root@${BACKUP_HOST}:/backups/study-assistant/"
    echo "[$(date)] 备份主机同步完成"
fi

echo "[$(date)] 备份任务全部完成"
```

#### `docker/postgres/init.sql`

```sql
-- 初始化数据库扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- V1.2 时启用
-- CREATE EXTENSION IF NOT EXISTS "pgvector";

-- 创建自定义类型 (如果 Prisma 不管理)
-- 注意：Prisma 会管理 schema，这里仅用于手动初始化
```

### 4.6 部署命令脚本

#### `scripts/deploy-production.sh`

```bash
#!/bin/bash
set -e

echo "============================================"
echo "  生产环境部署脚本 (京东云)"
echo "============================================"

# 1. 拉取最新代码
echo "[1/6] 拉取最新代码..."
git pull origin main

# 2. 安装依赖
echo "[2/6] 安装依赖..."
npm ci

# 3. 生成 Prisma 客户端
echo "[3/6] 生成 Prisma 客户端..."
npx prisma generate

# 4. 构建应用
echo "[4/6] 构建应用..."
npm run build

# 5. 数据库迁移
echo "[5/6] 执行数据库迁移..."
npx prisma migrate deploy

# 6. 重启 Docker 服务
echo "[6/6] 重启 Docker 服务..."
docker-compose down
docker-compose up -d

# 等待服务启动
sleep 10

# 健康检查
echo "执行健康检查..."
curl -f http://localhost:3000/health || exit 1

echo "============================================"
echo "  部署完成!"
echo "============================================"
```

#### `scripts/deploy-staging.sh`

```bash
#!/bin/bash
set -e

echo "============================================"
echo "  预发环境部署脚本 (阿里云)"
echo "============================================"

# 1. 拉取最新代码
echo "[1/5] 拉取最新代码..."
git pull origin develop

# 2. 安装依赖
echo "[2/5] 安装依赖..."
npm ci

# 3. 生成 Prisma 客户端
echo "[3/5] 生成 Prisma 客户端..."
npx prisma generate

# 4. 构建应用
echo "[4/5] 构建应用..."
npm run build

# 5. 重启 Staging 服务
echo "[5/5] 重启 Staging 服务..."
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml up -d

sleep 10

echo "============================================"
echo "  预发环境部署完成!"
echo "============================================"
```

### 4.7 Crontab 配置

#### `scripts/crontab.txt`

```bash
# ============================================
# 定时任务配置
# ============================================

# 每日凌晨 2 点数据库备份
0 2 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1

# 每周一凌晨 3 点计算周排行榜
0 3 * * 1 curl -X POST http://localhost:3000/api/v1/admin/leaderboards/calculate/weekly

# 每月 1 号凌晨 3 点计算月排行榜
0 3 1 * * curl -X POST http://localhost:3000/api/v1/admin/leaderboards/calculate/monthly

# 每小时清理过期会话
0 * * * * curl -X POST http://localhost:3000/api/v1/admin/cleanup/sessions

# 每天凌晨 4 点清理临时文件
0 4 * * * find /tmp -type f -mtime +1 -delete
```

---

## 5. 快速启动指南

### 5.1 本地开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd study-assistant-backend

# 2. 安装依赖
npm install

# 3. 复制环境变量
cp .env.example .env.development

# 4. 启动 Docker 服务 (PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml up -d

# 5. 数据库迁移
npx prisma migrate dev

# 6. 生成 Prisma 客户端
npx prisma generate

# 7. 启动开发服务器
npm run start:dev
```

### 5.2 生产环境部署

```bash
# 1. 上传代码到京东云服务器
scp -r . root@jd-cloud-server:/opt/study-assistant

# 2. 登录服务器
ssh root@jd-cloud-server

# 3. 进入项目目录
cd /opt/study-assistant

# 4. 配置环境变量
cp .env.example .env.production
# 编辑 .env.production 填写实际配置

# 5. 执行部署脚本
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh

# 6. 查看日志
docker-compose logs -f
```

### 5.3 配置备份任务

```bash
# 1. 编辑 crontab
crontab -e

# 2. 添加备份任务
0 2 * * * /opt/study-assistant/scripts/backup.sh

# 3. 验证 cron 服务
systemctl status cron
```

---

## 6. 监控与运维

### 6.1 健康检查端点

```bash
# API 健康检查
curl http://localhost:3000/health

# 数据库连接检查
curl http://localhost:3000/health/db

# Redis 连接检查
curl http://localhost:3000/health/redis
```

### 6.2 日志查看

```bash
# API 日志
docker-compose logs -f app-api

# Worker 日志
docker-compose logs -f app-worker

# 数据库日志
docker-compose logs -f postgres

# Nginx 日志
docker-compose logs -f nginx
tail -f docker/nginx/logs/access.log
```

### 6.3 关键指标监控

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| API 5xx 错误率 | > 1% | 服务异常 |
| 解析任务失败率 | > 10% | AI 调用或解析逻辑问题 |
| 数据库磁盘占用 | > 80% | 需要扩容或清理 |
| Redis 队列积压 | > 1000 | Worker 处理能力不足 |
| 内存使用率 | > 85% | 需要优化或扩容 |

---

## 7. 附录

### 7.1 项目依赖清单

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "bullmq": "^4.0.0",
    "ioredis": "^5.0.0",
    "passport-jwt": "^4.0.0",
    "axios": "^1.6.0",
    "dayjs": "^1.11.0",
    "uuid": "^9.0.0",
    "joi": "^17.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/passport-jwt": "^3.0.0",
    "prisma": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 7.2 端口占用说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | HTTP/HTTPS |
| API | 3000 | NestJS 应用 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存/队列 |

### 7.3 资源分配建议

| 组件 | 内存限制 | CPU | 说明 |
|------|---------|-----|------|
| API | 700MB | 1 核 | NestJS 主服务 |
| Worker | 700MB | 1 核 | 后台任务处理 |
| PostgreSQL | 1300MB | 1-2 核 | 主数据库 |
| Redis | 200MB | 0.5 核 | 缓存 |
| Nginx | 80MB | 0.5 核 | 反向代理 |
| **合计** | **~3GB** | **4 核** | 适合 4G 内存服务器 |

---

**文档结束**
