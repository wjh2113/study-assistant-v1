const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @route   GET /api/health
 * @desc    健康检查接口
 * @access  Public
 */
router.get('/', healthController.getHealth);

module.exports = router;
