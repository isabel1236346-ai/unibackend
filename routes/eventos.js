const  express = require('express');
const  { Op } = require('sequelize');
const  { getModels } = require('../models/index.js');
const  { 
  createEvento,
  getAllEventos, 
  getEventoById,
  updateEvento, 
  deleteEvento,
  getEventosNoAprobados,
  getEventosAprobados,
  aprobarEvento,rechazarEvento,
  getDashboardStats,
  getHistoricalData,
  getEventosAprobadosPorFacultad,
  getEventosRechazados,
  getEventos,
  getEventosAprobadosPorFacultadYFecha,
  getEventosVencidos,
  //getEventosPendientesPorArea
  } = require('../controllers/proyectoController.js');
const {enviarNotificacionTelegram} = require('../controllers/botController.js');
const  {protect,authorize,protect1} = require('../middleware/authMiddleware.js');
const { getInformeEvento,guardarInformeEvento } = require('../controllers/informeEventoController.js');
const router = express.Router();

router.use((req, res, next) => {
  console.log(`[RUTA] ${req.method} ${req.path} - Params:`, req.params, '- Body:', req.body);
  next();
});

router.get('/pendientes',protect, getEventosNoAprobados);
router.get('/aprobados',protect, getEventosAprobados);
router.get('/vencidos',protect, getEventosVencidos);
router.get('/aprobados-por-facultad',protect, getEventosAprobadosPorFacultad);
router.get('/aprobados-por-facultad-y-fecha',protect, getEventosAprobadosPorFacultadYFecha);
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/dashboard/historical', protect, getHistoricalData);
router.get('/rechazados',protect, getEventosRechazados);
//router.get('/details/:id', getEventDetailsById);


//router.get('/listar-pendientes', pendientes); // si necesitas esta ruta
//router.get('/pendientes',protect, getEventosPendientesPorArea);
router.put('/:id/approve', aprobarEvento);
router.put('/:id/reject',deleteEvento);
router.put('/:id', updateEvento);
router.put('/:id/cancel',rechazarEvento);
//router.delete('/:id', deleteEvento);
router.post('/',protect, createEvento);
router.get('/con-facultad', getEventos);
router.get('/', getAllEventos);
router.get('/:id',protect, getEventoById);

router.get('/:id/informe', protect, getInformeEvento);
router.post('/:id/informe', protect, guardarInformeEvento);
//router.get('/mios/aprobados',protect, getAprobados);


//router.get('/debug/:id',debugEventoById);



//router.get('/pendientes',pendientes);

module.exports = router;