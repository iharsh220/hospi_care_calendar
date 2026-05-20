require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize } = require('../models');

async function migrateSchema() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();

    await sequelize.query('ALTER TABLE events MODIFY assigned_to VARCHAR(100) NOT NULL DEFAULT "all"');
    await sequelize.query('ALTER TABLE events MODIFY event_date DATE NULL');

    try {
      await sequelize.query('ALTER TABLE organogram ADD COLUMN region VARCHAR(50) NULL AFTER level');
      console.log('Added organogram.region');
    } catch (err) {
      if (!/Duplicate column/i.test(err.message)) throw err;
      console.log('organogram.region already exists');
    }

    console.log('Schema migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Schema migration failed:', err.message);
    process.exit(1);
  }
}

migrateSchema();
