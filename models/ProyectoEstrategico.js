const { DataTypes } = require('sequelize');
module.exports = (sequelize,DataTypes) => {
const ProyectoEstrategico = sequelize.define('ProyectoEstrategico', {
    idproyecto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'idproyecto'
    },
    codigo:{
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'codigo'
    },
    descripcion: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'descripcion'
    }
}, {
    tableName: 'proyectoestrategico',
    timestamps: false
});
ProyectoEstrategico.associate = function(models) {
    ProyectoEstrategico.belongsToMany(models.Evento, {
        through: models.ProyectoEvento, 
        foreignKey: 'idproyecto',
        otherKey: 'idevento',
        as: 'eventos'
    });
}
return ProyectoEstrategico;
};
