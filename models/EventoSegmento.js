module.exports = (sequelize,DataTypes) => {
const EventoSegmento = sequelize.define('EventoSegmento', {
  idevento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: 'idevento',
      references: { model: 'Evento', key: 'idevento' }
  },
  idsegmento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    field: 'idsegmento', 
      references: { model: 'Segmento', key: 'idsegmento' }
  },
  texto_personalizado: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'evento_segmento', 
  timestamps: false ,
});

return  EventoSegmento;
};