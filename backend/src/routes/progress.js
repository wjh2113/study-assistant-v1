const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

router.post('/upsert', progressController.upsert);
router.post('/log', progressController.logStudyTime);
router.get('/', progressController.getList);
router.get('/stats', progressController.getStats);

module.exports = router;
