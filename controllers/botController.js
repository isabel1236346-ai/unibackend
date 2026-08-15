const axios = require('axios');
const { getModels } = require('../models/index.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');
const FormData = require('form-data');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

const getEventosAprobadosForBot = async (usuarioId, userRole) => {
  const models = getModels();
  const { Evento, User, Fase, Academico } = models;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      eventos = await Evento.findAll({
        where: { estado: 'aprobado' },
        attributes: { include: ['idfase'] },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['nombre', 'apellidopat', 'apellidomat']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      // Para académico: eventos propios + eventos de su facultad + eventos donde es comité
      const eventosEnComite = await models.sequelize.query(
        'SELECT idevento FROM comite WHERE idusuario = ?',
        { replacements: [usuarioId], type: models.sequelize.QueryTypes.SELECT }
      );
      const idsEventosComite = eventosEnComite.map(r => r.idevento);

      const academicoActual = await Academico.findOne({
        where: { idusuario: usuarioId },
        attributes: ['facultad_id']
      });

      let idsCreadores = [];
      if (academicoActual?.facultad_id) {
        const creadoresMismaFacultad = await Academico.findAll({
          where: { facultad_id: academicoActual.facultad_id },
          attributes: ['idusuario']
        });
        idsCreadores = creadoresMismaFacultad.map(a => a.idusuario);
      }

      const condiciones = [];
      if (idsCreadores.length > 0) {
        condiciones.push({ idacademico: { [Op.in]: idsCreadores } });
      }
      if (idsEventosComite.length > 0) {
        condiciones.push({ idevento: { [Op.in]: idsEventosComite } });
      }

      if (condiciones.length === 0) {
        return { activos: [], vencidos: [], total: 0 };
      }

      eventos = await Evento.findAll({
        where: {
          estado: 'aprobado',
          [Op.or]: condiciones
        },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat']
        }],
        order: [['created_at', 'DESC']]
      });
    }

    const activos = [];
    const vencidos = [];

    eventos.forEach(evento => {
      const fechaEvento = new Date(evento.fechaevento);
      fechaEvento.setHours(0, 0, 0, 0);
      
      const eventData = evento.get({ plain: true });
      eventData.esVencido = fechaEvento < hoy;

      if (fechaEvento >= hoy) {
        activos.push(eventData);
      } else {
        vencidos.push(eventData);
      }
    });

    return { activos, vencidos, total: eventos.length };
  } catch (error) {
    console.error('❌ Error en getEventosAprobadosForBot:', error);
    return { activos: [], vencidos: [], total: 0 };
  }
};

const getEventosNoAprobadosForBot = async (usuarioId, userRole) => {
  const models = getModels();
  const { Evento, User, Academico, Facultad } = models;

  try {
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 1);

    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      eventos = await Evento.findAll({
        where: {
          estado: 'pendiente',
          created_at: { [Op.gte]: fechaLimite }
        },
        distinct: true,
        attributes: { include: ['idfase'] },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const academicoLogueado = await Academico.findOne({
        where: { idusuario: usuarioId },
        attributes: ['facultad_id']
      });
      if (!academicoLogueado) return [];

      eventos = await Evento.findAll({
        where: {
          estado: 'pendiente',
          created_at: { [Op.gte]: fechaLimite }
        },
        subQuery: false,
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
          required: true,
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            where: { facultad_id: academicoLogueado.facultad_id },
            required: true,
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }

    return eventos.map(event => event.get({ plain: true }));
  } catch (error) {
    console.error('❌ Error en getEventosNoAprobadosForBot:', error);
    return [];
  }
};

const getEventosRechazadosForBot = async (usuarioId, userRole) => {
  const models = getModels();
  const { Evento, User, Academico, Facultad } = models;

  try {
    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      eventos = await Evento.findAll({
        where: { estado: 'rechazado' },
        distinct: true,
        attributes: { include: ['idfase', 'razon_rechazo', 'fecha_rechazo'] },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['fecha_rechazo', 'DESC']]
      });
    } else {
      eventos = await Evento.findAll({
        where: {
          estado: 'rechazado',
          idacademico: usuarioId
        },
        distinct: true,
        attributes: { include: ['idfase', 'razon_rechazo', 'fecha_rechazo'] },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat']
        }],
        order: [['fecha_rechazo', 'DESC']]
      });
    }

    return eventos.map(event => event.get({ plain: true }));
  } catch (error) {
    console.error('❌ Error en getEventosRechazadosForBot:', error);
    return [];
  }
};


const formatearEventoAprobado = (evento, index) => {
  const fecha = new Date(evento.fechaevento).toLocaleDateString('es-ES');
  const creador = evento.academicoCreador;
  const organizador = creador 
    ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim() 
    : 'Sin organizador';
  
  return `<b>${index + 1}. ${evento.nombreevento || 'Sin título'}</b>
   🗓️ Fecha: ${fecha}
   🕐 Hora: ${evento.horaevento || 'N/A'}
   📍 Lugar: ${evento.lugarevento || 'Sin ubicación'}
   👤 Organizador: ${organizador}
   ✅ Estado: Aprobado`;
};

