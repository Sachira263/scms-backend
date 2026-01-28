const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['Income', 'Expense', 'Refund'],
    default: 'Income'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Online'],
    default: 'Cash'
  },
  category: {
    type: String,
    enum: ['Food Sales', 'Beverage Sales', 'Supplies', 'Maintenance', 'Other'],
    default: 'Food Sales'
  },
  description: {
    type: String
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);