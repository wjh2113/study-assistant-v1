const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const authMiddleware = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

router.post('/', knowledgeController.create);
router.get('/', knowledgeController.getList);
router.get('/search', knowledgeController.search);
router.get('/:id', knowledgeController.getOne);
router.put('/:id', knowledgeController.update);
router.delete('/:id', knowledgeController.delete);

module.exports = router;
