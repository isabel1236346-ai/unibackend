
module.exports = (sequelize,DataTypes) => {
const Servicio=sequelize.define('Servicio',{
    idservicio:{
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
    nombreservicio:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'nombreservicio',

    },
    fechadeentrega:
        DataTypes.DATE,


    
    caracteristicas:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'caracteristicas',
    },
    observaciones:{
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'observaciones',
    },
    habilitado:{
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '1',
        field: 'habilitado',
    }
    
},{
    tableName:'servicio',
    timestamps:false,
});
Servicio.associate = function(models){
    Servicio.belongsTo(models.Evento,{
        foreignKey:'idevento',
        as:'evento',
    });
}
 return Servicio;
};