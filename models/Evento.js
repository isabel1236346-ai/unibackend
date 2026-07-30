const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Evento = sequelize.define('Evento', {
    idevento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'idevento'
    },
    nombreevento: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'nombreevento'
    },
    lugarevento: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'lugarevento'
    },
    fechaevento: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fechaevento'
    },
    horaevento: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'horaevento'
    },
    estado: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'estado',
      validate: {
        isIn: [['pendiente', 'aprobado', 'rechazado', 'cancelado', 'vencido', 'completado']]
      }
    },
  
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'descripcion'
    },
    fecha_aprobacion: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_aprobacion'
    },
    admin_aprobador: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'admin_aprobador'
    },
    comentarios_admin: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentarios_admin'
    },
    fecha_rechazo: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_rechazo'
    },
    razon_rechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'razon_rechazo'
    },
    idadministrador: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idadministrador'
    },
    idacademico: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idacademico'
    },
    idclasificacion: {
      type: DataTypes.INTEGER,
      allowNull: true,  // ← era false, causaba error si no se enviaba
      field: 'idclasificacion'
    },
    idsubcategoria: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idsubcategoria'
    },
    idresultado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idresultado'
    },
    idfase: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idfase'
    },
    idlayout: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idlayout'
    },
    evento_externo:{
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'evento_externo'
    }
  }, {
    tableName: 'evento',
    timestamps: false
  });

  Evento.associate = function(models) {
    Evento.belongsTo(models.ClasificacionEstrategica, {
      foreignKey: 'idclasificacion',
      targetKey: 'idclasificacion',
      as: 'clasificacion'
    });
    Evento.belongsTo(models.Subcategoria, {
      foreignKey: 'idsubcategoria',
      targetKey: 'idsubcategoria',
      as: 'subcategoria'
    });
    Evento.belongsTo(models.User, {
      foreignKey: 'idacademico',
      as: 'academicoCreador'
    });
    Evento.belongsToMany(models.User, {
      through: models.Comite,
      foreignKey: 'idevento',
      otherKey: 'idusuario',
      as: 'comite',
    });
    Evento.belongsToMany(models.Recurso, {
      through: 'evento_recurso',
      foreignKey: 'idevento',
      otherKey: 'idrecurso',
      as: 'Recursos',
      timestamps: false
    });
    Evento.hasOne(models.Resultado, {
      foreignKey: 'idevento',
      as: 'Resultados'
    });
    Evento.belongsToMany(models.Objetivo, {
      through: models.EventoObjetivo,
      foreignKey: 'idevento',
      otherKey: 'idobjetivo',
      as: 'Objetivos'
    });
    Evento.belongsToMany(models.Estudiante, {
      through: 'evento_inscripciones',
      foreignKey: 'idevento',
      otherKey: 'idestudiante',
      as: 'Estudiantes'
    });
    Evento.belongsToMany(models.TiposDeEvento, {
      through: models.EventoTipo,
      foreignKey: 'idevento',
      otherKey: 'idtipoevento',
      as: 'tiposDeEvento'
    });
    Evento.belongsTo(models.Fase, {
      foreignKey: 'idfase',
      as: 'fases'
    });
    Evento.belongsTo(models.Layout, {
      foreignKey: 'idlayout',
      as: 'Layout'
    });
    Evento.belongsTo(models.Academico, { 
    foreignKey: 'idacademico', 
    as: 'creador' // alias opcional
    });
  Evento.belongsToMany(models.ProyectoEstrategico, {
    through: models.ProyectoEvento,  
    foreignKey: 'idevento',
    otherKey: 'idproyecto',
    as: 'proyectosEstrategicos'
  });
  };

  return Evento;
};