const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) => {

    const EventoComite = sequelize.define('EventoComite',{
   idcomite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'evento', key: 'idevento' }
    },
    idusuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'user', key: 'idusuario' }
    },
    rol_comite: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'miembro'
    },
    fecha_asignacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'activo',
      validate: { isIn: [['activo', 'invitado', 'rechazado']] }
    },
    texto_personalizado: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'evento_comite',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      { unique: true, fields: ['idevento', 'idusuario'] }
    ]
  });

  EventoComite.associate = function(models) {
    EventoComite.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
    EventoComite.belongsTo(models.User, { foreignKey: 'idusuario', as: 'usuario' });
    //EventoComite.hasMany(models.ChatMensaje, { foreignKey: 'idcomite', as: 'mensajes' });
    // EventoComite.belongsToMany(models.Notificacion, { foreignKey: 'idnotificacion', through: 'ComiteNotificaciones', as: 'notificacion' }); 
  };

  return EventoComite;
};