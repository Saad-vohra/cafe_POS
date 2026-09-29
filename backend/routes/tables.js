const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const { auth, adminOnly } = require('../middleware/auth');

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
    const table = new Table({ ...req.body, restaurantId: req.restaurantId });
    await table.save();
    res.status(201).json(table);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const update = { ...req.body };
    delete update.restaurantId;
    const table = await Table.findOneAndUpdate({ _id: req.params.id, restaurantId: req.restaurantId }, update, { new: true });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    const io = req.app.get('io');
    io.to(`restaurant-${req.restaurantId}`).emit('table-updated', table);
    res.json(table);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Table.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
