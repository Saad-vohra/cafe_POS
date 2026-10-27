const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Customer = require('../models/Customer');
const { auth, staffOrCustomer, notKitchen } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { emitOrder, emitToStaff, publicOrder } = require('../utils/realtime');
const { toPositiveInt } = require('../utils/validate');

const ACTIVE = { $nin: ['completed', 'cancelled'] };
// Statuses staff can set by hand. "completed" only happens through billing.
const MANUAL_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

const customerOrderLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyFn: (req) => `order:${req.customer?._id || req.ip}`,
  message: 'Too many orders in a short time. Please ask the staff for help.'
});

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Turns the items a client sent into order lines priced from the menu.
 * The client only chooses WHAT and HOW MANY — names and prices always come from the database.
 */
async function priceItems(rawItems, restaurantId, batchNumber, now) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new OrderError(400, 'Add at least one item');
  if (rawItems.length > 100) throw new OrderError(400, 'Too many items in one order');

  const ids = rawItems
    .map(i => i.menuItemId || i.menu || i._id)
    .filter(id => id && mongoose.Types.ObjectId.isValid(id));
  const names = rawItems.map(i => i.name).filter(Boolean);
  const menu = await MenuItem.find({ restaurantId, $or: [{ _id: { $in: ids } }, { name: { $in: names } }] });
  const byId = new Map(menu.map(m => [m._id.toString(), m]));
  const byName = new Map(menu.map(m => [m.name, m]));

  return rawItems.map(raw => {
    const id = raw.menuItemId || raw.menu || raw._id;
    const menuItem = (id && byId.get(String(id))) || byName.get(raw.name);
    if (!menuItem) throw new OrderError(400, `"${raw.name || 'Item'}" is not on the menu`);
    if (!menuItem.available) throw new OrderError(400, `${menuItem.name} is not available right now`);
    const quantity = toPositiveInt(raw.quantity, { min: 1, max: 99 });
    if (!quantity) throw new OrderError(400, `Invalid quantity for ${menuItem.name}`);
    return {
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      notes: String(raw.notes || '').slice(0, 200),
      served: false,
      addedAt: now,
      servedAt: null,
      batchNumber
    };
  });
}

const sendError = (res, err, fallback = 400) => {
  if (!(err instanceof OrderError)) console.error('Order error:', err);
  res.status(err.status || fallback).json({ message: err.message });
};

