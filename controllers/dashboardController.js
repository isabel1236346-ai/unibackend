const { getModels } = require('../models/index.js');
const { Op } = require('sequelize');
const asyncHandler = require('express-async-handler');

const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { User, Evento, sequelize } = models;

    const [
      activeUsers,
      totalEvents,
      estadoCountsResult,
      nuevosUsuariosResult,
      eventosPorFacultad,
      eventosPorDia
    ] = await Promise.all([
      User.count({ 
        where: { 
          [Op.or]: [
            { habilitado: '1' },
            { habilitado: 'true' },
          ]
        } 
      }),
      Evento.count(),
      sequelize.query(`
        SELECT e.estado, COUNT(*) as total
        FROM evento e
        INNER JOIN academico a ON e.idacademico = a.idacademico
        INNER JOIN facultad f ON a.facultad_id = f.facultad_id
        GROUP BY e.estado
`, { type: sequelize.QueryTypes.SELECT }),
      sequelize.query(
        `SELECT COUNT(*) as total FROM usuario WHERE "created_at" >= :inicioMes`,
        { 
          replacements: { 
            inicioMes: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          }, 
          type: sequelize.QueryTypes.SELECT 
        }
      ),
      sequelize.query(`
        SELECT 
          f.nombre_facultad as facultad,
          COUNT(e.idevento) FILTER (WHERE e.estado = 'aprobado') as aprobados,
          COUNT(e.idevento) FILTER (WHERE e.estado = 'pendiente') as pendientes,
          COUNT(e.idevento) FILTER (WHERE e.estado = 'rechazado') as rechazados,
          COUNT(e.idevento) as total
        FROM facultad f
        LEFT JOIN academico a ON f.facultad_id = a.facultad_id
        LEFT JOIN evento e ON a.idacademico = e.idacademico
        GROUP BY f.nombre_facultad 
        ORDER BY aprobados DESC  -- ✅ Esto ordena por eventos APROBADOS
        LIMIT 10
`, { type: sequelize.QueryTypes.SELECT }),
      sequelize.query(`
        SELECT DATE("fecha_aprobacion") as fecha, COUNT(*) as total
        FROM "evento"
        WHERE "fecha_aprobacion" ::DATE >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE("fecha_aprobacion") 
        ORDER BY fecha ASC
      `, { type: sequelize.QueryTypes.SELECT })
    ]);

    const estadoCounts = {};
    estadoCountsResult.forEach(row => {
      estadoCounts[row.estado || 'sin_estado'] = parseInt(row.total);
    });

    const usuariosNuevosEsteMes = parseInt(nuevosUsuariosResult[0]?.total || 0);
    const eventosAprobadosMes = estadoCounts.aprobado || 0;
    const tasaAprobacion = totalEvents > 0 
      ? Math.round((estadoCounts.aprobado / totalEvents) * 100) 
      : 0;

    const eventosPorDiaCompleto = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const found = eventosPorDia.find(r => {
        const fechaStr = r.fecha instanceof Date 
          ? r.fecha.toISOString().split('T')[0] 
          : r.fecha;
        return fechaStr === ds;
      });
      eventosPorDiaCompleto.push({ 
        fecha: ds, 
        total: found ? parseInt(found.total) : 0 
      });
    }

    res.status(200).json({
      activeUsers,
      totalEvents,
      usuariosNuevosEsteMes,
      estadoCounts,
      eventosAprobadosMes,
      tasaAprobacion,
      systemStability: 99,
      eventosPorFacultad: eventosPorFacultad.map(r => ({ 
      facultad: r.facultad, 
      total: parseInt(r.total),
      aprobados: parseInt(r.aprobados) || 0,
      pendientes: parseInt(r.pendientes) || 0,
      rechazados: parseInt(r.rechazados) || 0
    })),
      eventosPorDia: eventosPorDiaCompleto
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ 
      error: 'Error al cargar estadísticas',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getMensualStats = asyncHandler(async (req, res) => {
  try {
    const { sequelize } = getModels();
    
    const result = await sequelize.query(`
      SELECT 
        TO_CHAR("fechaevento" ::DATE, 'YYYY-MM') AS mes, 
        COUNT(*) FILTER (WHERE "estado" = 'aprobado')::INTEGER AS aprobado,
        COUNT(*) FILTER (WHERE "estado" = 'pendiente')::INTEGER AS pendiente,
        COUNT(*) FILTER (WHERE "estado" = 'rechazado')::INTEGER AS rechazado,
        COUNT(*) AS total
      FROM "evento"
      WHERE "fechaevento" IS NOT NULL            
      GROUP BY TO_CHAR("fechaevento" ::DATE, 'YYYY-MM') 
      ORDER BY mes DESC
      LIMIT 24
    `, { type: sequelize.QueryTypes.SELECT });

    const reportes = result.map(row => ({
      mes: row.mes,
      totalEvents: parseInt(row.total),
      aprobado: row.aprobado,
      pendiente: row.pendiente,
      rechazado: row.rechazado,
      tasaAprobacion: row.total > 0 ? parseFloat(((row.aprobado / row.total) * 100).toFixed(1)) : 0
    }));

    res.status(200).json(reportes);
  } catch (error) {
    console.error('Error getMensualStats:', error);
    res.status(500).json({ 
      error: 'Error al cargar datos mensuales',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getHistoricalData = asyncHandler(async (req, res) => {
  try {
    const { Evento, sequelize } = getModels();
    
    const results = await sequelize.query(`
      SELECT 
        TO_CHAR("fechaevento", 'YYYY-MM') as mes,
        EXTRACT(MONTH FROM "fechaevento") as month_num,
        EXTRACT(YEAR FROM "fechaevento") as year_num,
        COUNT(*) as eventos
      FROM "evento"
      WHERE "fechaevento" >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR("fechaevento", 'YYYY-MM'), 
               EXTRACT(MONTH FROM "fechaevento"),
               EXTRACT(YEAR FROM "fechaevento")
      ORDER BY year_num ASC, month_num ASC
    `, { type: sequelize.QueryTypes.SELECT });

    const historical = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = date.getMonth() + 1;
      const yearNum = date.getFullYear();
      const name = date.toLocaleString('es-ES', { month: 'short' });
      
      const found = results.find(r => 
        parseInt(r.month_num) === monthNum && 
        parseInt(r.year_num) === yearNum
      );
      
      historical.push({ 
        name, 
        eventos: found ? parseInt(found.eventos) : 0 
      });
    }

    res.status(200).json({ historical });
  } catch (error) {
    console.error('Error getHistoricalData:', error);
    res.status(500).json({ 
      error: 'Error al cargar datos históricos',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getMyDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { idusuario, role, email } = req.user;

    if (!idusuario) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }

    const { Evento, Academico } = models;

    const isAdminOrSistemas = role === 'admin' || email === 'sistemas@gmail.com';
    
    if (isAdminOrSistemas) {
      const [totalEvents, eventosPorEstado] = await Promise.all([
        Evento.count(),
        Evento.findAll({
          attributes: [
            'estado',
            [models.sequelize.fn('COUNT', models.sequelize.col('idevento')), 'total']
          ],
          group: ['estado'],
          raw: true
        })
      ]);

      const estadoCounts = {};
      eventosPorEstado.forEach(row => {
        estadoCounts[row.estado || 'sin_estado'] = parseInt(row.total);
      });

      return res.status(200).json({
        totalEvents,
        estadoCounts,
        eventosAprobadosMes: estadoCounts.aprobado || 0,
        tasaAprobacion: totalEvents > 0 ? Math.round((estadoCounts.aprobado / totalEvents) * 100) : 0
      });
    }

    const academicos = await Academico.findAll({ where: { idusuario } });
    
    if (!academicos || academicos.length === 0) {
      return res.status(200).json({
        totalEvents: 0,
        estadoCounts: {},
        eventosAprobadosMes: 0,
        tasaAprobacion: 0
      });
    }

    const idsAcademico = academicos.map(a => a.idacademico).filter(Boolean);

    const [totalEvents, eventosPorEstado] = await Promise.all([
      Evento.count({ where: { idacademico: idsAcademico } }),
      Evento.findAll({
        attributes: [
          'estado',
          [models.sequelize.fn('COUNT', models.sequelize.col('idevento')), 'total']
        ],
        where: { idacademico: idsAcademico },
        group: ['estado'],
        raw: true
      })
    ]);

    const estadoCounts = {};
    eventosPorEstado.forEach(row => {
      estadoCounts[row.estado || 'sin_estado'] = parseInt(row.total);
    });

    const eventosAprobados = estadoCounts.aprobado || 0;
    const tasaAprobacion = totalEvents > 0 
      ? Math.round((eventosAprobados / totalEvents) * 100) 
      : 0;

    res.status(200).json({
      totalEvents,
      estadoCounts,
      eventosAprobadosMes: eventosAprobados,
      tasaAprobacion
    });
    
  } catch (error) {
    console.error('Error en getMyDashboardStats:', error);
    res.status(500).json({ 
      error: 'Error al cargar tus estadísticas',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getMyHistoricalData = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { Evento, sequelize, Academico } = models;
    const { idusuario } = req.user;

    const academicos = await Academico.findAll({ where: { idusuario } });
    
    if (!academicos || academicos.length === 0) {
      return res.status(200).json({ historical: [] });
    }
    
    const idsAcademico = academicos.map(a => a.idacademico).filter(Boolean);

    // ✅ CORREGIDO: Evitar error de sintaxis SQL "IN ()" si el array está vacío
    if (idsAcademico.length === 0) {
      return res.status(200).json({ historical: [] });
    }

    const results = await sequelize.query(`
       SELECT 
        EXTRACT(MONTH FROM "fechaevento"::DATE) as month_num,
        EXTRACT(YEAR FROM "fechaevento"::DATE) as year_num,
        COUNT(*) as eventos
      FROM "evento"
      WHERE idacademico IN (:idsAcademico)
        AND "fechaevento"::DATE >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY EXTRACT(MONTH FROM "fechaevento"::DATE), EXTRACT(YEAR FROM "fechaevento"::DATE)
      ORDER BY year_num ASC, month_num ASC
    `, { 
      replacements: { idsAcademico },
      type: sequelize.QueryTypes.SELECT 
    });

    const historical = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = date.getMonth() + 1;
      const yearNum = date.getFullYear();
      const name = date.toLocaleString('es-ES', { month: 'short' });
      
      const found = results.find(r => 
        parseInt(r.month_num) === monthNum && 
        parseInt(r.year_num) === yearNum
      );
      
      historical.push({ 
        name, 
        eventos: found ? parseInt(found.eventos) : 0 
      });
    }

    res.status(200).json({ historical });
  } catch (error) {
    console.error('❌ Error en getMyHistoricalData:', error);
    res.status(500).json({ 
      error: 'Error al cargar datos históricos',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getMyCommitteeEvents = asyncHandler(async (req, res) => {
  try {
    if (!req.user?.idusuario) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { idusuario } = req.user;
    const { sequelize, Evento } = getModels();

    const DIAS_A_MOSTRAR = 30; 
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - DIAS_A_MOSTRAR);

    const committeeRecords = await sequelize.query(
      `SELECT idevento, "created_at" FROM public.comite WHERE idusuario = :idusuario`,
      { replacements: { idusuario }, type: sequelize.QueryTypes.SELECT }
    );

    if (committeeRecords.length === 0) {
      return res.status(200).json({ events: [] });
    }

    const eventoIds = committeeRecords.map(record => record.idevento);

    const events = await Evento.findAll({
      where: { 
        idevento: eventoIds,
        fechaevento: { [Op.gte]: fechaLimite }
      },
      attributes: ['idevento', 'nombreevento', 'descripcion', 'fechaevento', 'estado'],
      order: [['fechaevento', 'DESC']]
    });

    const eventsWithAssignment = events.map(event => {
      const assignment = committeeRecords.find(r => r.idevento === event.idevento);
      return {
        ...event.get({ plain: true }),
        assignedAt: assignment?.created_at,
        role: 'comité'
      };
    });

    res.status(200).json({ events: eventsWithAssignment });
  } catch (error) {
    console.error('Error getMyCommitteeEvents:', error);
    res.status(500).json({ 
      error: 'Error al cargar eventos del comité',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const myEvent = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.idusuario) {
    console.error('Usuario no autenticado o req.user faltante');
    return res.status(401).json({ 
      error: 'No autorizado. Por favor inicia sesión nuevamente.',
      debug: { hasUser: !!req.user, user: req.user }
    });
  }
  res.status(200).json({ message: 'OK' });
});

module.exports = {
  getDashboardStats,
  getMensualStats,
  getHistoricalData,
  getMyDashboardStats,
  getMyHistoricalData,
  getMyCommitteeEvents,
  myEvent
};