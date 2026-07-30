const { getModels, sequelize } = require('../models/index');
const { Op } = require('sequelize');
const asyncHandler = require('express-async-handler');
const { createNotification, getUserNotifications, markAsRead, getUnreadCount, createNotificationRecord } = require('../controllers/notificationController');

// --- FUNCIÓN AUXILIAR ---
const guardarTiposEvento = async (idevento, tiposEvento, transaction) => {
  if (!tiposEvento || !Array.isArray(tiposEvento)) {
    console.log('No hay tipos de eventos para procesar');
    return;
  }

  console.log('Procesando tipos de eventos:', tiposEvento);
  
  for (const tipo of tiposEvento) {
    if (!tipo.id) {
      console.warn('Tipo de evento sin ID:', tipo);
      continue;
    }
    
    await sequelize.query(
      'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
      { 
        replacements: [idevento, tipo.id, tipo.texto_personalizado || null], 
        transaction 
      }
    );
  }
  console.log(`✓ ${tiposEvento.length} tipos de evento guardados`);
};

// --- CONSTANTES ---
const OBJETIVO_TYPES = {
  modeloPedagogico: 1, posicionamiento: 2, internacionalizacion: 3,
  rsu: 4, fidelizacion: 5, otro: 6
};
const OTRO_TIPO_ID = 6;
const OTRO_SEGMENTO_ID = 5;

// --- FUNCIONES AUXILIARES ---
const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    if (!jsonString) return defaultValue;
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

