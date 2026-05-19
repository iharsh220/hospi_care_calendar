const sequelize = require('../config/database');
const Admin = require('./Admin');
const Organogram = require('./organogram');
const Event = require('./Event');
const EventAssignment = require('./EventAssignment');

// Associations
Organogram.hasMany(EventAssignment, { foreignKey: 'field_user_id', as: 'assignments' });
EventAssignment.belongsTo(Organogram, { foreignKey: 'field_user_id', as: 'fieldUser' });

Event.hasMany(EventAssignment, { foreignKey: 'event_id', as: 'assignments' });
EventAssignment.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

module.exports = { sequelize, Admin, Organogram, Event, EventAssignment };
