-- Prisma 迁移初始化 SQL
-- 此文件在 PostgreSQL 容器首次启动时自动执行

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建枚举类型
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM (
        'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE',
        'FILL_IN_BLANK', 'SHORT_ANSWER', 'ESSAY',
        'MATCHING', 'LISTENING', 'SPEAKING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
