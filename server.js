const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const fieldRoutes = require('./routes/field');

// Start cron jobs
require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 12000;
const BASE_PATH = process.env.BASE_PATH || '/hospitalcare/calendar/automation';

// ── Middleware ──
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded proof images
app.use(`${BASE_PATH}/uploads`, express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ── Routes ──
app.use(BASE_PATH, authRoutes);
app.use(`${BASE_PATH}/admin`, adminRoutes);
app.use(`${BASE_PATH}/field`, fieldRoutes);

// Health check
app.get(`${BASE_PATH}/health`, (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});


// ── DB connection + start ──
async function start() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected to MySQL successfully');

    // Sync only new tables (safe — won't touch organogram)
    await sequelize.sync({ alter: false, force: false });
    console.log('[DB] Tables synced');

    app.listen(PORT, () => {
      console.log(`[SERVER] FieldTrack running on port ${PORT}`);
      console.log(`[SERVER] Base path: ${BASE_PATH}`);
      console.log(`[SERVER] Health: http://localhost:${PORT}${BASE_PATH}/health`);
    });
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

start();