// ✅ FUNCIÓN PRINCIPAL - createEvento (sin 'export')
const createEvento = async (req, res) => {
  const t = await sequelize.transaction();
  const models = getModels();
  const Evento = models.Evento;
  const Objetivo = models.Objetivo;
  const Resultado = models.Resultado;
  const Recurso = models.Recurso;
  const User = models.User;       
  const Comite = models.Comite;
  const Segmento = models.Segmento;
  const ObjetivoPDI = models.ObjetivoPDI;
  
  try {
    const data = req.body;
    const nuevoEvento = await Evento.create({
      nombreevento: data.nombreevento,
      lugarevento: data.lugarevento || 'Por definir',
      fechaevento: data.fechaevento,
      horaevento: data.horaevento,
      responsable_evento: data.responsable_evento,
      estado: 'pendiente',
      fechaAprobacion: null,
      idclasificacion: data.idclasificacion || null,
      idresultado: data.idresultado || null,
      aprobado: false,
      rechazado: false,
      idacademico: req.user?.idusuario,
    }, { transaction: t });

    const nuevoEventoId = nuevoEvento.idevento;
    await guardarTiposEvento(nuevoEventoId, data.tipos_de_evento, t);

    let nuevosObjetivos = [];
    if (Array.isArray(data.objetivos) && data.objetivos.length > 0) {
      for (const objetivoData of data.objetivos) {
        if (objetivoData.id) {
          const objetivo = await Objetivo.create({
            idtipoobjetivo: objetivoData.id,
            texto_personalizado: objetivoData.texto_personalizado || null,
          }, { transaction: t });

          await sequelize.query(
            'INSERT INTO evento_objetivos (idevento, idobjetivo, texto_personalizado) VALUES (?, ?, ?)',
            {
              replacements: [nuevoEventoId, objetivo.idobjetivo, objetivoData.texto_personalizado || null],
              transaction: t
            }
          );
          nuevosObjetivos.push(objetivo);
        }
      }
    }

    // Objetivos PDI
    let objetivosPDIArray = [];
    if (data.objetivos_pdi) {
      try {
        objetivosPDIArray = typeof data.objetivos_pdi === 'string' 
          ? JSON.parse(data.objetivos_pdi) 
          : data.objetivos_pdi;
      } catch (e) {}
    }

    if (Array.isArray(objetivosPDIArray) && objetivosPDIArray.length > 0) {
      const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
      if (descripcionesPDI.length > 0) {
        const objetivoGeneralPDI = await Objetivo.create({
          idtipoobjetivo: OTRO_TIPO_ID,
          texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
        }, { transaction: t });

        const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
          idobjetivo: objetivoGeneralPDI.idobjetivo,
          descripcion: descripcion,
        }));
        await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction: t });
      }
    }

    // Segmentos
    const parsedSegmentos = Array.isArray(data.segmentos_objetivo) ? data.segmentos_objetivo : [];
    const segmentosValidos = await Segmento.findAll({ attributes: ['idsegmento'], raw: true });
    const idsSegmentosValidos = new Set(segmentosValidos.map(seg => seg.idsegmento));
    const argumentacionSegmento = data.argumentacion_segmento || '';
    const otroSegmentoTexto = parsedSegmentos.find(s => s.texto)?.texto || '';

    if (argumentacionSegmento.trim() || otroSegmentoTexto.trim()) {
      const objetivoSegmentacion = await Objetivo.create({
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: otroSegmentoTexto.trim() || 'Segmentación de Público',
      }, { transaction: t });
      nuevosObjetivos.push(objetivoSegmentacion);
    }

    if (parsedSegmentos.length > 0) {
      const segmentosFiltrados = parsedSegmentos.filter(seg => {
        const idSegmento = parseInt(seg.id);
        if (isNaN(idSegmento)) return false;
        if (!idsSegmentosValidos.has(idSegmento)) return false;
        return true;
      });

      if (nuevosObjetivos.length === 0) {
        const objetivoGenerico = await Objetivo.create({
          idtipoobjetivo: OTRO_TIPO_ID,
          texto_personalizado: 'Objetivo General del Evento',
        }, { transaction: t });
        
        await sequelize.query(
          'INSERT INTO evento_objetivos (idevento, idobjetivo, texto_personalizado) VALUES (?, ?, ?)',
          {
            replacements: [nuevoEventoId, objetivoGenerico.idobjetivo, objetivoGenerico.texto_personalizado],
            transaction: t
          }
        );

        if (data.argumentacion?.trim()) {
          await sequelize.query(
            'INSERT INTO argumentacion (idobjetivo, texto_argumentacion) VALUES (?, ?)',
            {
              replacements: [objetivoGenerico.idobjetivo, data.argumentacion.trim()],
              transaction: t
            }
          );
        }
        nuevosObjetivos.push(objetivoGenerico);
      }

      if (data.argumentacion?.trim()) {
        const argumentacionesACrear = nuevosObjetivos.map(objetivo => ({
          idobjetivo: objetivo.idobjetivo,
          texto_argumentacion: data.argumentacion.trim()
        }));
        
        await sequelize.query(
          'INSERT INTO argumentacion (idobjetivo, texto_argumentacion) VALUES ' +
          argumentacionesACrear.map(() => '(?, ?)').join(', '),
          {
            replacements: argumentacionesACrear.flatMap(arg => [arg.idobjetivo, arg.texto_argumentacion]),
            transaction: t
          }
        );
      }

      for (const objetivo of nuevosObjetivos) {
        for (const segmentoData of segmentosFiltrados) {
          const idSegmento = parseInt(segmentoData.id);
          const textoPersonalizado = segmentoData.texto_personalizado || null;
          await sequelize.query(
            'INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) VALUES (?, ?, ?)',
            {
              replacements: [objetivo.idobjetivo, idSegmento, textoPersonalizado],
              transaction: t
            }
          );
        }
      }
    }

    // Resultados
    let parsedResultados = {};
    if (data.resultados_esperados) {
      try {
        parsedResultados = typeof data.resultados_esperados === 'string'
          ? JSON.parse(data.resultados_esperados)
          : data.resultados_esperados;
      } catch (e) {}
    }

    await Resultado.create({
      idevento: nuevoEventoId,
      participacion_esperada: parsedResultados.participacion || '',
      satisfaccion_esperada: parsedResultados.satisfaccion || '',
      otros_resultados: parsedResultados.otro || null,
    }, { transaction: t });

    // Recursos nuevos
    if (data.recursos_nuevos && Array.isArray(data.recursos_nuevos) && data.recursos_nuevos.length > 0) {
      const recursosACrear = data.recursos_nuevos.map(recurso => ({
        idevento: nuevoEventoId,
        nombre_recurso: recurso.nombre_recurso,
        recurso_tipo: recurso.recurso_tipo || 'Material/Técnico/Tercero',
        habilitado: 1
      }));
      await Recurso.bulkCreate(recursosACrear, { transaction: t });
    }

    // Recursos existentes
    if (data.recursos && Array.isArray(data.recursos) && data.recursos.length > 0) {
      const recursosExistentesACrear = data.recursos.map(recurso => ({
        idevento: nuevoEventoId,
        idrecurso: recurso.idrecurso,
        nombre_recurso: recurso.nombre_recurso,
      }));
      if (recursosExistentesACrear.length > 0) {
        await Recurso.bulkCreate(recursosExistentesACrear, { transaction: t });
      }
    }

    // Comité y notificaciones
    if (Array.isArray(data.comite) && data.comite.length > 0) {
      const usuariosValidos = await User.findAll({
        where: { idusuario: data.comite, habilitado: '1' },
        attributes: ['idusuario']
      });
      const idsValidos = usuariosValidos.map(u => u.idusuario);

      if (idsValidos.length > 0) {
        const comiteData = idsValidos.map(idusuario => ({
          idevento: nuevoEventoId,
          idusuario,
          created_at: new Date()
        }));
        await Comite.bulkCreate(comiteData, { transaction: t });

        for (const idusuario of idsValidos) {
          try {
            await createNotificationRecord({
              idusuario: idusuario,
              tipo: 'evento_asignado',
              titulo: 'Has sido asignado a un evento',
              mensaje: `El evento "${nuevoEvento.nombreevento}" te ha asignado como miembro del comité.`,
              idevento: nuevoEventoId
            }, t);
          } catch (notifError) {}
        }
      }
    }

    await t.commit();

    const eventoCompleto = await Evento.findByPk(nuevoEventoId, {
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: Recurso, as: 'Recursos' },
        { 
          model: User, 
          as: 'academicoCreador',
          attributes: ['nombre', 'apellidopat', 'apellidomat', 'email', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      data: eventoCompleto
    });

  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear el evento.',
      error: error.message
    });
  }
};

