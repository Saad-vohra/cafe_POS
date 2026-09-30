const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    if (!user.active) return res.status(403).json({ message: 'Account is deactivated' });

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant || !restaurant.active) {
      return res.status(403).json({ message: 'This restaurant account is inactive. Please contact support.' });
    }

    req.user = user;
    req.restaurantId = user.restaurantId;
    req.restaurant = restaurant;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.active) {
          req.user = user;
          req.restaurantId = user.restaurantId;
        }
      } catch (tokenErr) {
        // Token invalid or expired - proceed to resolve default restaurant
      }
    }
    // If not authenticated via token, resolve default active restaurant
    if (!req.restaurantId) {
      const restaurant = await Restaurant.findOne({ active: true });
      if (restaurant) {
        req.restaurantId = restaurant._id;
        req.restaurant = restaurant;
      }
    }
    next();
  } catch (err) {
    next();
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

const notKitchen = (req, res, next) => {
  if (req.user?.role === 'kitchen') return res.status(403).json({ message: 'Not authorized' });
  next();
};

module.exports = { auth, optionalAuth, adminOnly, notKitchen };

