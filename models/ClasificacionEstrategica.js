// models/Participante.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) => {
const Clasificacion = sequelize.define('ClasificacionEstrategica', {
  idclasificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'idclasificacion'
  },
  nombreClasificacion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
 
}, {
  tableName: 'clasificacion_estrategica',
  timestamps: false 
});
  Clasificacion.associate = function(models) {
    Clasificacion.hasMany(models.Subcategoria, {
      foreignKey: 'idclasificacion',
      as: 'subcategorias'
    });

  }
return Clasificacion;
};