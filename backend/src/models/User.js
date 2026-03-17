const { db } = require('../config/database');
const crypto = require('crypto');

/**
 * 生成 UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

class UserModel {
  // 创建用户
  static create(phone, role, nickname = null) {
    // 生成 UUID 作为用户 ID（兼容 PostgreSQL）
    const id = generateUUID();
    const stmt = db.prepare(`
      INSERT INTO users (id, phone, role, nickname)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, phone, role, nickname);
    return this.getById(id);
  }

  // 根据 ID 获取用户
  static getById(id) {
    const stmt = db.prepare('SELECT id, role, phone, nickname, avatar_url, created_at, updated_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  // 根据手机号获取用户
  static getByPhone(phone) {
    const stmt = db.prepare('SELECT * FROM users WHERE phone = ?');
    return stmt.get(phone);
  }

  // 更新用户
  static update(id, data) {
    const { nickname, avatar_url } = data;
    const stmt = db.prepare(`
      UPDATE users 
      SET nickname = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(nickname, avatar_url, id);
    return this.getById(id);
  }

  // 创建学生资料
  static createStudentProfile(user_id, grade, school_name) {
    // 确保 grade 是整数
    const gradeInt = grade ? parseInt(grade, 10) : null;
    const stmt = db.prepare(`
      INSERT INTO student_profiles (user_id, grade, school_name)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET grade = excluded.grade, school_name = excluded.school_name, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(user_id, gradeInt, school_name);
    return this.getStudentProfile(user_id);
  }

  // 获取学生资料
  static getStudentProfile(user_id) {
    const stmt = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?');
    return stmt.get(user_id);
  }

  // 创建家长资料
  static createParentProfile(user_id, real_name) {
    const stmt = db.prepare(`
      INSERT INTO parent_profiles (user_id, real_name)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET real_name = excluded.real_name, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(user_id, real_name);
    return this.getParentProfile(user_id);
  }

  // 获取家长资料
  static getParentProfile(user_id) {
    const stmt = db.prepare('SELECT * FROM parent_profiles WHERE user_id = ?');
    return stmt.get(user_id);
  }

  // 保存验证码（保留用于向后兼容，新代码请使用 verificationService）
  static saveVerificationCode(phone, code, purpose = 'login', expiresInMinutes = 5) {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const stmt = db.prepare(`
      INSERT INTO verification_codes (phone, code, purpose, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(phone, code, purpose, expiresAt);
  }

  // 验证验证码（保留用于向后兼容）
  static verifyCode(phone, code, purpose = 'login') {
    const stmt = db.prepare(`
      SELECT * FROM verification_codes 
      WHERE phone = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `);
    return stmt.get(phone, code, purpose);
  }

  // 标记验证码为已使用（保留用于向后兼容）
  static markCodeAsUsed(id) {
    const stmt = db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`);
    stmt.run(id);
  }

  // 获取用户完整信息（包含资料）
  static getUserWithProfile(id) {
    const user = this.getById(id);
    if (!user) return null;

    let profile = null;
    if (user.role === 'STUDENT') {
      profile = this.getStudentProfile(id);
    } else if (user.role === 'PARENT') {
      profile = this.getParentProfile(id);
    }

    return { ...user, profile };
  }
}

module.exports = UserModel;
