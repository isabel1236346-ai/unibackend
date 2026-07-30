const express = require('express');
const router = express.Router();

const  {
  createEvento,
  getAllEventos,
  getEventoById,
  updateEvento,
  deleteEvento,
} = require('../controllers/eventControllerA.js');
const  {getModels} = require('../models/index.js');
const { protect, authorize } =require('../middleware/authMiddleware.js');

router.post('/', protect, createEvento);
router.get('/', getAllEventos);
router.get('/:id', getEventoById);


router.put('/:id', protect, authorize(['admin']), updateEvento);
router.delete('/:id', protect, authorize(['admin']), deleteEvento);
module.exports = router;