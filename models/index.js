const { Sequelize,DataTypes } = require('sequelize');
require('dotenv').config();
const fs = require('fs');
const path = require('path');


let _sequelize;
let _models = null;
const getSequelize = () => {
  if (!_sequelize) {
    throw new Error('Sequelize not initialized. Call initModels() first.');
  }
  return _sequelize;
};

const initModels = async () => {
  if (_models) return _models;

  let sequelize;
  let connectionString = null;

  // 1. Verificar si DATABASE_URL es válida (no sea "null", vacío o undefined)
  if (process.env.DATABASE_URL && 
      process.env.DATABASE_URL.trim() !== '' && 
      process.env.DATABASE_URL.toLowerCase() !== 'null' &&
      process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.log('✅ Usando DATABASE_URL directo');
    connectionString = process.env.DATABASE_URL;
  } 
  // 2. Fallback: Construir URL desde variables individuales (PGHOST, PGUSER, etc.)
  else if (process.env.PGHOST || process.env.DB_HOST) {
    console.log('✅ Construyendo URL desde variables individuales');
    const host = process.env.PGHOST || process.env.DB_HOST;
    const user = process.env.PGUSER || process.env.DB_USER;
    const pass = process.env.PGPASSWORD || process.env.DB_PASSWORD;
    const db   = process.env.PGDATABASE || process.env.DB_NAME;
    const port = process.env.PGPORT || process.env.DB_PORT || 5432;

    connectionString = `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
    console.log('🔍 Conectando a:', host, '/', db, 'como', user);
  } 
  // 3. Fallback local
  else {
    console.log('✅ Conexión local (desarrollo)');
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        dialectOptions: { ssl: false },
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        quoteIdentifiers: false,
        define: { timestamps: false, underscored: true }
      }
    );
  }

  // Crear instancia de Sequelize si tenemos connection string
  if (connectionString && !sequelize) {
    sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      dialectOptions: { 
        ssl: { 
          require: true, 
          rejectUnauthorized: false 
        } 
      },
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      quoteIdentifiers: false,
      define: { timestamps: false, underscored: true }
    });
  }

  _sequelize = sequelize;

  try {
    await _sequelize.authenticate();
    console.log('✅ PostgreSQL conectado correctamente');
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
  
  
  const models = {};

  const orderedModelFiles = [
    'Facultad.js',
    'User.js',
    'Administrador.js',
    'Admisiones.js',
    'Daf.js',
    'Externo.js',
    'Ti.js',
    'Comunicacion.js',
    'Alumno.js',
    'Estudiante.js',
    'Carrera.js',

    'ClasificacionEstrategica.js',
    'Subcategoria.js',
    
    'Fase.js',
    'ProyectoEvento.js',
    'ProyectoEstrategico.js',
    'Evento.js',
    'Objetivo.js',
    'Resultado.js',
    'Recurso.js',
    'EventoTipo.js',
    'Comite.js',
    'Notificacion.js',
    'EventoObjetivo.js',
    'EventoInscripcion.js',
    'ResultadoRecurso.js',
    'Proyecto.js',
    'ProyectoEstudiante.js',
    'ObjetivoPDI.js',
    'TipoObjetivo.js',
    'Segmento.js',
    'ObjetivoSegmento.js',
    'Argumentacion.js',
    'EventoComite.js',
    'Academico.js',
    'TiposDeEvento.js',
    'Layouts.js',
    'Actividad.js',
    'Servicio.js',
    'Croquis.js',
    'Presupuesto.js',
    'Ingreso.js',
    'Egreso.js',
    'Message.js',
    'ChatMensaje.js',
    'InformeEvento.js',

  ];

const loadModel = (filename) => {
  try {
    const modelPath = path.join(__dirname, filename);
    if (!fs.existsSync(modelPath)) return null;
    
    const modelDefiner = require(modelPath);
    const definer = modelDefiner.default || modelDefiner;
    
    if (typeof definer === 'function') {
      const model = definer(_sequelize, Sequelize.DataTypes);
      return (model && model.name) ? model : null;
    }
  } catch (err) {
    console.error(`❌ Error cargando el modelo ${filename}:`, err.message);
  }
  return null;
};

  for (const file of orderedModelFiles) {
    const model = loadModel(file);
    if (model) {
      models[model.name] = model;
      console.log(`✅ Modelo cargado: ${model.name}`);
    }
  }

  const allFiles = fs.readdirSync(__dirname);
  for (const file of allFiles) {
    if (file === 'index.js' || !file.endsWith('.js') || orderedModelFiles.includes(file)) {
      continue;
    }
    const model = loadModel(file);
    if (model && !models[model.name]) {
      models[model.name] = model;
      console.log(`✅ Modelo cargado (adicional): ${model.name}`);
    }
  }

  console.log('\n🔗 Ejecutando asociaciones de modelos...');
  Object.values(models).forEach(model => {
    if (model && typeof model.associate === 'function') {
      model.associate(models);
    }
  });
  console.log('✅ Asociaciones completadas\n');

  
  models.sequelize = _sequelize;
  _models = models;
  return { sequelize: _sequelize, models: _models };
};

const getModels = () => {
  if (!_models || Object.keys(_models).length === 0) {
    throw new Error('Models not initialized. Call initModels() first.');
  }
  return _models;
};

module.exports = {
  get sequelize() { return _sequelize; },
  initModels,
  getModels
};