// ✅ OTRAS FUNCIONES SIN 'export'
const getAllEventos = async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  const eventos = await Evento.findAll({
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
};

const getid = async (req, res) => {
  const eventId = req.params.id;
  console.log(`[Backend] ${eventId}`);
};

const fetchAllEvents = async () => {
  const models = getModels();
  const Evento = models.Evento;
  try {
    const eventos = await Evento.findAll({
      attributes: ['idevento', 'nombreevento', 'fechaevento', 'horaevento'],
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
    });
    return eventos;
  } catch (error) {
    console.error('Error in fetchAllEvents:', error);
    throw error;
  }
};

const getEventoById = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Evento, Comite, User, Resultado } = models;
  
  try {
    const { id } = req.params;
    const eventIdNum = parseInt(id, 10);
    if (isNaN(eventIdNum)) return res.status(400).json({ message: 'ID de evento inválido' });
    
    const evento = await Evento.findByPk(eventIdNum, { 
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: User, as: 'academicoCreador', 
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role'],
          required: false
        },
        { model: Comite, as: 'Comites' }
      ]
    });

    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    let tiposDeEvento = [];
    try {
      const [tiposRaw] = await sequelize.query(
        `SELECT et.idevento, et.idtipoevento, et.texto_personalizado, te.nombre_tipo
         FROM evento_tipos et
         LEFT JOIN tipo_evento te ON et.idtipoevento = te.idtipoevento
         WHERE et.idevento = ?`,
        { replacements: [eventIdNum] }
      );
      tiposDeEvento = tiposRaw;
    } catch (tiposError) {}

    let miembrosComite = [];
    try {
      miembrosComite = await Comite.findAll({
        where: { idevento: eventIdNum },
        include: [{
          model: User,
          as: 'miembroComite',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role']
        }]
      });
    } catch (includeError) {
      const comiteRecords = await Comite.findAll({
        where: { idevento: eventIdNum },
        attributes: ['idevento', 'idusuario', 'created_at']
      });
      const usuariosIds = comiteRecords.map(c => c.idusuario);
      if (usuariosIds.length > 0) {
        const usuarios = await User.findAll({
          where: { idusuario: usuariosIds },
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role']
        });
        miembrosComite = comiteRecords.map(comite => ({
          ...comite.toJSON(),
          miembroComite: usuarios.find(u => u.idusuario === comite.idusuario)?.toJSON()
        }));
      }
    }

    const eventoConComite = evento.toJSON();
    eventoConComite.Comites = miembrosComite;
    eventoConComite.tiposDeEvento = tiposDeEvento;
    res.status(200).json(eventoConComite);

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener evento', error: error.message });
  }
});

