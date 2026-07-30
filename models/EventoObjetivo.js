module.exports = (sequelize,DataTypes)=>{

const EventoObjetivo = sequelize.define('EventoObjetivo', {
  idevento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references:{
      model:'evento',
      key:'idevento'
    }
  },
  idtipoobjetivo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references:{
      model:'tipos_objetivo',
      key: 'idtipoobjetivo'
    }
  },
  idobjetivo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references:{
      model:'objetivo',
      key:'idobjetivo'
    }
  },
  texto_personalizado: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'evento_objetivos',
  timestamps: false,
  id: false
});

return EventoObjetivo;
}