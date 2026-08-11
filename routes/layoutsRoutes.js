// routes/layoutsRoutes.js - SOLUCIÓN AUTOCONTENIDA
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { crearLayout, obtenerLayouts } = require('../controllers/layoutsController');
const { protect } = require('../middleware/authMiddleware');

// 📂 Crear carpeta uploads/layouts si no existe
const uploadsBase = path.join(__dirname, '..', 'uploads');
const layoutsDir = path.join(__dirname, '..', 'uploads', 'layouts');

if (!fs.existsSync(uploadsBase)) fs.mkdirSync(uploadsBase, { recursive: true });
if (!fs.existsSync(layoutsDir)) fs.mkdirSync(layoutsDir, { recursive: true });

// 💾 Configuración de multer DIRECTAMENTE aquí (no depende de middleware)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, layoutsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `layout-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const uploadLayout = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo imágenes'), ok);
  }
});

// 🛣️ Rutas
router.post('/', protect, uploadLayout.single('imagen'), crearLayout);
router.get('/', protect, obtenerLayouts);

module.exports = router;