require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 12000;
const BASE_PATH = process.env.BASE_PATH || '/hospitalcare/calendar/automation';

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded proof files statically
app.use(`${BASE_PATH}/uploads`, express.static(path.join(__dirname, 'uploads')));

// ── Routes ──
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const fieldRoutes = require('./routes/field');

app.use(BASE_PATH, authRoutes);
app.use(`${BASE_PATH}/admin`, adminRoutes);
app.use(`${BASE_PATH}/field`, fieldRoutes);

// ── Health check ──
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FieldTrack API is running',
    version: '1.0.0',
    base_path: BASE_PATH
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n✅ FieldTrack API running on port ${PORT}`);
  console.log(`📍 Base URL: http://localhost:${PORT}${BASE_PATH}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   ${BASE_PATH}/login`);
  console.log(`  GET    ${BASE_PATH}/admin/dashboard`);
  console.log(`  GET    ${BASE_PATH}/admin/calendar`);
  console.log(`  GET    ${BASE_PATH}/admin/events`);
  console.log(`  POST   ${BASE_PATH}/admin/events`);
  console.log(`  PUT    ${BASE_PATH}/admin/events/:id`);
  console.log(`  GET    ${BASE_PATH}/admin/tracking`);
  console.log(`  GET    ${BASE_PATH}/admin/incomplete`);
  console.log(`  GET    ${BASE_PATH}/admin/users`);
  console.log(`  POST   ${BASE_PATH}/admin/users`);
  console.log(`  POST   ${BASE_PATH}/admin/jobs/generate-assignments`);
  console.log(`  POST   ${BASE_PATH}/admin/jobs/send-reminders`);
  console.log(`  GET    ${BASE_PATH}/field/my-events`);
  console.log(`  POST   ${BASE_PATH}/field/complete`);
  console.log(`  GET    ${BASE_PATH}/field/my-history`);
  console.log(`  GET    ${BASE_PATH}/field/reports\n`);
  startScheduler();
});

module.exports = app;
