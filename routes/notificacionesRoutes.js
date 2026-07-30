const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  diagnosticarNotificaciones
} = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

// Ruta de diagnóstico (SIN autenticación para probar)
router.get('/diagnostico', diagnosticarNotificaciones);

// Rutas protegidas
router.get('/', protect, getUserNotifications);
router.patch('/:id/read', protect, markAsRead);
router.patch('/mark-all-read', protect, markAllAsRead);
router.get('/unread-count', protect, getUnreadCount);

module.exports = router;