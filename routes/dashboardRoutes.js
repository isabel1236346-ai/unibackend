const express = require('express');
const {getModels} =require ('../models/index.js');
const { protect, authorize } =require('../middleware/authMiddleware.js');
const { getDashboardStats, getHistoricalData,getMensualStats,getMyHistoricalData,getMyDashboardStats, getMyCommitteeEvents } =require('../controllers/dashboardController.js');
const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/historical', protect,getHistoricalData);
router.get('/mensual', protect, getMensualStats);
// Rutas para académicos (datos personales)
router.get('/my-stats', protect, authorize(['academico']), getMyDashboardStats);
router.get('/my-historical', protect, authorize(['academico']), getMyHistoricalData); 
router.get('/my-committee-events', protect, authorize(['academico']), getMyCommitteeEvents);
module.exports = router;