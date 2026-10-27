const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const { auth, adminOnly, notKitchen } = require('../middleware/auth');
const { emitToStaff } = require('../utils/realtime');
const { toPositiveInt } = require('../utils/validate');

router.get('/', auth, async (req, res) => {
  try {
    const tables = await Table.find({ restaurantId: req.restaurantId }).sort('tableNumber');
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const tableNumber = toPositiveInt(req.body.tableNumber, { min: 1, max: 9999 });
    if (!tableNumber) return res.status(400).json({ message: 'Enter a valid table number' });
    if (await Table.exists({ restaurantId: req.restaurantId, tableNumber })) {
      return res.status(400).json({ message: `Table ${tableNumber} already exists` });
    }
    const table = new Table({
      restaurantId: req.restaurantId,
      tableNumber,
      capacity: toPositiveInt(req.body.capacity, { min: 1, max: 50 }) || 4
    });
    await table.save();
    emitToStaff(req.app.get('io'), req.restaurantId, 'table-updated', table);
    res.status(201).json(table);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Staff can change capacity or mark a table reserved/free. Occupancy itself is managed by orders and billing.
router.put('/:id', auth, notKitchen, async (req, res) => {
  try {
    const table = await Table.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!table) return res.status(404).json({ message: 'Table not found' });

    if (req.body.capacity !== undefined) {
      const capacity = toPositiveInt(req.body.capacity, { min: 1, max: 50 });
      if (!capacity) return res.status(400).json({ message: 'Capacity must be between 1 and 50' });
      table.capacity = capacity;
    }
    if (req.body.status !== undefined) {
      if (!['available', 'occupied', 'reserved'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid table status' });
      }
      if (table.currentOrderId && req.body.status !== 'occupied') {
        return res.status(400).json({ message: 'This table has an open order. Bill or cancel it first.' });
      }
      table.status = req.body.status;
    }

    await table.save();
    emitToStaff(req.app.get('io'), req.restaurantId, 'table-updated', table);
    res.json(table);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const table = await Table.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    if (table.currentOrderId) return res.status(400).json({ message: 'This table has an open order. Bill or cancel it first.' });
    await table.deleteOne();
    emitToStaff(req.app.get('io'), req.restaurantId, 'table-updated');
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
