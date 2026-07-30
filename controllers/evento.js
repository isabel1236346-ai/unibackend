const { getModels } = require('../models/index');
const asyncHandler = require('express-async-handler');

// Constants for better maintainability
const OBJETIVO_TYPES = {
  modeloPedagogico: 1,
  posicionamiento: 2,
  internacionalizacion: 3,
  rsu: 4,
  fidelizacion: 5,
  otro: 6
};

const OTRO_TIPO_ID = 6;
const OTRO_SEGMENTO_ID = 5;

// Helper function to parse JSON safely
const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString || JSON.stringify(defaultValue));
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

const createObjetivos = async (nuevoEventoId, data, transaction) => {
  const objetivosACrear = [];
  const parsedObjetivos = safeJsonParse(data.objetivos, {});
  

  for (const [key, value] of Object.entries(parsedObjetivos)) {
    if (value === true && OBJETIVO_TYPES[key]) {
      objetivosACrear.push({
        idevento: nuevoEventoId,
        idtipoobjetivo: OBJETIVO_TYPES[key],
        texto_personalizado: (key === 'otro') ? parsedObjetivos.otroTexto : null,
      });
    }
  }

  const parsedSegmentos = safeJsonParse(data.segmentos_objetivo, []);
  const argumentacionSegmento = data.argumentacion_segmento || '';
  const otroSegmentoTexto = parsedSegmentos.find(s => s.id === OTRO_SEGMENTO_ID)?.texto || '';

  if (argumentacionSegmento.trim() || otroSegmentoTexto.trim()) {
    objetivosACrear.push({
      idevento: nuevoEventoId,
      idtipoobjetivo: OTRO_TIPO_ID,
      texto_personalizado: otroSegmentoTexto.trim() || 'Segmentación de Público',
      argumentacion: argumentacionSegmento.trim(),
    });
  }

  return objetivosACrear.length > 0 
    ? await Objetivo.bulkCreate(objetivosACrear, { transaction })
    : [];
};

const associateObjetivosWithSegmentos = async (objetivos, segmentosData, transaction) => {
  if (!objetivos.length || !segmentosData.length) return;

  const associations = [];
  for (const objetivo of objetivos) {
    for (const segmentoData of segmentosData) {
      const textoPersonalizado = (segmentoData.id === OTRO_SEGMENTO_ID) ? segmentoData.texto : null;
      associations.push({
        idobjetivo: objetivo.idobjetivo,
        idsegmento: segmentoData.id,
        texto_personalizado: textoPersonalizado
      });
    }
  }

  if (associations.length > 0) {
    const query = `
      INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) 
      VALUES ${associations.map(() => '(?, ?, ?)').join(', ')}
    `;
    const values = associations.flatMap(assoc => [
      assoc.idobjetivo, 
      assoc.idsegmento, 
      assoc.texto_personalizado
    ]);
    
    await sequelize.query(query, { 
      replacements: values, 
      transaction 
    });
  }
};

const createObjetivosPDI = async (nuevoEventoId, data, transaction) => {
  const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
  if (!objetivosPDIArray.length) return;

  const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
  if (!descripcionesPDI.length) return;

  const objetivoGeneralPDI = await Objetivo.create({
    idevento: nuevoEventoId,
    idtipoobjetivo: OTRO_TIPO_ID,
    texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
    argumentacion: data.argumentacion_pdi || null,
  }, { transaction });

  const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
    idobjetivo: objetivoGeneralPDI.idobjetivo,
    descripcion: descripcion,
  }));

  await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction });
};

const createEventoTipos = async (nuevoEventoId, tiposDeEvento, transaction) => {
  if (!Array.isArray(tiposDeEvento) || !tiposDeEvento.length) return;

  const associations = tiposDeEvento.map(tipo => [
    nuevoEventoId, 
    tipo.id, 
    tipo.texto || null
  ]);

  const query = `
    INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) 
    VALUES ${associations.map(() => '(?, ?, ?)').join(', ')}
  `;
  const values = associations.flat();

  await sequelize.query(query, { 
    replacements: values, 
    transaction 
  });
};



