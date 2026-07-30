const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ProyectoEvento = sequelize.define('ProyectoEvento', {
    idevento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'idevento',
      references: { model: 'Evento', key: 'idevento' }
    },
    idproyecto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'idproyecto',
        references: { model: 'ProyectoEstrategico', key: 'idproyecto' }
    }
}, {
  tableName: 'proyecto_evento',
  timestamps: false
});
return ProyectoEvento;
};