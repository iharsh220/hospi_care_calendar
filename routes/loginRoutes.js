const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', loginController.login);
router.get('/verify', authMiddleware, loginController.verifyToken);

module.exports = router;