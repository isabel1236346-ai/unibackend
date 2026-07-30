const asyncHandler = require('express-async-handler');
const { getModels } = require('../models/index.js');

const createRecurso = asyncHandler(async (req, res) => {
  console.log('📦 Body recibido:', req.body);
  const models = getModels();
  const { Recurso } = models;

  // ✅ Destructurar incluyendo 'cantidad'
  const { nombre_recurso, recurso_tipo, descripcion, habilitado, cantidad } = req.body;

  if (!nombre_recurso || !recurso_tipo) {
    res.status(400);
    throw new Error('Los campos "nombre_recurso" y "recurso_tipo" son obligatorios.');
  }

  // ✅ Validar cantidad si se envía
  if (cantidad !== undefined && (isNaN(cantidad) || cantidad < 0)) {
    res.status(400);
    throw new Error('La cantidad debe ser un número válido mayor o igual a 0.');
  }

  const nuevoRecurso = await Recurso.create({
    nombre_recurso,
    recurso_tipo,
    descripcion: descripcion || null,
    habilitado: habilitado !== undefined ? (habilitado === true || habilitado === 1 ? 1 : 0) : 1,
    cantidad: cantidad !== undefined ? parseInt(cantidad) : 1, // ✅ Valor por defecto
  });

  res.status(201).json({
    message: 'Recurso creado exitosamente',
    recurso: {
      idrecurso: nuevoRecurso.idrecurso,
      nombre_recurso: nuevoRecurso.nombre_recurso,
      recurso_tipo: nuevoRecurso.recurso_tipo,
      descripcion: nuevoRecurso.descripcion,
      habilitado: nuevoRecurso.habilitado,
      cantidad: nuevoRecurso.cantidad, // ✅ Incluir en respuesta
    },
  });
});

const getRecursos = asyncHandler(async (req, res) => {
  console.log('🔵 GET /recursos - Petición recibida');
  console.log('🔵 Headers:', req.headers.authorization);
  console.log('🔵 Query:', req.query);
  
  const models = getModels();
  const { Recurso } = models;
  
  try {
    const recursos = await Recurso.findAll({
      attributes: ['idrecurso', 'nombre_recurso', 'recurso_tipo', 'descripcion', 'habilitado', 'cantidad'],
      order: [['nombre_recurso', 'ASC']],
    });

    console.log('✅ Recursos encontrados:', recursos.length);
    
    const formatted = recursos.map(r => ({
      idrecurso: r.idrecurso,
      nombre_recurso: r.nombre_recurso,
      recurso_tipo: r.recurso_tipo,
      descripcion: r.descripcion,
      habilitado: r.habilitado,
      cantidad: r.cantidad || 0,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('❌ Error en getRecursos:', error);
    throw error;
  }
});

// ─── ACTUALIZAR RECURSO ──────────────────────────────────────────────────────
const updateRecurso = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Recurso } = models;
  const { id } = req.params;

  const recurso = await Recurso.findByPk(id);
  if (!recurso) {
    res.status(404);
    throw new Error('Recurso no encontrado.');
  }

  const { nombre_recurso, recurso_tipo, descripcion, habilitado, cantidad } = req.body;

  await recurso.update({
    nombre_recurso: nombre_recurso ?? recurso.nombre_recurso,
    recurso_tipo: recurso_tipo ?? recurso.recurso_tipo,
    descripcion: descripcion !== undefined ? descripcion : recurso.descripcion,
    habilitado: habilitado !== undefined ? (habilitado === true || habilitado === 1 ? 1 : 0) : recurso.habilitado,
    cantidad: cantidad !== undefined ? parseInt(cantidad) : recurso.cantidad, // ✅ Actualizar cantidad
  });

  res.json({
    message: 'Recurso actualizado exitosamente',
    recurso: {
      idrecurso: recurso.idrecurso,
      nombre_recurso: recurso.nombre_recurso,
      recurso_tipo: recurso.recurso_tipo,
      descripcion: recurso.descripcion,
      habilitado: recurso.habilitado,
      cantidad: recurso.cantidad, // ✅ Incluir en respuesta
    },
  });
});

// ─── DESHABILITAR RECURSO (Soft Delete) ─────────────────────────────────────
const deleteRecurso = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Recurso } = models;
  const { id } = req.params;

  const recurso = await Recurso.findByPk(id);
  if (!recurso) {
    res.status(404);
    throw new Error('Recurso no encontrado.');
  }

  await recurso.update({ habilitado: 0 });
  res.json({ message: 'Recurso deshabilitado exitosamente' });
});

module.exports = {
  createRecurso,
  getRecursos,
  updateRecurso,
  deleteRecurso,
};