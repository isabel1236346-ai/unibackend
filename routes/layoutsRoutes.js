const router = require('express').Router();
const { uploadLayout } = require('../middleware/upload');  // ✅ Importación por nombre, varias cosas
const { crearLayout } = require('../controllers/layoutsController');
const { protect } = require('../middleware/authMiddleware'); 

router.post('/', protect, uploadLayout.single('imagen'), crearLayout);

module.exports = router;