module.exports = (sequelize,DataTypes) => {
  const EventoRecurso = sequelize.define("EventoRecurso",{
      idevento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      idrecurso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      tableName: "evento_recurso", // Nombre de la tabla "hija"
      timestamps: false,
    }
  );
   EventoRecurso.associate = function(models) {
    EventoRecurso.belongsTo(models.Evento, {
      foreignKey: 'idevento',
      as: 'evento'
    });
    
    EventoRecurso.belongsTo(models.Recurso, {
      foreignKey: 'idrecurso', 
      as: 'recurso'
    });
  };


  return EventoRecurso;
}