const formatearEventoPendiente = (evento, index) => {
  const fecha = new Date(evento.fechaevento).toLocaleDateString('es-ES');
  const creador = evento.academicoCreador;
  const organizador = creador 
    ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim() 
    : 'Sin organizador';
  const facultad = creador?.academico?.facultad?.nombre_facultad || 'Sin facultad';
  
  return `<b>${index + 1}. ${evento.nombreevento || 'Sin título'}</b>
   🗓️ Fecha: ${fecha}
   🕐 Hora: ${evento.horaevento || 'N/A'}
   📍 Lugar: ${evento.lugarevento || 'Sin ubicación'}
   👤 Organizador: ${organizador}
   🏫 Facultad: ${facultad}
   ⏳ Estado: Pendiente de aprobación`;
};

const formatearEventoRechazado = (evento, index) => {
  const fecha = new Date(evento.fechaevento).toLocaleDateString('es-ES');
  const fechaRechazo = evento.fecha_rechazo 
    ? new Date(evento.fecha_rechazo).toLocaleDateString('es-ES') 
    : 'N/A';
  const creador = evento.academicoCreador;
  const organizador = creador 
    ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim() 
    : 'Sin organizador';
  
  let mensaje = `<b>${index + 1}. ${evento.nombreevento || 'Sin título'}</b>
   🗓️ Fecha: ${fecha}
   📍 Lugar: ${evento.lugarevento || 'Sin ubicación'}
   👤 Organizador: ${organizador}
   ❌ Estado: Rechazado
   📅 Fecha de rechazo: ${fechaRechazo}`;
  
  if (evento.razon_rechazo) {
    mensaje += `\n   💬 Motivo: ${evento.razon_rechazo}`;
  }
  
  return mensaje;
};

