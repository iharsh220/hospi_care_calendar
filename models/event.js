const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 'monthly' = open period each month | 'specific' = fixed date
  type: {
    type: DataTypes.ENUM('monthly', 'specific'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  // Only for type='specific', format YYYY-MM-DD
  event_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // 'all' or zone name like 'North'
  assigned_to: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'all'
  },
  seven_day_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'events'
});

module.exports = Event;
