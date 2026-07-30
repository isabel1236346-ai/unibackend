const express = require('express');
const { getFacultades } = require('../controllers/facultadController.js');
const { protect } = require('../middleware/authMiddleware.js');
const { getModels } = require('../models/index.js');
const router = express.Router();

router.get('/', protect, getFacultades);

module.exports = router;