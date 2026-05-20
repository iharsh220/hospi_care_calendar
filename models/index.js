const sequelize = require('../config/database');
const Organogram = require('./Organogram');
const Event = require('./Event');
const EventAssignment = require('./EventAssignment');

// Associations
Event.hasMany(EventAssignment, { foreignKey: 'event_id', as: 'assignments' });
EventAssignment.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
Organogram.hasMany(EventAssignment, { foreignKey: 'organogram_id', as: 'assignments' });
EventAssignment.belongsTo(Organogram, { foreignKey: 'organogram_id', as: 'user' });

module.exports = { sequelize, Organogram, Event, EventAssignment };
