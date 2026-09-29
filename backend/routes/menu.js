const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { auth, optionalAuth, adminOnly } = require('../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.available) filter.available = req.query.available === 'true';
    if (req.query.isVeg !== undefined) filter.isVeg = req.query.isVeg === 'true';
    const items = await MenuItem.find(filter).sort('category name');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const trimmedName = (req.body.name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    const escapedName = trimmedName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const existing = await MenuItem.findOne({
      restaurantId: req.restaurantId,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({ message: 'A menu item with this name already exists' });
    }

    const item = new MenuItem({ ...req.body, name: trimmedName, restaurantId: req.restaurantId });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const update = { ...req.body };
    delete update.restaurantId;

    if (update.name) {
      const trimmedName = update.name.trim();
      const escapedName = trimmedName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const existing = await MenuItem.findOne({
        restaurantId: req.restaurantId,
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({ message: 'A menu item with this name already exists' });
      }
      update.name = trimmedName;
    }

    const item = await MenuItem.findOneAndUpdate({ _id: req.params.id, restaurantId: req.restaurantId }, update, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
