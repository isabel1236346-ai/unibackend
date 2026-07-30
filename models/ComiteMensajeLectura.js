module.exports = (sequelize, DataTypes) => {
  const ComiteMensajeLectura = sequelize.define('comite_mensaje_lectura', {
    idmensaje: {
      type: DataTypes.INTEGER,
      primaryKey: true,  // ✅ PK compuesta parte 1
      allowNull: false,
      references: { 
        model: 'comite_mensajes', 
        key: 'idmensaje' 
      }
    },
    idusuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,  // ✅ PK compuesta parte 2
      allowNull: false,
      references: { 
        model: 'usuario', 
        key: 'idusuario' 
      }
    },
    leido_at: {  // ✅ Coincide con tu BD (Imagen 3)
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true
    }
  }, {
    tableName: 'comite_mensaje_lectura',  // ✅ Tabla correcta
    timestamps: false,
    freezeTableName: true
  });

  ComiteMensajeLectura.associate = (models) => {
    // ✅ Asociación correcta con el mensaje
    if (models.ComiteMensaje) {
      ComiteMensajeLectura.belongsTo(models.ComiteMensaje, { 
        foreignKey: 'idmensaje',
        as: 'mensaje'
      });
    }
    
    // ✅ Asociación con el usuario que leyó
    if (models.User) {
      ComiteMensajeLectura.belongsTo(models.User, { 
        foreignKey: 'idusuario',
        as: 'usuarioLector'
      });
    }
  };

  return ComiteMensajeLectura;
};