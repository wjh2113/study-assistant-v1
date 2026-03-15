const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

router.post('/ask', aiController.ask);
router.get('/history', aiController.getHistory);
router.get('/search', aiController.search);
router.delete('/:id', aiController.delete);

module.exports = router;
