const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Academico = sequelize.define('Academico', {
    idacademico: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'usuario',
        key: 'idusuario'
      }
    },
    facultad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'facultad_id',
      references: {
        model: 'facultad',
        key: 'facultad_id'
      }
    },
    idcarrera: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carrera',
        key: 'idcarrera'
      }
    }
  }, {
    tableName: 'academico',
    timestamps: false,
    underscored: true
  });

  Academico.associate = function(models) {
    Academico.belongsTo(models.User, { foreignKey: 'idusuario', as: 'usuario' });
    Academico.belongsTo(models.Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
    Academico.belongsTo(models.Carrera, { foreignKey: 'idcarrera', as: 'carrera' });
   /* Academico.belongsTo(models.User, { foreignKey: 'idacademico', as: 'academicoCreador' });  
    Academico.belongsTo(models.Comite,{foreignKey: 'idacademico', through: 'ComiteUsuarios'});*/
    Academico.hasMany(models.Evento, { 
    foreignKey: 'idacademico',
    as: 'eventos'
});
    }
  
  return Academico;
};