module.exports = (sequelize,DataTypes) => {
  const Segmento = sequelize.define(
    'Segmento',
    {
      idsegmento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre_segmento: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "nombre_segmento",
      },
     
    },
    {
      tableName: "segmento", // Nombre de la tabla "hija"
      timestamps: false,
    }
  );

  return Segmento;
}