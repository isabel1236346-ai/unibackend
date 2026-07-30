module.exports = (sequelize, DataTypes) => {
  const UserFacultad = sequelize.define('UserFacultad', {
    idusuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
      field:'idusuario'
    },
     idfacultad: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
      allowNull: false
    },
}, {
    tableName: 'usuario_facultad', // nombre real en la BD
    timestamps: false
  });

  return UserFacultad;
};