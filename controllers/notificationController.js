const asyncHandler = require('express-async-handler');
const { getModels } = require('../models/index.js'); 
const { Op } = require('sequelize');

const sendNotification = async ({ idusuario, titulo, mensaje, tipo = 'nuevo_evento', estado = 'pendiente' }) => {
  try {
    if (Array.isArray(idusuario)) {
      for (const id of idusuario) {
        await sendNotification({ idusuario: id, titulo, mensaje, tipo, estado });
      }
      return;
    }

    if (!idusuario) {
      console.warn('⚠️ sendNotification: idusuario no proporcionado');
      return;
    }
    
    const models = getModels();
    const sequelize = models.sequelize;
    
    // INSERT sin id_relacionado
    await sequelize.query(
      `INSERT INTO notificacion (idusuario, titulo, mensaje, tipo, estado, created_at, updated_at) 
       VALUES (:idusuario, :titulo, :mensaje, :tipo, :estado, :created_at, :updated_at)`,
      {
        replacements: {
          idusuario,
          titulo,
          mensaje,
          tipo,
          estado,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    console.log(`✅ Notificación enviada a usuario ${idusuario}`);

  } catch (error) {
    console.error('❗ Error al crear notificación:', error.message);
  }
};

const getUserNotifications = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const sequelize = models.sequelize;

    const userId = req.user?.idusuario || req.user?.id;
    
    if (!userId) {
      console.error('❌ Usuario no autenticado');
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    console.log('🔍 Buscando notificaciones para usuario ID:', userId);

    // Consulta SQL directa con las columnas REALES de tu tabla
    const notificaciones = await sequelize.query(
      `SELECT 
        idnotificacion,
        idusuario,
        titulo,
        mensaje,
        tipo,
        estado,
        created_at,
        updated_at
       FROM notificacion
       WHERE idusuario = :userId
       ORDER BY created_at DESC
       LIMIT 50`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    console.log(`✅ Encontradas ${notificaciones.length} notificaciones`);

    // Formatear para el frontend
    const notificacionesFormateadas = notificaciones.map(n => ({
      idnotificacion: n.idnotificacion,
      id: n.idnotificacion, // Alias para compatibilidad con el frontend
      titulo: n.titulo,
      mensaje: n.mensaje,
      tipo: n.tipo,
      estado: n.estado,
      read: n.estado === 'leido',
      created_at: n.created_at,
      // Como no hay id_relacionado, no podemos filtrar por fecha de evento
      evento_pasado: false
    }));

    res.json(notificacionesFormateadas);

  } catch (error) {
    console.error('❌ ERROR en getUserNotifications:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

const markAsRead = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const sequelize = models.sequelize;

    const notificationId = req.params.id;
    const userId = req.user?.idusuario || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const [updated] = await sequelize.query(
      `UPDATE notificacion 
       SET estado = 'leido', updated_at = :now
       WHERE idnotificacion = :id AND idusuario = :userId`,
      {
        replacements: { 
          id: notificationId, 
          userId, 
          now: new Date().toISOString() 
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    if (updated === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('❌ Error en markAsRead:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const markAllAsRead = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const sequelize = models.sequelize;

    const userId = req.user?.idusuario || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const [updated] = await sequelize.query(
      `UPDATE notificacion 
       SET estado = 'leido', updated_at = :now
       WHERE idusuario = :userId AND estado != 'leido'`,
      {
        replacements: { userId, now: new Date().toISOString() },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    res.json({ 
      success: true, 
      message: 'Todas las notificaciones marcadas como leídas',
      updated_count: updated 
    });
  } catch (error) {
    console.error('❌ Error en markAllAsRead:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const getUnreadCount = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const sequelize = models.sequelize;

    const userId = req.user?.idusuario || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const result = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM notificacion
       WHERE idusuario = :userId AND estado != 'leido'`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({ unread_count: parseInt(result[0].count) });
  } catch (error) {
    console.error('❌ Error en getUnreadCount:', error.message);
    res.status(500).json({ error: error.message });
  }
});
const diagnosticarNotificaciones = asyncHandler(async (req, res) => {
  try {
    const { getModels } = require('../models/index.js');
    const models = getModels();
    const sequelize = models.sequelize;
    
    // Verificar estructura de la tabla
    const columnas = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notificacion'
    `);
    
    const count = await sequelize.query(`
      SELECT COUNT(*) as total FROM notificacion
    `);
    
    res.json({
      status: 'ok',
      columnas: columnas[0],
      totalNotificaciones: count[0][0].total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  sendNotification,        
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  diagnosticarNotificaciones
};