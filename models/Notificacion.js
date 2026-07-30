
module.exports = (sequelize,DataTypes) => {
    const Notificacion = sequelize.define('Notificacion', {
  idnotificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
 idusuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuario',
        key: 'idusuario'
      }
    },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo:{
    type: DataTypes.STRING(50),
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'nueva'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  id_relacionado: {
  type: DataTypes.INTEGER,
  allowNull: true,
  comment: 'ID del recurso relacionado (evento, mensaje, etc.)'
},
tipo: {
  type: DataTypes.STRING(50),
  allowNull: true,
  validate: { 
    isIn: [
      ['nuevo_evento', 'evento_aprobado', 'evento_rechazado', 
       'recordatorio', 'comite_invitacion', 'mensaje_nuevo']
    ]
  }
},
leido_at: {
  type: DataTypes.DATE,
  allowNull: true
},
  created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
}, {
  tableName: 'notificacion',
  timestamps: false,
});
Notificacion.associate = function(models) {
    Notificacion.belongsTo(models.User, {
      foreignKey: 'idusuario',
      as: 'usuario'
    });
  };

return Notificacion;
};