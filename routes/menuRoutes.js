const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { 
  getAllProducts, 
  createProduct, 
  getProductById, 
  updateProduct, 
  deleteProduct,
  getProductsByCategory,
  toggleAvailability
} = require('../controllers/menuController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Public routes - anyone can view menu
router.get('/', getAllProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);

// Admin only routes - manage menu
router.post('/', protect, isAdmin, upload.single('image'), createProduct);
router.put('/:id', protect, isAdmin, upload.single('image'), updateProduct);
router.delete('/:id', protect, isAdmin, deleteProduct);
router.patch('/:id/availability', protect, isAdmin, toggleAvailability);

module.exports = router;


