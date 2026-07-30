
module.exports = (sequelize, DataTypes) => {
  const Fase = sequelize.define('Fase', {
    idfase: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true, // 👈 probablemente lo necesitas
      allowNull: false
    },
    nrofase: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'evento', 
        key: 'idevento'
      },
     
    }
  }, {
  
    tableName: 'fase',
    timestamps: true
  });

  Fase.associate = (models) => {
    Fase.hasMany(models.Evento, { foreignKey: 'idfase', as: 'eventos' });
  };

  return Fase;
};