const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Carpetas ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
const layoutsDir = path.join(__dirname, '../uploads/layouts');

// Crear carpetas si no existen
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(layoutsDir)) fs.mkdirSync(layoutsDir, { recursive: true });

// ─── Filtro de imágenes ────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes: jpeg, jpg, png, gif, webp'));
  }
};

// ─── Storage general (uploads/) ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// ─── Storage específico para layouts (uploads/layouts/) ────────────────────
const storageLayouts = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, layoutsDir); // ← siempre guarda en uploads/layouts/
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// ─── Instancias de multer ──────────────────────────────────────────────────
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadLayout = multer({
  storage: storageLayouts,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

module.exports = { upload, uploadLayout };