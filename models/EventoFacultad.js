const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) => {
    const EventoFacultad = sequelize.define('EventoFacultad',{
        idevento: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: { model: 'evento', key: 'idevento' }
        },
        idfacultad: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: { model: 'facultad', key: 'idfacultad' }
        }
    });
    return EventoFacultad;
};
