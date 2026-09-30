const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');

// 0. Admin: Get all customers with search, filter, and aggregate statistics
router.get('/', async (req, res) => {
  try {
    const { search, filter } = req.query;
    let query = {};

    if (search && search.trim()) {
      const q = search.trim();
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

    const customers = await Customer.find(query).sort({ lastVisit: -1, createdAt: -1 });

    // Aggregate statistics for admin dashboard
    const allCustomers = await Customer.find({});
    const totalCustomers = allCustomers.length;
    const totalStampsAwarded = allCustomers.reduce((sum, c) => sum + (c.totalStamps || 0), 0);
    const activeDineInCustomers = allCustomers.filter(c => c.activeTable).length;
    const customersWithAvailableRewards = allCustomers.filter(c =>
      c.rewards && c.rewards.some(r => r.status === 'available')
    ).length;

    res.json({
      customers,
      stats: {
        totalCustomers,
        totalStampsAwarded,
        activeDineInCustomers,
        customersWithAvailableRewards
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 1. Customer Login / Identification via Table QR Code
// Automatically identifies or creates profile without blocking returning customers
// Generates/refreshes unique reward token every visit
router.post('/session', async (req, res) => {
  try {
    const { name, phone, tableNumber } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and Phone number are required' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanName = name.trim();

    // Find default restaurant if restaurantId is not passed
    let restaurantId = req.body.restaurantId;
    if (!restaurantId) {
      const defaultRest = await Restaurant.findOne({ active: true });
      if (defaultRest) restaurantId = defaultRest._id;
    }

    let customer = await Customer.findOne({ phone: cleanPhone });

    if (customer) {
      // Existing customer: Update name & active table, re-generate fresh reward token for this visit
      customer.name = cleanName;
      customer.activeTable = tableNumber ? parseInt(tableNumber, 10) : customer.activeTable;
      customer.lastVisit = new Date();
      customer.generateFreshRewardToken();
      customer.initDefaultRewards();
      customer.evaluateRewards();
      await customer.save();
    } else {
      // First-time customer: Create new customer profile & wallet
      customer = new Customer({
        restaurantId,
        name: cleanName,
        phone: cleanPhone,
        activeTable: tableNumber ? parseInt(tableNumber, 10) : null,
        totalStamps: 0
      });
      await customer.save();
    }

    res.json({
      success: true,
      customer
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Get customer profile and reward progress by ID or Customer Code
router.get('/:id', async (req, res) => {
  try {
    const isObjectId = require('mongoose').Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { $or: [{ _id: req.params.id }, { customerId: req.params.id }] }
      : { customerId: req.params.id };

    const customer = await Customer.findOne(query)
      .populate({
        path: 'orders',
        options: { sort: { createdAt: -1 }, limit: 20 }
      });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    customer.initDefaultRewards();
    customer.evaluateRewards();

    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2b. Get customer's real dining orders history
router.get('/:id/orders', async (req, res) => {
  try {
    const isObjectId = require('mongoose').Types.ObjectId.isValid(req.params.id);
    const query = isObjectId
      ? { $or: [{ _id: req.params.id }, { customerId: req.params.id }] }
      : { customerId: req.params.id };

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Find all real orders associated with this customer
    const orderFilter = {
      $or: [
        { customerId: customer._id },
        { customerPhone: customer.phone },
        { customerCode: customer.customerId },
        { _id: { $in: customer.orders || [] } }
      ]
    };

    const orders = await Order.find(orderFilter)
      .sort({ createdAt: -1 })
      .limit(30);

    // Also look up matching bills for paid details
    const orderIds = orders.map(o => o._id);
    const billFilter = {
      $or: [
        { customerId: customer._id },
        { customerPhone: customer.phone },
        { orderId: { $in: orderIds } }
      ]
    };
    const bills = await Bill.find(billFilter).sort({ createdAt: -1 });

    const orderHistory = orders.map(order => {
      const matchingBill = bills.find(b => b.orderId && b.orderId.toString() === order._id.toString());
      const subtotal = matchingBill ? matchingBill.subtotal : order.totalAmount;
      const discount = matchingBill ? (matchingBill.discountAmount || 0) : (order.appliedReward?.discountAmount || 0);
      const tax = matchingBill ? (matchingBill.gstAmount || 0) : Math.round(subtotal * 0.05);
      const amount = matchingBill ? matchingBill.totalAmount : Math.max(0, subtotal + tax - discount);
      const paymentMethod = matchingBill ? (matchingBill.paymentMode?.toUpperCase() || 'UPI') : 'UPI';
      const status = matchingBill ? 'Paid' : (order.status === 'completed' ? 'Paid' : order.status);

      // Nicely format the date for display
      const d = new Date(order.createdAt || Date.now());
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}, ${timeStr}`;

      return {
        id: `TJ${order.orderNumber || 1000}`,
        orderNumber: order.orderNumber,
        date: dateStr,
        rawDate: order.createdAt,
        table: order.tableNumber || 5,
        amount,
        subtotal,
        tax,
        discount,
        paymentMethod,
        status: status === 'placed' ? 'Placed' : status === 'ready' ? 'Ready' : status === 'preparing' ? 'Preparing' : 'Paid',
        items: (order.items || []).map(i => ({
          name: i.name,
          qty: i.quantity || 1,
          price: i.price,
          notes: i.notes || ''
        }))
      };
    });

    res.json({
      success: true,
      orders: orderHistory
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Staff Scan: Lookup customer by secure rewardToken
router.get('/token/:token', async (req, res) => {
  try {
    const customer = await Customer.findOne({ rewardToken: req.params.token });
    if (!customer) {
      return res.status(404).json({ message: 'Invalid or expired customer reward QR code' });
    }

    customer.initDefaultRewards();
    customer.evaluateRewards();

    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Staff adds stamp after scanning customer QR code or from Admin Panel
router.post('/add-stamp', async (req, res) => {
  try {
    const { token, customerId, phone, stampsToAdd } = req.body;
    let query = {};
    if (token) {
      query.rewardToken = token;
    } else if (phone) {
      query.phone = phone;
    } else if (customerId) {
      const isObjectId = require('mongoose').Types.ObjectId.isValid(customerId);
      query = isObjectId
        ? { $or: [{ _id: customerId }, { customerId }, { phone: customerId }] }
        : { $or: [{ customerId }, { phone: customerId }] };
    } else {
      return res.status(400).json({ message: 'Reward token, Phone or Customer ID required' });
    }

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const count = parseInt(stampsToAdd, 10) || 1;
    const oldStamps = customer.totalStamps || 0;
    customer.totalStamps = oldStamps + count;

    customer.initDefaultRewards();
    customer.evaluateRewards();
    await customer.save();

    // Broadcast across multiple channels to ensure instant customer update
    const io = req.app.get('io');
    if (io) {
      io.emit(`customer-update-${customer._id}`, customer);
      io.emit(`customer-update-${customer.customerId}`, customer);
      if (customer.phone) {
        io.emit(`customer-update-${customer.phone}`, customer);
      }
      io.emit('customer-stamp-added', {
        _id: customer._id,
        customerId: customer.customerId,
        phone: customer.phone,
        totalStamps: customer.totalStamps,
        customer
      });
      if (customer.restaurantId) {
        io.to(`restaurant-${customer.restaurantId}`).emit('customer-stamp-added', {
          customerId: customer.customerId,
          name: customer.name,
          totalStamps: customer.totalStamps
        });
      }
    }

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

// 5. Get current active bill and eligible rewards for customer's table
router.get('/:id/table-bill', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const tableNum = req.query.table || customer.activeTable;
    if (!tableNum) {
      return res.status(400).json({ message: 'No active table number specified' });
    }

    // Find active non-completed orders for this table
    const activeOrders = await Order.find({
      tableNumber: parseInt(tableNum, 10),
      status: { $nin: ['completed', 'cancelled'] }
    }).sort('-createdAt');

    if (activeOrders.length === 0) {
      return res.json({
        hasActiveOrder: false,
        message: `No active order found for Table ${tableNum}`,
        customer
      });
    }

    // Aggregate items across all active order batches for this table session
    const allItems = [];
    let subtotal = 0;
    activeOrders.forEach(o => {
      o.items.forEach(i => {
        allItems.push(i);
        subtotal += (i.price * i.quantity);
      });
    });

    const gstRate = 5;
    const gstAmount = Math.round(subtotal * gstRate / 100);
    const totalAmount = subtotal + gstAmount;

    // Filter available rewards customer can redeem
    const LoyaltySetting = require('../models/LoyaltySetting');
    const settings = await LoyaltySetting.findOne(customer.restaurantId ? { restaurantId: customer.restaurantId } : {});
    customer.initDefaultRewards(settings);
    customer.evaluateRewards();
    const availableRewards = customer.rewards
      .filter(r => r.status === 'available')
      .map(r => {
        const obj = r.toObject ? r.toObject() : { ...r };
        return {
          ...obj,
          name: obj.title || obj.name,
          title: obj.title || obj.name
        };
      });

    res.json({
      hasActiveOrder: true,
      tableNumber: tableNum,
      orders: activeOrders,
      items: allItems,
      subtotal,
      gstRate,
      gstAmount,
      totalAmount,
      customer,
      availableRewards,
      eligibleRewards: availableRewards
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Pay Bill & Apply Reward & Automatically Award Stamp
router.post('/:id/pay-bill', async (req, res) => {
  try {
    const { orderId, tableNumber, paymentMode, rewardId } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Find the order
    let order = null;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (tableNumber) {
      order = await Order.findOne({
        tableNumber: parseInt(tableNumber, 10),
        status: { $nin: ['completed', 'cancelled'] }
      }).sort('-createdAt');
    }

    if (!order) {
      return res.status(404).json({ message: 'No active order found to pay' });
    }

    let subtotal = order.totalAmount;
    let discountAmount = 0;
    let appliedReward = null;

    const effectiveRewardId = req.body.rewardId || req.body.appliedRewardId;
    const effectivePaymentMode = (req.body.paymentMode || req.body.paymentMethod || 'upi').toLowerCase();

    // If customer selected a reward, validate and apply
    if (effectiveRewardId) {
      customer.initDefaultRewards();
      customer.evaluateRewards();
      const effLower = String(effectiveRewardId).toLowerCase();
      let targetRew = customer.rewards.find(r =>
        r.status === 'available' && (
          r.rewardId === effectiveRewardId ||
          r._id?.toString() === effectiveRewardId
        )
      );

      // Flexible fallback match if ID string differs slightly (e.g., rew_discount_8 vs DISCOUNT_20)
      if (!targetRew) {
        if (effLower.includes('discount') || effLower.includes('20')) {
          targetRew = customer.rewards.find(r => r.status === 'available' && (r.rewardType === 'discount_percent' || r.rewardId?.includes('discount')));
        } else if (effLower.includes('coffee') || effLower.includes('free')) {
          targetRew = customer.rewards.find(r => r.status === 'available' && (r.rewardType === 'free_item' || r.rewardId?.includes('coffee')));
        }
      }

      if (targetRew) {
        if (targetRew.rewardType === 'free_item' || targetRew.title?.toLowerCase().includes('coffee')) {
          // Free item benefit e.g. Free coffee - complimentary physical item, does NOT deduct money from food bill
          discountAmount = 0;
        } else if (targetRew.rewardType === 'discount_percent' || (targetRew.rewardValue > 0 && targetRew.rewardValue <= 100)) {
          const pct = targetRew.rewardValue || 20;
          discountAmount = Math.round(subtotal * (pct / 100));
        } else if (targetRew.rewardType === 'discount_flat') {
          discountAmount = Math.min(subtotal, targetRew.rewardValue || 50);
        } else {
          discountAmount = 0;
        }

        appliedReward = {
          rewardId: targetRew.rewardId,
          title: targetRew.title || '20% OFF',
          rewardType: targetRew.rewardType,
          discountAmount
        };

        // Mark reward as redeemed
        targetRew.status = 'redeemed';
        targetRew.redeemedAt = new Date();
        targetRew.orderId = order._id;
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const gstRate = 5;
    const gstAmount = Math.round(discountedSubtotal * gstRate / 100);
    const totalAmount = discountedSubtotal + gstAmount;

    // Create official bill
    const bill = new Bill({
      restaurantId: order.restaurantId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType || 'dine_in',
      tableNumber: order.tableNumber,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerId: customer._id,
      items: order.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.price * i.quantity
      })),
      subtotal,
      discountAmount,
      appliedReward,
      gstRate,
      gstAmount,
      totalAmount,
      paymentMode: effectivePaymentMode,
      paymentStatus: 'paid',
      customerCount: order.customerCount || 1
    });
    await bill.save();

    // Mark order completed
    order.status = 'completed';
    if (appliedReward) {
      order.appliedReward = appliedReward;
    }
    await order.save();

    // Release table
    if (order.tableId) {
      await Table.findOneAndUpdate(
        { _id: order.tableId },
        { status: 'available', currentOrderId: null, customerCount: 0 }
      );
    }

    // Award +1 loyalty stamp for completing eligible paid visit
    const oldStamps = customer.totalStamps;
    customer.totalStamps += 1;
    customer.orders.push(order._id);
    customer.activeTable = null;
    customer.initDefaultRewards();
    customer.evaluateRewards();
    await customer.save();

    const newlyUnlocked = customer.rewards.filter(r => r.status === 'available' && oldStamps < r.requiredStamps);

    // Socket broadcasts
    const io = req.app.get('io');
    if (io) {
      const room = `restaurant-${order.restaurantId}`;
      io.to(room).emit('table-updated');
      io.to(room).emit('order-status-updated', order);
      io.to(room).emit('bill-created', bill);
      io.emit(`customer-update-${customer._id}`, customer);
    }

    res.json({
      success: true,
      message: 'Payment completed successfully!',
      bill,
      order,
      customer,
      stampEarned: 1,
      totalStamps: customer.totalStamps,
      newlyUnlocked
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
