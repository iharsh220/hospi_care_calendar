const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per user per event per period (month+year for recurring, date for yearly)
// status: pending | done | carry
const EventAssignment = sequelize.define(
  'EventAssignment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    event_id: { type: DataTypes.INTEGER, allowNull: false },
    organogram_id: { type: DataTypes.BIGINT, allowNull: false },
    period_month: { type: DataTypes.INTEGER, allowNull: true },  // 1-12
    period_year: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'done', 'carry', 'remind', 'upcoming'),
      defaultValue: 'pending',
    },
    is_carry_forward: { type: DataTypes.BOOLEAN, defaultValue: false },
    carry_from_month: { type: DataTypes.INTEGER, allowNull: true },
    carry_from_year: { type: DataTypes.INTEGER, allowNull: true },
    completed_on: { type: DataTypes.DATEONLY, allowNull: true },
    completion_notes: { type: DataTypes.TEXT, allowNull: true },
    proof_image_url: { type: DataTypes.STRING(500), allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    tableName: 'ft_event_assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = EventAssignment;
