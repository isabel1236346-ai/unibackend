const {getModels} = require('../models/index.js');

const estadisticas = async (req, res) => {
   try {
    const { sequelize } = require('../models/index.js');

    const [totalEventos] = await sequelize.query('SELECT COUNT(*) as total FROM evento');
    const [eventosPorTipo] = await sequelize.query(`
      SELECT te.nombretipoevento, COUNT(e.idevento) as cantidad
      FROM evento e
      JOIN tipo_evento te ON e.idtipoevento = te.idtipoevento
      GROUP BY te.nombretipoevento
      ORDER BY cantidad DESC
    `);
    const [proximosEventos] = await sequelize.query(`
      SELECT nombreevento, fechaevento FROM evento 
      WHERE fechaevento >= CURRENT_DATE 
      ORDER BY fechaevento ASC 
      LIMIT 5
    `);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-estadisticas.pdf');
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('Reporte de Estadísticas de Eventos', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).font('Helvetica-Bold').text('Resumen General');
    doc.fontSize(12).font('Helvetica').text(`- Número total de eventos registrados: ${totalEventos[0].total}`);
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text('Distribución de Eventos por Tipo');
    eventosPorTipo.forEach(tipo => {
      doc.fontSize(12).font('Helvetica').text(`- ${tipo.nombretipoevento}: ${tipo.cantidad} evento(s)`);
    });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text('Próximos 5 Eventos');
    proximosEventos.forEach(evento => {
      doc.fontSize(12).font('Helvetica').text(`- ${evento.nombreevento} (Fecha: ${new Date(evento.fechaevento).toLocaleDateString('es-ES')})`);
    });
    doc.moveDown();
    const generationDate = new Date().toLocaleString('es-ES');
    doc.fontSize(8).text(`Reporte generado el ${generationDate}`, 50, doc.page.height - 50, { align: 'center' });
    doc.end();

  } catch (error) {
    console.error('Error al generar el PDF de estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
module.exports = {
  estadisticas
};