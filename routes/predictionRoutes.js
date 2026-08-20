// src/routes/predictionRoutes.js
const express = require('express');
const router = express.Router();
const { predecir, analisisCompleto } = require('../controllers/predictionController');

// Ruta para predecir asistencia de un evento específico
router.post('/predict', predecir);

// Ruta para obtener análisis completo del dashboard
router.get('/analysis', analisisCompleto);

module.exports = router;