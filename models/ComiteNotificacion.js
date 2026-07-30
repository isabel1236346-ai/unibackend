const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) =>{
    const ComiteNotificacion = sequelize.define('ComiteNotificacion',{
   
  idNotificacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'idnotificacion',
      references: { model: 'Notificacion', key: 'idnotificacion' }
  },
  idComite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'idcomite',
    references: { model: 'comite', key: 'idcomite' }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'evento_comite',
  timestamps: false
});
return ComiteNotificacion;
}