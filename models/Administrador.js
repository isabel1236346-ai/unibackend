const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Administrador = sequelize.define('Administrador', {
    idadministrador: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
   idusuario: { 
         type: DataTypes.INTEGER,
         allowNull: false,
         unique: true,
         references:{
           model: 'usuario',
           key:'idusuario'
         }
       },
       nivelAcceso: {
         type: DataTypes.INTEGER,
         defaultValue: 1
       },
  }, {
    tableName: 'administrador',
    timestamps: false
  });

  Administrador.associate = (models) => {
    Administrador.belongsTo(models.User, {
      foreignKey: 'idusuario',
      as: 'usuario'
    });
    
  };

  return Administrador;
};