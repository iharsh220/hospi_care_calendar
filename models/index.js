const sequelize = require('../config/database');
const DataTypes = require('sequelize').DataTypes;

const Organogram = require('./organogram')(sequelize, DataTypes);
const Event = require('./event')(sequelize, DataTypes);

const models = {
  Organogram,
  Event
};

Object.keys(models).forEach(modelName => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
};