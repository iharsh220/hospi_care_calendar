module.exports = (sequelize, DataTypes) => {
  const Organogram = sequelize.define('organogram', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    emp_code: {
      type: DataTypes.INTEGER,
      field: 'emp_code'
    },
    emp_name: {
      type: DataTypes.STRING(32),
      field: 'emp_name'
    },
    hq: {
      type: DataTypes.STRING(15),
      field: 'hq'
    },
    level: {
      type: DataTypes.STRING(24),
      field: 'level'
    },
    region: {
      type: DataTypes.STRING(21),
      field: 'region'
    },
    status: {
      type: DataTypes.STRING(13),
      field: 'status'
    },
    division: {
      type: DataTypes.STRING(23),
      field: 'division'
    },
    sap_code: {
      type: DataTypes.INTEGER,
      field: 'sap_code'
    },
    mobileno: {
      type: DataTypes.STRING(10),
      field: 'mobileno'
    },
    emailid: {
      type: DataTypes.STRING(35),
      field: 'emailid'
    },
    doj: {
      type: DataTypes.STRING(9),
      field: 'doj'
    },
    am_sapcode: {
      type: DataTypes.INTEGER,
      field: 'am_sapcode'
    },
    rm_sapcode: {
      type: DataTypes.INTEGER,
      field: 'rm_sapcode'
    },
    zm_sapcode: {
      type: DataTypes.INTEGER,
      field: 'zm_sapcode'
    },
    is_admin: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'is_admin'
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
    timestamps: false,
    underscored: true
  });

  Organogram.associate = (models) => {
    // Define associations if needed
  };

  return Organogram;
};