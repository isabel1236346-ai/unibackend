module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    idmensaje: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plataforma: {
      type: DataTypes.STRING,
      allowNull: false
    },
    external_id: {
      type: DataTypes.STRING,
      comment: 'ID del usuario en la plataforma (email en app, chat_id en telegram, phone en WA)'
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false
    },
    direction: {
      type: DataTypes.STRING,
      comment: 'inbound: usuario -> bot, outbound: bot -> usuario'
    }
  }, {
    tableName: 'mensajes',
  timestamps: false,    
  underscored: false,   
  freezeTableName: true
    
  });
  Message.associate = function(models) {
    Message.belongsTo(models.Evento, {
      foreignKey: 'idevento',
      otherKey: 'idevento',
      as: 'eventos'
    });
   /* Message.belongsTo(models.Comite, { 
      foreignKey: 'idcomite', 
      as: 'comite' 
    });*/
  };
  return Message;
};