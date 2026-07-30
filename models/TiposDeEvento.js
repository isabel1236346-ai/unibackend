// models/TiposDeEvento.js
module.exports = (sequelize, DataTypes) => {
  const TiposDeEvento = sequelize.define('TiposDeEvento', {
    idtipoevento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idtipoevento'
    },
    nombretipo: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'nombretipo'
    }
  }, {
    tableName: 'tipos_de_evento',
    timestamps: false
  });

  return TiposDeEvento;
};