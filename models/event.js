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
  // 'monthly'=every month | 'bi_monthly'=every 2 months | 'quarterly'=every 3 months | 'half_yearly'=every 6 months | 'yearly'=every 12 months | 'specific'=fixed date
  type: {
    type: DataTypes.ENUM('monthly', 'bi_monthly', 'quarterly', 'half_yearly', 'yearly', 'specific'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  // For type='specific' and yearly date-based reminders, format YYYY-MM-DD
  event_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // 'all' or comma-separated targets like BDM,KAM,RM,ZM
  assigned_to: {
    type: DataTypes.STRING(100),
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
