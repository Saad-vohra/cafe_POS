const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const Table = require('../models/Table');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.date) {
      const date = new Date(req.query.date);
      filter.createdAt = {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      };
    }
    const bills = await Bill.find(filter).sort('-createdAt').limit(100);
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, restaurantId: req.restaurantId }).populate('orderId');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { orderId, paymentMode } = req.body;
    const order = await Order.findOne({ _id: orderId, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const subtotal = order.totalAmount;
    const gstRate = req.restaurant?.gstRate ?? 5;
    const gstAmount = Math.round(subtotal * gstRate / 100);
    const totalAmount = subtotal + gstAmount;

    const bill = new Bill({
      restaurantId: req.restaurantId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      items: order.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.price * i.quantity
      })),
      subtotal,
      gstRate,
      gstAmount,
      totalAmount,
      paymentMode,
      customerCount: order.customerCount
    });
    await bill.save();

    order.status = 'completed';
    await order.save();

    await Table.findOneAndUpdate(
      { _id: order.tableId, restaurantId: req.restaurantId },
      { status: 'available', currentOrderId: null, customerCount: 0 }
    );

    const io = req.app.get('io');
    const room = `restaurant-${req.restaurantId}`;
    io.to(room).emit('table-updated');
    io.to(room).emit('bill-created', bill);

    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
