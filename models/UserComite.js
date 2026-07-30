module.exports = (sequelize, DataTypes) => {
  const UserComite = sequelize.define('UserComite', {
    idcomite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: false,
      field:'idcomite',
      references: { model: 'comite', key: 'idcomite' }
    },
     idusuario: {
      type: DataTypes.INTEGER,
      autoIncrement: false,
      field:'idusuario',
      references: { model: 'usuario', key: 'idusuario' }
    },
    rol_comite: {
      type: DataTypes.STRING,
      allowNull: false,
      field:'rol_comite'
    }
}, {
    tableName: 'comite_usuarios', // nombre real en la BD
    timestamps: false,
    id: false,
  });

  return UserComite;
};
/*field: 'idadministrador', // ✅ Agregado field
      references: { model: 'usuario', key: 'idusuario' }*/