module.exports = (sequelize,DataTypes) => {
  const Objetivo = sequelize.define('Objetivo', {
    idobjetivo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
   
    texto_personalizado: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'texto_personalizado',
    },
    idargumentacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idargumentacion',
      references: { model: 'argumentacion', key: 'idargumentacion' }
    },
    idtipoobjetivo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idtipoobjetivo',
      references: { model: 'tipos_objetivo', key: 'idtipoobjetivo' }

    },   
     
  }, {
    tableName: 'objetivos', // Nombre de la tabla "hija"
    timestamps: false,
  });
  /*field: 'idadministrador', // ✅ Agregado field
      references: { model: 'usuario', key: 'idusuario' }
*/
Objetivo.associate = function(models) {
  Objetivo.belongsToMany(models.Evento, { 
  through: {
    model:'evento_objetivos',
  },
  foreignKey: 'idobjetivo',
  otherKey:'idevento' ,
  as: 'Eventos'});

  
  
  Objetivo.belongsTo(models.TipoObjetivo, {
    foreignKey:'idtipoobjetivo',as:'TipoObjetivo'});
  Objetivo.belongsToMany(models.Segmento, {
    through: 'objetivo_segmento', foreignKey: 'idobjetivo',
    otherKey: 'idsegmento',
    as: 'Segmentos'});
  Objetivo.hasMany(models.Argumentacion, { foreignKey: 'idobjetivo', as: 'argumentaciones' });
  }
return Objetivo;
};