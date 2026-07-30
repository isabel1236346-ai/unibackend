module.exports = (sequelize, DataTypes) => {
  const Facultad = sequelize.define('Facultad', {
    facultad_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'facultad_id'
    },
    nombre_facultad: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'nombre_facultad'
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'facultad',
    timestamps: false,
  });

  Facultad.associate = function(models) {
    Facultad.hasMany(models.Academico, {
      foreignKey: 'facultad_id',
      as: 'academicos'
    });
    
  };

  return Facultad;
};