module.exports = (sequelize,DataTypes)=>{
    const externo=sequelize.define('Externo',{
       idExterno: { // Clave primaria para esta tabla específica
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
      defaultValue: 2
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'externo',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return externo;
};

