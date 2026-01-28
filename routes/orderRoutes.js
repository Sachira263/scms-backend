const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  getOrdersByStatus
} = require('../controllers/orderController');
const { protect, isAdmin, isOwnerOrAdmin } = require('../middleware/authMiddleware');

// All order routes require authentication
router.use(protect);

// Student routes - place order and view own orders
router.post('/', createOrder);                    // Any authenticated user can create order
router.get('/my-orders', getMyOrders);            // Get logged-in user's orders

// Admin only routes
router.get('/', isAdmin, getAllOrders);           // Get all orders
router.get('/status/:status', isAdmin, getOrdersByStatus);  // Filter by status

// Get single order (owner or admin)
router.get('/:id', getOrderById);

// Admin only - manage orders
router.put('/:id/status', isAdmin, updateOrderStatus);
router.put('/:id/payment', isAdmin, updatePaymentStatus);

// Cancel order (owner can cancel pending, admin can cancel any)
router.put('/:id/cancel', cancelOrder);

module.exports = router;

