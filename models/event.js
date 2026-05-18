module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('event', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    event_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'event_name'
    },
    description: {
      type: DataTypes.TEXT,
      field: 'description'
    },
    event_type: {
      type: DataTypes.ENUM('monthly', 'di_monthly', 'quarterly', 'half_yearly', 'yearly'),
      allowNull: false,
      field: 'event_type'
    },
    event_date: {
      type: DataTypes.DATE,
      field: 'event_date'
    },
    assign_to: {
      type: DataTypes.STRING(500),
      field: 'assign_to'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'events',
    timestamps: true,
    underscored: true
  });

  Event.associate = (models) => {
    // Define associations if needed
  };

  return Event;
};