module.exports = (sequelize, DataTypes) => {
  const ComiteMensaje = sequelize.define('comite_mensaje', {
    idmensaje: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    idcomite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'evento_comite', key: 'idcomite' }
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    idusuario_emisor: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(30),
      defaultValue: 'texto'
    },
    archivo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comite_mensajes',
    timestamps: false,
    freezeTableName: true
  });

  ComiteMensaje.associate = (models) => {
    if (models.EventoComite) {
      ComiteMensaje.belongsTo(models.EventoComite, { foreignKey: 'idcomite', as: 'comite' });
    }
    if (models.Evento) {
      ComiteMensaje.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
    }
    if (models.User) {
      ComiteMensaje.belongsTo(models.User, { foreignKey: 'idusuario_emisor', as: 'emisor' });
    }
    // Relación con lecturas
    if (models.ComiteMensajeLectura) {
      ComiteMensaje.hasMany(models.ComiteMensajeLectura, { foreignKey: 'idmensaje', as: 'lecturas' });
    }
  };

  return ComiteMensaje;
};