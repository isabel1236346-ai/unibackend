// routes/authRoutes.js
const express =require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, registerUserStudent,getFacultadInfo } =require('../controllers/authController.js');
const { protect, protect1 } = require ('../middleware/authMiddleware.js');


router.post('/register', registerUser); 
router.post('/registerStudent', registerUserStudent);
router.post('/login', loginUser);
router.get('/me', protect, getMe); 
router.get('/facultad-info', protect1, getFacultadInfo);

module.exports = router; // Usar export default