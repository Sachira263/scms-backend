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
  getOrdersByStatus,
} = require('../controllers/orderController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { generateEBillPDF } = require('../services/emailService');
const Order = require('../models/Order');

router.use(protect);

// Student routes
router.post('/', createOrder);
router.get('/my-orders', getMyOrders);

// E-bill PDF download
router.get('/:id/ebill', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('products.productId', 'name category');

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isOwner = order.studentId._id.toString() === req.user.id;
    const isAdminUser = req.user.role === 'admin';
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pdfBuffer = await generateEBillPDF(order);
    const shortId = order._id.toString().substring(order._id.toString().length - 6).toUpperCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SCMS_Bill_${shortId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
router.get('/', isAdmin, getAllOrders);
router.get('/status/:status', isAdmin, getOrdersByStatus);
router.get('/:id', getOrderById);
router.put('/:id/status', isAdmin, updateOrderStatus);
router.put('/:id/payment', isAdmin, updatePaymentStatus);
router.delete('/:id', cancelOrder);

module.exports = router;





