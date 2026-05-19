require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 12000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/hospitalcare/calendar/automation', require('./routes'));

// Database connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connection established.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Sync database
sequelize.sync({ alter: false })
  .then(() => {
    console.log('Database synced successfully.');
  })
  .catch(err => {
    console.error('Database sync error:', err);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});