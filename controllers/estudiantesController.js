const asyncHandler = require('express-async-handler');
const { getModels } = require("../models/index.js");
const { Op,QueryTypes } = require('sequelize');

// ✅ GET ESTUDIANTE POR ID DE USUARIO
const getEstudiantes = asyncHandler(async (req, res) => {
  const requestedUserId = parseInt(req.params.idusuario, 10);
  if (isNaN(requestedUserId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  const { idusuario: currentUserId, role } = req.user;
  
  if (role !== 'admin' && currentUserId !== requestedUserId) {
    console.warn(`Acceso denegado: Usuario ${currentUserId} intentó acceder a estudiante ${requestedUserId}`);
    return res.status(403).json({ 
      message: 'Acceso denegado: No tienes permisos para ver este recurso' 
    });
  }

  try {
    const models = getModels();
    const { Estudiante } = models;

    const estudiante = await Estudiante.findOne({ 
      where: { idusuario: requestedUserId },
      raw: true
    });

    if (!estudiante) {
      return res.status(404).json({ 
        message: `No se encontró registro de estudiante para el usuario ID ${requestedUserId}` 
      });
    }

    res.json(estudiante);
  } catch (error) {
    console.error('Error al obtener estudiante:', error);
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({ message: 'Solicitud inválida a la base de datos' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const getAllEstudiantes = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acceso denegado: Solo administradores pueden ver todos los estudiantes' 
    });
  }

  try {
    const models = getModels();
    const { Estudiante } = models;

    const estudiantes = await Estudiante.findAll({
      raw: true,
      order: [['idestudiante', 'ASC']]
    });

    res.json({
      count: estudiantes.length,
      estudiantes
    });
  } catch (error) {
    console.error('Error al obtener todos los estudiantes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const getEstudianteById = asyncHandler(async (req, res) => {
  const estudianteId = parseInt(req.params.id, 10);
  if (isNaN(estudianteId)) {
    return res.status(400).json({ message: 'ID de estudiante inválido' });
  }

  try {
    const models = getModels();
    const { Estudiante } = models;

    const estudiante = await Estudiante.findByPk(estudianteId, { raw: true });

    if (!estudiante) {
      return res.status(404).json({ 
        message: `Estudiante con ID ${estudianteId} no encontrado` 
      });
    }

    if (req.user.role !== 'admin' && estudiante.idusuario !== req.user.idusuario) {
      return res.status(403).json({ 
        message: 'Acceso denegado: No tienes permisos para ver este recurso' 
      });
    }

    res.json(estudiante);
  } catch (error) {
    console.error('Error al obtener estudiante por ID:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const createEstudiante = asyncHandler(async (req, res) => {
  const { 
    idusuario, 
    codigo_estudiante, 
    nombre, 
    apellido_paterno, 
    apellido_materno, 
    correo_institucional,
    telefono,
    estado 
  } = req.body;

  if (!idusuario || !codigo_estudiante || !nombre || !apellido_paterno) {
    return res.status(400).json({ 
      message: 'Faltan campos requeridos: idusuario, codigo_estudiante, nombre, apellido_paterno' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acceso denegado: Solo administradores pueden crear estudiantes' 
    });
  }

  try {
    const models = getModels();
    const { Estudiante } = models;

    const existingByCodigo = await Estudiante.findOne({ 
      where: { codigo_estudiante } 
    });
    
    if (existingByCodigo) {
      return res.status(409).json({ 
        message: `Ya existe un estudiante con el código ${codigo_estudiante}` 
      });
    }

    const existingByUsuario = await Estudiante.findOne({ 
      where: { idusuario } 
    });
    
    if (existingByUsuario) {
      return res.status(409).json({ 
        message: `Ya existe un estudiante asociado al usuario ID ${idusuario}` 
      });
    }

    const nuevoEstudiante = await Estudiante.create({
      idusuario,
      codigo_estudiante,
      nombre,
      apellido_paterno,
      apellido_materno,
      correo_institucional,
      telefono,
      estado: estado || 'activo'
    });

    res.status(201).json({
      message: 'Estudiante creado exitosamente',
      estudiante: nuevoEstudiante
    });
  } catch (error) {
    console.error('Error al crear estudiante:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const updateEstudiante = asyncHandler(async (req, res) => {
  const estudianteId = parseInt(req.params.id, 10);
  if (isNaN(estudianteId)) {
    return res.status(400).json({ message: 'ID de estudiante inválido' });
  }

  const { 
    idusuario, 
    codigo_estudiante, 
    nombre, 
    apellido_paterno, 
    apellido_materno, 
    correo_institucional,
    telefono,
    estado 
  } = req.body;

  try {
    const models = getModels();
    const { Estudiante } = models;

    const estudiante = await Estudiante.findByPk(estudianteId);

    if (!estudiante) {
      return res.status(404).json({ 
        message: `Estudiante con ID ${estudianteId} no encontrado` 
      });
    }

    if (req.user.role !== 'admin' && estudiante.idusuario !== req.user.idusuario) {
      return res.status(403).json({ 
        message: 'Acceso denegado: No tienes permisos para actualizar este recurso' 
      });
    }

    if (req.user.role !== 'admin') {
      if (idusuario && idusuario !== estudiante.idusuario) {
        return res.status(403).json({ 
          message: 'No puedes cambiar el ID de usuario' 
        });
      }
      if (codigo_estudiante && codigo_estudiante !== estudiante.codigo_estudiante) {
        return res.status(403).json({ 
          message: 'No puedes cambiar el código de estudiante' 
        });
      }
    }

    await estudiante.update({
      ...(nombre && { nombre }),
      ...(apellido_paterno && { apellido_paterno }),
      ...(apellido_materno && { apellido_materno }),
      ...(correo_institucional && { correo_institucional }),
      ...(telefono && { telefono }),
      ...(estado && { estado }),
      ...(idusuario && req.user.role === 'admin' && { idusuario }),
      ...(codigo_estudiante && req.user.role === 'admin' && { codigo_estudiante })
    });

    res.json({
      message: 'Estudiante actualizado exitosamente',
      estudiante: await estudiante.reload({ raw: true })
    });
  } catch (error) {
    console.error('Error al actualizar estudiante:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const deleteEstudiante = asyncHandler(async (req, res) => {
  const estudianteId = parseInt(req.params.id, 10);
  if (isNaN(estudianteId)) {
    return res.status(400).json({ message: 'ID de estudiante inválido' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acceso denegado: Solo administradores pueden eliminar estudiantes' 
    });
  }

  try {
    const models = getModels();
    const { Estudiante } = models;

    const estudiante = await Estudiante.findByPk(estudianteId);

    if (!estudiante) {
      return res.status(404).json({ 
        message: `Estudiante con ID ${estudianteId} no encontrado` 
      });
    }

    await estudiante.destroy();

    res.json({
      message: 'Estudiante eliminado exitosamente',
      deletedId: estudianteId
    });
  } catch (error) {
    console.error('Error al eliminar estudiante:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const getEventosPorFacultadEstudiante = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Evento, User, Academico, Facultad, Estudiante } = models;
  
  try {
    const { facultad_id } = req.params;
    const facultadId = parseInt(facultad_id, 10);

    if (isNaN(facultadId)) {
      return res.status(400).json({ message: 'ID de facultad inválido' });
    }

    const eventos = await Evento.findAll({
      where: { estado: 'aprobado' },
      distinct: true,
      include: [{
        model: User,
        as: 'academicoCreador',
        attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
        required: true,
        include: [{
          model: Academico,
          as: 'academico',
          attributes: ['facultad_id'],
          where: { facultad_id: facultadId },
          required: true,
          include: [{
            model: Facultad,
            as: 'facultad',
            attributes: ['nombre_facultad']
          }]
        }]
      }],
      order: [['fechaevento', 'DESC']]
    });

    const eventosUnicos = Array.from(
      new Map(eventos.map(e => [e.idevento, e])).values()
    );

    const eventosFormateados = eventosUnicos.map(event => {
      const creador = event.academicoCreador;
      const facultadNombre = creador?.academico?.facultad?.nombre_facultad || 'Sin facultad';

      return {
        idevento: event.idevento,
        nombre: event.nombreevento || 'Sin título',
        descripcion: event.descripcion || 'Sin descripción',
        fecha_inicio: event.fechaevento,
        fecha_fin: event.fechaevento,
        ubicacion: event.lugarevento || 'Por definir',
        tipo_evento: 'Evento',
        categoria: 'General',
        estado: event.estado,
        created_at: event.created_at,
        organizador: creador 
          ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim()
          : 'Sin organizador',
        facultad: facultadNombre
      };
    });

    return res.status(200).json(eventosFormateados);

  } catch (error) {
    console.error('Error en getEventosPorFacultadEstudiante:', error);
    return res.status(500).json({ 
      message: 'Error al cargar eventos de la facultad',
      error: error.message 
    });
  }
});
const estudiantesInscritosEnEvento = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const sequelize = models.sequelize;
    const idUsuario = req.user.idusuario; 
    
    const usuario = await sequelize.query(
      `SELECT facultad_id FROM usuario WHERE idusuario = :idUsuario`,
      { replacements: { idUsuario }, type: QueryTypes.SELECT }
    );

    if (!usuario.length || !usuario[0].facultad_id) {
      return res.status(400).json({ error: 'El usuario no tiene facultad asignada' });
    }

    const facultadId = usuario[0].facultad_id;
    
    // ✅ CORREGIDO: 'evento_inscripciones' (plural) para coincidir con la tabla real
    const inscripciones = await sequelize.query(
      `SELECT e.idevento, e.nombreevento, e.fechaevento,
              est.idestudiante, u.nombre, u.apellidopat, u.apellidomat,
              ei.fecha_inscripcion
       FROM evento_inscripciones ei
       JOIN estudiante est ON est.idestudiante = ei.idestudiante
       JOIN usuario u ON u.idusuario = est.idusuario
       JOIN evento e ON e.idevento = ei.idevento
       WHERE est.facultad_id = :facultadId
       ORDER BY e.fechaevento DESC`,
      { replacements: { facultadId }, type: models.sequelize.QueryTypes.SELECT }
    );

    const eventosAgrupados = {};
    inscripciones.forEach(row => {
      if (!eventosAgrupados[row.idevento]) {
        eventosAgrupados[row.idevento] = {
          idevento: row.idevento,
          nombreevento: row.nombreevento,
          fechaevento: row.fechaevento,
          estudiantes: []
        };
      }
      eventosAgrupados[row.idevento].estudiantes.push({
        idestudiante: row.idestudiante,
        nombre: `${row.nombre} ${row.apellidopat} ${row.apellidomat}`.trim(),
        fecha_inscripcion: row.fecha_inscripcion
      });
    });

    res.json({ eventos: Object.values(eventosAgrupados) });
  } catch (error) {
    console.error('❌ Error al obtener estudiantes inscritos:', error);
    res.status(500).json({ error: 'Error al obtener estudiantes inscritos', details: error.message });
  }
});
module.exports = {
  getEstudiantes,
  getAllEstudiantes,
  getEstudianteById,
  createEstudiante,
  updateEstudiante,
  deleteEstudiante,
  getEventosPorFacultadEstudiante,
  estudiantesInscritosEnEvento
};