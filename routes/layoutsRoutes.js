// backend/routes/layoutsRoutes.js
const express = require('express');
const router = express.Router();
const { crearLayout, obtenerLayouts } = require('../controllers/layoutsController.js');
const { uploadLayout } = require('../middleware/upload.js'); // ← llaves {}

router.post('/', uploadLayout.single('imagen'), crearLayout);
router.get('/', obtenerLayouts);

module.exports = router;