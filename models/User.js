const  bcrypt = require('bcryptjs');

module.exports = (sequelize,DataTypes) => { 
  const User = sequelize.define('User', {
    idusuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
      field:'idusuario'
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'username',
    },
    contrasenia: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'contrasenia',
    },
    habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'habilitado',
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'nombre',
    },
    apellidopat: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'apellidopat',
    },
    apellidomat: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'apellidomat',
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      field: 'email',
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'student',
      validate: {
        isIn: [[
          'student',
          'daf',
          'admin',
          'comunicacion',
          'academico',
          'TI',
          'recursos',
          'Admisiones',
          'serv. Estudiatil'
        ]],
      },
      field: 'role',
    },
    telegramChatId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      field: 'telegram_chat_id'
    },
    created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW 
  },
    updated_at: { 
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }, 
    facultad_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'facultad',
        key: 'facultad_id'
      },
      field: 'facultad_id'
    },
    telegram_chat_id: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  telegram_username: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  theme:{
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'light',
    Comment: 'preferencia de tema del usuario: light, dark o system'
  },
  color_acento: {
  type: DataTypes.STRING(7),
  defaultValue: '#E95A0C',
  allowNull: true,
},
  },
  {
    tableName: 'usuario',
    timestamps: false,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.contrasenia && (user.isNewRecord || user.changed('contrasenia'))) {
          const salt = await bcrypt.genSalt(10);
          user.contrasenia = await bcrypt.hash(user.contrasenia, salt);
        } else {
          // Considera lanzar un error o manejar el caso si la contraseña no está presente
          // y no debería serlo.
        }
        if (!user.role) {
          user.role = 'student';
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('contrasenia')) {
          console.log('Hook beforeUpdate - Contraseña CAMBIÓ, hasheando de nuevo. ANTES:', user.previous('contrasenia'), 'NUEVA (antes de hash):', user.contrasenia);
          const salt = await bcrypt.genSalt(10);
          user.contrasenia = await bcrypt.hash(user.contrasenia, salt);
          console.log('Hook beforeUpdate - Contraseña DESPUÉS del hash:', user.contrasenia);
        }
      },
    },
  });

  User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.contrasenia);
  };
      User.associate = function(models){
        User.hasOne(models.Administrador,{foreignKey:'idusuario', as: 'administrador'});
        User.hasOne(models.Admisiones,{foreignKey:'idusuario', as: 'admisiones'});
        //User.hasOne(models.Alumno,{foreignKey:'idusuario', as: 'alumno'});
        User.hasOne(models.Comunicacion,{foreignKey:'idusuario', as: 'comunicacion'});
        
        
        

       User.hasOne(models.Daf,{foreignKey:'idusuario', as: 'daf'});
       User.hasOne(models.Academico,{foreignKey:'idusuario', as: 'academico'});
      //  User.hasOne(models.Estudiantes,{foreignKey:'idusuario', as: 'estudiantes '});
       User.hasOne(models.Externo,{foreignKey:'idusuario', as: 'externo'});
       User.hasOne(models.Ti,{foreignKey:'idusuario', as: 'ti'});
    
       User.hasOne(models.Recursos,{foreignKey:'idusuario', as: 'recursos'});
       User.hasMany(models.Evento, { as: 'eventosCreados', foreignKey: 'idacademico' });
  User.belongsToMany(models.Evento, {
  through: models.Comite,
  foreignKey: 'idusuario',
  otherKey: 'idevento',
  as: 'eventosEnComite'
});
  User.belongsTo(models.Facultad,{foreignKey:'facultad_id', as: 'facultad'})
      if (models.Notificacion && typeof models.Notificacion.hasMany === 'function') {
    User.hasMany(models.Notificacion, {
      foreignKey: 'idusuario',
      as: 'notificaciones'
    });
  }
  User.hasMany(models.Message, {
    foreignKey: 'idusuario',
    as: 'mensajes'
  });

}
       return User;
};
