const {DataTypes} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const InformeEvento = sequelize.define('InformeEvento', {
    idinforme: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // un informe final por evento
    },

    // --- II. Segmento Objetivo Alcanzado (numérico, cargado por el responsable) ---
    segmento_alcanzado_estudiantes: { type: DataTypes.INTEGER, defaultValue: 0 },
    segmento_alcanzado_docentes: { type: DataTypes.INTEGER, defaultValue: 0 },
    segmento_alcanzado_publico_externo: { type: DataTypes.INTEGER, defaultValue: 0 },
    segmento_alcanzado_influencers: { type: DataTypes.INTEGER, defaultValue: 0 },
    segmento_alcanzado_otro_cual: { type: DataTypes.STRING, allowNull: true },
    segmento_alcanzado_otro_cantidad: { type: DataTypes.INTEGER, defaultValue: 0 },

    // --- Objetivos Alcanzados (booleanos, iguales categorías que Objetivos PDI esperados) ---
    objetivo_alcanzado_modelo_pedagogico: { type: DataTypes.BOOLEAN, defaultValue: false },
    objetivo_alcanzado_posicionamiento: { type: DataTypes.BOOLEAN, defaultValue: false },
    objetivo_alcanzado_internacionalizacion: { type: DataTypes.BOOLEAN, defaultValue: false },
    objetivo_alcanzado_rsu: { type: DataTypes.BOOLEAN, defaultValue: false },
    objetivo_alcanzado_fidelizacion: { type: DataTypes.BOOLEAN, defaultValue: false },
    objetivo_alcanzado_otro_cual: { type: DataTypes.STRING, allowNull: true },

    // --- Participación / Satisfacción reales ---
    participacion_real: { type: DataTypes.STRING, allowNull: true },
    indice_satisfaccion_real: { type: DataTypes.STRING, allowNull: true },
    otros_resultados_real: { type: DataTypes.TEXT, allowNull: true },

    // --- III. Balance Económico real (filas dinámicas, se guardan como JSON) ---
    // Cada item: { descripcion, cantidad, precio_unitario, total }
    egresos_reales: { type: DataTypes.JSONB, defaultValue: [] },
    ingresos_reales: { type: DataTypes.JSONB, defaultValue: [] },
    total_egresos_real: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total_ingresos_real: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    balance_real: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    // --- IV, V, VI ---
    info_prensa: { type: DataTypes.TEXT, allowNull: true },
    analisis_desviaciones: { type: DataTypes.TEXT, allowNull: true },
    lecciones_aprendidas: { type: DataTypes.TEXT, allowNull: true },

    // Quién llenó / firmó el informe
    idusuario_responsable: { type: DataTypes.INTEGER, allowNull: true },
    estado: {
      type: DataTypes.ENUM('borrador', 'finalizado'),
      defaultValue: 'borrador',
    },
  }, {
    tableName: 'informe_evento',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  InformeEvento.associate = (models) => {
    InformeEvento.belongsTo(models.Evento, { foreignKey: 'idevento' });
    // Si tienes modelo Usuario:
    // InformeEvento.belongsTo(models.Usuario, { foreignKey: 'idusuario_responsable', as: 'responsable' });
  };

  return InformeEvento;
};