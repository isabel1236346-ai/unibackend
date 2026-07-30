const eventRoutes = require('./eventRoutesNO');
const express = require('express');
const router = express.Router(); 
const {
  /*getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory*/
  registerUser,
  registerUserStudent,
  loginUser,
  getMe
} = require('../controllers/categoryController');
const { protect, authorize } =require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/register-student', registerUserStudent);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
/*router.get('/', getAllCategories);
router.post('/', protect, authorize(['admin']), createCategory);
router.put('/:id', protect, authorize(['admin']), updateCategory);
router.delete('/:id', protect, authorize(['admin']), deleteCategory);*/

module.exports = router; 