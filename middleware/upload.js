// middleware/uploadLayout.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const layoutsDir = path.join(__dirname, '..', 'uploads', 'layouts');

if (!fs.existsSync(layoutsDir)) {
  fs.mkdirSync(layoutsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, layoutsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes: jpeg, jpg, png, gif, webp'));
  }
};

const uploadLayout = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

module.exports = uploadLayout;  // ✅ Exportación por defecto, una sola cosa