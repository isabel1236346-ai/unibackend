const express = require('express');
const {getModels} =require('../models/index.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');
const { 
  getEventosNoAprobados,
  aprobarEvento,
  rechazarEvento,
  getEventosAprobados,
  getCarreraById,
  getFacultadById,
  getEstudianteFacultad,
  deleteEvento,
  registrarEventoEstudiante,
  getMisInscripciones
} = require('../controllers/proyectoController.js');
const {
  sendNotification,
  getUserNotifications,
  markAsRead,
  getUnreadCount
} = require('../controllers/notificationController.js');

const router = express.Router();
router.put('/:id/approve',protect,authorize('admin'), aprobarEvento);
router.put('/:id/reject',protect,authorize('admin'), deleteEvento);
router.get('/estudiantes/facultad/:idfacultad',getEstudianteFacultad) ;


router.get('/carreras/:id', protect, getCarreraById);

router.get('/facultades/:id', protect,getFacultadById);
router.post('/', sendNotification);
router.get('/', getUserNotifications);
router.patch('/:id/read', markAsRead);
router.get('/unread-count', getUnreadCount);

module.exports= router;