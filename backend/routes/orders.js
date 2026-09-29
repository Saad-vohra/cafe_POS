// const express = require('express');
// const router = express.Router();
// const Order = require('../models/Order');
// const Table = require('../models/Table');
// const { auth } = require('../middleware/auth');

// // Get all orders
// router.get('/', auth, async (req, res) => {
//   try {
//     const filter = { restaurantId: req.restaurantId };
//     if (req.query.status) filter.status = req.query.status;
//     if (req.query.tableNumber) filter.tableNumber = req.query.tableNumber;
//     if (req.query.active === 'true') {
//       filter.status = { $nin: ['completed', 'cancelled'] };
//     }
//     const orders = await Order.find(filter).sort('-createdAt').limit(100);
//     res.json(orders);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get single order
// router.get('/:id', auth, async (req, res) => {
//   try {
//     const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
//     if (!order) return res.status(404).json({ message: 'Order not found' });
//     res.json(order);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Create order
// router.post('/', auth, async (req, res) => {
//   try {
//     const order = new Order({
//       ...req.body,
//       restaurantId: req.restaurantId,
//       waiterId: req.user._id,
//       waiterName: req.user.name
//     });
//     await order.save();

//     await Table.findOneAndUpdate(
//       { _id: req.body.tableId, restaurantId: req.restaurantId },
//       { status: 'occupied', currentOrderId: order._id, customerCount: req.body.customerCount || 1 }
//     );

//     const io = req.app.get('io');
//     const room = `restaurant-${req.restaurantId}`;
//     io.to(`kitchen-${req.restaurantId}`).emit('new-order', order);
//     io.to(room).emit('table-updated');
//     io.to(room).emit('order-created', order);

//     res.status(201).json(order);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// // Update order status
// router.put('/:id/status', auth, async (req, res) => {
//   try {
//     const { status } = req.body;
//     const order = await Order.findOneAndUpdate(
//       { _id: req.params.id, restaurantId: req.restaurantId },
//       { status },
//       { new: true }
//     );
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     const io = req.app.get('io');
//     const room = `restaurant-${req.restaurantId}`;
//     io.to(room).emit('order-status-updated', order);

//     if (status === 'completed' || status === 'cancelled') {
//       await Table.findOneAndUpdate(
//         { _id: order.tableId, restaurantId: req.restaurantId },
//         { status: 'available', currentOrderId: null, customerCount: 0 }
//       );
//       io.to(room).emit('table-updated');
//     }

//     res.json(order);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// // Update order items
// router.put('/:id', auth, async (req, res) => {
//   try {
//     const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     const update = { ...req.body };
//     delete update.restaurantId;
//     Object.assign(order, update);
//     await order.save();

//     const io = req.app.get('io');
//     io.to(`kitchen-${req.restaurantId}`).emit('order-updated', order);

//     res.json(order);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// module.exports = router;


















const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const { auth } = require('../middleware/auth');

