const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, deleteEvent, updateEvent } = require('../controllers/adminEventController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.post('/events', authMiddleware, adminOnly, createEvent);
router.get('/events', authMiddleware, adminOnly, getAllEvents);
router.put('/events/:id', authMiddleware, adminOnly, updateEvent);
router.delete('/events/:id', authMiddleware, adminOnly, deleteEvent);

module.exports = router;