const updateEvento = asyncHandler(async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  try {
    const evento = await Evento.findByPk(req.params.id);
    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    const allowedUpdates = [
      'nombreevento', 'lugarevento', 'fechaevento', 'horaevento',
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
    res.status(500).json({ message: 'Error al actualizar evento', error: error.message });
  }
});

const deleteEvento = asyncHandler(async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  try {
    const evento = await Evento.findByPk(req.params.id);
    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });
    await evento.destroy();
    res.status(200).json({ message: 'Evento eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar evento', error: error.message });
  }
});

const getEventosNoAprobados = asyncHandler(async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  try {
    const eventos = await Evento.findAndCountAll({
      attributes: { exclude: ['creadorid'] },
      where: { [Op.or]: [{ estado: 'pendiente' }, { estado: null }, { estado: '' }] },
      order: [['idevento', 'DESC']],
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    });

    const eventosTransformados = eventos.rows.map(evento => ({
      id: evento.idevento,
      title: evento.nombreevento || 'Sin título',
      description: evento.descripcion || 'Sin descripción',
      date: evento.fechaevento,
      time: evento.horaevento,
      location: evento.lugarevento || 'Sin ubicación',
      organizer: evento.responsable_evento || 'Sin organizador',
      attendees: evento.participantes_esperados || 'No especificado',
      status: evento.estado || 'pendiente',
      priority: 'media',
      category: 'General',
      submittedDate: evento.created_at || evento.fechaevento,
      submittedBy: evento.responsable_evento || 'Sistema',
      fechaAprobacion: evento.fecha_aprobacion,
      adminAprobador: evento.admin_aprobador,
      comentarios: evento.comentarios_admin
    }));

    res.json({
      success: true,
      events: eventosTransformados,
      total: eventos.count,
      message: `Se encontraron ${eventos.count} eventos pendientes de aprobación`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener eventos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const aprobarEvento = async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  const User = models.User;
  const { id } = req.params;
  
  const evento = await Evento.findByPk(id, {
    include: [{ model: User, as: 'academicoCreador',
      attributes: ['nombre', 'apellidopat', 'apellidomat', 'email', 'role']
    }]
  });
  
  if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

  evento.estado = 'aprobado';
  evento.fecha_aprobacion = new Date();
  await evento.save();

  if (evento.academicoCreador) {
    try {
      const Notificacion = models.Notificacion;
      await Notificacion.create({
        idusuario: evento.academicoCreador.idusuario,
        tipo: 'aprobacion',
        titulo: 'Evento aprobado',
        mensaje: `Tu evento ha sido aprobado.`,
        estado: 'nueva',
        read: false
      });
    } catch (error) {}
  }

  res.json({ success: true, evento });
};

const rechazarEvento = async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  const { id } = req.params;
  const evento = await Evento.findByPk(id);
  if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

  evento.estado = 'rechazado';
  await evento.save();
  res.json({ success: true, evento });
};

const fetchEventsWithRawQuery = async () => {
  try {
    console.log('[DB-RAW] Buscando eventos con consulta directa...');
    const [eventos] = await sequelize.query(
      "SELECT idevento, nombreevento, lugarevento, fechaevento, horaevento FROM evento ORDER BY fechaevento DESC"
    );
    console.log(`[DB-RAW] Se encontraron ${eventos.length} eventos.`);
    return eventos;
  } catch (error) {
    console.error('Error in fetchEventsWithRawQuery:', error);
    throw error;
  }
};

const getEventos = asyncHandler(async (req, res) => {
  try {
    const eventos = await fetchEventsWithRawQuery();
    res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al obtener eventos con consulta raw:', error);
    res.status(500).json({ message: 'Error al obtener eventos', error: error.message });
  }
});

const pendientes = asyncHandler(async (req, res) => {
  try {
    const result = await sequelize.query('SELECT * FROM public.evento ORDER BY idevento ASC');
    res.json({ evento: result[0] }); // sequelize.query devuelve [rows, metadata]
  } catch (err) {
    console.error('Error al obtener los pendientes', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

const fetchEventById = async (id) => {
  const models =  getModels();
  const Evento = models.Evento;
  try {
    console.log(`[DB] Buscando evento con ID: ${id}`);
    const evento = await Evento.findByPk(id, {
      attributes: { exclude: ['organizerId', 'categoryId', 'locationId'] }
    });
    if (evento) console.log(`[DB] Evento encontrado: ${evento.nombreevento}`);
    else console.log(`[DB] No se encontró ningún evento con ID: ${id}`);
    return evento;
  } catch (error) {
    console.error('Error in fetchEventById:', error);
    throw error;
  }
};

const getEventoByIdA = asyncHandler(async (req, res) => {
  try {
    const evento = await fetchEventById(req.params.id);
    if (evento) res.status(200).json(evento);
    else res.status(404).json({ message: 'Evento no encontrado' });
  } catch (error) {
    console.error('Error al obtener evento por ID (alternativo):', error);
    res.status(500).json({ message: 'Error al obtener evento', error: error.message });
  }
});

const getAprobados = asyncHandler(async (req, res) => {
  const models =  getModels();
  const Evento = models.Evento;
  try {
    const eventos = await Evento.findAll({
      where: {
        idacademico: req.user?.id,
        estado: 'aprobado'
      }
    });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar eventos' });
  }
});

const debugEventoById = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const Evento = models.Evento;
    const Resultado = models.Resultado;
    const Objetivo = models.Objetivo;
    const Recurso = models.Recurso;
    
    console.log('=== DEBUG INFO ===');
    console.log('Requested ID:', req.params.id);
    
    const numericId = parseInt(req.params.id);
    if (isNaN(numericId)) {
      console.log('ERROR: ID no es numérico');
      return res.status(400).json({ 
        message: 'ID de evento inválido - debe ser numérico',
        receivedId: req.params.id,
        receivedType: typeof req.params.id
      });
    }
    
    const evento = await Evento.findByPk(numericId);
    if (!evento) {
      const eventosDisponibles = await Evento.findAll({
        attributes: ['idevento', 'nombreevento'],
        limit: 10
      });
      return res.status(404).json({ 
        message: 'Evento no encontrado',
        requestedId: numericId,
        availableEvents: eventosDisponibles.map(e => ({ id: e.idevento, name: e.nombreevento }))
      });
    }
    
    const eventoCompleto = await Evento.findByPk(numericId, {
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: Objetivo, as: 'Objetivos', through: { attributes: ['texto_personalizado_relacion'] } },
        { model: Recurso, as: 'Recursos' }
      ]
    });
    
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventoData = eventoCompleto.get({ plain: true });
    eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
    
    console.log('=== DEBUG INFO END ===');
    res.status(200).json({ debug: true, message: 'Evento encontrado exitosamente', data: eventoData });
    
  } catch (error) {
    console.error('=== ERROR DEBUG ===');
    console.error('Error completo:', error);
    res.status(500).json({ message: 'Error al obtener evento', error: error.message, stack: error.stack, debug: true });
  }
});

const approveEvent = asyncHandler(async (req, res) => {
  const models = getModels();
  const Evento = models.Evento;
  try {
    const evento = await Evento.findByPk(req.params.id);
    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    evento.estado = 'aprobado';
    evento.fecha_aprobacion = new Date();
    const eventoActualizado = await evento.save();

    res.status(200).json({ message: 'Evento aprobado exitosamente', evento: eventoActualizado });
  } catch (error) {
    console.error('Error al aprobar evento:', error);
    res.status(500).json({ message: 'Error al aprobar evento', error: error.message });
  }
});

const getApprovedEvents = asyncHandler(async (req, res) => {
  const models =  getModels();
  const Evento = models.Evento;
  try {
    const eventos = await Evento.findAll({
      attributes: { exclude: ['creadorid'] },
      where: { estado: 'aprobado' }
    });
    res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al obtener eventos aprobados:', error);
    res.status(500).json({ message: 'Error al obtener eventos aprobados', error: error.message });
  }
});

const getPendingEvents = asyncHandler(async (req, res) => {
  const models = getModels();
  const Event = models.Evento;
  try {
    const eventos = await Event.findAll({
      where: { estado: 'Pendiente' },
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: Objetivo, as: 'Objetivos' },
        { model: Recurso, as: 'Recursos' }
      ]
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventosConUrl = eventos.map(evento => {
      const eventoData = evento.get({ plain: true });
      eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
      return eventoData;
    });
    res.status(200).json(eventosConUrl);
  } catch (error) {
    console.error('Error al obtener eventos pendientes:', error);
    res.status(500).json({ message: 'Error al obtener eventos pendientes', error: error.message });
  }
});

const rejectEvent = asyncHandler(async (req, res) => {
  const models = getModels();
  const Event = models.Evento;
  try {
    const evento = await Event.findByPk(req.params.id);
    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    const { razon_rechazo } = req.body;
    evento.estado = 'rechazado';
    evento.fecha_rechazo = new Date();
    evento.razon_rechazo = razon_rechazo || 'Sin razón especificada';
    const eventoActualizado = await evento.save();

    res.status(200).json({ message: 'Evento rechazado exitosamente', evento: eventoActualizado });
  } catch (error) {
    console.error('Error al rechazar evento:', error);
    res.status(500).json({ message: 'Error al rechazar evento', error: error.message });
  }
});

const getEventoById1 = asyncHandler(async (req, res) => {
  const models = getModels();
  const Event = models.Evento;
  const evento = await Event.findAll({ attributes: { exclude: ['idevento'] } });
  res.status(200).json(evento);
});

// ✅ EXPORTS FINALES - CommonJS
module.exports = {
  createEvento,
  getAllEventos,
  getid,
  fetchAllEvents,
  getEventoById,
  updateEvento,
  deleteEvento,
  getEventosNoAprobados,
  aprobarEvento,
  rechazarEvento,
  fetchEventsWithRawQuery,
  getEventos,
  pendientes,
  fetchEventById,
  getEventoByIdA,
  getAprobados,
  debugEventoById,
  approveEvent,
  getApprovedEvents,
  getPendingEvents,
  rejectEvent,
  getEventoById1
};