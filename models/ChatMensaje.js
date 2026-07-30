const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ChatMensaje = sequelize.define('ChatMensaje', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'evento',
        key: 'idevento'
      }
    },
    idusuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuario',
        key: 'idusuario'
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'username',
      references: {
        model: 'usuario',
        key: 'username'
      }
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'role',
      references: {
        model: 'usuario',
        key: 'role'
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    room_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'room_id'
    }
  }, {
    tableName: 'chatmensaje',  
    timestamps: true,
    underscored: true,
  });
  return ChatMensaje;
};