async function generarPDFEvento(evento, usuario) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = new PassThrough();
    const buffers = [];

    doc.pipe(stream);
    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buffers)));

    // ENCABEZADO INSTITUCIONAL
    doc.fontSize(24).fillColor('#E95A0C').text('UNIFRANZ', { align: 'center' });
    doc.fontSize(11).fillColor('#333333').text('Ficha Técnica del Evento', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E95A0C');
    doc.moveDown(1);

    // ✨ TÍTULO DEL EVENTO EN MAYÚSCULAS
    const tituloEvento = (evento.nombreevento || 'Sin nombre').toUpperCase();
    doc.fontSize(18).fillColor('#1e293b').text(tituloEvento, { align: 'center' });
    doc.moveDown(1);

    // DATOS GENERALES
    doc.fontSize(14).fillColor('#2980b9').text('Datos Generales', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#000000');
    
    const fechaEvento = evento.fechaevento ? 
      new Date(evento.fechaevento).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida';
    
    doc.text(`Fecha: ${fechaEvento}`);
    
    // ✨ HORA LIMPIA (sin segundos)
    const horaLimpia = evento.horaevento ? evento.horaevento.toString().substring(0, 5) : 'No definida';
    doc.text(`Hora: ${horaLimpia}`);
    
    doc.text(`Lugar: ${evento.lugarevento || 'No definido'}`);
    doc.text(`Estado: ${evento.estado?.toUpperCase() || 'N/A'}`);
    doc.text(`Responsable: ${evento.responsable_evento || 'No asignado'}`);
    
    // ✨ ORGANIZADOR Y FACULTAD
    if (usuario) {
      const organizador = [usuario.nombre, usuario.apellidopat, usuario.apellidomat].filter(Boolean).join(' ').trim();
      if (organizador) doc.text(`Organizador: ${organizador}`);
      if (usuario.academico?.facultad?.nombre_facultad) {
        doc.text(`Facultad: ${usuario.academico.facultad.nombre_facultad}`);
      }
    }
    doc.moveDown(1);

    // DESCRIPCIÓN
    if (evento.descripcion) {
      doc.fontSize(14).fillColor('#2980b9').text('Descripción', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000').text(evento.descripcion, { align: 'justify' });
      doc.moveDown(1);
    }

    // ACTIVIDADES (Previas, Durante, Post)
    const agregarActividades = (titulo, actividades) => {
      if (!actividades || actividades.length === 0) return;
      if (doc.y > 700) doc.addPage();
      doc.fontSize(14).fillColor('#2980b9').text(titulo, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000');
      actividades.forEach((act, i) => {
        doc.text(`${i + 1}. ${act.nombre || act.nombreActividad || 'Actividad'}`);
        doc.text(`   Responsable: ${act.responsable || 'N/A'}`, { indent: 20 });
        doc.text(`   Fechas: ${act.fecha_inicio || act.fechaInicio || 'N/A'} al ${act.fecha_fin || act.fechaFin || 'N/A'}`, { indent: 20 });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.5);
    };

    agregarActividades('Actividades Previas', evento.actividadesPrevias);
    agregarActividades('Actividades Durante el Evento', evento.actividadesDurante);
    agregarActividades('Actividades Después del Evento', evento.actividadesPost);

    // COMITÉ
    if (evento.comite && evento.comite.length > 0) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(14).fillColor('#2980b9').text('Comité del Evento', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000');
      evento.comite.forEach(miembro => {
        const nombre = [miembro.nombre, miembro.apellidopat, miembro.apellidomat].filter(Boolean).join(' ');
        doc.text(`• ${nombre} (${miembro.role}) - ${miembro.email}`);
      });
      doc.moveDown(1);
    }

    // RECURSOS
    if (evento.recursos && evento.recursos.length > 0) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(14).fillColor('#2980b9').text('Recursos Solicitados', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000');
      evento.recursos.forEach(r => {
        doc.text(`• ${r.cantidad || 1} x ${r.nombre_recurso} (${r.recurso_tipo})`);
      });
      doc.moveDown(1);
    }

    // PRESUPUESTO
    if (evento.presupuesto) {
      if (doc.y > 650) doc.addPage();
      doc.fontSize(14).fillColor('#2980b9').text('Presupuesto', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000000');
      doc.text(`Total Egresos: Bs ${(evento.presupuesto.total_egresos || 0).toFixed(2)}`);
      doc.text(`Total Ingresos: Bs ${(evento.presupuesto.total_ingresos || 0).toFixed(2)}`);
      const balanceColor = (evento.presupuesto.balance || 0) >= 0 ? '#27ae60' : '#e74c3c';
      doc.fillColor(balanceColor).text(`Balance: Bs ${(evento.presupuesto.balance || 0).toFixed(2)}`, { bold: true });
      doc.fillColor('#000000');
      doc.moveDown(1);
    }

    // ✨ FIRMAS OFICIALES (espacio para imprimir)
    if (doc.y < 620) {
      doc.moveDown(2);
      const y = doc.y;
      doc.strokeColor('#000000');
      doc.moveTo(80, y + 40).lineTo(250, y + 40).stroke();
      doc.fontSize(9).fillColor('#333333').text('Firma del Responsable', 80, y + 45, { width: 170, align: 'center' });
      doc.moveTo(350, y + 40).lineTo(520, y + 40).stroke();
      doc.text('Vo. Bo. DAF', 350, y + 45, { width: 170, align: 'center' });
    }

    // PIE DE PÁGINA
    const pageCount = doc.bufferedPageCount;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#999999')
        .text(`Documento generado el ${new Date().toLocaleString('es-ES')} - UNIFRANZ`, 
          50, 750, { align: 'center', width: 500 });
    }

    doc.end();
  });
}

async function askGemini(userMessage, senderInfo = 'Invitado', eventosContexto = "", history = []) {
  const SYSTEM_PROMPT = `Eres el asistente virtual de gestión de eventos de la UNIFRANZ.
📌 REGLAS:
- Responde SOLO con la información del contexto proporcionado.
- Si falta un dato, di: "No tengo información actualizada sobre [tema]".
- Sé conciso (máx 3-4 líneas). Usa formato claro.
- No inventes fechas, responsables ni estados.

📊 CONTEXTO DEL SISTEMA:
${eventosContexto || "Sin eventos activos en este momento."}`;

  const contents = [];
  
  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.parts?.[0]?.text || msg.text || '' }]
    });
  }
  
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: SYSTEM_PROMPT
      });

      const result = await model.generateContent({ contents });
      return result.response.text();
      
    } catch (err) {
      console.warn(`⚠️ Fallo con ${modelName}:`, err.message);
      if (err.message?.includes('systemInstruction')) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const fallbackContents = [
            { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nPregunta: ${userMessage}` }] },
            ...contents.slice(1)
          ];
          const result = await model.generateContent({ contents: fallbackContents });
          return result.response.text();
        } catch (fallbackErr) {
          console.warn(`⚠️ Fallback también falló para ${modelName}`);
          continue;
        }
      }
      continue;
    }
  }
  return "⚠️ Servicio temporalmente ocupado. Intenta en unos segundos.";
}

function getMessage() {
  try { return getModels()?.Message || null; } catch { return null; }
}


const appChat = async (req, res) => {
  try {
    const models = getModels();
    const { Evento, Message } = models;
    const { message, sender = 'invitado', eventId, history = [] } = req.body;

    if (!message?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });

    let eventosContexto = "";

    if (Evento && eventId) {
      const evento = await Evento.findByPk(eventId, {
        attributes: ['nombreevento', 'fechaevento', 'descripcion', 'lugarevento', 'estado']
      });
      if (evento) {
        eventosContexto = `EVENTO CONSULTADO:\n• Nombre: ${evento.nombreevento}\n• Fecha: ${evento.fechaevento}\n• Lugar: ${evento.lugarevento}\n• Estado: ${evento.estado}\n• Descripción: ${evento.descripcion}`;
      }
    } 
    else if (Evento) {
      const lista = await Evento.findAll({ 
        where: { estado: 'aprobado' }, 
        limit: 4, 
        attributes: ['nombreevento', 'fechaevento', 'estado'] 
      });
      if (lista.length > 0) {
        eventosContexto = "Eventos aprobados:\n" + lista.map(e => 
          `- ${e.nombreevento} (${e.fechaevento}) [${e.estado}]`
        ).join('\n');
      }
    }

    const reply = await askGemini(message, sender, eventosContexto, history);

    if (Message && sender !== 'invitado' && sender !== 'anonymous') {
      await Promise.all([
        Message.create({ 
          sender, 
          text: message, 
          role: 'user', 
          eventId: eventId || null, 
          timestamp: new Date() 
        }),
        Message.create({ 
          sender, 
          text: reply, 
          role: 'bot', 
          eventId: eventId || null, 
          timestamp: new Date() 
        })
      ]);
    }

    res.json({ reply, eventId });
  } catch (error) {
    console.error('❌ Error en appChat:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { platform, externalId } = req.params;
    res.json({ platform, externalId, messages: [] });
  } catch { res.status(500).json({ error: 'Error al obtener mensajes' }); }
};

const botStatus = (req, res) => {
  res.json({ status: 'online', platform: 'gemini', timestamp: new Date().toISOString() });
};

const telegramWebhook = async (req, res) => {
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (WEBHOOK_SECRET) {
    const telegramSecretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (telegramSecretHeader !== WEBHOOK_SECRET) {
      console.warn('⚠️ Acceso denegado: Petición al webhook sin el secreto correcto.');
      return res.status(403).send('Forbidden');
    }
  }

  console.log('📩 [TELEGRAM] Webhook recibido');
  
  const { message, callback_query } = req.body;
  
  // 🛡️ Variables seguras para todo el código
  let chatId = null;
  let text = '';
  let isCallback = false;
  let callbackQueryId = null;

  // Caso 1: Mensaje normal de texto
  if (message && message.chat && message.text) {
    chatId = message.chat.id;
    text = message.text.trim();
  } 
  // Caso 2: Click en botón inline (callback_query)
  else if (callback_query && callback_query.message && callback_query.data) {
    chatId = callback_query.message.chat.id;
    text = callback_query.data;
    isCallback = true;
    callbackQueryId = callback_query.id;
  } 
  // Caso 3: Cualquier otra actualización de Telegram
  else {
    console.log('ℹ️ Update ignorado (no es mensaje ni botón)');
    return res.sendStatus(200);
  }

  try {
   
        if (isCallback && text.startsWith('pdf_')) {
      const idevento = text.replace('pdf_', '');
      const models = getModels();
      const { User, Evento, Academico, Facultad } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.'
        });
        return res.status(200).send('OK');
      }

      // 1️ Intento con asociaciones comprobadas que SÍ funcionan
      let evento = null;
      try {
        evento = await Evento.findOne({
          where: { idevento: idevento, idacademico: usuario.idusuario },
          include: [
            { association: 'academicoCreador' },
            { association: 'comite' },
            { association: 'Recursos' },
            { association: 'clasificacion' },
            { association: 'subcategoria' },
            { association: 'Resultados' },
            { association: 'Objetivos' },
            { association: 'tiposDeEvento' },
            { association: 'Layout' },
            { association: 'creador' }
          ]
        });
      } catch (e) {
        // 2️⃣ Si algo falla, reintenta SIN asociaciones (el PDF saldrá con datos básicos)
        console.warn('⚠️ Include falló, reintentando sin asociaciones:', e.message);
        evento = await Evento.findOne({
          where: { idevento: idevento, idacademico: usuario.idusuario }
        });
      }

      if (!evento) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Evento no encontrado o no tienes permisos.'
        });
        return res.status(200).send('OK');
      }

      // 3️⃣ Normalizar nombres para el PDF (mayúsculas/minúsculas)
      evento.dataValues.recursos = evento.dataValues.Recursos || evento.dataValues.recursos || [];
      evento.dataValues.comite = evento.dataValues.comite || evento.dataValues.Comite || [];

      // 4️⃣ Datos extra opcionales (si fallan, simplemente no salen en el PDF)
      try {
        if (models.Fase && evento.idfase) {
          const fase = await models.Fase.findOne({ where: { idfase: evento.idfase } });
          evento.dataValues.faseActual = fase;
        }
      } catch (e) { /* sin fase */ }

      try {
        if (models.Actividad) {
          const acts = await models.Actividad.findAll({ where: { idevento: idevento } });
          const tipo = (a) => String(a.tipo || a.tipoactividad || a.fase || '').toLowerCase();
          evento.dataValues.actividadesPrevias = acts.filter(a => tipo(a).includes('prev'));
          evento.dataValues.actividadesDurante = acts.filter(a => tipo(a).includes('dur'));
          evento.dataValues.actividadesPost = acts.filter(a => tipo(a).includes('post') || tipo(a).includes('desp'));
          if (!evento.dataValues.actividadesPrevias.length && !evento.dataValues.actividadesDurante.length && !evento.dataValues.actividadesPost.length) {
            evento.dataValues.actividadesPrevias = acts; // si no hay campo tipo, mostrar todas como previas
          }
        }
      } catch (e) { /* sin actividades */ }

      try {
        if (models.Servicio) {
          evento.dataValues.serviciosContratados = await models.Servicio.findAll({ where: { idevento: idevento } });
        }
      } catch (e) { /* sin servicios */ }

      try {
        if (models.Presupuesto) {
          const pres = await models.Presupuesto.findOne({ where: { idevento: idevento } });
          if (pres) {
            if (models.Egreso) pres.dataValues.egresos = await models.Egreso.findAll({ where: { idpresupuesto: pres.idpresupuesto } });
            if (models.Ingreso) pres.dataValues.ingresos = await models.Ingreso.findAll({ where: { idpresupuesto: pres.idpresupuesto } });
            evento.dataValues.presupuesto = pres;
          }
        }
      } catch (e) { /* sin presupuesto */ }

      // 5️⃣ Generar y enviar el PDF
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `⏳ Generando PDF de: <b>${evento.nombreevento}</b>...`,
        parse_mode: 'HTML'
      });

      try {
        const usuarioConFacultad = await User.findOne({
          where: { idusuario: usuario.idusuario },
          include: [{ model: Academico, as: 'academico', include: [{ model: Facultad, as: 'facultad' }] }]
        });

        const pdfBuffer = await generarPDFEvento(evento, usuarioConFacultad);

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('document', pdfBuffer, {
          filename: `Ficha_${evento.nombreevento.replace(/\s+/g, '_').substring(0, 30)}.pdf`,
          contentType: 'application/pdf'
        });
        form.append('caption', `📄 <b>Ficha Técnica:</b> ${evento.nombreevento}`);

        await axios.post(`${TELEGRAM_API}/sendDocument`, form, {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });

        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: callbackQueryId,
          text: '✅ PDF enviado'
        });

      } catch (error) {
        console.error('❌ Error generando/enviando PDF:', error.message);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '⚠️ Ocurrió un error al generar el documento PDF.'
        });
      }

      return res.status(200).send('OK');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const esEmail = emailRegex.test(text);

    if (esEmail) {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { email: text.toLowerCase() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `❌ Email no encontrado: ${text}\n\nVerifica que sea tu email institucional registrado.`,
        });
        return res.status(200).send('OK');
      }

      if (usuario.telegram_chat_id && usuario.telegram_chat_id !== chatId.toString()) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '⚠️ Este email ya está vinculado con otra cuenta de Telegram.',
        });
        return res.status(200).send('OK');
      }

      await User.update(
        { 
          telegram_chat_id: chatId.toString(),
          telegram_username: message.from.username || message.from.first_name
        },
        { where: { email: text.toLowerCase() } }
      );

      const successMessage = 
`✅ <b>¡Cuenta vinculada exitosamente!</b>

Hola <b>${usuario.nombre} ${usuario.apellidopat || ''}</b>, ahora recibirás notificaciones sobre:

• ✅ Aprobación de eventos
• ❌ Rechazo de eventos (con motivo)
• ⏰ Recordatorios 3 días antes de tu evento

¡Mantente informado! 🎉`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: successMessage,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    // ============================================
    // 📋 COMANDOS
    // ============================================
    if (text === '/start') {
      const welcomeMessage = 
`🤖 <b>¡Bienvenido al Bot de Eventos UNIFRANZ!</b>

Para vincular tu cuenta y recibir notificaciones, envía tu email institucional:

Ejemplo: <code>juan.perez@unifranz.edu.bo</code>

<b>Comandos disponibles:</b>
• /mis_eventos - Eventos aprobados (detallado)
• /pendientes - Eventos pendientes (detallado)
• /rechazados - Eventos rechazados (con motivos)
• /comite - Eventos donde eres comité
• /resumen - Resumen completo con estadísticas
• /ficha_pdf - Descargar ficha en PDF
• /estado - Verificar vinculación
• /desvincular - Desvincular cuenta de Telegram
• /ayuda - Mostrar ayuda`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    if (text === '/estado') {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.\n\nEnvía tu email institucional para vincularla.',
        });
      } else {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `✅ Tu cuenta está vinculada como:\n\n👤 <b>${usuario.nombre} ${usuario.apellidopat || ''}</b>\n📧 ${usuario.email}\n👑 Rol: ${usuario.role || 'usuario'}\n\nRecibirás notificaciones automáticas.`,
          parse_mode: 'HTML'
        });
      }

      return res.status(200).send('OK');
    }

    if (text === '/mis_eventos') {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.\n\nEnvía tu email institucional para vincularla.',
        });
        return res.status(200).send('OK');
      }

      const { activos, vencidos, total } = await getEventosAprobadosForBot(
        usuario.idusuario, 
        usuario.role
      );

      if (total === 0) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '✅ No tienes eventos aprobados.',
        });
        return res.status(200).send('OK');
      }

      let mensajeEventos = `✅ <b>Eventos Aprobados (${total})</b>\n\n`;
      
      if (activos.length > 0) {
        mensajeEventos += `<b>📅 Próximos eventos (${activos.length}):</b>\n\n`;
        activos.slice(0, 5).forEach((evento, index) => {
          mensajeEventos += formatearEventoAprobado(evento, index) + '\n\n';
        });
      }
      
      if (vencidos.length > 0) {
        mensajeEventos += `\n<b>📜 Eventos pasados (${vencidos.length}):</b>\n\n`;
        vencidos.slice(0, 3).forEach((evento, index) => {
          mensajeEventos += formatearEventoAprobado(evento, index) + '\n\n';
        });
      }

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: mensajeEventos,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    if (text === '/pendientes') {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.\n\nEnvía tu email institucional para vincularla.',
        });
        return res.status(200).send('OK');
      }

      const eventosPendientes = await getEventosNoAprobadosForBot(
        usuario.idusuario, 
        usuario.role
      );

      if (eventosPendientes.length === 0) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '✅ No tienes eventos pendientes de aprobación.',
        });
        return res.status(200).send('OK');
      }

      let mensajeEventos = `⏳ <b>Eventos Pendientes (${eventosPendientes.length})</b>\n\n`;
      eventosPendientes.slice(0, 5).forEach((evento, index) => {
        mensajeEventos += formatearEventoPendiente(evento, index) + '\n\n';
      });

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: mensajeEventos,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    if (text === '/rechazados') {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.\n\nEnvía tu email institucional para vincularla.',
        });
        return res.status(200).send('OK');
      }

      const eventosRechazados = await getEventosRechazadosForBot(
        usuario.idusuario, 
        usuario.role
      );

      if (eventosRechazados.length === 0) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '✅ No tienes eventos rechazados.',
        });
        return res.status(200).send('OK');
      }

      let mensajeEventos = `❌ <b>Eventos Rechazados (${eventosRechazados.length})</b>\n\n`;
      eventosRechazados.slice(0, 5).forEach((evento, index) => {
        mensajeEventos += formatearEventoRechazado(evento, index) + '\n\n';
      });

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: mensajeEventos,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    if (text === '/comite') {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.\n\nEnvía tu email institucional para vincularla.',
        });
        return res.status(200).send('OK');
      }

      const comites = await models.sequelize.query(
        `SELECT e.idevento, e.nombreevento, e.fechaevento, e.lugarevento, e.estado,
                u.nombre, u.apellidopat
         FROM comite c
         JOIN evento e ON c.idevento = e.idevento
         LEFT JOIN usuario u ON e.idacademico = u.idusuario
         WHERE c.idusuario = ?
         ORDER BY e.fechaevento ASC`,
        { 
          replacements: [usuario.idusuario],
          type: models.sequelize.QueryTypes.SELECT
        }
      );

      if (!comites || comites.length === 0) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '👥 No eres parte de ningún comité actualmente.',
        });
        return res.status(200).send('OK');
      }

      let mensajeEventos = `👥 <b>Eventos donde eres Comité (${comites.length})</b>\n\n`;
      comites.slice(0, 5).forEach((evento, index) => {
        const fecha = new Date(evento.fechaevento).toLocaleDateString('es-ES');
        const estadoEmoji = {
          'aprobado': '✅',
          'pendiente': '⏳',
          'rechazado': '❌',
          'cancelado': '🚫'
        }[evento.estado] || '📝';
        
        mensajeEventos += `<b>${index + 1}. ${evento.nombreevento}</b>\n`;
        mensajeEventos += `   🗓️ Fecha: ${fecha}\n`;
        mensajeEventos += `   📍 Lugar: ${evento.lugarevento || 'No definido'}\n`;
        mensajeEventos += `   ${estadoEmoji} Estado: ${evento.estado}\n\n`;
      });

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: mensajeEventos,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    if (text === '/resumen') {
      const models = getModels();
      const { User } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.',
        });
        return res.status(200).send('OK');
      }

      const { activos, vencidos, total: totalAprobados } = await getEventosAprobadosForBot(
        usuario.idusuario, 
        usuario.role
      );
      const eventosPendientes = await getEventosNoAprobadosForBot(usuario.idusuario, usuario.role);
      const eventosRechazados = await getEventosRechazadosForBot(usuario.idusuario, usuario.role);

      const comites = await models.sequelize.query(
        'SELECT COUNT(*) as total FROM comite WHERE idusuario = ?',
        { 
          replacements: [usuario.idusuario],
          type: models.sequelize.QueryTypes.SELECT
        }
      );
      const totalComites = comites[0]?.total || 0;

      const mensajeResumen = 
`📊 <b>Resumen de tu actividad</b>

👤 <b>${usuario.nombre} ${usuario.apellidopat || ''}</b>
📧 ${usuario.email}
👑 Rol: ${usuario.role || 'usuario'}

✅ <b>Eventos Aprobados: ${totalAprobados}</b>
   📅 Activos: ${activos.length}
   📜 Pasados: ${vencidos.length}

⏳ <b>Eventos Pendientes: ${eventosPendientes.length}</b>

❌ <b>Eventos Rechazados: ${eventosRechazados.length}</b>

👥 <b>Como Comité: ${totalComites} eventos</b>

Usa /mis_eventos, /pendientes, /rechazados o /comite para ver detalles.`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: mensajeResumen,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    if (text === '/ayuda') {
      const helpMessage = 
`📚 <b>Comandos disponibles:</b>

<b>Vinculación:</b>
• /start - Bienvenida
• /estado - Verificar vinculación
• /desvincular - Desvincular cuenta de Telegram
• Enviar email - Vincular cuenta

<b>Eventos:</b>
• /mis_eventos - Eventos aprobados (detallado)
• /pendientes - Eventos pendientes (detallado)
• /rechazados - Eventos rechazados (con motivos)
• /comite - Eventos donde eres comité
• /resumen - Resumen completo con estadísticas
• /ficha_pdf - Descargar ficha en PDF

<b>Otros:</b>
• /ayuda - Mostrar esta ayuda`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: helpMessage,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    // 📄 SELECCIONAR EVENTO PARA PDF (con botones)
    if (text === '/ficha_pdf') {
      const models = getModels();
      const { User, Evento } = models;

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta no está vinculada.\n\nEnvía tu email institucional para vincularla.',
        });
        return res.status(200).send('OK');
      }

      // Buscamos los últimos 5 eventos del usuario
      const eventosRecientes = await Evento.findAll({
        where: { idacademico: usuario.idusuario },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      if (eventosRecientes.length === 0) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '📭 No tienes eventos registrados para generar una ficha.'
        });
        return res.status(200).send('OK');
      }

      // Creamos los botones de selección
      const botones = eventosRecientes.map((evento) => {
        const fecha = new Date(evento.fechaevento).toLocaleDateString('es-ES');
        const nombreCorto = evento.nombreevento.length > 25 ? 
          evento.nombreevento.substring(0, 25) + '...' : 
          evento.nombreevento;
        
        return [{
          text: `${nombreCorto} (${fecha})`,
          callback_data: `pdf_${evento.idevento}`
        }];
      });

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: '📄 <b>Selecciona el evento para descargar en PDF:</b>',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: botones
        }
      });

      return res.status(200).send('OK');
    }

    if (text === '/desvincular') {
      const models = getModels();
      const { User } = models;

      console.log(`🔓 [TELEGRAM] Comando /desvincular recibido de chat_id: ${chatId}`);

      const usuario = await User.findOne({ 
        where: { telegram_chat_id: chatId.toString() } 
      });

      if (!usuario) {
        console.log(`⚠️ No se encontró usuario vinculado con chat_id: ${chatId}`);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: '❌ Tu cuenta de Telegram no está vinculada a ningún usuario.\n\nEnvía tu email institucional para vincularla.',
        });
        return res.status(200).send('OK');
      }

      console.log(`🔓 Desvinculando usuario: ${usuario.email} (ID: ${usuario.idusuario})`);

      await User.update(
        { 
          telegram_chat_id: null, 
          telegram_username: null 
        },
        { 
          where: { idusuario: usuario.idusuario } 
        }
      );

      console.log(`✅ Usuario ${usuario.email} desvinculado correctamente de Telegram`);

      const successMessage = 
`✅ <b>¡Cuenta desvinculada correctamente!</b>

Tu cuenta de Telegram ya no está vinculada a:
👤 <b>${usuario.nombre} ${usuario.apellidopat || ''}</b>
📧 ${usuario.email}

❌ Ya no recibirás notificaciones automáticas.

Si quieres volver a vincular tu cuenta, envía tu email institucional.`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: successMessage,
        parse_mode: 'HTML'
      });

      return res.status(200).send('OK');
    }

    // Comando no reconocido
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: '❌ Comando no reconocido.\n\nUsa /ayuda para ver los comandos disponibles.',
    });

  } catch (error) { 
    console.error('❌ [TELEGRAM] Error:', error.message);
    console.error('❌ Response data:', error.response?.data);
    
    if (chatId) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `❌ Ocurrió un error. Intenta nuevamente.`,
      }).catch(e => console.error('Error enviando mensaje de error:', e.message));
    }
  }
  
  res.status(200).send('OK');
};

const whatsappWebhook = async (req, res) => {
  res.status(200).json({ received: true });
};

const getChatHistory = async (req, res) => {
  try {
    const Message = getMessage();
    const { email } = req.params;
    if (!email || email === 'invitado' || !Message) return res.json({ messages: [] });
    
    const messages = await Message.findAll({
      where: { sender: email },
      order: [['timestamp', 'ASC']],
      limit: 50,
      attributes: ['id', 'text', 'role', 'timestamp'],
    });
    
    res.json({
      messages: messages.map(m => ({
        id: m.id?.toString(),
        text: m.text,
        sender: m.role === 'user' ? 'user' : 'bot',
        timestamp: m.timestamp,
      })),
    });
  } catch (error) {
    console.error('❌ getChatHistory error:', error);
    res.status(500).json({ error: 'Error al cargar el historial' });
  }
};


const enviarNotificacionTelegram = async (evento, tipo) => {
  try {
    const models = getModels();
    const { Evento, User, Academico, Facultad } = models;

    // Obtener evento completo con toda la información
    const eventoCompleto = await Evento.findByPk(evento.idevento || evento.id, {
      include: [
        {
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'telegram_chat_id', 'role'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }
      ]
    });

    if (!eventoCompleto) {
      console.log('⚠️ Evento no encontrado para notificar');
      return;
    }

    const idAcademico = eventoCompleto.idacademico || eventoCompleto.academicoCreador?.idusuario;
    
    if (!idAcademico) {
      console.log('⚠️ No se encontró idacademico');
      return;
    }

    const usuarioCreador = eventoCompleto.academicoCreador || await User.findByPk(idAcademico);

    if (!usuarioCreador || !usuarioCreador.telegram_chat_id) {
      console.log(`⚠️ Usuario ${idAcademico} no tiene telegram_chat_id`);
      return;
    }

    const chatId = usuarioCreador.telegram_chat_id;
    const fechaEvento = new Date(evento.fechaevento || eventoCompleto.fechaevento).toLocaleDateString('es-ES');
    const facultadNombre = usuarioCreador.academico?.facultad?.nombre_facultad || 'Sin facultad';
    
    let mensaje = '';
    
    if (tipo === 'aprobado') {
      // Obtener resumen de eventos del usuario
      const { activos, vencidos, total } = await getEventosAprobadosForBot(idAcademico, usuarioCreador.role);
      const eventosPendientes = await getEventosNoAprobadosForBot(idAcademico, usuarioCreador.role);
      
      mensaje = 
`✅ <b>¡EVENTO APROBADO!</b>

📅 <b>${evento.nombreevento || eventoCompleto.nombreevento}</b>

🗓️ Fecha: ${fechaEvento}
${evento.horaevento || eventoCompleto.horaevento ? `🕐 Hora: ${evento.horaevento || eventoCompleto.horaevento}` : ''}
📍 Lugar: ${evento.lugarevento || eventoCompleto.lugarevento}
👤 Responsable: ${evento.responsable_evento || `${usuarioCreador.nombre} ${usuarioCreador.apellidopat || ''}`.trim()}
🏫 Facultad: ${facultadNombre}

━━━━━━━━━━━━━━━━━━━━
📊 <b>Tu resumen actual:</b>
✅ Aprobados: ${total} (${activos.length} activos, ${vencidos.length} pasados)
⏳ Pendientes: ${eventosPendientes.length}

¡Tu evento ha sido aprobado exitosamente! 🎉`;

    } else if (tipo === 'rechazado') {
      const eventosRechazados = await getEventosRechazadosForBot(idAcademico, usuarioCreador.role);
      
      mensaje = 
`❌ <b>EVENTO RECHAZADO</b>

📅 <b>${evento.nombreevento || eventoCompleto.nombreevento}</b>

🗓️ Fecha: ${fechaEvento}
📍 Lugar: ${evento.lugarevento || eventoCompleto.lugarevento}
👤 Responsable: ${evento.responsable_evento || `${usuarioCreador.nombre} ${usuarioCreador.apellidopat || ''}`.trim()}
🏫 Facultad: ${facultadNombre}

${evento.razon_rechazo ? `💬 <b>Motivo del rechazo:</b>\n${evento.razon_rechazo}` : ''}

━━━━━━━━━━━━━━━━━━━━
📊 <b>Total de eventos rechazados: ${eventosRechazados.length}</b>

Revisa los motivos y realiza las correcciones necesarias.`;

    } else if (tipo === 'nuevo') {
      mensaje = 
`🆕 <b>NUEVO EVENTO REGISTRADO</b>

📅 <b>${evento.nombreevento || eventoCompleto.nombreevento}</b>

🗓️ Fecha: ${fechaEvento}
${evento.horaevento || eventoCompleto.horaevento ? `🕐 Hora: ${evento.horaevento || eventoCompleto.horaevento}` : ''}
📍 Lugar: ${evento.lugarevento || eventoCompleto.lugarevento}
👤 Responsable: ${evento.responsable_evento || `${usuarioCreador.nombre} ${usuarioCreador.apellidopat || ''}`.trim()}
🏫 Facultad: ${facultadNombre}

⏳ Estado: Pendiente de aprobación

Tu evento ha sido registrado y está siendo revisado por el administrador.`;
    }

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: mensaje,
      parse_mode: 'HTML'
    });

    console.log(`✅ Notificación Telegram enviada a ${chatId} (${tipo})`);
  } catch (error) {
    console.error('❌ Error al enviar notificación Telegram:', error.message);
    console.error('❌ Response:', error.response?.data);
  }
};
const enviarNotificacionCompletaTelegram = async (req, res) => {
  try {
    const { idevento } = req.body;
    if (!idevento) return res.status(400).json({ error: 'Falta idevento' });

    const models = getModels();
    const { Evento, User, Academico, Facultad } = models;

    // 1. Obtener el evento con TODA la información (igual que tu app móvil)
    const evento = await Evento.findByPk(idevento, {
      include: [
        {
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'telegram_chat_id', 'role'],
          include: [{
            model: Academico,
            as: 'academico',
            include: [{ model: Facultad, as: 'facultad', attributes: ['nombre_facultad'] }]
          }]
        }
      ]
    });

    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const creador = evento.academicoCreador;
    if (!creador || !creador.telegram_chat_id) {
      return res.status(400).json({ error: 'El creador no tiene Telegram vinculado' });
    }

    const chatId = creador.telegram_chat_id;
    const fechaEvento = new Date(evento.fechaevento).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // 2. Construir mensaje enriquecido con TODOS los datos
    const facultad = creador.academico?.facultad?.nombre_facultad || 'Sin facultad';
    
    let mensaje = `🎉 <b>¡EVENTO APROBADO!</b>\n\n`;
    mensaje += `📅 <b>${evento.nombreevento}</b>\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `📋 <b>DATOS GENERALES</b>\n`;
    mensaje += `🗓️ Fecha: ${fechaEvento}\n`;
    mensaje += `🕐 Hora: ${evento.horaevento || 'No definida'}\n`;
    mensaje += `📍 Lugar: ${evento.lugarevento || 'No definido'}\n`;
    mensaje += `🏫 Facultad: ${facultad}\n`;
    mensaje += `👤 Responsable: ${evento.responsable_evento || 'No asignado'}\n\n`;

    // Descripción (si existe)
    if (evento.descripcion) {
      mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
      mensaje += `📝 <b>DESCRIPCIÓN</b>\n`;
      mensaje += `${evento.descripcion.substring(0, 200)}${evento.descripcion.length > 200 ? '...' : ''}\n\n`;
    }

    // Información de actividades (si tiene)
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `📊 <b>ESTADÍSTICAS</b>\n`;
    mensaje += `✅ Estado: <b>APROBADO</b>\n`;
    mensaje += `📄 Se adjunta ficha técnica completa en PDF con:\n`;
    mensaje += `   • Actividades detalladas\n`;
    mensaje += `   • Presupuesto completo\n`;
    mensaje += `   • Comité del evento\n`;
    mensaje += `   • Recursos solicitados\n`;
    mensaje += `   • Servicios contratados\n\n`;
    mensaje += `¡Éxito en tu evento! 🎊`;

    // 3. Enviar el mensaje de texto con toda la info
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: mensaje,
      parse_mode: 'HTML'
    });

    // 4. Generar y enviar el PDF adjunto
    try {
      const pdfBuffer = await generarPDFEvento(evento, creador);
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('document', pdfBuffer, {
        filename: `Evento_${evento.nombreevento.replace(/\s+/g, '_').substring(0, 30)}.pdf`,
        contentType: 'application/pdf'
      });
      form.append('caption', '📄 <b>Ficha Técnica Completa</b>\nDescarga el PDF con todos los detalles.');

      await axios.post(`${TELEGRAM_API}/sendDocument`, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
    } catch (pdfError) {
      console.warn('⚠️ No se pudo adjuntar PDF:', pdfError.message);
    }

    res.json({ ok: true, message: 'Notificación completa enviada a Telegram' });
  } catch (error) {
    console.error('❌ Error enviando resumen a Telegram:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMessages,
  telegramWebhook,
  whatsappWebhook,
  botStatus,
  enviarNotificacionTelegram,
  appChat,
  getChatHistory,
  enviarNotificacionCompletaTelegram
};