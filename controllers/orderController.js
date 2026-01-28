const Order = require('../models/Order');
const Product = require('../models/Product');

// Create a new order (Any authenticated user)
exports.createOrder = async (req, res) => {
  try {
    const { products } = req.body;
    const studentId = req.user.id; // Get from authenticated user
    
    // Validate and calculate total amount
    let totalAmount = 0;
    const validatedProducts = [];
      
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.productId} not found` });
      }
      if (!product.isAvailable) {
        return res.status(400).json({ error: `Product ${product.name} is not available` });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      validatedProducts.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });
    }

    const order = new Order({
      studentId,
      products: validatedProducts,
      totalAmount
    });

    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('studentId', 'name email')
      .populate('products.productId', 'name category');

    res.status(201).json({ 
      message: 'Order created successfully', 
      order: populatedOrder 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get logged-in user's orders (Student)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ studentId: req.user.id })
      .populate('products.productId', 'name category imageUrl')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all orders (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('studentId', 'name email')
      .populate('products.productId', 'name category')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get order by ID (Owner or Admin)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('products.productId', 'name category imageUrl');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is owner or admin
    if (req.user.role !== 'admin' && order.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };

    if (status === 'Completed') {
      updateData.completedDate = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('studentId', 'name email')
     .populate('products.productId', 'name category');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update payment status (Admin only)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    ).populate('studentId', 'name email')
     .populate('products.productId', 'name category');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Payment status updated successfully', order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cancel order (Owner can cancel pending orders, Admin can cancel any)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check permissions
    const isOwner = order.studentId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Students can only cancel pending orders
    if (isOwner && !isAdmin && order.status !== 'Pending') {
      return res.status(400).json({ error: 'You can only cancel pending orders' });
    }

    // Admin cannot cancel completed orders
    if (order.status === 'Completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed order' });
    }

    order.status = 'Cancelled';
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('studentId', 'name email')
      .populate('products.productId', 'name category');

    res.json({ message: 'Order cancelled successfully', order: populatedOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get orders by status (Admin only)
exports.getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const orders = await Order.find({ status })
      .populate('studentId', 'name email')
      .populate('products.productId', 'name category')
      .sort({ orderDate: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};