// routes/carreras.js
const express = require('express');
const router = express.Router();
const { getModels } = require('../models');

// GET /carreras - Obtener todas las carreras
router.get('/', async (req, res) => {
  try {
    const models = getModels();
    const Carrera = models.Carrera || models.carrera;
    
    if (!Carrera) {
      return res.status(404).json({ message: 'Modelo Carrera no encontrado' });
    }
    
    const carreras = await Carrera.findAll({
      include: [{
        model: models.Facultad || models.facultad,
        as: 'facultad' // Ajusta según tu asociación
      }],
      order: [['nombre_carrera', 'ASC']]
    });
    
    res.json(carreras);
  } catch (error) {
    console.error('Error fetching carreras:', error);
    res.status(500).json({ 
      message: 'Error al obtener carreras', 
      error: error.message 
    });
  }
});

module.exports = router;