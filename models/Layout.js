
module.exports = function(sequelize,DataTypes) {
  const Layout = sequelize.define('Layout', {
    idlayout: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    url_imagen: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    created_at: {
      type: DataTypes.DATE,
      field: 'created_at',
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      field: 'updated_at',
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'layouts',
    timestamps: false
  });
  Layout.associate = function(models) {
  Layout.hasMany(models.Evento, {
  foreignKey: 'idlayout',
  as: 'Eventos'
});
  };
  return Layout;
};