module.exports = (sequelize,DataTypes) => {
  const Recurso = sequelize.define('Recurso', {
    idrecurso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
   
   nombre_recurso: {
      type: DataTypes.STRING,
        allowNull: false,
    }, 
    recurso_tipo: {     
      type: DataTypes.STRING,
      allowNull: false,
       validate: {
        isIn: [['tecnologico', 'mobiliario', 'vajilla']]
      }
    },
      descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cantidad: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        min: 0,
        isInt: true
      }
    },
    habilitado: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      
    }
},
    {
    tableName: 'recurso', // Nombre de la tabla "hija"
    timestamps: false,
  });
 /*Evento.associate = function(models) {
Recurso.belongsToMany(models.Evento, {
  through: 'evento_recurso',
  foreignKey: 'idrecurso',
  otherKey: 'idevento',
  timestamps: false 
});
  };*/
return Recurso;
};