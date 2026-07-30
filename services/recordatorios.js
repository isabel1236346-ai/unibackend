const axios = require('axios');
const cron = require('node-cron');
const { Op } = require('sequelize');
const { getModels } = require('../models/index.js');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

// Recordatorio automático - Se ejecuta cada día a las 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🤖 Ejecutando recordatorios automáticos...');
  
  try {
    const models = getModels();
    const { Evento, User } = models;
    
    const hoy = new Date();
    const tresDiasDespues = new Date();
    tresDiasDespues.setDate(hoy.getDate() + 3);

    // Eventos aprobados que ocurren en 3 días
    const eventosProximos = await Evento.findAll({
      where: {
        fechaevento: {
          [Op.between]: [hoy, tresDiasDespues]
        },
        estado: 'aprobado'
      }
    });

    console.log(`📅 ${eventosProximos.length} eventos próximos encontrados`);

    for (const evento of eventosProximos) {
      const usuario = await User.findByPk(evento.idacademico);

      if (usuario && usuario.telegram_chat_id) {
        const fechaEvento = new Date(evento.fechaevento);
        const diasRestantes = Math.ceil((fechaEvento - hoy) / (1000 * 60 * 60 * 24));
        
        const mensaje = `
⏰ *Recordatorio de Evento*

📅 *${evento.nombreevento}*

🗓️ Fecha: ${fechaEvento.toLocaleDateString('es-ES')}
${evento.horaevento ? `🕐 Hora: ${evento.horaevento}` : ''}
📍 Lugar: ${evento.lugarevento}

⏱️ Faltan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}
        `;

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: usuario.telegram_chat_id,
          text: mensaje,
          parse_mode: 'Markdown'
        });

        console.log(`✅ Recordatorio enviado a ${usuario.telegram_chat_id}`);
      }
    }

    // Recordatorio para administradores sobre eventos pendientes
    const admins = await User.findAll({
      where: { 
        role: 'admin',
        telegram_chat_id: { [Op.ne]: null }
      }
    });

    const eventosPendientes = await Evento.count({
      where: { estado: 'pendiente' }
    });

    if (eventosPendientes > 0 && admins.length > 0) {
      const mensaje = `
📋 *Recordatorio de Aprobaciones*

Tienes *${eventosPendientes} evento${eventosPendientes !== 1 ? 's' : ''}* pendiente${eventosPendientes !== 1 ? 's' : ''} de aprobación.

Revisa la aplicación para aprobarlos.
      `;

      for (const admin of admins) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: admin.telegram_chat_id,
          text: mensaje,
          parse_mode: 'Markdown'
        });
      }

      console.log(`✅ Recordatorios enviados a ${admins.length} administradores`);
    }

  } catch (error) {
    console.error('❌ Error en recordatorios automáticos:', error);
  }
});

console.log('⏰ Sistema de recordatorios iniciado (cron: 9:00 AM diario)');