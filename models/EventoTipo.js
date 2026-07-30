module.exports = (sequelize,DataTypes) => {
const EventoTipo=sequelize.define('EventoTipo',{
   idevento:{
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'idevento',
        primaryKey: true,
    },
    idtipoevento:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references:{
            model:'tipo_evento',
            key:'idtipoevento',
        }
    },
    texto_personalizado:{
        type: DataTypes.STRING,
        allowNull: true,
        field: 'texto_personalizado',

    },
},{
    tableName:'evento_tipos',
    timestamps:false,
    primaryKey:['idevento','idtipoevento'],

}
);


  return EventoTipo; 
};