module.exports = (sequelize, DataTypes) => {
  const Egreso = sequelize.define('Egreso', {
    idegreso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idpresupuesto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'presupuesto', key: 'idpresupuesto' },
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    descripcion_real: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    cantidad_real: {
      type: DataTypes.INTEGER,
      allowNull: true,
  },
    precio_unitario_real: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    total_real: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    tableName: 'egreso',
    timestamps: false,
  });

  Egreso.associate = function(models) {
    Egreso.belongsTo(models.Presupuesto, { foreignKey: 'idpresupuesto', as: 'presupuesto' });
  };

  return Egreso;
};