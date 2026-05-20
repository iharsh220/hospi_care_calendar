const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  adminDashboard,
  adminCalendar,
  listEvents,
  addEvent,
  editEvent,
  deleteEvent,
  adminTracking,
  adminIncomplete,
  listUsers,
  addUser,
} = require('../controllers/adminController');

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', adminDashboard);
router.get('/calendar', adminCalendar);
router.get('/events', listEvents);
router.post('/events', addEvent);
router.put('/events/:event_id', editEvent);
router.delete('/events/:event_id', deleteEvent);
router.get('/tracking', adminTracking);
router.get('/incomplete', adminIncomplete);
router.get('/users', listUsers);
router.post('/users', addUser);

module.exports = router;
