const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) => {
  const Admisiones=sequelize.define('Admisiones',{
       idadmisiones: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { 
      type:DataTypes.INTEGER ,
      allowNull: false,
      unique: true 
    },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 4
    },
  }, {
    tableName: 'admisiones',
    timestamps: false 
  });
  Admisiones.associate = (models) => {
    Admisiones.belongsTo(models.User,{foreignKey:'idusuario'});
  }
  return Admisiones;
}

