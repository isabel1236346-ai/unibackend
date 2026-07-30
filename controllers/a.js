/*import { sequelize, Evento, Objetivo, Resultado, ObjetivoPDI, TipoObjetivo, Segmento, Recurso } from '../config/db.js';
import asyncHandler from 'express-async-handler';

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

// --- CONTROLADOR PRINCIPAL ---

export const createEvento = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const data = req.body;

    // 1. Crear el Evento principal
    const nuevoEvento = await Evento.create({
      nombreevento: data.nombreevento,
      lugarevento: data.lugarevento,
      fechaevento: data.fechaevento,
      horaevento: data.horaevento,
      responsable_evento: data.responsable_evento,
    }, { transaction: t });

    const nuevoEventoId = nuevoEvento.idevento;

    // 2. Guardar Tipos de Eventos
    if (data.tipos_de_evento && Array.isArray(data.tipos_de_evento)) {
      for (const tipo of data.tipos_de_evento) {
        await sequelize.query(
          'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
          { replacements: [nuevoEventoId, tipo.id, tipo.texto_personalizado || null], transaction: t }
        );
      }
    }console.log(`✓ ${data.tipos_de_evento.length} tipos de evento guardados`);

    // 3. Preparar y Guardar TODOS los Objetivos
    const objetivosACrear = [];
    const parsedObjetivos = safeJsonParse(data.objetivos, {});
    console.log('=== DEBUG OBJETIVOS ===');
    console.log('parsedObjetivos:', parsedObjetivos);

    // 3.1 Preparar Objetivos Principales
    for (const key in parsedObjetivos) {
      if (parsedObjetivos[key] === true && OBJETIVO_TYPES[key]) {
        objetivosACrear.push({
          idevento: nuevoEventoId,
          idtipoobjetivo: OBJETIVO_TYPES[key],
          texto_personalizado: (key === 'otro') ? parsedObjetivos.otroTexto : null,
        });
       
      }
    }

    const parsedSegmentos = safeJsonParse(data.segmentos_objetivo, []);
    const argumentacionSegmento = data.argumentacion_segmento || '';
    const otroSegmentoTexto = parsedSegmentos.find(s => s.texto)?.texto || '';

    if (argumentacionSegmento.trim() || otroSegmentoTexto.trim()) {
      objetivosACrear.push({
        idevento: nuevoEventoId,
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: otroSegmentoTexto.trim() || 'Segmentación de Público',
      });
    }

    // --- CORRECCIÓN DE ÁMBITO ---
    // Declaramos 'nuevosObjetivos' aquí, una sola vez.
    let nuevosObjetivos = [];

    // 3.3 Guardar los objetivos preparados hasta ahora
    if (objetivosACrear.length > 0) {
      nuevosObjetivos = await Objetivo.bulkCreate(objetivosACrear, { transaction: t });
    }
     if(data.argumentacion && data.argumentacion.trim()){
      for (const objetivo of nuevosObjetivos) {
        await sequelize.query(
          'INSERT INTO argumentacion (idobjetivo, idevento, texto_argumentacion) VALUES (?, ?, ?)',
          {
            replacements: [objetivo.idobjetivo, nuevoEventoId, data.argumentacion.trim()],
            transaction: t
          }
        )
    }
  }

    // 3.4 Guardar Objetivos PDI y añadirlos a la lista
    const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
    if (objetivosPDIArray.length > 0) {
      const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
      if (descripcionesPDI.length > 0) {
        const objetivoGeneralPDI = await Objetivo.create({
          idevento: nuevoEventoId,
          idtipoobjetivo: OTRO_TIPO_ID,
          texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
        }, { transaction: t });

        nuevosObjetivos.push(objetivoGeneralPDI);

        const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
          idobjetivo: objetivoGeneralPDI.idobjetivo,
          descripcion: descripcion,
        }));
        await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction: t });
      }
    }
console.log('=== DEBUG SEGMENTOS ===');
console.log('parsedSegmentos:', parsedSegmentos);
console.log('nuevosObjetivos length:', nuevosObjetivos.length);
console.log('nuevosObjetivos IDs:', nuevosObjetivos.map(o => o.idobjetivo));


    if (parsedSegmentos.length > 0) {
      if (nuevosObjetivos.length === 0) {
        console.log('No se encontraron objetivos, creando objetivo genérico...');
      const objetivoGenerico = await Objetivo.create({
        idevento: nuevoEventoId,
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: 'Objetivo General del Evento',
      }, { transaction: t });
      nuevosObjetivos.push(objetivoGenerico);
    }
  

console.log('Insertando relaciones objetivo_segmento...');
      for (const objetivo of nuevosObjetivos) {
        for (const segmentoData of parsedSegmentos) {
          try {
             console.log(`Insertando: objetivo ${objetivo.idobjetivo}, segmento ${segmentoData.id}`);
        
        // Validar que segmentoData tiene la estructura correcta
        if (!segmentoData.id) {
          console.warn('Segmento sin ID:', segmentoData);
          continue;
        }

          await sequelize.query(
            'INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) VALUES (?, ?, ?)',
            {
              replacements: [objetivo.idobjetivo, segmentoData.id, segmentoData.texto_personalizado|| null],
              transaction: t
            }
          );

         console.log(`✓ Insertado objetivo_segmento: ${objetivo.idobjetivo} - ${segmentoData.id}`);
      } catch (segmentoError) {
        console.error('Error insertando objetivo_segmento:', segmentoError);
        console.error('Datos:', { 
          objetivoId: objetivo.idobjetivo, 
          segmentoId: segmentoData.id, 
          textoPersonalizado: segmentoData.texto_personalizado 
        });
        // Re-lanzar el error para que la transacción se revierta
        throw segmentoError;
      }
      }
     
    }
console.log('✓ Todas las relaciones objetivo_segmento insertadas correctamente');
} else {
  console.log('No hay segmentos para asociar');
}

// También agrega este debug al principio de la función para ver qué datos llegan:
console.log('=== DEBUG DATOS RECIBIDOS ===');
console.log('data.segmentos_objetivo (raw):', data.segmentos_objetivo);
console.log('parsedSegmentos:', parsedSegmentos);
    // 6. Guardar Resultados Esperados
    const parsedResultados = safeJsonParse(data.resultados_esperados, {});
    await Resultado.create({
      idevento: nuevoEventoId,
      participacion_esperada: parseInt(parsedResultados.participacion, 10) || 0,
      satisfaccion_esperada: parseInt(parsedResultados.satisfaccion, 10) || 0,
      otros_resultados: parsedResultados.otro || null,
    }, { transaction: t });

    // 7. Guardar Recursos
    if (data.recursos && Array.isArray(data.recursos)) {
      const recursosACrear = data.recursos.map(recurso => ({
        idevento: nuevoEventoId,
        idrecurso: recurso.idrecurso,
        nombre_recurso: recurso.nombre_recurso,
      }));
      if (recursosACrear.length > 0) {
        await Recurso.bulkCreate(recursosACrear, { transaction: t });
      }
    }

    // 8. Finalizar Transacción
    await t.commit();

    const eventoCompleto = await Evento.findByPk(nuevoEventoId, {
        include: [{ all: true, nested: true }]
    });
    res.status(201).json({ message: 'Evento creado exitosamente', evento: eventoCompleto });

  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error('Error en la transacción al crear el evento:', error);
    res.status(500).json({
      message: 'Error interno del servidor al crear el evento.',
      error: error.message,
      details: error.stack
    });
  }
};
export const getAllEventos = asyncHandler(async (req, res) => {
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
});

export const fetchAllEvents = async () => {
  try {
    const eventos = await Evento.findAll({
      attributes: [
        'idevento',
        'nombreevento',
        'fechaevento',
        'horaevento'
      ],
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
    });
    return eventos;
  } catch (error) {
    console.error('Error in fetchAllEvents:', error);
    throw error;
  }
};

export const getEventoById = asyncHandler(async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id, {
      attributes: {
        exclude: ['organizerId', 'categoryId', 'locationId']
      },
      include: [
        { model: Resultado, as: 'resultados' },
        { model: Objetivo, as: 'objetivos' }
      ]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    res.status(200).json(evento);
  } catch (error) {
    console.error('Error al obtener evento por ID:', error);
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message 
    });
  }
});

export const updateEvento = asyncHandler(async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Authorization check (uncomment when user system is implemented)
    // if (evento.idorganizador && evento.idorganizador.toString() !== req.user.idusuario && req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'No autorizado para modificar este evento' });
    // }

    const allowedUpdates = [
      'nombreevento', 'lugarevento', 'fechaevento', 'horaevento',
      'idtipoevento', 'idservicio', 'idactividad', 'idambiente', 'idobjetivo'
    ];

    // Only update provided fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field.startsWith('id') && field !== 'idobjetivo') {
          // Handle integer fields
          evento[field] = req.body[field] ? parseInt(req.body[field]) : null;
        } else {
          evento[field] = req.body[field];
        }
      }
    });

    const eventoActualizado = await evento.save();
    res.status(200).json(eventoActualizado);

  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ 
      message: 'Error al actualizar evento',
      error: error.message 
    });
  }
});

export const deleteEvento = asyncHandler(async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Authorization check (uncomment when user system is implemented)
    // if (evento.idorganizador && evento.idorganizador.toString() !== req.user.idusuario && req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'No autorizado para eliminar este evento' });
    // }

    await evento.destroy();
    res.status(200).json({ message: 'Evento eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ 
      message: 'Error al eliminar evento',
      error: error.message 
    });
  }
});

// Raw query functions (kept for compatibility)
export const fetchEventsWithRawQuery = async () => {
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

export const getEventos = asyncHandler(async (req, res) => {
  try {
    const eventos = await fetchEventsWithRawQuery();
    res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al obtener eventos con consulta raw:', error);
    res.status(500).json({ 
      message: 'Error al obtener eventos',
      error: error.message 
    });
  }
});

export const fetchEventById = async (id) => {
  try {
    console.log(`[DB] Buscando evento con ID: ${id}`);
    
    const evento = await Evento.findByPk(id, {
      attributes: {
        exclude: ['organizerId', 'categoryId', 'locationId']
      }
    });

    if (evento) {
      console.log(`[DB] Evento encontrado: ${evento.nombreevento}`);
    } else {
      console.log(`[DB] No se encontró ningún evento con ID: ${id}`);
    }
    
    return evento;
  } catch (error) {
    console.error('Error in fetchEventById:', error);
    throw error;
  }
};

export const getEventoByIdA = asyncHandler(async (req, res) => {
  try {
    const evento = await fetchEventById(req.params.id);
    if (evento) {
      res.status(200).json(evento);
    } else {
      res.status(404).json({ message: 'Evento no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener evento por ID (alternativo):', error);
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message 
    });
  }
});

// Future implementation for event registration with Telegram notifications
/*
export const inscribirEvento = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, eventoId } = req.body;

    // 1. Register user for event (implement your logic here)
    // const registration = await EventRegistration.create({
    //   userId,
    //   eventoId,
    //   fechaInscripcion: new Date()
    // }, { transaction });

    // 2. Send Telegram notification
    try {
      const user = await User.findByPk(userId, {
        attributes: ['telegram_chat_id']
      });
      
      if (user?.telegram_chat_id) {
        const evento = await Evento.findByPk(eventoId, {
          attributes: ['nombreevento']
        });

        if (evento) {
          const rasaWebhookUrl = process.env.RASA_WEBHOOK_URL;
          await axios.post(rasaWebhookUrl, {
            recipient_id: user.telegram_chat_id,
            text: `¡Confirmado! Te has inscrito exitosamente al evento: "${evento.nombreevento}".`
          });
        }
      }
    } catch (notificationError) {
      console.error("No se pudo enviar la notificación de Telegram:", notificationError);
      // Don't fail the main operation due to notification errors
    }

    await transaction.commit();
    res.status(200).json({ message: "Inscripción exitosa." });

  } catch (error) {
    await transaction.rollback();
    console.error('Error en inscripción:', error);
    res.status(500).json({ 
      message: 'Error en la inscripción',
      error: error.message 
    });
  }
});
*/