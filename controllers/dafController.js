// routes/daf.js (Node.js/Express)
const express = require('express');
const {getModels} = require('../models/index.js');
// Helper para calcular fechas según período
const getDateRange = (periodo) => {
  const now = new Date();
  let start = new Date();
  
  switch (periodo) {
    case 'semana':
      start.setDate(now.getDate() - 7);
      break;
    case 'trimestre':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'mes':
    default:
      start.setMonth(now.getMonth() - 1);
      break;
  }
  
  return { start, end: now };
};

const reportes = async (req, res) => {
   try {
    const { periodo = 'mes' } = req.query;
    const { start, end } = getDateRange(periodo);

    console.log('📊 Reporte DAF - Período:', periodo);

    // 1️⃣ Conteos por estado (solo fase 2)
    const [totalResult, aprobadasResult, rechazadasResult, pendientesResult] = await Promise.all([
      sequelize.query(
        `SELECT COUNT(*) as count FROM evento WHERE fechaevento BETWEEN $1 AND $2 AND idfase = 2`,
        { bind: [start, end], type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT COUNT(*) as count FROM evento WHERE fechaevento BETWEEN $1 AND $2 AND idfase = 2 AND estado = 'aprobado'`,
        { bind: [start, end], type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT COUNT(*) as count FROM evento WHERE fechaevento BETWEEN $1 AND $2 AND idfase = 2 AND estado = 'rechazado'`,
        { bind: [start, end], type: sequelize.QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT COUNT(*) as count FROM evento WHERE fechaevento BETWEEN $1 AND $2 AND idfase = 2 AND estado = 'pendiente'`,
        { bind: [start, end], type: sequelize.QueryTypes.SELECT }
      ),
    ]);

    const totalSolicitudes = parseInt(totalResult[0]?.count) || 0;
    const aprobadas = parseInt(aprobadasResult[0]?.count) || 0;
    const rechazadas = parseInt(rechazadasResult[0]?.count) || 0;
    const pendientes = parseInt(pendientesResult[0]?.count) || 0;

    // 2️⃣ Recursos más usados
    const recursosMasUsados = await sequelize.query(`
      SELECT 
        r.nombre_recurso as nombre,
        COUNT(re.idrecurso) as usos
      FROM recurso r
      INNER JOIN evento_recurso re ON re.idrecurso = r.idrecurso
      INNER JOIN evento e ON e.idevento = re.idevento
      WHERE e.fechaevento BETWEEN $1 AND $2
        AND e.idfase = 2
      GROUP BY r.idrecurso, r.nombre_recurso
      ORDER BY usos DESC
      LIMIT 5
    `, { 
      bind: [start, end], 
      type: sequelize.QueryTypes.SELECT 
    });

    // 3️⃣ Eventos recientes
    const eventoRecientes = await sequelize.query(`
      SELECT 
        e.idevento as id,
        e.nombreevento as "nombreEvento",
        e.estado,
        e.fechaevento,
        COUNT(er.idrecurso) as "totalRecursos",
        COALESCE(a.nombre || ' ' || a.apellidopat, 'Desconocido') as solicitante
      FROM evento e
      LEFT JOIN evento_recurso er ON er.idevento = e.idevento
      LEFT JOIN academico a ON a.idacademico = e.idacademico
      WHERE e.idfase = 2 
        AND e.fechaevento BETWEEN $1 AND $2
      GROUP BY e.idevento, a.nombre, a.apellidopat
      ORDER BY e.fechaevento DESC
      LIMIT 5
    `, { 
      bind: [start, end], 
      type: sequelize.QueryTypes.SELECT 
    });

    // ✅ Respuesta
    res.json({
      totalSolicitudes,
      aprobadas,
      rechazadas,
      pendientes,
      recursosMasUsados: recursosMasUsados.map(r => ({
        nombre: r.nombre,
        usos: parseInt(r.usos)
      })),
      eventoRecientes: eventoRecientes.map(ev => ({
        id: ev.id,
        nombreEvento: ev.nombreEvento,
        solicitante: ev.solicitante || 'Desconocido',
        fecha: ev.fechaevento ? new Date(ev.fechaevento).toLocaleDateString('es-ES') : 'N/A',
        estado: ev.estado?.charAt(0).toUpperCase() + ev.estado?.slice(1) || 'Pendiente',
        totalRecursos: parseInt(ev.totalRecursos) || 0
      }))
    });

  } catch (error) {
    console.error('❌ Error en /reportes:', error);
    res.status(500).json({ 
      error: 'Error al obtener reportes',
      details: error.message 
    });
  }
};

module.exports = { reportes };