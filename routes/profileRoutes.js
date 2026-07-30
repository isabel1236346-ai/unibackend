const { Router } =require ('express');
const  { protect } = require('../middleware/authMiddleware.js');
const { getProfile } = require('../controllers/userController.js');

const router = Router();

router.get('/',protect, getProfile); 

module.exports = router;