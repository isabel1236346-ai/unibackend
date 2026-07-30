const  express = require('express');
const router = express.Router(); // O como hayas llamado a tu instancia de router
const { protect, authorize } = require('../middleware/authMiddleware.js');
const {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/locationController.js');

// Define tus rutas aquí usando 'router.get', 'router.post', etc.
router.get('/', getAllLocations); // Asumiendo que es público o protegido en el controlador
router.post('/', protect, authorize(['admin']), createLocation);
router.put('/:id', protect, authorize(['admin']), updateLocation);
router.delete('/:id', protect, authorize(['admin']), deleteLocation);

module.exports = router; // <--- ASEGÚRATE DE TENER ESTA LÍNEA