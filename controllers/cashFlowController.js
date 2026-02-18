const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { orderId, studentId, amount, type, paymentMethod, category, description } = req.body;

    const transaction = new Transaction({
      orderId,
      studentId,
      amount,
      type,
      paymentMethod,
      category,
      description
    });

    await transaction.save();
    res.status(201).json({ message: 'Transaction recorded successfully', transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    let filter = {};
    
    if (startDate && endDate) {
      filter.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (type) {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter)
      .populate('orderId')
      .populate('studentId', 'name email')
      .sort({ transactionDate: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('orderId')
      .populate('studentId', 'name email');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get cash flow summary
exports.getCashFlowSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Transaction.find(dateFilter);

    const totalIncome = transactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRefunds = transactions
      .filter(t => t.type === 'Refund')
      .reduce((sum, t) => sum + t.amount, 0);

    // Group by payment method
    const byPaymentMethod = transactions.reduce((acc, t) => {
      if (t.type === 'Income') {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount;
      }
      return acc;
    }, {});

    // Group by category
    const byCategory = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    res.json({
      totalIncome,
      totalExpense,
      totalRefunds,
      netCashFlow: totalIncome - totalExpense - totalRefunds,
      transactionCount: transactions.length,
      byPaymentMethod,
      byCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get daily cash flow for charts
exports.getDailyCashFlow = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const transactions = await Transaction.aggregate([
      {
        $match: {
          transactionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" } },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Format data for charts
    const chartData = {};
    transactions.forEach(t => {
      if (!chartData[t._id.date]) {
        chartData[t._id.date] = { date: t._id.date, income: 0, expense: 0, refund: 0 };
      }
      if (t._id.type === 'Income') chartData[t._id.date].income = t.total;
      if (t._id.type === 'Expense') chartData[t._id.date].expense = t.total;
      if (t._id.type === 'Refund') chartData[t._id.date].refund = t.total;
    });

    res.json({
      chartData: Object.values(chartData),
      labels: Object.keys(chartData)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


