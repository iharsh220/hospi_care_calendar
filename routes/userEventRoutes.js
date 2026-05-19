const express = require('express');
const router = express.Router();
const { getUserEvents } = require('../controllers/userEventController');
const authMiddleware = require('../middleware/authMiddleware');

// Get events based on user role (protected route)
router.get('/events', authMiddleware, getUserEvents);

module.exports = router;
