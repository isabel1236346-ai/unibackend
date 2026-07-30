const { getModels } = require('../models/index');
const asyncHandler = require('express-async-handler');
//const { sequelize } = require('../config/db');
const { sequelize } = require('../config/db.js');
// --- CONSTANTES ---
const OBJETIVO_TYPES = {
  modeloPedagogico: 1,
  posicionamiento: 2,
  internacionalizacion: 3,
  rsu: 4,
  fidelizacion: 5,
  otro: 6
};
const OTRO_TIPO_ID = 6;

const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    if (!jsonString || typeof jsonString !== 'string') return defaultValue;
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

const createEvento = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const models = getModels();
    const data = req.body;

    // 1. Crear el Evento principal
    const nuevoEvento = await models.Evento.create({
      nombreevento: data.nombreevento,
      lugarevento: data.lugarevento,
      fechaevento: data.fechaevento,
      horaevento: data.horaevento,
      responsable_evento: data.responsable_evento,
      descripcion: data.descripcion || null,
      participantes_esperados: data.participantes_esperados || 0,
      estado: 'Pendiente',
    }, { transaction: t });
    const nuevoEventoId = nuevoEvento.idevento;
    console.log(`✓ Evento principal creado con ID: ${nuevoEventoId}`);

    // 2. Asociar Tipos de Evento
    if (data.tipos_de_evento && Array.isArray(data.tipos_de_evento) && data.tipos_de_evento.length > 0) {
      for (const tipo of data.tipos_de_evento) {
        await sequelize.query(
          'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
          { replacements: [nuevoEventoId, tipo.id, tipo.texto_personalizado || null], transaction: t }
        );
      }
      console.log(`✓ ${data.tipos_de_evento.length} tipos de evento guardados`);
    }

    // 3. Inicializar variables
    let idsObjetivosVinculadosAlEvento = [];

    // 4. Procesar Objetivos
    if (Array.isArray(data.objetivos) && data.objetivos.length > 0) {
      const objetivosACrear = data.objetivos.map(obj => ({
        idtipoobjetivo: obj.id,
        texto_personalizado: obj.texto_personalizado || null
      }));
      const nuevosObjetivosCreados = await models.Objetivo.bulkCreate(objetivosACrear, { transaction: t, returning: true });

      const relacionesEventoObjetivo = nuevosObjetivosCreados.map((objetivo, index) => ({
        idevento: nuevoEventoId,
        idobjetivo: objetivo.idobjetivo,
        texto_personalizado_relacion: data.objetivos[index]?.texto_personalizado_relacion || null
      }));
      await models.EventoObjetivo.bulkCreate(relacionesEventoObjetivo, { transaction: t });

      idsObjetivosVinculadosAlEvento = nuevosObjetivosCreados.map(obj => obj.idobjetivo);
      console.log(`✓ ${idsObjetivosVinculadosAlEvento.length} objetivos asociados.`);
    }

    // 5. Procesar Objetivos PDI
    const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
    const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
    if (descripcionesPDI.length > 0) {
      const objetivoGeneralPDI = await models.Objetivo.create({
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
      }, { transaction: t });

      await models.EventoObjetivo.create({
        idevento: nuevoEventoId,
        idobjetivo: objetivoGeneralPDI.idobjetivo,
        texto_personalizado_relacion: 'Objetivo PDI General'
      }, { transaction: t });

      idsObjetivosVinculadosAlEvento.push(objetivoGeneralPDI.idobjetivo);

      const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
        idobjetivo: objetivoGeneralPDI.idobjetivo,
        descripcion: descripcion,
      }));
      await models.ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction: t });
      console.log(`✓ ${descripcionesPDI.length} objetivos PDI detallados creados.`);
    }

    // 6. Procesar Argumentaciones
    if (data.argumentacion && typeof data.argumentacion === 'string' && data.argumentacion.trim() !== '') {
      if (idsObjetivosVinculadosAlEvento.length > 0) {
        for (const obj of idsObjetivosVinculadosAlEvento) {
          await sequelize.query(
            'INSERT INTO argumentacion (idobjetivo, texto_argumentacion) VALUES (?, ?)',
            { replacements: [obj, data.argumentacion], transaction: t }
          ).catch(err => console.error('Error al insertar argumentación:', err));
        }
        console.log(`✓ 1 argumentación asociada.`);
      }
    }

    // 7. Asociar Segmentos Objetivo
    if (idsObjetivosVinculadosAlEvento.length > 0 && Array.isArray(data.segmentos_objetivo) && data.segmentos_objetivo.length > 0) {
      const relacionesSegmento = [];
      for (const objetivoId of idsObjetivosVinculadosAlEvento) {
        for (const segmento of data.segmentos_objetivo) {
          relacionesSegmento.push({
            idobjetivo: objetivoId,
            idsegmento: segmento.id,
            texto_personalizado: segmento.texto_personalizado || null
          });
        }
      }
      await models.ObjetivoSegmento.bulkCreate(relacionesSegmento, { transaction: t });
    }

    // 8. Crear Resultados
    const resultados = typeof data.resultados_esperados === 'string'
      ? JSON.parse(data.resultados_esperados)
      : (data.resultados_esperados || {});
    await models.Resultado.create({
      idevento: nuevoEventoId,
      participacion_esperada: resultados.participacion || null,
      satisfaccion_esperada: resultados.satisfaccion || null,
      otros_resultados: resultados.otro || null,
    }, { transaction: t });

    // 9. Asociar Recursos
    const recursosIds = data.recursos || [];
    if (Array.isArray(recursosIds) && recursosIds.length > 0) {
      const relacionesRecurso = recursosIds.map(recursoId => ({
        idevento: nuevoEventoId,
        idrecurso: recursoId
      }));
      await models.EventoRecurso.bulkCreate(relacionesRecurso, { transaction: t });
      console.log(`✓ ${recursosIds.length} recursos asociados`);
    }

    const recursosNuevos = data.recursos_nuevos || [];
    if (Array.isArray(recursosNuevos) && recursosNuevos.length > 0) {
      const nuevosRecursosCreados = await models.Recurso.bulkCreate(recursosNuevos, { transaction: t, returning: true });
      const relacionesNuevosRecursos = nuevosRecursosCreados.map(recurso => ({
        idevento: nuevoEventoId,
        idrecurso: recurso.idrecurso
      }));
      await models.EventoRecurso.bulkCreate(relacionesNuevosRecursos, { transaction: t });
      console.log(`✓ ${recursosNuevos.length} recursos nuevos creados y asociados`);
    }

    // 10. Notificaciones al comité
    if (Array.isArray(data.comite) && data.comite.length > 0) {
      const { Notificacion } = models;
      if (Notificacion) {
        const notificaciones = data.comite.map(idusuario => ({
          idusuario: parseInt(idusuario, 10),
          titulo: 'Nuevo evento asignado',
          mensaje: `Has sido asignado al comité del evento "${data.nombreevento}".`,
          tipo: 'nuevo_evento',
          estado: 'no_leido',
          created_at: new Date()
        }));
        await Notificacion.bulkCreate(notificaciones, { transaction: t });
        console.log(`✓ ${notificaciones.length} notificaciones enviadas al comité.`);
      }
    }

    await t.commit();

    const eventoCompleto = await models.Evento.findByPk(nuevoEventoId, {
      include: [
        { model: models.Objetivo, as: 'Objetivos', through: { attributes: [] } },
        { model: models.Resultado, as: 'Resultados' },
        { model: models.EventoTipo, as: 'TipoEvento' },
        { model: models.Recurso, as: 'Recursos' },
      ]
    });
    res.status(201).json({ message: 'Evento creado exitosamente', evento: eventoCompleto });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    res.status(500).json({
      message: 'Error interno del servidor al crear el evento.',
      error: error.message,
      details: error.stack
    });
  }
});

