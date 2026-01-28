const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getDailyReport,
  getWeeklySalesTrend,
  getHourlySales,
  getProductPerformance,
  getCategoryDailyBreakdown,
  getDashboardSummary
} = require('../controllers/reportController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All report routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Dashboard summary
router.get('/dashboard', getDashboardSummary);

// Sales report
router.get('/sales', getSalesReport);

// Daily report
router.get('/daily', getDailyReport);

// Weekly sales trend (line chart)
router.get('/weekly-trend', getWeeklySalesTrend);

// Hourly sales (bar chart)
router.get('/hourly', getHourlySales);

// Product performance
router.get('/products', getProductPerformance);

// Category daily breakdown (stacked bar chart)
router.get('/category-breakdown', getCategoryDailyBreakdown);

module.exports = router;


