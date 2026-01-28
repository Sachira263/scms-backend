const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Get sales report with chart data
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find({
      ...dateFilter,
      status: 'Completed',
      paymentStatus: 'Paid'
    }).populate('products.productId', 'name category price');

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Sales by category for pie chart
    const salesByCategory = {};
    orders.forEach(order => {
      order.products.forEach(item => {
        if (item.productId) {
          const category = item.productId.category;
          salesByCategory[category] = (salesByCategory[category] || 0) + (item.price * item.quantity);
        }
      });
    });

    // Convert to chart format
    const categoryChartData = Object.entries(salesByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(2) : 0
    }));

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue: averageOrderValue.toFixed(2)
      },
      salesByCategory: categoryChartData,
      orders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get daily report with chart data
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const orders = await Order.find({
      orderDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).populate('products.productId', 'name category')
      .populate('studentId', 'name email');

    const completedOrders = orders.filter(order => order.status === 'Completed');
    const pendingOrders = orders.filter(order => order.status === 'Pending');
    const cancelledOrders = orders.filter(order => order.status === 'Cancelled');
    
    const totalRevenue = completedOrders
      .filter(order => order.paymentStatus === 'Paid')
      .reduce((sum, order) => sum + order.totalAmount, 0);

    // Orders by status for pie chart
    const ordersByStatus = {
      Completed: completedOrders.length,
      Pending: pendingOrders.length,
      Cancelled: cancelledOrders.length
    };

    // Top selling products today
    const productSales = {};
    orders.forEach(order => {
      order.products.forEach(item => {
        if (item.productId) {
          const productName = item.productId.name;
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.price * item.quantity;
        }
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      date: targetDate.toDateString(),
      summary: {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalRevenue
      },
      charts: {
        ordersByStatus,
        topProducts
      },
      orders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get weekly sales trend for line chart
exports.getWeeklySalesTrend = async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(weeks) * 7));

    const salesData = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate },
          status: 'Completed',
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      chartData: salesData.map(item => ({
        date: item._id,
        sales: item.totalSales,
        orders: item.orderCount
      })),
      labels: salesData.map(item => item._id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get hourly sales for today (for bar chart)
exports.getHourlySales = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const hourlyData = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startOfDay, $lt: endOfDay },
          status: 'Completed'
        }
      },
      {
        $group: {
          _id: { $hour: "$orderDate" },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing hours with zero
    const fullDayData = [];
    for (let hour = 0; hour < 24; hour++) {
      const found = hourlyData.find(h => h._id === hour);
      fullDayData.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        sales: found ? found.totalSales : 0,
        orders: found ? found.orderCount : 0
      });
    }

    res.json({
      chartData: fullDayData,
      peakHour: fullDayData.reduce((max, h) => h.sales > max.sales ? h : max, fullDayData[0])
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get product performance report
exports.getProductPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find({
      ...dateFilter,
      status: 'Completed'
    }).populate('products.productId', 'name category price');

    // Aggregate product performance
    const productPerformance = {};
    orders.forEach(order => {
      order.products.forEach(item => {
        if (item.productId) {
          const productId = item.productId._id.toString();
          if (!productPerformance[productId]) {
            productPerformance[productId] = {
              name: item.productId.name,
              category: item.productId.category,
              totalQuantity: 0,
              totalRevenue: 0,
              orderCount: 0
            };
          }
          productPerformance[productId].totalQuantity += item.quantity;
          productPerformance[productId].totalRevenue += item.price * item.quantity;
          productPerformance[productId].orderCount += 1;
        }
      });
    });

    const performanceArray = Object.values(productPerformance)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Top 10 for charts
    const topProducts = performanceArray.slice(0, 10);

    res.json({
      allProducts: performanceArray,
      topProductsChart: {
        labels: topProducts.map(p => p.name),
        quantities: topProducts.map(p => p.totalQuantity),
        revenues: topProducts.map(p => p.totalRevenue)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get category-wise daily breakdown
exports.getCategoryDailyBreakdown = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const orders = await Order.find({
      orderDate: { $gte: startDate },
      status: 'Completed'
    }).populate('products.productId', 'name category');

    // Group by date and category
    const breakdown = {};
    orders.forEach(order => {
      const dateKey = order.orderDate.toISOString().split('T')[0];
      if (!breakdown[dateKey]) {
        breakdown[dateKey] = {
          date: dateKey,
          Breakfast: 0,
          Lunch: 0,
          Snacks: 0,
          Beverages: 0,
          total: 0
        };
      }
      
      order.products.forEach(item => {
        if (item.productId) {
          const category = item.productId.category;
          const amount = item.price * item.quantity;
          breakdown[dateKey][category] += amount;
          breakdown[dateKey].total += amount;
        }
      });
    });

    const chartData = Object.values(breakdown).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      chartData,
      categories: ['Breakfast', 'Lunch', 'Snacks', 'Beverages']
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats
    const todayOrders = await Order.find({
      orderDate: { $gte: startOfDay }
    });

    const todayRevenue = todayOrders
      .filter(o => o.status === 'Completed' && o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Monthly stats
    const monthOrders = await Order.find({
      orderDate: { $gte: startOfMonth }
    });

    const monthRevenue = monthOrders
      .filter(o => o.status === 'Completed' && o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Total users
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Total products
    const totalProducts = await Product.countDocuments();
    const availableProducts = await Product.countDocuments({ isAvailable: true });

    // Pending orders
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });

    res.json({
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        completedOrders: todayOrders.filter(o => o.status === 'Completed').length
      },
      month: {
        orders: monthOrders.length,
        revenue: monthRevenue
      },
      overview: {
        totalStudents,
        totalProducts,
        availableProducts,
        pendingOrders
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};