// List orders. Staff see everything; a customer only sees their own table's orders.
router.get('/', staffOrCustomer, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.customer) {
      filter.tableNumber = req.customerTable;
      filter.status = ACTIVE;
    } else {
      if (req.query.status) filter.status = String(req.query.status);
      if (req.query.tableNumber) filter.tableNumber = parseInt(req.query.tableNumber, 10);
      if (req.query.orderType) filter.orderType = String(req.query.orderType);
      if (req.query.active === 'true') filter.status = ACTIVE;
    }
    const orders = await Order.find(filter).sort('-createdAt').limit(100);
    res.json(req.customer ? orders.map(publicOrder) : orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', staffOrCustomer, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Order not found' });
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.customer && order.tableNumber !== req.customerTable) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(req.customer ? publicOrder(order) : order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create an order: waiter/admin from the POS, or a customer from the table QR app.
// A dine-in table has one open order at a time; new items are appended as a new batch.
router.post('/', staffOrCustomer, (req, res, next) => (req.customer ? customerOrderLimit(req, res, next) : next()), async (req, res) => {
  try {
    if (req.user?.role === 'kitchen') return res.status(403).json({ message: 'Kitchen accounts cannot place orders' });

    const now = new Date();
    const restaurantId = req.restaurantId;
    const isTakeaway = !req.customer && req.body.orderType === 'takeaway';

    // Customers can only order for the table their QR session belongs to.
    const tableNum = isTakeaway
      ? undefined
      : toPositiveInt(req.customer ? req.customerTable : req.body.tableNumber, { min: 1, max: 9999 });

    let table = null;
    if (!isTakeaway) {
      if (!tableNum) return res.status(400).json({ message: 'Table number is required for dine-in orders' });
      table = await Table.findOne({ restaurantId, tableNumber: tableNum });
      if (!table) return res.status(400).json({ message: `Table ${tableNum} does not exist. Please ask the staff.` });
    }

    // The customer placing the order (QR app), or the one a waiter linked by phone/ID.
    let customerDoc = req.customer || null;
    if (!customerDoc && req.body.customerId) {
      const raw = String(req.body.customerId);
      customerDoc = await Customer.findOne(
        mongoose.Types.ObjectId.isValid(raw) ? { $or: [{ _id: raw }, { customerId: raw }] } : { customerId: raw }
      );
    } else if (!customerDoc && req.body.customerPhone) {
      customerDoc = await Customer.findOne({ phone: String(req.body.customerPhone).trim() });
    }

    const notes = String(req.body.notes || '').slice(0, 300);

    const existingOrder = !isTakeaway
      ? await Order.findOne({ restaurantId, tableNumber: tableNum, status: ACTIVE }).sort({ createdAt: -1 })
      : null;

    if (existingOrder) {
      const nextBatch = (existingOrder.batchCount || 1) + 1;
      const batchItems = await priceItems(req.body.items, restaurantId, nextBatch, now);

      existingOrder.items.push(...batchItems);
      existingOrder.batchCount = nextBatch;
      if (notes) existingOrder.notes = existingOrder.notes ? `${existingOrder.notes} | ${notes}` : notes;
      // New food after the table was served: send the order back to the kitchen
      if (['served', 'ready'].includes(existingOrder.status)) existingOrder.status = 'preparing';
      if (customerDoc && !existingOrder.customerId) {
        existingOrder.customerId = customerDoc._id;
        existingOrder.customerCode = customerDoc.customerId;
      }
      await existingOrder.save();

      if (customerDoc && !customerDoc.orders.some(id => id.toString() === existingOrder._id.toString())) {
        customerDoc.orders.push(existingOrder._id);
        customerDoc.activeTable = tableNum;
        await customerDoc.save();
      }

      const io = req.app.get('io');
      emitOrder(io, 'order-updated', existingOrder);
      emitToStaff(io, restaurantId, 'table-updated');

      return res.status(200).json(req.customer ? publicOrder(existingOrder) : existingOrder);
    }

    const items = await priceItems(req.body.items, restaurantId, 1, now);
    const customerName = String(req.body.customerName || customerDoc?.name || (isTakeaway ? 'Takeaway Customer' : `Table ${tableNum} Customer`)).slice(0, 80);
    const customerPhone = String(customerDoc?.phone || req.body.customerPhone || '').slice(0, 20);
    const customerCount = toPositiveInt(req.body.customerCount, { min: 1, max: 100 }) || 1;

    const order = new Order({
      restaurantId,
      orderType: isTakeaway ? 'takeaway' : 'dine_in',
      customerName,
      customerPhone,
      customerId: customerDoc ? customerDoc._id : undefined,
      customerCode: customerDoc ? customerDoc.customerId : '',
      takeawayToken: isTakeaway ? String(req.body.takeawayToken || '').slice(0, 20) : '',
      items,
      tableId: table?._id,
      tableNumber: tableNum,
      waiterId: req.user?._id,
      waiterName: req.user?.name || `Self QR (${customerName})`,
      status: 'pending',
      customerCount,
      notes,
      batchCount: 1
    });
    await order.save();

    if (customerDoc) {
      customerDoc.orders.push(order._id);
      if (tableNum) customerDoc.activeTable = tableNum;
      customerDoc.lastVisit = now;
      await customerDoc.save();
    }

    if (table) {
      await Table.findByIdAndUpdate(table._id, {
        status: 'occupied',
        currentOrderId: order._id,
        customerCount,
        billRequested: false,
        billRequestedAt: null
      });
    }

    const io = req.app.get('io');
    emitOrder(io, 'new-order', order);
    emitOrder(io, 'order-created', order);
    if (table) emitToStaff(io, restaurantId, 'table-updated');

    res.status(201).json(req.customer ? publicOrder(order) : order);
  } catch (err) {
    sendError(res, err);
  }
});

// Update order status (kitchen / waiter / admin). Billing is the only way to complete an order.
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!MANUAL_STATUSES.includes(status)) {
      return res.status(400).json({ message: status === 'completed' ? 'Generate the bill to complete an order' : 'Invalid status' });
    }
    if (status === 'cancelled' && req.user.role === 'kitchen') {
      return res.status(403).json({ message: 'Only a waiter or admin can cancel an order' });
    }

    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId, status: ACTIVE });
    if (!order) return res.status(404).json({ message: 'Order not found or already closed' });

    if (status === 'served') {
      order.items.forEach(item => {
        item.served = true;
        item.servedAt = item.servedAt || new Date();
      });
    }

    order.status = status;
    if (status === 'cancelled') order.billRequested = false;
    await order.save();

    const io = req.app.get('io');
    emitOrder(io, 'order-status-updated', order);

    if (status === 'cancelled' && order.tableId) {
      await Table.findOneAndUpdate(
        { _id: order.tableId, restaurantId: req.restaurantId, currentOrderId: order._id },
        { status: 'available', currentOrderId: null, customerCount: 0, billRequested: false, billRequestedAt: null }
      );
      emitToStaff(io, req.restaurantId, 'table-updated');
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Waiter edits the items of an open order — batch-aware merge.
// Existing lines keep their served status; extra quantity becomes a NEW batch line, so
// "Paneer Tikka served (batch 1)" and "Paneer Tikka new (batch 2)" never get mixed up.
// Reductions remove unserved quantity only, newest batch first.
router.put('/:id', auth, notKitchen, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId, status: ACTIVE });
    if (!order) return res.status(404).json({ message: 'Order not found or already closed' });

    if (Array.isArray(req.body.items)) {
      const now = new Date();
      const nextBatch = (order.batchCount || 1) + 1;

      // Desired total quantity per dish (the waiter's cart may list a dish more than once)
      const desiredByName = {};
      const sampleByName = {};
      req.body.items.forEach(i => {
        const qty = toPositiveInt(i.quantity, { min: 1, max: 999 });
        if (!i.name || !qty) return;
        desiredByName[i.name] = (desiredByName[i.name] || 0) + qty;
        if (!sampleByName[i.name] || (i.notes && !sampleByName[i.name].notes)) sampleByName[i.name] = i;
      });

      const currentByName = {};
      order.items.forEach(item => {
        currentByName[item.name] = (currentByName[item.name] || 0) + item.quantity;
      });

      // Extra quantity → new batch, priced from the menu
      const additions = Object.keys(desiredByName)
        .filter(name => desiredByName[name] > (currentByName[name] || 0))
        .map(name => ({ ...sampleByName[name], quantity: desiredByName[name] - (currentByName[name] || 0) }));
      const newBatchItems = additions.length ? await priceItems(additions, req.restaurantId, nextBatch, now) : [];

      // Reductions → take quantity off unserved lines, newest batch first
      let items = order.items.map(i => i.toObject());
      Object.keys(currentByName).forEach(name => {
        let toRemove = currentByName[name] - (desiredByName[name] || 0);
        if (toRemove <= 0) return;
        items = items
          .sort((a, b) => (b.batchNumber || 1) - (a.batchNumber || 1))
          .map(item => {
            if (item.name !== name || item.served || toRemove <= 0) return item;
            const take = Math.min(item.quantity, toRemove);
            toRemove -= take;
            return item.quantity - take > 0 ? { ...item, quantity: item.quantity - take } : null;
          })
          .filter(Boolean);
        if (toRemove > 0) {
          throw new OrderError(400, `${name} has already been served and can't be reduced further`);
        }
      });
      items.sort((a, b) => (a.batchNumber || 1) - (b.batchNumber || 1));

      order.items = [...items, ...newBatchItems];
      if (newBatchItems.length) {
        order.batchCount = nextBatch;
        if (['served', 'ready'].includes(order.status)) order.status = 'preparing';
      }
      order.lastUpdatedByWaiter = now;
    }

    if (req.body.notes !== undefined) order.notes = String(req.body.notes).slice(0, 300);
    const customerCount = toPositiveInt(req.body.customerCount, { min: 1, max: 100 });
    if (customerCount) order.customerCount = customerCount;

    if (order.items.length === 0) {
      return res.status(400).json({ message: 'An order needs at least one item. Cancel the order instead.' });
    }

    await order.save();

    const io = req.app.get('io');
    emitOrder(io, 'order-updated', order);

    res.json(order);
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
