const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) => {
const Subcategoria = sequelize.define('Subcategoria', {
  idsubcategoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'idsubcategoria'
  },
  nombreSubcategoria: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  idclasificacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'idclasificacion'
  }
  
}, {
  tableName: 'subcategoria',
  timestamps: false 
});
Subcategoria.associate = function(models) {
  Subcategoria.hasMany(models.Evento,
     { foreignKey: 'idsubcategoria',
      targetKey: 'idsubcategoria',
      });
      
      Subcategoria.belongsTo(models.ClasificacionEstrategica, {
        foreignKey: 'idclasificacion',
        targetKey: 'idclasificacion',
        as: 'clasificacion'
      });
    };

return Subcategoria;
};