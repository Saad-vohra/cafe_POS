const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const { auth, optionalAuth, adminOnly } = require('../middleware/auth');

// 1. Get all active categories (public for customers and staff)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const restaurantId = req.restaurantId || null;
    const categories = await Category.getOrCreateDefaults(restaurantId);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Admin adds a new category
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, icon, sortOrder } = req.body;
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      ...(req.restaurantId ? { restaurantId: req.restaurantId } : {})
    });

    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new Category({
      restaurantId: req.restaurantId || null,
      name: cleanName,
      icon: (icon || '🍽️').trim(),
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive: true
    });

    await category.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('categories-updated');
    }

    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. Admin updates category
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, icon, sortOrder, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const oldName = category.name;
    if (name) category.name = name.trim();
    if (icon) category.icon = icon.trim();
    if (sortOrder !== undefined) category.sortOrder = parseInt(sortOrder, 10) || 0;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    // If renamed, update menu items under this category
    if (name && name.trim() !== oldName) {
      await MenuItem.updateMany(
        { category: oldName },
        { $set: { category: name.trim() } }
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('categories-updated');
      io.emit('menu-updated');
    }

    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. Admin deletes category
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    await Category.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('categories-updated');
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
