// src/routes/predictionRoutes.js
const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// Ruta para predecir asistencia de un evento específico
router.post('/predict', predictionController.predecir);

// Ruta para obtener análisis completo del dashboard
router.get('/analysis', predictionController.analisisCompleto);

module.exports = router;