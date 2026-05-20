const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organogram = sequelize.define(
  'Organogram',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    emp_code: { type: DataTypes.STRING(50) },
    emp_name: { type: DataTypes.STRING(100) },
    hq: { type: DataTypes.STRING(100) },
    level: { type: DataTypes.STRING(50) },   // BDM - Government Account | AM | RM | ZM
    region: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.STRING(20) },
    division: { type: DataTypes.STRING(100) },
    sap_code: { type: DataTypes.STRING(50) },
    mobileno: { type: DataTypes.STRING(20) },
    emailid: { type: DataTypes.STRING(150) },
    doj: { type: DataTypes.DATEONLY },
    am_sapcode: { type: DataTypes.STRING(50) },
    rm_sapcode: { type: DataTypes.STRING(50) },
    zm_sapcode: { type: DataTypes.STRING(50) },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    tableName: 'organogram',
    timestamps: false,
  }
);

module.exports = Organogram;
