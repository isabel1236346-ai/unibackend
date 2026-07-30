const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const { linkTelegramAccount } = require('./controllers/userController');
const { fetchEventById, fetchEventsWithRawQuery } = require('./controllers/evento.js');

// ─────────────────────────────────────────
//  ESTADO EN MEMORIA
// ─────────────────────────────────────────
const sesiones = {};
const estados  = {};
const chatIds  = new Set();

const getSesion   = (id) => sesiones[id];
const setSesion   = (id, data) => (sesiones[id] = data);
const getEstado   = (id) => estados[id] || { estado: null, datos: {} };
const setEstado   = (id, estado, datos = {}) => (estados[id] = { estado, datos });
const clearEstado = (id) => delete estados[id];

// ─────────────────────────────────────────
//  INSTANCIA ÚNICA DEL BOT
// ─────────────────────────────────────────
let _botInstance = null;
const getBot = () => _botInstance;

// ─────────────────────────────────────────
//  MENÚS POR ROL
// ─────────────────────────────────────────
const menus = {
  admin: [
    [{ text: '📅 Ver eventos',     callback_data: 'ver_eventos'     }, { text: '➕ Crear evento',    callback_data: 'crear_evento'    }],
    [{ text: '✏️ Editar evento',   callback_data: 'editar_evento'   }, { text: '🗑️ Eliminar evento', callback_data: 'eliminar_evento' }],
    [{ text: '📢 Mensaje a todos', callback_data: 'msg_global'      }],
    [{ text: '🚪 Cerrar sesión',   callback_data: 'logout'          }],
  ],
  comite: [
    [{ text: '📅 Mis eventos',          callback_data: 'ver_eventos'    }, { text: '👥 Ver asistentes',       callback_data: 'ver_asistentes' }],
    [{ text: '📢 Mensajear asistentes', callback_data: 'msg_asistentes' }],
    [{ text: '🚪 Cerrar sesión',        callback_data: 'logout'         }],
  ],
  asistente: [
    [{ text: '📅 Ver eventos',   callback_data: 'ver_eventos'   }, { text: '✅ Registrarme',  callback_data: 'registrarme'  }],
    [{ text: '📋 Mis registros', callback_data: 'mis_registros' }],
    [{ text: '🚪 Cerrar sesión', callback_data: 'logout'        }],
  ],
};

const markup = (rol) => ({ reply_markup: { inline_keyboard: menus[rol] || menus.asistente } });

// ─────────────────────────────────────────
//  NOTIFICACIONES
// ─────────────────────────────────────────
const notificarTodos = async (mensaje) => {
  if (!_botInstance) return;
  for (const id of chatIds) {
    try { await _botInstance.sendMessage(id, mensaje, { parse_mode: 'Markdown' }); }
    catch (e) { console.warn(`⚠️ No se pudo notificar a ${id}:`, e.message); }
  }
};

const notificarUsuario = async (chatId, mensaje) => {
  if (!_botInstance) return;
  try { await _botInstance.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' }); }
  catch (e) { console.warn(`⚠️ No se pudo notificar a ${chatId}:`, e.message); }
};

// ─────────────────────────────────────────
//  HELPER: eliminar webhook antes de polling
// ─────────────────────────────────────────
const deleteWebhookFirst = (token) => {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('🧹 Webhook eliminado:', data);
        resolve();
      });
    }).on('error', (err) => {
      console.warn('⚠️ No se pudo eliminar webhook (continuando igual):', err.message);
      resolve(); // continuar aunque falle
    });
  });
};

