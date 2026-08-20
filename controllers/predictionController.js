const asyncHandler = require('express-async-handler');
const { Op,QueryTypes } = require('sequelize');
const predictionService = require('../services/predictionService');


  const predecir = asyncHandler (async(req, res) => {
  //async predecir(req, res) {
    try {
      const { evento_id, tipo, facultad, fecha } = req.body;
      
      if (!tipo || !facultad || !fecha) {
        return res.status(400).json({ error: 'Faltan datos del evento' });
      }

      const resultado = await predictionService.predecirAsistencia({
        tipo,
        facultad,
        fecha
      });

      res.json({
        success: true,
        data: resultado
      });
    } catch (error) {
      console.error('Error en predicción:', error);
      res.status(500).json({ error: 'Error al generar predicción' });
    }
  }
);

  /**
   * GET /api/predictions/analysis
   * Genera análisis completo para el dashboard
   */
  const analisisCompleto = asyncHandler(async (req, res) => {
    try {
      const analisis = await predictionService.generarAnalisisCompleto();
      
      res.json({
        success: true,
        data: analisis,
        total_eventos: analisis.length
      });
    } catch (error) {
      console.error('Error en análisis:', error);
      res.status(500).json({ error: 'Error al generar análisis' });
    }
  }
);

module.exports = {
  predecir,
  analisisCompleto
};
