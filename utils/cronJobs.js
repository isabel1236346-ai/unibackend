const cron = require('node-cron');
const { getModels } = require('../models/index');
const { Op } = require('sequelize');
const predictionService = require('../services/predictionService');

cron.schedule('0 8 * * *', async () => {
  console.log('🤖 Ejecutando análisis predictivo de asistencia...');
  try {
    const analisis = await predictionService.generarAnalisisCompleto();
    console.log(`✅ Análisis completado para ${analisis.length} eventos`);
    
    // Aquí puedes enviar notificaciones por Telegram o Socket
    // si algún evento tiene baja predicción de asistencia
    analisis.forEach(evento => {
      if (evento.tasa_asistencia_esperada !== 'N/A') {
        const tasa = parseFloat(evento.tasa_asistencia_esperada);
        if (tasa < 50) {
          console.log(`⚠️ Alerta: Evento "${evento.titulo}" tiene baja asistencia esperada (${evento.tasa_asistencia_esperada})`);
          // Aquí llamarías a tu servicio de notificaciones
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en cron de predicciones:', error);
  }
});

const marcarEventosVencidos = async () => {
  console.log('🔄 [CRON] Iniciando revisión...');
  
  try {
    const { Evento } = getModels();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    console.log('📅 Fecha de hoy:', hoy.toISOString());

    // Buscar eventos
    const eventosPorVencer = await Evento.findAll({
      where: {
        fechaevento: { [Op.lt]: hoy },
        estado: { [Op.in]: ['aprobado', 'activo'] }
      }
    });

    console.log(`📋 Encontrados ${eventosPorVencer.length} eventos por vencer`);
    eventosPorVencer.forEach(e => {
      console.log(`   - ID:${e.idevento} | ${e.nombreevento} | Fecha:${e.fechaevento} | Estado:${e.estado}`);
    });

    if (eventosPorVencer.length === 0) {
      console.log('✅ No hay eventos para actualizar');
      return;
    }

    // Actualizar
    console.log('🔄 Ejecutando UPDATE...');
    const [cantidad] = await Evento.update(
  { estado: 'vencido' },  
  { where:  {
      fechaevento: { [Op.lt]: hoy }, 
      estado: { [Op.in]: ['aprobado', 'activo'] }  // consistente con el findAll
  }}
);

    console.log(`✅ UPDATE completado. Filas afectadas: ${cantidad}`);

    // Verificar que se guardó
    const verificacion = await Evento.count({
      where: { estado: 'vencido' }
    });
    console.log(`🔍 Total eventos 'vencido' en BD: ${verificacion}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
};

const limpiarEventosMuyAntiguos = async () => {
  try {
    const { Evento } = getModels();
    const haceDosSemanas = new Date();
    haceDosSemanas.setDate(haceDosSemanas.getDate() - 14);

    const [cantidad] = await Evento.destroy({
      where: {
        fechaevento: { [Op.lt]: haceDosSemanas },
        estado: 'vencido'
      }
    });

    console.log(`🗑️ Cron: ${cantidad} eventos antiguos eliminados`);
  } catch (error) {
    console.error('❌ Error limpiando eventos antiguos:', error.message);
  }
};

const iniciarCronJobs = async () => {
  console.log('🕐 Iniciando cron jobs...');
  
  await marcarEventosVencidos();
  
  cron.schedule('0 0 * * *', () => {
    console.log('🔄 Ejecutando cron: marcarEventosVencidos');
    marcarEventosVencidos();
  });
//domingo
  cron.schedule('0 3 * * 0', () => {
    console.log('🔄 Ejecutando cron: limpiarEventosMuyAntiguos');
    limpiarEventosMuyAntiguos();
  });

  console.log('✅ Cron jobs configurados:');
  console.log('   - Marcar vencidos: Todos los días a 00:00');
  console.log('   - Limpiar antiguos: Domingos a 03:00');
};

module.exports = { iniciarCronJobs };