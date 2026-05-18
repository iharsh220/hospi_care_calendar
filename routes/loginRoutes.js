const express = require('express');
const router = express.Router();
const {login,verifyToken} = require('../controllers/loginController');
const authMiddleware = require('../middleware/authMiddleware');
const { sequelize, Organogram } = require('../models');

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    await sequelize.authenticate();
    const users = await Organogram.findAll({ limit: 5 });
    res.json({
      success: true,
      message: 'Database connected',
      users: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

router.post('/login', login);
router.get('/verify', authMiddleware, verifyToken);

module.exports = router;