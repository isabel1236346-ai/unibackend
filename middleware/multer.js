const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta ABSOLUTA: funciona sin importar desde dónde ejecutes node
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `layout-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });