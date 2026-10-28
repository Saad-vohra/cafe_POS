const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');
const { staffRoom } = require('../utils/realtime');

const ROLES = ['admin', 'waiter', 'kitchen'];

// Close the live connection of a staff member who was deactivated or removed, so their
// open screens stop receiving orders right away (their next request is refused anyway).
async function disconnectUser(req, userId) {
  const io = req.app.get('io');
  if (!io) return;
  const sockets = await io.in(staffRoom(req.restaurantId)).fetchSockets();
  sockets.filter(s => s.data.userId === String(userId)).forEach(s => s.disconnect(true));
}
const isSelf = (req) => req.params.id === req.user._id.toString();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ restaurantId: req.restaurantId }).select('-password').sort('role name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Choose a valid role' });
    if (!password || String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hash = await bcrypt.hash(String(password), 10);
    const user = new User({ restaurantId: req.restaurantId, name: String(name).trim(), email: cleanEmail, password: hash, role });
    await user.save();
    res.status(201).json({ ...user.toObject(), password: undefined });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.email !== undefined) {
      updates.email = String(req.body.email).toLowerCase().trim();
      const taken = await User.findOne({ email: updates.email, _id: { $ne: req.params.id } });
      if (taken) return res.status(400).json({ message: 'Email already exists' });
    }
    if (req.body.role !== undefined) {
      if (!ROLES.includes(req.body.role)) return res.status(400).json({ message: 'Choose a valid role' });
      if (isSelf(req) && req.body.role !== 'admin') return res.status(400).json({ message: 'You cannot remove your own admin role' });
      updates.role = req.body.role;
    }
    if (req.body.active !== undefined) {
      if (isSelf(req) && !req.body.active) return res.status(400).json({ message: 'You cannot deactivate your own account' });
      updates.active = Boolean(req.body.active);
    }
    if (req.body.password) {
      if (String(req.body.password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
      updates.password = await bcrypt.hash(String(req.body.password), 10);
    }

    const user = await User.findOneAndUpdate({ _id: req.params.id, restaurantId: req.restaurantId }, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.active) await disconnectUser(req, user._id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    if (isSelf(req)) return res.status(400).json({ message: 'You cannot delete your own account' });
    await User.findOneAndDelete({ _id: req.params.id, restaurantId: req.restaurantId });
    await disconnectUser(req, req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
