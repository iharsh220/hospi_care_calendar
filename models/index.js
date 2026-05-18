const sequelize = require('../config/database');
const DataTypes = require('sequelize').DataTypes;

const Organogram = require('./organogram')(sequelize, DataTypes);

const models = {
  Organogram
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