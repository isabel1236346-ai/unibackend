
module.exports = (sequelize, DataTypes) => {
    const ti=sequelize.define('Ti',{
      idTi: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { // Clave foránea que referencia a la tabla 'usuarios'
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true // Un usuario solo puede ser un tipo de administrador
    },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 8
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'ti',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return ti;
};
