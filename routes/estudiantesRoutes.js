const  express =require('express');
const { 
  getEstudiantes,
  getAllEstudiantes,
  getEstudianteById,
  updateEstudiante,
  deleteEstudiante,
  getEventosPorFacultadEstudiante,
  estudiantesInscritosEnEvento,
  getEstudiantesInscritosEvento,
  actualizarDatosInscripcion,
  misInscripciones,
  registrarEventoEstudiante
} = require('../controllers/estudiantesController.js');
const { protect,protect1 } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.get('/facultad/:idfacultad', protect1, getEventosPorFacultadEstudiante);
router.get('/estudiantes-inscritos-facultad',protect, estudiantesInscritosEnEvento);
router.get('/estudiantes-inscritos-evento/:id', protect, getEstudiantesInscritosEvento);
router.put('/mis-datos-inscripcion', protect, actualizarDatosInscripcion);
router.get('/mis-inscripciones', protect, misInscripciones);
router.get('/', protect, getAllEstudiantes);
router.get('/:idusuario', protect1, getEstudiantes);
router.get('/:id', protect, getEstudianteById);
router.put('/:id', protect, updateEstudiante);
router.delete('/:id', protect, deleteEstudiante);
//router.post('/:id/registrar', protect, registrarEventoEstudiante);

module.exports = router;