const express = require('express');
const { getModels } = require('../models/index.js');
const { createRecurso,
    getRecursos,
    updateRecurso,
    deleteRecurso } = require ('../controllers/recursoController.js');
const { protect } =require('../middleware/authMiddleware.js'); 

const router = express.Router();

router.post('/', protect, createRecurso); 
router.get('/', getRecursos);
router.put('/:id',updateRecurso);
router.delete('/:id',deleteRecurso);

module.exports = router;