const getAllEventos = asyncHandler(async (req, res) => {
  const models = getModels();
  const eventos = await models.Evento.findAll({
    order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
    attributes: { exclude: ['organizerId', 'categoryId', 'locationId'] }
  });

  const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
  const eventosConUrl = eventos.map(evento => {
    const eventoData = evento.get({ plain: true });
    eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
    return eventoData;
  });
  res.status(200).json(eventosConUrl);
});

const getEventoById = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const evento = await models.Evento.findByPk(req.params.id, {
      attributes: { exclude: ['organizerId', 'categoryId', 'locationId'] },
      include: [
        { model: models.Resultado, as: 'Resultados' },
        { model: models.Objetivo, as: 'Objetivos', through: { attributes: ['texto_personalizado_relacion'] } },
        { model: models.Recurso, as: 'Recursos' }
      ]
    });

    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventoData = evento.get({ plain: true });
    eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;

    res.status(200).json(eventoData);
  } catch (error) {
    console.error('Error al obtener evento por ID:', error);
    res.status(500).json({ message: 'Error al obtener evento', error: error.message });
  }
});

const getEventosAprobadosDaf = asyncHandler(async (req, res) => {
  const models = getModels();
  
  try {
    const eventos = await models.Evento.findAll({
      where: {
        idacademico: req.user?.idusuario,
        estado: 'aprobado'
      },
      order: [['fechaevento', 'DESC']],
      attributes: { exclude: ['creadorid'] }
    });

    const eventosTransformados = eventos.map(evento => ({
      idevento: evento.idevento,
      nombreevento: evento.nombreevento || 'Sin título',
      descripcion: evento.descripcion || 'Sin descripción',
      fechaevento: evento.fechaevento,
      horaevento: evento.horaevento,
      lugarevento: evento.lugarevento || 'Sin ubicación',
      responsable_evento: evento.responsable_evento || 'Sin organizador',
      participantes_esperados: evento.participantes_esperados || 'No especificado',
      estado: evento.estado || 'aprobado',
      created_at: evento.created_at
    }));

    res.status(200).json(eventosTransformados);
  } catch (error) {
    console.error('Error al obtener eventos aprobados:', error);
    res.status(500).json({ message: 'Error al cargar eventos aprobados', error: error.message });
  }
});

const updateEvento = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const evento = await models.Evento.findByPk(req.params.id);

    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    const allowedUpdates = [
      'nombreevento', 'lugarevento', 'fechaevento', 'horaevento',
      'responsable_evento', 'descripcion', 'participantes_esperados',
      'idtipoevento', 'idservicio', 'idactividad', 'idambiente', 'idobjetivo'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        evento[field] = field.startsWith('id') && field !== 'idobjetivo' 
          ? (req.body[field] ? parseInt(req.body[field]) : null)
          : req.body[field];
      }
    });

    const eventoActualizado = await evento.save();
    res.status(200).json(eventoActualizado);
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ message: 'Error al actualizar evento', error: error.message });
  }
});

const deleteEvento = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { razon_rechazo, fecha_rechazo, admin_responsable } = req.body;
  
  try {
    await db.query(
      `UPDATE eventos 
       SET estado = 'rechazado', 
           razon_rechazo = $1, 
           fecha_rechazo = $2,
           admin_responsable = $3
       WHERE idevento = $4`,
      [razon_rechazo, fecha_rechazo, admin_responsable, id]
    );
    
    res.json({ message: 'Razón de rechazo guardada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  };
});

// ✅ Exportar todas las funciones
module.exports = {
  createEvento,
  getAllEventos,
  getEventoById,
  getEventosAprobadosDaf,
  updateEvento,
  deleteEvento,
 
};