const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const LoyaltySetting = require('../models/LoyaltySetting');
const { auth, notKitchen, staffOrCustomer, customerOnly, signCustomerToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { emitOrder, emitToStaff, emitCustomerUpdate, publicCustomer, publicOrder } = require('../utils/realtime');
const { computeTotals, rewardDiscount } = require('../utils/billing');
const { escapeRegex, normalizePhone, toPositiveInt } = require('../utils/validate');

// Generous per-IP limit: many guests may share the restaurant's Wi-Fi (one public IP).
const sessionLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 150, message: 'Too many attempts. Please wait a few minutes.' });
const callBillLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyFn: (req) => `bill:${req.customer?._id || req.ip}`,
  message: 'Your request has already been sent to the staff.'
});

const findCustomerQuery = (id) => (
  mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { customerId: id }] }
    : { customerId: id }
);

// Customers may only read their own profile; staff may read any.
const loadCustomer = async (req, res) => {
  const customer = await Customer.findOne(findCustomerQuery(req.params.id));
  if (!customer || (req.customer && customer._id.toString() !== req.customer._id.toString())) {
    res.status(404).json({ message: 'Customer not found' });
    return null;
  }
  return customer;
};

// Admin: all customers with search, filter and summary statistics
router.get('/', auth, notKitchen, async (req, res) => {
  try {
    const { search, filter } = req.query;
    const query = {};

    if (search && String(search).trim()) {
      const q = escapeRegex(String(search).trim().slice(0, 50));
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { customerId: { $regex: q, $options: 'i' } }
      ];
    }

    if (filter === 'active') {
      query.activeTable = { $ne: null };
    } else if (filter === 'rewards') {
      query['rewards.status'] = 'available';
    }

    const [customers, totalCustomers, activeDineInCustomers, customersWithAvailableRewards, stampsAgg] = await Promise.all([
      Customer.find(query).sort({ lastVisit: -1, createdAt: -1 }).limit(500),
      Customer.countDocuments({}),
      Customer.countDocuments({ activeTable: { $ne: null } }),
      Customer.countDocuments({ 'rewards.status': 'available' }),
      Customer.aggregate([{ $group: { _id: null, total: { $sum: '$totalStamps' } } }])
    ]);

    res.json({
      customers,
      stats: {
        totalCustomers,
        totalStampsAwarded: stampsAgg[0]?.total || 0,
        activeDineInCustomers,
        customersWithAvailableRewards
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer check-in from the table QR code. Identifies or creates the profile and
// returns a session token tied to that table.
router.post('/session', sessionLimit, async (req, res) => {
  try {
    const cleanName = String(req.body.name || '').trim().slice(0, 60);
    const cleanPhone = normalizePhone(req.body.phone);
    const tableNumber = toPositiveInt(req.body.tableNumber, { min: 1, max: 9999 });

    if (!cleanName) return res.status(400).json({ message: 'Please enter your name' });
    if (!cleanPhone) return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
    if (!tableNumber) return res.status(400).json({ message: 'Please scan the QR code on your table' });

    const restaurant = await Restaurant.findOne({ active: true });
    if (!restaurant) return res.status(503).json({ message: 'The restaurant is not accepting orders right now' });

    const table = await Table.findOne({ restaurantId: restaurant._id, tableNumber });
    if (!table) return res.status(400).json({ message: `Table ${tableNumber} was not found. Please ask the staff for help.` });

    let customer = await Customer.findOne({ phone: cleanPhone });
    if (customer) {
      customer.name = cleanName;
      customer.activeTable = tableNumber;
      customer.lastVisit = new Date();
      customer.generateFreshRewardToken();
      await customer.save();
    } else {
      customer = new Customer({
        restaurantId: restaurant._id,
        name: cleanName,
        phone: cleanPhone,
        activeTable: tableNumber,
        totalStamps: 0
      });
      await customer.save();
    }

    res.json({
      success: true,
      customer: publicCustomer(customer),
      token: signCustomerToken(customer, restaurant._id, tableNumber),
      tableNumber,
      restaurant: { name: restaurant.name, gstRate: restaurant.gstRate ?? 5 }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer: the running bill for their table (read-only — payment happens with the waiter)
router.get('/me/table-bill', staffOrCustomer, customerOnly, async (req, res) => {
  try {
    const customer = req.customer;
    const order = await Order.findOne({
      restaurantId: req.restaurantId,
      tableNumber: req.customerTable,
      status: { $nin: ['completed', 'cancelled'] }
    }).sort('-createdAt');

    const settings = await LoyaltySetting.getOrCreateDefault(req.restaurantId);
    customer.initDefaultRewards(settings);
    customer.evaluateRewards();
    const availableRewards = customer.rewards
      .filter(r => r.status === 'available')
      .map(r => ({ ...r.toObject(), discountPreview: order ? rewardDiscount(r, order.totalAmount) : 0 }));

    const gstRate = req.restaurant.gstRate ?? 5;
    if (!order) {
      return res.json({
        hasActiveOrder: false,
        tableNumber: req.customerTable,
        gstRate,
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        items: [],
        availableRewards
      });
    }

    const totals = computeTotals(order.totalAmount, gstRate, 0);
    res.json({
      hasActiveOrder: true,
      tableNumber: req.customerTable,
      order: publicOrder(order),
      items: order.items,
      ...totals,
      billRequested: order.billRequested,
      billRequestedAt: order.billRequestedAt,
      paymentPreference: order.paymentPreference,
      requestedRewardId: order.requestedRewardId,
      availableRewards
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer: "Call for Bill" — notifies the waiters, who bring the bill and collect payment at the POS.
router.post('/me/call-bill', staffOrCustomer, customerOnly, callBillLimit, async (req, res) => {
  try {
    const paymentPreference = ['cash', 'upi', 'card'].includes(req.body.paymentPreference) ? req.body.paymentPreference : '';
    const order = await Order.findOne({
      restaurantId: req.restaurantId,
      tableNumber: req.customerTable,
      status: { $nin: ['completed', 'cancelled'] }
    }).sort('-createdAt');
    if (!order) return res.status(404).json({ message: 'There is no open order for your table' });

    let rewardTitle = '';
    let requestedRewardId = '';
    if (req.body.rewardId) {
      const reward = req.customer.rewards.find(r => r.status === 'available' && r.rewardId === req.body.rewardId);
      if (reward) {
        requestedRewardId = reward.rewardId;
        rewardTitle = reward.title;
      }
    }

    const now = new Date();
    order.billRequested = true;
    order.billRequestedAt = order.billRequestedAt || now;
    order.paymentPreference = paymentPreference;
    order.requestedRewardId = requestedRewardId;
    if (!order.customerId) {
      order.customerId = req.customer._id;
      order.customerCode = req.customer.customerId;
    }
    await order.save();

    if (order.tableId) {
      await Table.updateOne({ _id: order.tableId }, { billRequested: true, billRequestedAt: order.billRequestedAt });
    }

    const io = req.app.get('io');
    const gstRate = req.restaurant.gstRate ?? 5;
    emitToStaff(io, req.restaurantId, 'bill-requested', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      customerName: req.customer.name,
      paymentPreference,
      rewardTitle,
      totalAmount: computeTotals(order.totalAmount, gstRate, 0).totalAmount,
      requestedAt: order.billRequestedAt
    });
    emitToStaff(io, req.restaurantId, 'table-updated');
    emitOrder(io, 'order-updated', order);

    res.json({ success: true, message: 'A waiter is on the way with your bill.', order: publicOrder(order) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer profile and reward progress (customer: own profile only)
router.get('/:id', staffOrCustomer, async (req, res) => {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return;

    const settings = await LoyaltySetting.getOrCreateDefault(req.restaurantId);
    customer.initDefaultRewards(settings);
    customer.evaluateRewards();

    if (req.customer) return res.json(publicCustomer(customer));
    await customer.populate({ path: 'orders', options: { sort: { createdAt: -1 }, limit: 20 } });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer's dining history with matching bills
router.get('/:id/orders', staffOrCustomer, async (req, res) => {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return;

    const orders = await Order.find({
      restaurantId: req.restaurantId,
      $or: [
        { customerId: customer._id },
        { customerCode: customer.customerId },
        { _id: { $in: customer.orders || [] } }
      ]
    }).sort({ createdAt: -1 }).limit(30);

    const bills = await Bill.find({ restaurantId: req.restaurantId, orderId: { $in: orders.map(o => o._id) } });
    const gstRate = req.restaurant.gstRate ?? 5;

    const orderHistory = orders.map(order => {
      const bill = bills.find(b => b.orderId.toString() === order._id.toString());
      const estimate = computeTotals(order.totalAmount, gstRate, 0);
      const d = new Date(order.createdAt);
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${timeStr}`;
      const statusLabel = bill || order.status === 'completed'
        ? 'Paid'
        : order.status === 'cancelled' ? 'Cancelled'
        : order.status.charAt(0).toUpperCase() + order.status.slice(1);

      return {
        id: `#${order.orderNumber}`,
        orderNumber: order.orderNumber,
        date: dateStr,
        rawDate: order.createdAt,
        table: order.tableNumber,
        orderType: order.orderType,
        amount: bill ? bill.totalAmount : estimate.totalAmount,
        subtotal: bill ? bill.subtotal : order.totalAmount,
        tax: bill ? bill.gstAmount : estimate.gstAmount,
        discount: bill ? bill.discountAmount || 0 : 0,
        paymentMethod: bill ? bill.paymentMode.toUpperCase() : '',
        status: statusLabel,
        items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price, notes: i.notes || '' }))
      };
    });

    res.json({ success: true, orders: orderHistory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Staff: look up a customer by the reward QR shown on their phone
router.get('/token/:token', auth, notKitchen, async (req, res) => {
  try {
    const customer = await Customer.findOne({ rewardToken: String(req.params.token) });
    if (!customer) {
      return res.status(404).json({ message: 'Invalid or expired customer reward QR code' });
    }
    const settings = await LoyaltySetting.getOrCreateDefault(req.restaurantId);
    customer.initDefaultRewards(settings);
    customer.evaluateRewards();
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Staff: manually add stamps after scanning the customer's QR or from the admin panel
router.post('/add-stamp', auth, notKitchen, async (req, res) => {
  try {
    const { token, customerId, phone, stampsToAdd } = req.body;
    let query;
    if (token) {
      query = { rewardToken: String(token) };
    } else if (phone) {
      query = { phone: normalizePhone(phone) || String(phone) };
    } else if (customerId) {
      const id = String(customerId);
      query = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { customerId: id }, { phone: id }] }
        : { $or: [{ customerId: id }, { phone: id }] };
    } else {
      return res.status(400).json({ message: 'Reward token, Phone or Customer ID required' });
    }

    const customer = await Customer.findOne(query);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const count = toPositiveInt(stampsToAdd ?? 1, { min: 1, max: 10 });
    if (!count) return res.status(400).json({ message: 'You can add between 1 and 10 stamps at a time' });
    if (count > 1 && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only an admin can add more than one stamp at a time' });
    }

    const oldStamps = customer.totalStamps || 0;
    customer.totalStamps = oldStamps + count;
    const settings = await LoyaltySetting.getOrCreateDefault(req.restaurantId);
    customer.initDefaultRewards(settings);
    customer.evaluateRewards();
    await customer.save();

    const io = req.app.get('io');
    emitCustomerUpdate(io, customer);
    emitToStaff(io, req.restaurantId, 'customer-stamp-added', {
      customerId: customer.customerId,
      name: customer.name,
      totalStamps: customer.totalStamps
    });

    res.json({
      success: true,
      message: `Added ${count} stamp(s) successfully!`,
      customer,
      newlyUnlocked: customer.rewards.filter(r => r.status === 'available' && oldStamps < r.requiredStamps)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
