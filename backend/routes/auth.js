const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');

// NOTE: Public self-signup ("register your restaurant") has been removed —
// this build serves a single client. The one restaurant + its first admin
// user are created by running `npm run seed` (see backend/seed.js) instead.

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.active) return res.status(400).json({ message: 'Account is deactivated' });

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant || !restaurant.active) {
      return res.status(403).json({ message: 'This restaurant account is inactive. Please contact support.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      restaurant: { id: restaurant._id, name: restaurant.name, slug: restaurant.slug }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ ...req.user.toObject(), restaurant: req.restaurant });
});

module.exports = router;
