const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 📁 Carpeta donde caerán los layouts: uploads/layouts/
const uploadsDir = path.join(__dirname, '..', 'uploads');
const layoutsDir = path.join(__dirname, '..', 'uploads', 'layouts');

// Crear carpetas si no existen
[uploadsDir, layoutsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 💾 Storage: guarda en uploads/layouts/ con nombre único
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, layoutsDir), // 👈 uploads/layouts/
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `layout-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

// 🖼️ Solo imágenes
const fileFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
  cb(ok ? null : new Error('Solo se permiten imágenes'), ok);
};

// ✅ ESTA ES LA VARIABLE QUE FALTABA DECLARAR
const uploadLayout = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

module.exports = uploadLayout;