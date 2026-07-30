
const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes)=>{
    const Estudiante=sequelize.define('Estudiante',{
       idEstudiante: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idestudiante'
    },
    idusuario: { // Clave foránea que referencia a la tabla 'usuarios'
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true // Un usuario solo puede ser un tipo de administrador
    },
    nivelacceso: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'nivelacceso'
    },
    facultad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'facultad', // Nombre de la tabla en la BD
        key: 'facultad_id'
      }
    },
    idcarrera: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'carrera',
        key: 'idcarrera'
      }
    }
  }, {
    tableName: 'estudiante',
    timestamps: false 
  });
Estudiante.associate = function(models) {
     Estudiante.belongsTo(models.User, {
        foreignKey: 'idusuario',
        as: 'usuario'
      });
      
      Estudiante.belongsTo(models.Carrera, {
        foreignKey: 'idcarrera',
        targetKey: 'idcarrera',  // ← PK en tabla carrera
        as: 'carrera'
      });
      
      Estudiante.belongsTo(models.Facultad, {
        foreignKey: 'facultad_id',  // ← Nombre REAL de la columna en estudiante
        targetKey: 'facultad_id',   // ← PK en tabla facultad
        as: 'facultad'
      });
      Estudiante.belongsToMany(models.Evento, {
        through: 'evento_inscripciones',
        foreignKey: 'idestudiante',
        otherKey: 'idevento',
        as: 'eventosInscritos'
});


}
  return Estudiante;
};

