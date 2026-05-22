const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// frequency: monthly | bi-monthly | quarterly | half-yearly | yearly
// assigned_to: all | BDM | KAM | RM | ZM (can be comma-separated for multiple)
const Event = sequelize.define(
  'Event',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    frequency: {
      type: DataTypes.ENUM('monthly', 'bi-monthly', 'quarterly', 'half-yearly', 'yearly'),
      allowNull: false,
    },
    assigned_to: {
      type: DataTypes.STRING(50),
      defaultValue: 'all',
    },
    // For yearly (one-time specific date events)
    event_date: { type: DataTypes.DATEONLY, allowNull: true },
    seven_day_reminder: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.STRING(50), defaultValue: 'admin' },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    tableName: 'ft_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Event;
