const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// 公开路由
router.post('/send-code', authController.sendCode);
router.post('/login', authController.login);
router.post('/register', authController.register);

// 需要认证的路由
router.post('/refresh', authController.refreshToken);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/me', authMiddleware, authController.updateUser);

module.exports = router;
