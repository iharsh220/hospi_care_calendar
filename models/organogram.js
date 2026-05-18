module.exports = (sequelize, DataTypes) => {
  const Organogram = sequelize.define('organogram', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    emp_code: {
      type: DataTypes.STRING(50),
      field: 'emp_code'
    },
    emp_name: {
      type: DataTypes.STRING(255),
      field: 'emp_name'
    },
    hq: {
      type: DataTypes.STRING(100),
      field: 'hq'
    },
    level: {
      type: DataTypes.STRING(50),
      field: 'level'
    },
    region: {
      type: DataTypes.STRING(100),
      field: 'region'
    },
    status: {
      type: DataTypes.STRING(50),
      field: 'status'
    },
    division: {
      type: DataTypes.STRING(100),
      field: 'division'
    },
    sap_code: {
      type: DataTypes.STRING(50),
      field: 'sap_code'
    },
    mobileno: {
      type: DataTypes.STRING(20),
      field: 'mobileno'
    },
    emailid: {
      type: DataTypes.STRING(255),
      field: 'emailid'
    },
    doj: {
      type: DataTypes.DATEONLY,
      field: 'doj'
    },
    am_sapcode: {
      type: DataTypes.STRING(50),
      field: 'am_sapcode'
    },
    rm_sapcode: {
      type: DataTypes.STRING(50),
      field: 'rm_sapcode'
    },
    zm_sapcode: {
      type: DataTypes.STRING(50),
      field: 'zm_sapcode'
    },
    created_at: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'organogram',
    schema: 'public',
    timestamps: false,
    underscored: true
  });

  Organogram.associate = (models) => {
    // Define associations if needed
  };

  return Organogram;
};