const sequelize = require('../config/database');
const Admin = require('./admin');
const Organogram = require('./organogram');
const Event = require('./event');
const EventAssignment = require('./eventAssignment');

// Associations
Organogram.hasMany(EventAssignment, { foreignKey: 'field_user_id', as: 'assignments' });
EventAssignment.belongsTo(Organogram, { foreignKey: 'field_user_id', as: 'fieldUser' });

Event.hasMany(EventAssignment, { foreignKey: 'event_id', as: 'assignments' });
EventAssignment.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

module.exports = { sequelize, Admin, Organogram, Event, EventAssignment };