// ─────────────────────────────────────────
//  INICIO DEL BOT
// ─────────────────────────────────────────
const startTelegramBot = async () => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const API_BASE_URL   = process.env.API_BASE_URL;
  
  if (!TELEGRAM_TOKEN) {
    console.error('❌ Falta TELEGRAM_TOKEN en .env');
    return;
  }

  // Si ya existe una instancia, no crear otra
  if (_botInstance) {
    console.warn('⚠️ Bot ya iniciado, ignorando segunda llamada.');
    return;
  }

  // ✅ Eliminar webhook y updates pendientes ANTES de iniciar polling
  await deleteWebhookFirst(TELEGRAM_TOKEN);
  
  // Esperar 2 segundos para que Telegram libere el polling anterior
  await new Promise(r => setTimeout(r, 2000));

  const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: {
      interval: 1000,
      autoStart: true,
      params: { timeout: 10 }
    }
  });

  _botInstance = bot;
  console.log('🤖 Bot de Telegram iniciado...');

  // ── /start ──
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    chatIds.add(chatId);
    if (getSesion(chatId)) {
      const s = getSesion(chatId);
      return bot.sendMessage(chatId,
        `👋 Bienvenido de nuevo, *${s.nombre}*!\n¿Qué deseas hacer?`,
        { parse_mode: 'Markdown', ...markup(s.rol) }
      );
    }
    bot.sendMessage(chatId,
      `👋 Bienvenido al *Bot de Eventos Universitarios*\n\n` +
      `/login - Iniciar sesión\n` +
      `/eventos - Ver eventos\n` +
      `/vincular - Vincular tu cuenta`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── /login ──
  bot.onText(/\/login/, (msg) => {
    const chatId = msg.chat.id;
    chatIds.add(chatId);
    setEstado(chatId, 'esperando_email');
    bot.sendMessage(chatId, '📧 Ingresa tu correo institucional:');
  });

  // ── /eventos ──
  bot.onText(/\/eventos/, async (msg) => {
    const chatId = msg.chat.id;
    chatIds.add(chatId);
    await bot.sendMessage(chatId, 'Buscando eventos... 🗓️');
    try {
      const eventos = await fetchEventsWithRawQuery();
      if (!eventos || eventos.length === 0)
        return bot.sendMessage(chatId, 'No hay eventos programados por el momento.');
      
      const teclado = eventos.map(e => ([{
        text: `📅 ${e.title || e.nombreevento} - ${new Date(e.fechaevento).toLocaleDateString()}`,
        callback_data: `evento_details_${e.idevento}`
      }]));
      bot.sendMessage(chatId, 'Aquí tienes los próximos eventos:',
        { reply_markup: { inline_keyboard: teclado } });
    } catch (error) {
      console.error('[BOT] Error al obtener eventos:', error.message);
      bot.sendMessage(chatId, '❌ Hubo un error al buscar los eventos.');
    }
  });

  // ── /vincular ──
  bot.onText(/\/vincular/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
      'Responde con el email que usaste para registrarte.',
      { reply_markup: { force_reply: true } }
    ).then(sentMessage => {
      bot.onReplyToMessage(chatId, sentMessage.message_id, async (replyMsg) => {
        const email = replyMsg.text;
        if (!email || !email.includes('@'))
          return bot.sendMessage(chatId, 'Eso no parece un email válido. Intenta de nuevo.');
        
        await bot.sendMessage(chatId, `Intentando vincular con: ${email}...`);
        try {
          const mockReq = { body: { email, chat_id: chatId } };
          let responseMessage = '', statusCode = 200;
          const mockRes = {
            status(code) { statusCode = code; return this; },
            json(data)   { responseMessage = data.message; }
          };
          await linkTelegramAccount(mockReq, mockRes);
          bot.sendMessage(chatId, statusCode >= 400
            ? `❌ Problema: ${responseMessage}`
            : `✅ ¡Éxito! ${responseMessage}`
          );
        } catch (error) {
          bot.sendMessage(chatId, `❌ Error inesperado: ${error.message}`);
        }
      });
    });
  });

  // ─────────────────────────────────────────
  //  MENSAJES DE TEXTO (máquina de estados)
  // ─────────────────────────────────────────
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const texto  = msg.text?.trim();
    if (!texto || texto.startsWith('/')) return;
    chatIds.add(chatId);
    const { estado, datos } = getEstado(chatId);

    if (estado === 'esperando_email') {
      setEstado(chatId, 'esperando_password', { email: texto });
      return bot.sendMessage(chatId, '🔑 Ahora ingresa tu contraseña:');
    }

    if (estado === 'esperando_password') {
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      try {
        const axios = require('axios');
        const res = await axios.post(`${API_BASE_URL}/auth/login`,
          { email: datos.email, password: texto });
        const { token, rol, nombre } = res.data;
        setSesion(chatId, { token, rol: rol || 'asistente', nombre });
        clearEstado(chatId);
      bot.sendMessage(chatId, `✅ ¡Hola, *${nombre}*! Rol: \`${rol || 'asistente'}\``,
  { parse_mode: 'Markdown', ...markup(rol || 'asistente') });
      } catch {
        clearEstado(chatId);
        bot.sendMessage(chatId, '❌ Credenciales incorrectas. Usa /login para intentar de nuevo.');
      }
      return;
    }

    if (estado === 'crear_nombre') {
      setEstado(chatId, 'crear_lugar', { nombreevento: texto });
      return bot.sendMessage(chatId, '📍 *Lugar del evento:*', { parse_mode: 'Markdown' });
    }
    if (estado === 'crear_lugar') {
      setEstado(chatId, 'crear_fecha', { ...datos, lugarevento: texto });
      return bot.sendMessage(chatId, '🕐 *Fecha* (DD/MM/YYYY):', { parse_mode: 'Markdown' });
    }
    if (estado === 'crear_fecha') {
      setEstado(chatId, 'crear_hora', { ...datos, fechaevento: texto });
      return bot.sendMessage(chatId, '⏰ *Hora* (HH:MM):', { parse_mode: 'Markdown' });
    }
    if (estado === 'crear_hora') {
      setEstado(chatId, 'crear_desc', { ...datos, horaevento: texto });
      return bot.sendMessage(chatId, '📝 *Descripción:*', { parse_mode: 'Markdown' });
    }
    if (estado === 'crear_desc') {
      const evento = { ...datos, descripcion: texto };
      clearEstado(chatId);
      try {
        const axios = require('axios');
        await axios.post(`${API_BASE_URL}/eventos`, evento,
          { headers: { Authorization: `Bearer ${getSesion(chatId).token}` } });
        bot.sendMessage(chatId, '✅ ¡Evento creado exitosamente!');
        await notificarTodos(
          `📢 *Nuevo evento:* ${evento.nombreevento}\n📍 ${evento.lugarevento}\n🕐 ${evento.fechaevento} ${evento.horaevento}`
        );
      } catch {
        bot.sendMessage(chatId, '❌ Error al crear el evento.');
      }
      bot.sendMessage(chatId, '¿Qué más deseas hacer?', markup(getSesion(chatId)?.rol));
      return;
    }

    if (estado === 'msg_global' || estado === 'msg_asistentes') {
      clearEstado(chatId);
      await notificarTodos(`📢 *Mensaje oficial:*\n\n${texto}`);
      bot.sendMessage(chatId, '✅ Mensaje enviado a todos.');
      bot.sendMessage(chatId, '¿Qué más deseas hacer?', markup(getSesion(chatId)?.rol));
      return;
    }
  });

  // ─────────────────────────────────────────
  //  CALLBACKS DE BOTONES
  // ─────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data   = query.data;
    bot.answerCallbackQuery(query.id);

    if (data.startsWith('evento_details_')) {
      const eventoId = data.split('_')[2];
      try {
        const evento = await fetchEventById(eventoId);
        if (!evento)
          return bot.sendMessage(chatId, 'No pude encontrar los detalles de ese evento.');
        
        bot.sendMessage(chatId,
          `*${evento.nombreevento}*\n\n` +
          `📍 *Lugar:* ${evento.lugarevento || 'No especificado'}\n` +
          `🗓️ *Fecha:* ${new Date(evento.fechaevento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}\n` +
          `⏰ *Hora:* ${evento.horaevento || 'No especificada'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.error('[BOT] Error detalles evento:', e.message);
        bot.sendMessage(chatId, '❌ Hubo un problema al obtener los detalles del evento.');
      }
      return;
    }

    const s = getSesion(chatId);
    if (!s) return bot.sendMessage(chatId, '⚠️ Sesión expirada. Usa /login para volver a ingresar.');

    const axios   = require('axios');
    const headers = { Authorization: `Bearer ${s.token}` };

    if (data === 'ver_eventos') {
      try {
        const eventos = await fetchEventsWithRawQuery();
        if (!eventos?.length) return bot.sendMessage(chatId, '📭 No hay eventos disponibles.');
        const teclado = eventos.slice(0, 8).map(e => ([{
          text: `📅 ${e.nombreevento} - ${new Date(e.fechaevento).toLocaleDateString()}`,
          callback_data: `evento_details_${e.idevento}`
        }]));
        bot.sendMessage(chatId, 'Selecciona un evento para ver detalles:',
          { reply_markup: { inline_keyboard: teclado } });
      } catch { bot.sendMessage(chatId, '❌ Error al obtener eventos.'); }
      return;
    }

    if (data === 'crear_evento') {
      setEstado(chatId, 'crear_nombre');
      return bot.sendMessage(chatId, '📝 *Nombre del evento:*', { parse_mode: 'Markdown' });
    }

    if (data === 'eliminar_evento') {
      try {
        const eventos = await fetchEventsWithRawQuery();
        const teclado = eventos.slice(0, 8).map(e => ([{
          text: `🗑️ ${e.nombreevento}`, callback_data: `del_${e.idevento}`
        }]));
        bot.sendMessage(chatId, 'Selecciona el evento a eliminar:',
          { reply_markup: { inline_keyboard: teclado } });
      } catch { bot.sendMessage(chatId, '❌ Error al obtener eventos.'); }
      return;
    }

    if (data.startsWith('del_')) {
      const id = data.replace('del_', '');
       try {
        await axios.delete(`${API_BASE_URL}/eventos/${id}`, { headers });
        bot.sendMessage(chatId, '✅ Evento eliminado correctamente.');
        await notificarTodos('⚠️ Un evento ha sido *cancelado*. Revisa el calendario.');
      } catch { bot.sendMessage(chatId, '❌ Error al eliminar el evento.'); }
      return;
    }

    if (data === 'registrarme') {
      try {
        const eventos = await fetchEventsWithRawQuery();
        const teclado = eventos.slice(0, 8).map(e => ([{
          text: e.nombreevento, callback_data: `reg_${e.idevento}`
        }]));
        bot.sendMessage(chatId, '📋 Selecciona el evento al que deseas registrarte:',
          { reply_markup: { inline_keyboard: teclado } });
      } catch { bot.sendMessage(chatId, '❌ Error.'); }
      return;
    }

    if (data.startsWith('reg_')) {
      const id = data.replace('reg_', '');
      try {
         await axios.post(`${API_BASE_URL}/eventos/${id}/registrar`, {}, { headers });
        bot.sendMessage(chatId, '✅ ¡Registrado exitosamente! Recibirás recordatorios.');
      } catch { bot.sendMessage(chatId, '❌ Error al registrarse.'); }
      return;
    }

    if (data === 'ver_asistentes') {
      try {
        const eventos = await fetchEventsWithRawQuery();
        const teclado = eventos.slice(0, 8).map(e => ([{
          text: e.nombreevento, callback_data: `asis_${e.idevento}`
        }]));
        bot.sendMessage(chatId, 'Selecciona el evento:',
          { reply_markup: { inline_keyboard: teclado } });
      } catch { bot.sendMessage(chatId, '❌ Error.'); }
      return;
    }

    if (data.startsWith('asis_')) {
      const id = data.replace('asis_', '');
      try {
        const res = await axios.get(`${API_BASE_URL}/eventos/${id}/asistentes`, { headers });
        const lista = res.data?.data || res.data || [];
        if (!lista.length) return bot.sendMessage(chatId, 'No hay asistentes registrados aún.');
        let texto = `👥 *Asistentes (${lista.length}):*\n\n`;
        lista.forEach(a => (texto += `• ${a.nombre} — ${a.email}\n`));
        bot.sendMessage(chatId, texto, { parse_mode: 'Markdown' });
      } catch { bot.sendMessage(chatId, '❌ Error al obtener asistentes.'); }
      return;
    }

    if (data === 'mis_registros') {
      try {
        const res = await axios.get(`${API_BASE_URL}/mis-registros`, { headers });
        const lista = res.data?.data || res.data || [];
        if (!lista.length) return bot.sendMessage(chatId, '📭 No tienes registros aún.');
        let texto = '📋 *Tus eventos registrados:*\n\n';
        lista.forEach(r => (texto += `• *${r.nombreevento || r.nombre}* — ${r.fechaevento || r.fecha}\n`));
        bot.sendMessage(chatId, texto, { parse_mode: 'Markdown' });
      } catch { bot.sendMessage(chatId, '❌ Error al obtener registros.'); }
      return;
    }

    if (data === 'msg_global' || data === 'msg_asistentes') {
      setEstado(chatId, data);
      return bot.sendMessage(chatId, '✍️ Escribe el mensaje que deseas enviar:');
    }

    if (data === 'logout') {
      delete sesiones[chatId];
      clearEstado(chatId);
      return bot.sendMessage(chatId, '👋 Sesión cerrada. Usa /login para volver a ingresar.');
    }
  });

  // ── Recordatorios automáticos cada hora ──
  setInterval(async () => {
    try {
      const eventos = await fetchEventsWithRawQuery();
      if (!eventos || eventos.length === 0) return; // ✅ salir limpiamente si no hay eventos
      
      const ahora = new Date();
      const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
      const proximos = eventos.filter(e => {
        const f = new Date(e.fechaevento);
        return f >= ahora && f <= en24h;
      });
      
      for (const e of proximos) {
        await notificarTodos(
          `⏰ *Recordatorio:* El evento *${e.nombreevento}* es mañana en ${e.lugarevento || 'lugar por confirmar'}.`
        );
      }
    } catch (err) {
      console.error('⚠️ Error en recordatorios:', err.message);
    }
  }, 60 * 60 * 1000);
};

module.exports = { startTelegramBot, notificarTodos, notificarUsuario, getBot };