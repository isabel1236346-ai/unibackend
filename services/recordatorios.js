const axios = require('axios');
const cron = require('node-cron');
const { Op } = require('sequelize');
const { getModels } = require('../models/index.js');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
const TIMEZONE = 'America/La_Paz'; // Cambia a tu zona horaria

// 📌 FUNCIÓN: Recordatorio de eventos (3 días antes)
const enviarRecordatoriosEventos = async () => {
  console.log('🤖 [CRON] Ejecutando recordatorios de eventos...');
  
  try {
    const models = getModels();
    const { Evento, User } = models;
    
    // 🔧 SOLO eventos que ocurren EXACTAMENTE en 3 días (evita spam)
    const enTresDias = new Date();
    enTresDias.setDate(enTresDias.getDate() + 3);
    enTresDias.setHours(0, 0, 0, 0);
    
    const limiteDia = new Date(enTresDias);
    limiteDia.setDate(limiteDia.getDate() + 1);

    const eventosProximos = await Evento.findAll({
      where: {
        estado: 'aprobado',
        fechaevento: {
          [Op.gte]: enTresDias,
          [Op.lt]: limiteDia
        }
      }
    });

    console.log(`📅 ${eventosProximos.length} eventos que cumplen 3 días hoy`);

    for (const evento of eventosProximos) {
      const usuario = await User.findByPk(evento.idacademico);

      if (usuario && usuario.telegram_chat_id) {
        const fechaEvento = new Date(evento.fechaevento);
        const fechaFormateada = fechaEvento.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        // ✅ Usamos HTML en lugar de Markdown (más estable)
        const mensaje = `⏰ <b>¡Recordatorio de Evento!</b>

📅 <b>${evento.nombreevento}</b>

🗓️ Fecha: ${fechaFormateada}
${evento.horaevento ? `🕐 Hora: ${evento.horaevento}` : ''}
📍 Lugar: ${evento.lugarevento || 'Por confirmar'}

⏱️ <b>Faltan exactamente 3 días</b>

¡No olvides preparar los últimos detalles! 🎉`;

        try {
          await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: usuario.telegram_chat_id,
            text: mensaje,
            parse_mode: 'HTML'
          });
          console.log(`✅ Recordatorio enviado a ${usuario.nombre}`);
        } catch (err) {
          console.error(`❌ Error enviando a ${usuario.telegram_chat_id}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en recordatorios de eventos:', error.message);
  }
};

// 📌 FUNCIÓN: Recordatorio a administradores (eventos pendientes)
const enviarRecordatoriosAdmins = async () => {
  console.log('📋 [CRON] Revisando eventos pendientes para administradores...');
  
  try {
    const models = getModels();
    const { Evento, User } = models;

    const eventosPendientes = await Evento.count({
      where: { estado: 'pendiente' }
    });

    if (eventosPendientes === 0) {
      console.log('✅ No hay eventos pendientes');
      return;
    }

    const admins = await User.findAll({
      where: {
        role: 'admin',
        telegram_chat_id: { [Op.ne]: null }
      }
    });

    if (admins.length === 0) {
      console.log('⚠️ No hay administradores con Telegram vinculado');
      return;
    }

    const mensaje = `📋 <b>Recordatorio de Aprobaciones</b>

Tienes <b>${eventosPendientes} evento${eventosPendientes !== 1 ? 's' : ''}</b> pendiente${eventosPendientes !== 1 ? 's' : ''} de aprobación.

Revisa la aplicación para aprobarlos. ⚡`;

    for (const admin of admins) {
      try {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: admin.telegram_chat_id,
          text: mensaje,
          parse_mode: 'HTML'
        });
      } catch (err) {
        console.error(`❌ Error enviando a admin ${admin.email}:`, err.message);
      }
    }

    console.log(`✅ Recordatorios enviados a ${admins.length} administradores`);
  } catch (error) {
    console.error('❌ Error en recordatorios de admins:', error.message);
  }
};

// 🚀 FUNCIÓN PRINCIPAL: Inicia todos los crons
const iniciarRecordatorios = () => {
  console.log('⏰ Configurando sistema de recordatorios...');

  // 📅 Recordatorio de eventos: Todos los días a las 9:00 AM (hora local)
  cron.schedule('0 9 * * *', () => {
    console.log('🔄 Ejecutando cron: recordatorios de eventos');
    enviarRecordatoriosEventos();
  }, { timezone: TIMEZONE });

  // 📋 Recordatorio a admins: Todos los días a las 9:30 AM (hora local)
  cron.schedule('30 9 * * *', () => {
    console.log('🔄 Ejecutando cron: recordatorios de admins');
    enviarRecordatoriosAdmins();
  }, { timezone: TIMEZONE });

  console.log('✅ Recordatorios configurados:');
  console.log(`   - Eventos (3 días antes): 9:00 AM (${TIMEZONE})`);
  console.log(`   - Admins (pendientes): 9:30 AM (${TIMEZONE})`);
};

module.exports = { iniciarRecordatorios };