const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// NOTE: Public self-signup ("register your restaurant") has been removed —
// this build serves a single client. The one restaurant + its first admin
// user are created by running `npm run seed` (see backend/seed.js) instead.

// 10 failed-or-not attempts per email+IP every 15 minutes slows down password guessing.
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `login:${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many login attempts. Please wait 15 minutes and try again.'
});

const restaurantInfo = (r) => ({
  id: r._id,
  name: r.name,
  slug: r.slug,
  phone: r.phone,
  email: r.email,
  address: r.address,
  gstNumber: r.gstNumber,
  gstRate: r.gstRate ?? 5,
  fssaiNumber: r.fssaiNumber,
  receiptFooter: r.receiptFooter
});

// Login
router.post('/login', loginLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(String(password), user.password);
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
      restaurant: restaurantInfo(restaurant)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user (also used by the app on startup to check the session is still valid)
router.get('/me', auth, async (req, res) => {
  const u = req.user;
  res.json({
    user: { id: u._id, name: u.name, email: u.email, role: u.role },
    restaurant: restaurantInfo(req.restaurant)
  });
});

// Change own password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    const user = await User.findById(req.user._id);
    const ok = await bcrypt.compare(String(currentPassword || ''), user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ message: 'Password changed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.restaurantInfo = restaurantInfo;
module.exports = router;
