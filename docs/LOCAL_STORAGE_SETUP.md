# 本地文件存储配置指南

**更新时间**: 2026-03-15  
**适用版本**: v1.0+

---

## 📋 概述

本项目使用**本地文件存储**方式保存用户上传的文件（课本 PDF、头像、附件等）。

### 优势

- ✅ **无需配置云存储账号** - 开发测试更方便
- ✅ **零成本** - 不需要购买 OSS/S3 服务
- ✅ **快速部署** - 本地开发环境开箱即用
- ✅ **易于迁移** - 后续可轻松切换到云存储

### 文件结构

```
backend/
├── uploads/              # 上传文件根目录
│   ├── .gitignore        # Git 忽略配置
│   ├── textbooks/        # 课本 PDF 文件
│   ├── avatars/          # 用户头像
│   └── attachments/      # 附件文件
├── src/
│   ├── routes/
│   │   └── upload.js     # 上传路由
│   └── workers/
│       └── textbookParser.js  # 课本解析 Worker
└── .env.example          # 环境变量示例
```

---

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置：

```bash
# 本地文件存储配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
# 最大文件大小：50MB (52428800 bytes)
```

### Docker 配置

`docker-compose.yml` 中已配置卷映射：

```yaml
volumes:
  - ./backend:/app
  - ./backend/uploads:/app/uploads  # 持久化上传文件
  - /app/node_modules
```

---

## 📁 上传目录说明

### textbooks/ - 课本 PDF

- **用途**: 存储用户上传的课本 PDF 文件
- **限制**: 最大 50MB
- **格式**: 仅允许 PDF
- **访问 URL**: `http://localhost:3000/uploads/textbooks/{filename}`

### avatars/ - 用户头像

- **用途**: 存储用户头像图片
- **限制**: 最大 5MB
- **格式**: JPEG, PNG, GIF, WebP
- **访问 URL**: `http://localhost:3000/uploads/avatars/{filename}`

### attachments/ - 附件文件

- **用途**: 存储知识点、题目等附件
- **限制**: 最大 20MB
- **格式**: PDF, 图片，Word 文档
- **访问 URL**: `http://localhost:3000/uploads/attachments/{filename}`

---

## 🚀 使用指南

### 1. 上传课本 PDF

```bash
POST /api/upload/textbook
Content-Type: multipart/form-data

FormData:
- file: [PDF 文件]
- title: "数学三年级上册"
- subject: "数学"
- grade: "3"
- version: "人教版" (可选)
```

**响应示例**:
```json
{
  "success": true,
  "textbook": {
    "id": "uuid",
    "title": "数学三年级上册",
    "subject": "数学",
    "grade": 3,
    "parse_status": "pending",
    "file_url": "http://localhost:3000/uploads/textbooks/1234567890-math.pdf",
    "file_size": 1048576
  }
}
```

### 2. 上传头像

```bash
POST /api/upload/avatar
Content-Type: multipart/form-data

FormData:
- file: [图片文件]
- userId: "user-uuid"
```

### 3. 上传附件

```bash
POST /api/upload/attachment
Content-Type: multipart/form-data

FormData:
- file: [附件文件]
- entityType: "knowledge"
- entityId: "knowledge-uuid"
```

### 4. 测试上传功能

```bash
GET /api/upload/test
```

**响应示例**:
```json
{
  "success": true,
  "message": "本地文件存储配置正常",
  "upload_dir": "/app/uploads",
  "dir_exists": true,
  "base_url": "http://localhost:3000"
}
```

---

## 📝 文件命名规则

上传文件会自动重命名为安全格式：

```
{时间戳}-{随机数}-{原始文件名（去除特殊字符）}.{扩展名}

示例:
1710489600000-123456789-数学三年级上册.pdf
```

---

## 🔒 安全考虑

### 文件类型限制

系统会验证上传文件的 MIME 类型：

| 上传类型 | 允许的 MIME 类型 |
|---------|----------------|
| 课本 | application/pdf |
| 头像 | image/jpeg, image/png, image/gif, image/webp |
| 附件 | application/pdf, image/*, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document |

### 文件大小限制

| 上传类型 | 最大大小 |
|---------|---------|
| 课本 | 50MB |
| 头像 | 5MB |
| 附件 | 20MB |

### 文件清理

上传失败时会自动删除临时文件。

---

## 📊 监控与维护

### 检查上传目录

```bash
# 查看上传目录大小
du -sh backend/uploads/

# 查看各子目录大小
du -sh backend/uploads/*/
```

### 清理旧文件

定期清理不需要的文件：

```bash
# 删除 30 天前的课本文件
find backend/uploads/textbooks -type f -mtime +30 -delete
```

### 备份上传文件

```bash
# 备份到外部存储
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/
```

---

## 🔄 迁移到云存储

后续如需迁移到 OSS/S3，只需：

1. 修改 `upload.js` 中的存储配置
2. 更新环境变量
3. 迁移现有文件到云存储
4. 更新文件访问 URL 生成逻辑

---

## ❓ 常见问题

### Q: 上传失败怎么办？

**A**: 检查以下几点：
1. 上传目录是否有写权限
2. 文件大小是否超限
3. 文件格式是否支持
4. 查看服务器日志

### Q: 如何访问上传的文件？

**A**: 文件通过静态资源服务暴露：
- 开发环境：`http://localhost:3000/uploads/{subdir}/{filename}`
- 生产环境：配置 Nginx 反向代理或 CDN

### Q: 上传目录被 Git 跟踪了怎么办？

**A**: `uploads/` 目录已配置 `.gitignore`，不会被提交。如果已被跟踪，执行：
```bash
git rm -r --cached backend/uploads/
```

---

## 📞 技术支持

如有问题，请联系开发团队或查看项目文档。
