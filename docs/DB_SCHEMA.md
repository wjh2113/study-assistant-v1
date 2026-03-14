# 数据库 Schema - 小学生全科智能复习助手

**数据库**: PostgreSQL 16  
**字符集**: UTF8  
**创建时间**: 2026-03-14

---

## 表结构总览

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| users | 用户表 | 学生、家长、教师、管理员 |
| subjects | 学科表 | 语文、数学、英语等 |
| knowledge_points | 知识点表 | 层级知识点结构 |
| exercises | 习题表 | 各类题型 |
| wrong_questions | 错题本 | 学生错题记录 |
| study_plans | 学习计划表 | 学习目标设定 |
| exercise_records | 学习记录表 | 答题历史 |
| ai_chats | AI 对话记录表 | 智能辅导记录 |
| upload_files | 文件上传记录表 | FTP 文件索引 |

---

## 完整 DDL

```sql
-- ============================================
-- 创建数据库
-- ============================================
CREATE DATABASE study_assistant
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'zh_CN.UTF-8'
    LC_CTYPE = 'zh_CN.UTF-8'
    TEMPLATE = template0;

\c study_assistant;

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 枚举类型
-- ============================================

-- 用户角色
CREATE TYPE user_role AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'ADMIN');

-- 题目类型
CREATE TYPE question_type AS ENUM (
    'SINGLE_CHOICE',    -- 单选题
    'MULTIPLE_CHOICE',  -- 多选题
    'TRUE_FALSE',       -- 判断题
    'FILL_IN_BLANK',    -- 填空题
    'SHORT_ANSWER',     -- 简答题
    'ESSAY',            -- 作文题
    'MATCHING',         -- 配对题
    'LISTENING',        -- 听力题
    'SPEAKING'          -- 口语题
);

-- 难度等级
CREATE TYPE difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- 学习计划状态
CREATE TYPE plan_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    grade INTEGER CHECK (grade >= 1 AND grade <= 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_grade ON users(grade);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 学科表
-- ============================================
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 6),
    icon VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subjects_grade ON subjects(grade);
CREATE INDEX idx_subjects_sort ON subjects(sort_order);

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 知识点表
-- ============================================
CREATE TABLE knowledge_points (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 6),
    description TEXT,
    parent_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_points_subject ON knowledge_points(subject_id);
CREATE INDEX idx_knowledge_points_grade ON knowledge_points(grade);
CREATE INDEX idx_knowledge_points_parent ON knowledge_points(parent_id);

CREATE TRIGGER update_knowledge_points_updated_at BEFORE UPDATE ON knowledge_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 习题表
-- ============================================
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    knowledge_point_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
    question_type question_type NOT NULL DEFAULT 'SINGLE_CHOICE',
    question TEXT NOT NULL,
    options JSONB,
    answer TEXT NOT NULL,
    explanation TEXT,
    difficulty difficulty_level NOT NULL DEFAULT 'MEDIUM',
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 6),
    tags TEXT[] DEFAULT '{}',
    source VARCHAR(200),
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    audio_url VARCHAR(500),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    view_count INTEGER NOT NULL DEFAULT 0,
    correct_rate DECIMAL(5,2),
    student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exercises_subject ON exercises(subject_id);
CREATE INDEX idx_exercises_knowledge_point ON exercises(knowledge_point_id);
CREATE INDEX idx_exercises_grade ON exercises(grade);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_type ON exercises(question_type);
CREATE INDEX idx_exercises_student ON exercises(student_id);
CREATE INDEX idx_exercises_public ON exercises(is_public);

-- GIN 索引用于 tags 数组搜索
CREATE INDEX idx_exercises_tags ON exercises USING GIN(tags);

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 错题本表
-- ============================================
CREATE TABLE wrong_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    wrong_answer TEXT NOT NULL,
    times_wrong INTEGER NOT NULL DEFAULT 1,
    last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_exercise UNIQUE (user_id, exercise_id)
);

CREATE INDEX idx_wrong_questions_user ON wrong_questions(user_id);
CREATE INDEX idx_wrong_questions_exercise ON wrong_questions(exercise_id);
CREATE INDEX idx_wrong_questions_mastered ON wrong_questions(is_mastered);

CREATE TRIGGER update_wrong_questions_updated_at BEFORE UPDATE ON wrong_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 学习计划表
-- ============================================
CREATE TABLE study_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    daily_goal INTEGER NOT NULL DEFAULT 0,
    status plan_status NOT NULL DEFAULT 'ACTIVE',
    progress INTEGER NOT NULL DEFAULT 0,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plans_subject ON study_plans(subject_id);
CREATE INDEX idx_study_plans_status ON study_plans(status);

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 学习记录表
-- ============================================
CREATE TABLE exercise_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    user_answer TEXT NOT NULL,
    time_spent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exercise_records_user ON exercise_records(user_id);
CREATE INDEX idx_exercise_records_exercise ON exercise_records(exercise_id);
CREATE INDEX idx_exercise_records_created ON exercise_records(created_at);
CREATE INDEX idx_exercise_records_correct ON exercise_records(is_correct);

-- ============================================
-- AI 对话记录表
-- ============================================
CREATE TABLE ai_chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(50),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_chats_user ON ai_chats(user_id);
CREATE INDEX idx_ai_chats_subject ON ai_chats(subject);
CREATE INDEX idx_ai_chats_created ON ai_chats(created_at);

-- ============================================
-- 文件上传记录表
-- ============================================
CREATE TABLE upload_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    url VARCHAR(500) NOT NULL,
    ftp_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upload_files_user ON upload_files(user_id);
CREATE INDEX idx_upload_files_created ON upload_files(created_at);

-- ============================================
-- 初始数据
-- ============================================

-- 插入学科数据
INSERT INTO subjects (name, grade, icon, sort_order) VALUES
('语文', 1, '📚', 1),
('数学', 1, '🔢', 2),
('英语', 1, '🔤', 3),
('科学', 1, '🔬', 4),
('语文', 2, '📚', 5),
('数学', 2, '🔢', 6),
('英语', 2, '🔤', 7),
('科学', 2, '🔬', 8),
('语文', 3, '📚', 9),
('数学', 3, '🔢', 10),
('英语', 3, '🔤', 11),
('科学', 3, '🔬', 12);

-- ============================================
-- 视图
-- ============================================

-- 学生学习统计视图
CREATE VIEW v_student_stats AS
SELECT 
    u.id AS user_id,
    u.username,
    u.grade,
    COUNT(DISTINCT er.exercise_id) AS total_exercises,
    COUNT(DISTINCT CASE WHEN er.is_correct THEN er.exercise_id END) AS correct_count,
    ROUND(
        COUNT(DISTINCT CASE WHEN er.is_correct THEN er.exercise_id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT er.exercise_id), 0)::NUMERIC * 100, 
        2
    ) AS accuracy_rate,
    COUNT(DISTINCT wq.id) AS wrong_question_count,
    COUNT(DISTINCT CASE WHEN wq.is_mastered THEN wq.id END) AS mastered_count
FROM users u
LEFT JOIN exercise_records er ON u.id = er.user_id
LEFT JOIN wrong_questions wq ON u.id = wq.user_id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.username, u.grade;

-- 习题统计视图
CREATE VIEW v_exercise_stats AS
SELECT 
    s.name AS subject_name,
    s.grade,
    eq.name AS knowledge_point_name,
    e.difficulty,
    COUNT(e.id) AS exercise_count,
    ROUND(AVG(e.correct_rate), 2) AS avg_correct_rate
FROM exercises e
JOIN subjects s ON e.subject_id = s.id
LEFT JOIN knowledge_points eq ON e.knowledge_point_id = eq.id
WHERE e.is_public = TRUE
GROUP BY s.name, s.grade, eq.name, e.difficulty;

-- ============================================
-- 权限设置（可选）
-- ============================================
-- CREATE ROLE study_app WITH LOGIN PASSWORD 'your_password';
-- GRANT CONNECT ON DATABASE study_assistant TO study_app;
-- GRANT USAGE ON SCHEMA public TO study_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO study_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO study_app;
```

---

## 数据库优化建议

### 1. 连接池配置
```
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
```

### 2. 定期维护
```sql
-- 定期 VACUUM ANALYZE
VACUUM ANALYZE users;
VACUUM ANALYZE exercises;
VACUUM ANALYZE exercise_records;
```

### 3. 分区策略（数据量大时）
```sql
-- exercise_records 按月分区
CREATE TABLE exercise_records_2026_03 PARTITION OF exercise_records
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

---

**文档版本**: v1.0  
**最后更新**: 2026-03-14
