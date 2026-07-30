// routes/daf.js (Node.js/Express)
const express = require('express');
const {reportes} = require('../controllers/dafController');
const {authMiddleware} = require('../middleware/authMiddleware'); // Tu middleware de auth

const router = express.Router();

router.get('/reportes', reportes);

module.exports = router;