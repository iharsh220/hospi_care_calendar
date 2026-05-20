const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per (user × event × month-year).
// For carry-forwards a new row is created with is_carry_forward = true.
const EventAssignment = sequelize.define('EventAssignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  field_user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: { model: 'organogram', key: 'id' }
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'events', key: 'id' }
  },
  month: {
    type: DataTypes.INTEGER,   // 1–12
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // 'pending' | 'done' | 'carry' | 'remind' | 'upcoming'
  status: {
    type: DataTypes.ENUM('pending', 'done', 'carry', 'remind', 'upcoming'),
    defaultValue: 'pending'
  },
  completed_on: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  proof_image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // True if this row was rolled over from a prior month
  is_carry_forward: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Month/year this was originally assigned (for carry-forwards)
  original_month: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  original_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // How many times this assignment has been carried forward
  carry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'event_assignments',
  indexes: [
    { name: 'idx_ea_user_event_month', fields: ['field_user_id', 'event_id', 'month', 'year', 'is_carry_forward'] }
  ]
});

module.exports = EventAssignment;