const createEvento = async (req, res) => {
  let models;
  try {
    models = getModels();
  } catch (e) {
    console.error('❌ Models no inicializados:', e.message);
    return res.status(500).json({ message: 'Servidor no listo, reintenta en unos segundos.' });
  }
 
  const { Evento, Resultado, Fase, Presupuesto, Egreso, Ingreso } = models;
  const sequelize = models.sequelize;
 
  if (!sequelize) {
    console.error('❌ sequelize es undefined. Keys en models:', Object.keys(models));
    return res.status(500).json({ message: 'Conexión a base de datos no disponible.' });
  }
 
  const t = await sequelize.transaction();
 
  try {
    const data = req.body;
    console.log('Datos recibidos:', JSON.stringify(data, null, 2));
 
    if (!data.nombreevento || !data.fechaevento) {
      await t.rollback();
      return res.status(400).json({ message: 'Campos requeridos: nombreevento, fechaevento' });
    }
 
    const responsableCompleto = `${req.user.nombre} ${req.user.apellidopat || ''}`.trim() || 'Responsable no especificado';
 
    const nuevoEvento = await Evento.create({
      nombreevento:    data.nombreevento,
      lugarevento:     data.lugarevento || 'Por definir',
      fechaevento:     data.fechaevento,
      horaevento:      data.horaevento,
      responsable_evento: responsableCompleto,
      idacademico:     req.user.idusuario,
      idclasificacion: data.idclasificacion || null,
      idsubcategoria:  data.idsubcategoria  || null,
      argumentacion:   data.argumentacion   || null,
      evento_externo:  data.evento_externo  || false,
    }, { transaction: t });
 
    const nuevoEventoId = nuevoEvento.idevento;
    console.log('✅ Evento creado con ID:', nuevoEventoId);
 
    const faseMaestra = await Fase.findOne({ where: { nrofase: 1 }, transaction: t });
    if (faseMaestra) {
      nuevoEvento.idfase = faseMaestra.idfase;
      await nuevoEvento.save({ transaction: t });
    }
 
    if (Array.isArray(data.tipos_de_evento) && data.tipos_de_evento.length > 0) {
      const tiposData = data.tipos_de_evento.map(tipo => [
        nuevoEventoId,
        tipo.id,
        tipo.texto_personalizado || null
      ]);
 
      await sequelize.query(
        `INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado)
         VALUES ${tiposData.map(() => '(?, ?, ?)').join(', ')}`,
        { replacements: tiposData.flat(), transaction: t }
      );
      console.log('✅ Tipos de evento insertados:', data.tipos_de_evento.length);
    }
 
    // ── 4. OBJETIVOS NORMALES (id 1-5) ───────────────────────────────────────
    // FIX: objetivosInsertados se declara FUERA de todos los bloques if
    //      para que tanto objetivos normales como PDI lo puedan llenar,
    //      y el bloque de segmentos pueda consumirlo al final.
    const objetivosInsertados = [];
 
    if (Array.isArray(data.objetivos) && data.objetivos.length > 0) {
      const objetivosNormales = data.objetivos.filter(obj => {
        const id = typeof obj === 'number' ? obj : obj.id;
        return id >= 1 && id <= 5;
      });
 
      for (const obj of objetivosNormales) {
        const idtipoobjetivo = typeof obj === 'number' ? obj : obj.id;
 
        const [objetivoResult] = await sequelize.query(
          `INSERT INTO objetivos (idtipoobjetivo, idargumentacion, texto_personalizado, idobjetivo_pdi)
           VALUES (?, NULL, NULL, NULL)
           RETURNING idobjetivo`,
          { replacements: [idtipoobjetivo], transaction: t }
        );
 
        const idobjetivo = objetivoResult[0]?.idobjetivo;
        if (!idobjetivo) continue;
 
        await sequelize.query(
          `INSERT INTO evento_objetivos (idevento, idtipoobjetivo, texto_personalizado, idobjetivo)
           VALUES (?, ?, NULL, ?)`,
          { replacements: [nuevoEventoId, idtipoobjetivo, idobjetivo], transaction: t }
        );
 
        // FIX: push al array compartido
        objetivosInsertados.push({ idobjetivo, idtipoobjetivo });
      }
      console.log('✅ Objetivos normales insertados:', objetivosNormales.length);
    }
 
    // ── 5. OBJETIVOS PDI ─────────────────────────────────────────────────────
    if (Array.isArray(data.objetivos_pdi) && data.objetivos_pdi.length > 0) {
      const pdiValidos = data.objetivos_pdi.filter(desc => desc && desc.trim() !== '');
 
      for (const descripcion of pdiValidos) {
        const [pdiResult] = await sequelize.query(
          `INSERT INTO evento_pdi (idevento, descripcion)
           VALUES (?, ?)
           RETURNING idevento_pdi`,
          { replacements: [nuevoEventoId, descripcion.trim()], transaction: t }
        );
 
        const idevento_pdi = pdiResult[0]?.idevento_pdi;
        if (!idevento_pdi) continue;
 
        const [objetivoResult] = await sequelize.query(
          `INSERT INTO objetivos (idtipoobjetivo, idargumentacion, texto_personalizado, idobjetivo_pdi)
           VALUES (6, NULL, ?, ?)
           RETURNING idobjetivo`,
          { replacements: [`PDI: ${descripcion.trim()}`, idevento_pdi], transaction: t }
        );
 
        const idobjetivo = objetivoResult[0]?.idobjetivo;
        if (!idobjetivo) continue;
 
        await sequelize.query(
          `INSERT INTO evento_objetivos (idevento, idtipoobjetivo, texto_personalizado, idobjetivo)
           VALUES (?, 6, ?, ?)`,
          { replacements: [nuevoEventoId, `PDI: ${descripcion.trim()}`, idobjetivo], transaction: t }
        );
 
        objetivosInsertados.push({ idobjetivo, idtipoobjetivo: 6 });
      }
      console.log('✅ Objetivos PDI insertados:', pdiValidos.length);
    }
 
    // ── 6. SEGMENTOS → vinculados a TODOS los objetivos insertados ───────────
    if (Array.isArray(data.segmentos_objetivo) && data.segmentos_objetivo.length > 0 && objetivosInsertados.length > 0) {
      const segmentoData = [];
 
      for (const objetivo of objetivosInsertados) {
        for (const segmento of data.segmentos_objetivo) {
          segmentoData.push([
            objetivo.idobjetivo,
            segmento.id,
            segmento.texto_personalizado || null
          ]);
        }
      }
 
      if (segmentoData.length > 0) {
        await sequelize.query(
          `INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado)
           VALUES ${segmentoData.map(() => '(?, ?, ?)').join(', ')}`,
          { replacements: segmentoData.flat(), transaction: t }
        );
        console.log('✅ Segmentos vinculados:', segmentoData.length, 'relaciones');
      }
    }
 
    // ── 7. RESULTADOS ESPERADOS ──────────────────────────────────────────────
    const resultados = typeof data.resultados_esperados === 'string'
      ? JSON.parse(data.resultados_esperados)
      : (data.resultados_esperados || {});
 
    await Resultado.create({
      idevento:              nuevoEventoId,
      participacion_esperada: parseInt(resultados.participacion, 10) || 0,
      satisfaccion_esperada:  resultados.satisfaccion || null,
      otros_resultados:       resultados.otro || null,
    }, { transaction: t });
    console.log('✅ Resultados esperados insertados');
 
    // ── 8. RECURSOS EXISTENTES ───────────────────────────────────────────────
    if (Array.isArray(data.recursos_existentes) && data.recursos_existentes.length > 0) {
      const recursosData = data.recursos_existentes.map(id => [nuevoEventoId, id]);
 
      await sequelize.query(
        `INSERT INTO evento_recurso (idevento, idrecurso)
         VALUES ${recursosData.map(() => '(?, ?)').join(', ')}`,
        { replacements: recursosData.flat(), transaction: t }
      );
      console.log('✅ Recursos existentes vinculados:', data.recursos_existentes.length);
    }
 
    // ── 9. RECURSOS NUEVOS ───────────────────────────────────────────────────
    if (Array.isArray(data.recursos_nuevos) && data.recursos_nuevos.length > 0) {
      for (const recurso of data.recursos_nuevos) {
        const [result] = await sequelize.query(
          `INSERT INTO recurso (nombre_recurso, recurso_tipo, cantidad, habilitado)
           VALUES (?, ?, ?, ?)
           RETURNING idrecurso`,
          { replacements: [recurso.nombre_recurso, recurso.recurso_tipo, recurso.cantidad || 1, true], transaction: t }
        );
        const nuevoIdRecurso = result[0]?.idrecurso;
        if (nuevoIdRecurso) {
          await sequelize.query(
            `INSERT INTO evento_recurso (idevento, idrecurso) VALUES (?, ?)`,
            { replacements: [nuevoEventoId, nuevoIdRecurso], transaction: t }
          );
        }
      }
      console.log('✅ Recursos nuevos creados y vinculados:', data.recursos_nuevos.length);
    }
 
    // ── 10. PRESUPUESTO ──────────────────────────────────────────────────────
    if (data.presupuesto) {
      const presupuesto = await Presupuesto.create({
        idevento:       nuevoEventoId,
        total_egresos:  data.presupuesto.total_egresos  || 0,
        total_ingresos: data.presupuesto.total_ingresos || 0,
        balance:        data.presupuesto.balance        || 0,
      }, { transaction: t });
 
      const egresosValidos = (data.presupuesto.egresos || []).filter(e => e.descripcion?.trim());
      if (egresosValidos.length > 0) {
        await Egreso.bulkCreate(
          egresosValidos.map(e => ({
            idpresupuesto:   presupuesto.idpresupuesto,
            descripcion:     e.descripcion,
            cantidad:        parseFloat(e.cantidad)        || 0,
            precio_unitario: parseFloat(e.precio_unitario) || 0,
            total:           parseFloat(e.total)           || 0,
          })),
          { transaction: t }
        );
      }
 
      const ingresosValidos = (data.presupuesto.ingresos || []).filter(i => i.descripcion?.trim());
      if (ingresosValidos.length > 0) {
        await Ingreso.bulkCreate(
          ingresosValidos.map(i => ({
            idpresupuesto:   presupuesto.idpresupuesto,
            descripcion:     i.descripcion,
            cantidad:        parseFloat(i.cantidad)        || 0,
            precio_unitario: parseFloat(i.precio_unitario) || 0,
            total:           parseFloat(i.total)           || 0,
          })),
          { transaction: t }
        );
      }
      console.log('✅ Presupuesto insertado');
    }
 
    // ── 11. COMITÉ ───────────────────────────────────────────────────────────
    if (Array.isArray(data.comite) && data.comite.length > 0) {
      const comiteData = data.comite.map((idusuario, index) => [
        nuevoEventoId,
        index + 1,
        new Date(),
        index === 0,
        idusuario
      ]);
 
      await sequelize.query(
        `INSERT INTO comite (idevento, idcomite, created_at, es_creador, idusuario)
         VALUES ${comiteData.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
        { replacements: comiteData.flat(), transaction: t }
      );
      console.log('✅ Comité insertado:', data.comite.length, 'miembros');
    }
 
    await t.commit();
    console.log('✅ Transacción completada exitosamente');
 
    // ── NOTIFICACIONES (no bloqueante) ───────────────────────────────────────
    if (Array.isArray(data.comite) && data.comite.length > 0) {
      setImmediate(async () => {
        try {
          const { sendNotification } = require('./notificationController.js');
          for (const idusuario of data.comite) {
            await sendNotification({
              idusuario,
              titulo: '🎯 Nuevo evento en tu comité',
              mensaje: `Se ha creado: "${nuevoEvento.nombreevento}" - ${nuevoEvento.fechaevento}. Por favor, revísalo.`,
              tipo: 'comite_invitacion',
              id_relacionado: nuevoEventoId,
              estado: 'pendiente'
            });
          }
          console.log(`✅ Notificaciones enviadas a ${data.comite.length} miembros del comité`);
        } catch (notificationError) {
          console.warn('⚠️ Error no crítico al notificar al comité:', notificationError.message);
        }
      });
    }
 
    res.status(201).json({ message: 'Evento creado exitosamente', idevento: nuevoEventoId });
 
  } catch (error) {
    await t.rollback();
    console.error('❌ Error en la transacción al crear el evento:', error);
    res.status(500).json({
      message: 'Error interno del servidor al crear el evento.',
      error: error.message,
      details: error.stack
    });
  }
};
const fetchAllEvents = async () => {
  const { Evento } = getModels();
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
  const { Evento, Resultado, User, Comite, Objetivo, ObjetivoPDI, Segmento, Recurso, Actividad, Servicio } = models;
  const sequelize = models.sequelize;
  try {
    const { id } = req.params;
    const eventIdNum = parseInt(id, 10);

    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    const evento = await Evento.findByPk(eventIdNum, {
      include: [
        {
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role'],
          required: false
        },
        { model: models.Fase, as: 'fases', attributes: ['nrofase'] }
      ]
    });

    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    const actividades = await Actividad.findAll({
      where: { idevento: eventIdNum },
      attributes: ['nombre', 'responsable', 'fecha_inicio', 'fecha_fin', 'tipo']
    });

    const servicios = await Servicio.findAll({
      where: { idevento: eventIdNum },
      attributes: ['nombreservicio', 'fechadeentrega', 'caracteristicas', 'observaciones']
    });

    const [tiposDeEvento] = await sequelize.query(
      `SELECT et.idevento,t."nombretipo", et."texto_personalizado"
       FROM "evento_tipos" et
       JOIN "tipos_de_evento" t ON et."idtipoevento" = t."idtipoevento"
       WHERE et."idevento" = ?`,
      { replacements: [eventIdNum] }
    );

    const [resultados] = await sequelize.query(
      `SELECT "satisfaccion_esperada","otros_resultados","participacion_esperada", "satisfaccion_real" FROM "resultado"
       WHERE idevento=?`,
      { replacements: [eventIdNum] }
    );

    const [clasificacionData] = await sequelize.query(
      `SELECT e."idevento", c."nombre_clasificacion", s."nombre_subcategoria",
              c."idclasificacion", s."idsubcategoria"
       FROM "evento" e
       LEFT JOIN "clasificacion_estrategica" c ON e."idclasificacion" = c."idclasificacion"
       LEFT JOIN "subcategoria" s ON e."idsubcategoria" = s."idsubcategoria"
       WHERE e."idevento" = ? LIMIT 1`,
      { replacements: [eventIdNum] }
    );
    const clasificacion = clasificacionData[0] || null;

    const [objetivosRaw] = await sequelize.query(
      `SELECT eo."idevento", o."idobjetivo", o."idtipoobjetivo", o."texto_personalizado",
              t."nombre_objetivo", s."nombre_segmento", s."idsegmento",
              os."texto_personalizado" AS segmento_texto,
              a."texto_argumentacion" AS argumentacion
       FROM "evento_objetivos" eo
       JOIN "objetivos" o ON eo."idobjetivo" = o."idobjetivo"
       LEFT JOIN "tipos_objetivo" t ON o."idtipoobjetivo" = t."idtipoobjetivo" 
       LEFT JOIN "objetivo_segmento" os ON o."idobjetivo" = os."idobjetivo"
       LEFT JOIN "segmento" s ON os."idsegmento" = s."idsegmento"
       LEFT JOIN "argumentacion" a ON o."idobjetivo" = a."idobjetivo"
       WHERE eo."idevento" = ?`,
      { replacements: [eventIdNum] }
    );

    const objetivosMap = new Map();
    objetivosRaw.forEach(row => {
      if (!objetivosMap.has(row.idobjetivo)) {
        objetivosMap.set(row.idobjetivo, {
          idobjetivo: row.idobjetivo,
          idtipoobjetivo: row.idtipoobjetivo,
          texto_personalizado: row.texto_personalizado,
          nombre_objetivo: row.nombre_objetivo, 
          pdi_descripciones: [],
          segmentos: [],
          argumentacion: row.argumentacion || null  
        });
      }
      const obj = objetivosMap.get(row.idobjetivo);
      if (row.idsegmento) obj.segmentos.push({
        idsegmento: row.idsegmento,
        nombre_segmento: row.nombre_segmento,
        texto_personalizado: row.segmento_texto
      });
    });

    const objetivos = Array.from(objetivosMap.values());
    
    const pdiRows = await sequelize.query(
      `SELECT "descripcion" FROM evento_pdi WHERE idevento = :idevento ORDER BY idevento_pdi ASC`,
      { replacements: { idevento: eventIdNum }, type: sequelize.QueryTypes.SELECT }
    );
    const pdiIndependientes = pdiRows.map(row => row.descripcion);

    const [comiteRaw] = await sequelize.query(
      `SELECT u."idusuario", u."nombre", u."apellidopat", u."apellidomat", 
              u."email", u."role"
       FROM "comite" c
       JOIN "usuario" u ON c."idusuario" = u."idusuario"
       WHERE c."idevento" = ?`,
      { replacements: [eventIdNum] }
    );
    const comite = comiteRaw;

    const [recursosRaw] = await sequelize.query(
      `SELECT r."idrecurso", r."nombre_recurso", r."recurso_tipo", 
              r."descripcion", r."habilitado"
       FROM "evento_recurso" er
       JOIN "recurso" r ON er."idrecurso" = r."idrecurso"
       WHERE er."idevento" = ?`,
      { replacements: [eventIdNum] }
    );
    const recursos = recursosRaw;

    const [presupuestoRaw] = await sequelize.query(
  `SELECT p.idpresupuesto, p.total_egresos, p.total_ingresos, p.balance,
          json_agg(DISTINCT jsonb_build_object('descripcion', e.descripcion, 'cantidad', e.cantidad, 'precio_unitario', e.precio_unitario, 'total', e.total)) FILTER (WHERE e.idegreso IS NOT NULL) AS egresos,
          json_agg(DISTINCT jsonb_build_object('descripcion', i.descripcion, 'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario, 'total', i.total)) FILTER (WHERE i.idingreso IS NOT NULL) AS ingresos
   FROM presupuesto p
   LEFT JOIN egreso e ON e.idpresupuesto = p.idpresupuesto
   LEFT JOIN ingreso i ON i.idpresupuesto = p.idpresupuesto
   WHERE p.idevento = ?
   GROUP BY p.idpresupuesto`,
  { replacements: [eventIdNum] }
);
const presupuesto = presupuestoRaw[0] || null;

    const eventoCompleto = {
      ...evento.toJSON(),
      actividadesPrevias: actividades.filter(a => a.tipo === 'Previa'),
      actividadesDurante: actividades.filter(a => a.tipo === 'Durante'),
      actividadesPost: actividades.filter(a => a.tipo === 'Posterior'),
      serviciosContratados: servicios,
      Resultados: resultados || [],
      TiposDeEvento: tiposDeEvento,
      Objetivos: objetivos,
      Comite: comite,
      Recursos: recursos,
      Presupuesto: presupuesto,
      ObjetivosPDI: pdiIndependientes,
      Clasificacion: clasificacion,
      fase: evento.fases ? [{ nrofase: evento.fases.nrofase }] : []
    };

    res.status(200).json(eventoCompleto);

  } catch (error) {
    console.error('Error detallado en getEventoById:', error);
    res.status(500).json({ message: 'Error al obtener evento', error: error.message });
  }
});

const updateEvento = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Evento, Actividad, Servicio, Fase } = models;
  const sequelize = models.sequelize;
  const t = await sequelize.transaction();
  
  try {
    const evento = await Evento.findByPk(req.params.id, { transaction: t });
    if (!evento) {
      await t.rollback();
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    const camposBasicos = ['nombreevento', 'lugarevento', 'fechaevento', 'horaevento', 'responsable'];
    camposBasicos.forEach(campo => {
      if (req.body[campo] !== undefined) evento[campo] = req.body[campo];
    });

    if (req.body.idlayout !== undefined) evento.idlayout = req.body.idlayout;

    // ACTIVIDADES
    const tiposActividad = ['actividadesPrevias', 'actividadesDurante', 'actividadesPost'];
    for (const tipo of tiposActividad) {
      if (Array.isArray(req.body[tipo])) {
        await Actividad.destroy({
          where: { idevento: evento.idevento, tipo: tipo },
          transaction: t
        });
        const nuevas = req.body[tipo].map(act => ({
          idevento: evento.idevento,
          nombre: act.nombreActividad,
          responsable: act.responsable,
          fecha_inicio: act.fechaInicio,
          fecha_fin: act.fechaFin,
          tipo: tipo
        }));
        if (nuevas.length > 0) await Actividad.bulkCreate(nuevas, { transaction: t });
      }
    }

    // SERVICIOS
    if (Array.isArray(req.body.serviciosContratados)) {
      await Servicio.destroy({ where: { idevento: evento.idevento }, transaction: t });
      const nuevosServicios = req.body.serviciosContratados.map(s => ({
        idevento: evento.idevento,
        nombreservicio: s.nombreServicio,
        fechadeentrega: s.fechaInicio instanceof Date ? s.fechaInicio.toISOString().split('T')[0] : s.fechaInicio,
        caracteristicas: s.caracteristica,
        observaciones: s.observaciones
      }));
      if (nuevosServicios.length > 0) await Servicio.bulkCreate(nuevosServicios, { transaction: t });
    }

    if (req.body.nuevaFase?.nrofase) {
      const faseObj = await Fase.findOne({
        where: { nrofase: req.body.nuevaFase.nrofase },
        attributes: ['idfase'],
        transaction: t
      });
      if (faseObj) evento.idfase = faseObj.idfase;
    }

    await evento.save({ transaction: t });
    await t.commit();

    const eventoActualizado = await Evento.findByPk(evento.idevento, {
      include: [
        { model: Actividad, as: 'actividades' },
        { model: Servicio, as: 'servicios' }
      ]
    });

    res.status(200).json(eventoActualizado);
  } catch (error) {
    await t.rollback();
    console.error('Error en updateEvento:', error);
    res.status(500).json({ message: 'Error al actualizar evento', error: error.message });
  }
});

const deleteEvento = asyncHandler(async (req, res) => {
  let models;
  try {
    models = getModels();
  } catch (e) {
    return res.status(500).json({ message: 'Servidor no listo' });
  }

  const { Evento } = models;
  const sequelize = models.sequelize;
  const { id } = req.params;
  const { razon_rechazo } = req.body;

  if (!id) return res.status(400).json({ message: 'ID de evento requerido' });

  const t = await sequelize.transaction();
  try {
    const evento = await Evento.findByPk(id, { transaction: t });
    if (!evento) {
      await t.rollback();
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // ✅ Usa las columnas exactas que tiene tu tabla
    await sequelize.query(
      `UPDATE evento 
       SET estado = 'rechazado',
           fecha_rechazo = NOW(),
           razon_rechazo = ?,
       WHERE idevento = ?`,
      { 
        replacements: [razon_rechazo || null, id], 
        transaction: t 
      }
    );

    await t.commit();
    console.log(`✅ Evento ${id} rechazado`);

    res.status(200).json({
      message: 'Evento rechazado correctamente',
      idevento: id,
      estado: 'rechazado'
    });

  } catch (error) {
    await t.rollback();
    console.error('❌ Error al rechazar evento:', error);
    res.status(500).json({ 
      message: 'Error al procesar el rechazo', 
      error: error.message 
    });
  }
});

const fetchEventsWithRawQuery = async () => {
  let models;
  try {
    models = getModels();
  } catch (e) {
    console.warn('[DB] Models aún no listos:', e.message);
    return [];
  }

  const { Evento } = models;

  if (!Evento) {
    console.warn('[DB] Modelo Evento no disponible todavía.');
    return [];
  }

  try {
    console.log('[DB] Buscando eventos con Sequelize...');
    const eventos = await Evento.findAll({
      attributes: ['idevento', 'nombreevento', 'lugarevento', 'fechaevento', 'horaevento'],
      order: [['fechaevento', 'DESC']]
    });
    console.log(`[DB] Se encontraron ${eventos.length} eventos.`);
    return eventos;
  } catch (error) {
    console.error('Error in fetchEventsWithRawQuery:', error);
    return []; // ← no relanzar, retornar vacío
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

const fetchEventById = async (id) => 
  {
    const models = getModels();
    const { Evento } = models;
  const sequelize = models.sequelize;
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


module.exports = {
  createEvento,
  fetchAllEvents,
  getEventoById,
  updateEvento,
  deleteEvento,
  fetchEventsWithRawQuery,
  getEventos,
  fetchEventById,
  getEventoByIdA
};