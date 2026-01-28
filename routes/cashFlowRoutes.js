const express = require('express');
const router = express.Router();
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  getCashFlowSummary,
  getDailyCashFlow,
  deleteTransaction
} = require('../controllers/cashFlowController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Create transaction (admin only)
router.post('/', isAdmin, createTransaction);

// Get all transactions
router.get('/', getAllTransactions);

// Get cash flow summary
router.get('/summary', getCashFlowSummary);

// Get daily cash flow for charts
router.get('/daily-chart', getDailyCashFlow);

// Get transaction by ID
router.get('/:id', getTransactionById);

// Delete transaction (admin only)
router.delete('/:id', isAdmin, deleteTransaction);

module.exports = router;