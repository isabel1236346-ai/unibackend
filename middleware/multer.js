const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const layoutsDir = path.join(__dirname, '..', 'uploads', 'layouts');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(layoutsDir)) fs.mkdirSync(layoutsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, layoutsDir);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'layout-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const fileFilter = function(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.indexOf(file.mimetype) !== -1) {
    cb(null, true);
  } else {
    cb(new Error('Solo imágenes'), false);
  }
};

const uploadLayout = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = uploadLayout;