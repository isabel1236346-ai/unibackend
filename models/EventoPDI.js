module.exports = (sequelize,DataTypes) => {
  const EventoPDI = sequelize.define('evento_pdi', {
    idevento_pdi: {
      type: DataTypes.INTEGER,
      primaryKey: true, // ← Agregar esta línea
      autoIncrement: true,
      allowNull: false,
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false, // ← Agregar allowNull: false para consistencia
      references: {
        model: 'evento',
        key: 'idevento',
      },
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'descripcion',
    },
  }, {
    tableName: 'evento_pdi',
    timestamps: false,
  });
    EventoPDI.associate = function(models){
      EventoPDI.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
    }
  return EventoPDI;
};