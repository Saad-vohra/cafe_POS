const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/daily', auth, adminOnly, async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    const bills = await Bill.find({ restaurantId: req.restaurantId, createdAt: { $gte: start, $lte: end } });
    const orders = await Order.find({ restaurantId: req.restaurantId, createdAt: { $gte: start, $lte: end } });

    const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalOrders = orders.length;

    const itemSales = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (!itemSales[item.name]) itemSales[item.name] = { quantity: 0, revenue: 0 };
        itemSales[item.name].quantity += item.quantity;
        itemSales[item.name].revenue += item.total;
      });
    });

    const topItems = Object.entries(itemSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const paymentBreakdown = { cash: 0, upi: 0, card: 0 };
    bills.forEach(b => { paymentBreakdown[b.paymentMode] += b.totalAmount; });

    res.json({ date, totalRevenue, totalOrders, completedOrders: bills.length, topItems, paymentBreakdown, bills });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/monthly', auth, adminOnly, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const monthlyData = [];

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      const bills = await Bill.find({ restaurantId: req.restaurantId, createdAt: { $gte: start, $lte: end } });
      const revenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);
      monthlyData.push({
        month: start.toLocaleString('default', { month: 'long' }),
        revenue,
        orders: bills.length
      });
    }

    res.json({ year, monthlyData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/dashboard', auth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [todayBills, todayOrders, activeOrders] = await Promise.all([
      Bill.find({ restaurantId: req.restaurantId, createdAt: { $gte: today, $lte: todayEnd } }),
      Order.countDocuments({ restaurantId: req.restaurantId, createdAt: { $gte: today, $lte: todayEnd } }),
      Order.find({ restaurantId: req.restaurantId, status: { $nin: ['completed', 'cancelled'] } })
    ]);

    const todayRevenue = todayBills.reduce((sum, b) => sum + b.totalAmount, 0);

    res.json({ todayRevenue, todayOrders, todayBills: todayBills.length, activeOrders: activeOrders.length, pendingOrders: activeOrders.filter(o => o.status === 'pending').length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
