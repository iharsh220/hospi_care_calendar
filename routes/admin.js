const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');
const {
  getDashboard,
  getCalendar,
  getEvents,
  createEvent,
  updateEvent,
  getTracking,
  getIncomplete,
  getUsers,
  createUser
} = require('../controllers/adminController');

// All admin routes require admin JWT
router.use(requireAdmin);

// Dashboard & Calendar
router.get('/dashboard', getDashboard);      // #3
router.get('/calendar', getCalendar);        // #4

// Events management
router.get('/events', getEvents);            // #5
router.post('/events', createEvent);         // #6
router.put('/events/:event_id', updateEvent); // #7

// Tracking
router.get('/tracking', getTracking);        // #8
router.get('/incomplete', getIncomplete);    // #9

// Field Users
router.get('/users', getUsers);              // #10
router.post('/users', createUser);           // #11

module.exports = router;
