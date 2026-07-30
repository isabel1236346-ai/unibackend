const  express =require('express');
const { 
  getEstudiantes,
  getAllEstudiantes,
  getEstudianteById,
  updateEstudiante,
  deleteEstudiante,
  getEventosPorFacultadEstudiante,
  estudiantesInscritosEnEvento
} = require('../controllers/estudiantesController.js');
const { protect,protect1 } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.get('/facultad/:idfacultad', protect1, getEventosPorFacultadEstudiante);
router.get('/estudiantes-inscritos-facultad',protect, estudiantesInscritosEnEvento);

router.get('/', protect, getAllEstudiantes);
router.get('/:idusuario', protect1, getEstudiantes);
router.get('/:id', protect, getEstudianteById);
router.put('/:id', protect, updateEstudiante);
router.delete('/:id', protect, deleteEstudiante);

module.exports = router;