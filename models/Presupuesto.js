module.exports = (sequelize, DataTypes) => {
  const Presupuesto = sequelize.define('Presupuesto', {
    idpresupuesto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'evento', key: 'idevento' },
    },
    total_egresos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_ingresos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'presupuesto',
    timestamps: false,
  });

  Presupuesto.associate = function(models) {
    Presupuesto.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
    Presupuesto.hasMany(models.Egreso, { foreignKey: 'idpresupuesto', as: 'egresos' });
    Presupuesto.hasMany(models.Ingreso, { foreignKey: 'idpresupuesto', as: 'ingresos' });
  };

  return Presupuesto;
};