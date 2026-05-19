const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// POST /login — handles both admin and field user
router.post('/login', login);

module.exports = router;
