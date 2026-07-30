
module.exports = (sequelize, DataTypes) => {
  const TipoObjetivo = sequelize.define('TipoObjetivo', {
    idtipoobjetivo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
  
    nombre_objetivo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'tipos_objetivo',
    timestamps: false,
  });
  TipoObjetivo.associate = (models) => {
    TipoObjetivo.hasMany(models.Objetivo, { foreignKey: 'idtipoobjetivo', as: 'Objetivos' });
  };
return TipoObjetivo;
};