// Get all orders
router.get('/', auth, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.tableNumber) filter.tableNumber = req.query.tableNumber;
    if (req.query.active === 'true') {
      filter.status = { $nin: ['completed', 'cancelled'] };
    }
    const orders = await Order.find(filter).sort('-createdAt').limit(100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create order
router.post('/', auth, async (req, res) => {
  try {
    const now = new Date();
    // Mark all initial items as freshly added in batch 1
    const items = (req.body.items || []).map(item => ({
      ...item,
      served: false,
      addedAt: now,
      servedAt: null,
      batchNumber: 1          // first order = batch 1
    }));

    const order = new Order({
      ...req.body,
      items,
      restaurantId: req.restaurantId,
      waiterId: req.user._id,
      waiterName: req.user.name,
      batchCount: 1           // track total batches so far
    });
    await order.save();

    await Table.findOneAndUpdate(
      { _id: req.body.tableId, restaurantId: req.restaurantId },
      { status: 'occupied', currentOrderId: order._id, customerCount: req.body.customerCount || 1 }
    );

    const io = req.app.get('io');
    const room = `restaurant-${req.restaurantId}`;
    io.to(`kitchen-${req.restaurantId}`).emit('new-order', order);
    io.to(room).emit('table-updated');
    io.to(room).emit('order-created', order);

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update order status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // When order is marked served, mark ALL unserved items as served
    if (status === 'served') {
      order.items = order.items.map(item => ({
        ...item.toObject(),
        served: true,
        servedAt: item.servedAt || new Date()
      }));
    }

    order.status = status;
    await order.save();

    const io = req.app.get('io');
    const room = `restaurant-${req.restaurantId}`;
    io.to(room).emit('order-status-updated', order);

    if (status === 'completed' || status === 'cancelled') {
      await Table.findOneAndUpdate(
        { _id: order.tableId, restaurantId: req.restaurantId },
        { status: 'available', currentOrderId: null, customerCount: 0 }
      );
      io.to(room).emit('table-updated');
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update order items — batch-aware merge
// KEY FIX: We do NOT replace existing item entries.
// Instead we keep all existing items (preserving their served status) and
// only ADD new items / increase quantities as a NEW batch entry.
// This way "Paneer Tikka served (batch 1)" and "Paneer Tikka new (batch 2)"
// are separate rows, never confused.
router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const update = { ...req.body };
    delete update.restaurantId;

    if (update.items && Array.isArray(update.items)) {
      const now = new Date();
      const nextBatch = (order.batchCount || 1) + 1;

      // Build a map of existing items keyed by name
      // We track total quantity already in the order per item name (across all batches)
      const existingQtyByName = {};
      order.items.forEach(item => {
        existingQtyByName[item.name] = (existingQtyByName[item.name] || 0) + item.quantity;
      });

      // The incoming update.items from waiter has the TOTAL desired quantities.
      // We need to figure out the DELTA (what's new) vs what already exists.
      const newBatchItems = [];

      update.items.forEach(incomingItem => {
        const alreadyQty = existingQtyByName[incomingItem.name] || 0;
        const deltaQty = incomingItem.quantity - alreadyQty;

        if (deltaQty > 0) {
          // This item has MORE quantity than before — add the extra as a new batch entry
          newBatchItems.push({
            menuItemId: incomingItem.menuItemId,
            name: incomingItem.name,
            price: incomingItem.price,
            quantity: deltaQty,        // only the NEW extra quantity
            notes: incomingItem.notes || '',
            served: false,
            addedAt: now,
            servedAt: null,
            batchNumber: nextBatch
          });
        }
        // If deltaQty === 0: same quantity as before, nothing to add
        // If deltaQty < 0: waiter reduced quantity — we mark excess served items as removed
        // (handled below)
      });

      // Handle quantity reductions: if waiter reduced an item's quantity,
      // remove unserved entries for that item starting from the latest batch
      const incomingQtyByName = {};
      update.items.forEach(i => { incomingQtyByName[i.name] = i.quantity; });

      // Find items that were removed entirely or reduced
      let updatedExistingItems = [...order.items.map(i => i.toObject())];

      Object.keys(existingQtyByName).forEach(name => {
        const desired = incomingQtyByName[name] || 0;
        const current = existingQtyByName[name];
        if (desired < current) {
          // Need to reduce by (current - desired) — remove from unserved items, newest batch first
          let toRemove = current - desired;
          // Sort so we remove newest batches first
          updatedExistingItems = updatedExistingItems
            .map(item => {
              if (item.name === name && !item.served && toRemove > 0) {
                const removeFromThis = Math.min(item.quantity, toRemove);
                toRemove -= removeFromThis;
                const newQty = item.quantity - removeFromThis;
                if (newQty <= 0) return null; // remove entirely
                return { ...item, quantity: newQty };
              }
              return item;
            })
            .filter(Boolean);
        }
      });

      // Also handle completely new items (never existed before)
      // newBatchItems already handles them above correctly

      // Merge: keep updated existing items + add new batch items
      update.items = [...updatedExistingItems, ...newBatchItems];
      update.batchCount = newBatchItems.length > 0 ? nextBatch : (order.batchCount || 1);
      update.lastUpdatedByWaiter = now;
    }

    Object.assign(order, update);
    await order.save();

    const io = req.app.get('io');
    io.to(`kitchen-${req.restaurantId}`).emit('order-updated', order);

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;