const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
const Actividad=sequelize.define('Actividad',{
    idactividad:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
    },
    idevento:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{
            model:'evento',
            key:'idevento',
        },
      
    },
    nombre:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'nombre',

    },
     responsable: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    tipo: {
      type: DataTypes.ENUM('Previa', 'Durante', 'Posterior'),
      allowNull: false,
      defaultValue: 'Durante',
      validate: {
        isIn: [['Previa', 'Durante', 'Posterior']]
      }
    }
},{
    tableName:'actividades',
    timestamps:false,
});
Actividad.associate = (models) => {
    Actividad.belongsTo(models.Evento,{
        foreignKey:'idevento',
        as:'evento',
    });
}
 return Actividad;
};