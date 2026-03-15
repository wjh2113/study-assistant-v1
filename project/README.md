# 📚 小学生全科智能复习助手 - 项目文件管理

**创建日期**: 2026-03-14  
**依据 PRD**: v1.1 可研发落地稿

---

## 📁 目录结构

```
project/
├── README.md                    # 本文件
├── v1-prd/                      # V1 版本（按 PRD 重来）
│   ├── backend/                 # NestJS 后端代码
│   ├── frontend/                # Taro 4 前端代码（H5+ 小程序）
│   ├── docs/                    # 项目文档
│   │   ├── PRD_v1.1.txt        # 产品需求文档
│   │   ├── API.md              # 接口文档
│   │   ├── DB_SCHEMA.md        # 数据库设计
│   │   └── DEPLOY.md           # 部署文档
│   └── scripts/                 # 部署脚本
│       ├── docker-compose.yml
│       ├── init.sql
│       └── backup.sh
│
├── v1-mvp/                      # V1 MVP 版本（旧代码，保留参考）
│   ├── backend/                 # Express 后端（已废弃）
│   ├── frontend/                # React 前端（已废弃）
│   └── mobile/                  # React Native（已废弃）
│
└── v1.1/                        # V1.1 版本（规划中）
└── v1.2/                        # V1.2 版本（规划中）
```

---

## 📋 版本说明

| 版本 | 状态 | 说明 |
|------|------|------|
| v1-prd | 🔄 开发中 | 按 PRD v1.1 重新开发，正式版本 |
| v1-mvp | ⚠️ 已废弃 | 初期 MVP 尝试，技术栈不符，保留参考 |
| v1.1 | ⏳ 规划中 | 家长社区、错题本、学习建议增强 |
| v1.2 | ⏳ 规划中 | pgvector、相似题推荐、学习报告导出 |

---

## 🚀 当前开发重点

**Sprint 0-1**（第 1-3 周）：
- 基础设施搭建（Docker、PostgreSQL、Redis、OSS）
- 账号体系（学生/家长登录、家庭绑定）
- 课本管理（PDF 上传、AI 解析）

---

**项目所有文件统一存放在此目录下，按版本分类管理。**
