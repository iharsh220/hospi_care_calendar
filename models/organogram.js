const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organogram = sequelize.define('Organogram', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  emp_code: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  emp_name: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  hq: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  level: {
    type: DataTypes.STRING(24),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(13),
    allowNull: true
  },
  division: {
    type: DataTypes.STRING(23),
    allowNull: true
  },
  sap_code: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mobileno: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  emailid: {
    type: DataTypes.STRING(35),
    allowNull: true
  },
  doj: {
    type: DataTypes.STRING(9),
    allowNull: true
  },
  am_sapcode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rm_sapcode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  zm_sapcode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_admin: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'organogram',
  timestamps: false
});

// Virtual: get initials from emp_name
Organogram.prototype.getInitials = function () {
  if (!this.emp_name) return '';
  const parts = String(this.emp_name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

module.exports = Organogram;
