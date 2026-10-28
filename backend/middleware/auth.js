const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Customer = require('../models/Customer');

const CUSTOMER_TOKEN_HEADER = 'x-customer-token';
const CUSTOMER_TOKEN_TTL = '12h';
// Sent with 401/403 when the staff login itself is no longer valid (expired, deactivated...)
const SESSION_INVALID = 'SESSION_INVALID';

const getBearer = (req) => req.header('Authorization')?.replace('Bearer ', '') || null;

// Resolves a staff JWT into { user, restaurant }, or null when the token is missing/invalid.
const resolveStaff = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.typ === 'customer') return null;
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.active) return null;
    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant || !restaurant.active) return null;
    return { user, restaurant };
  } catch {
    return null;
  }
};

// Resolves a customer session token (issued by POST /api/customers/session).
const resolveCustomer = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.typ !== 'customer') return null;
    const customer = await Customer.findById(decoded.cid);
    if (!customer) return null;
    return { customer, restaurantId: decoded.rid, tableNumber: decoded.table };
  } catch {
    return null;
  }
};

const signCustomerToken = (customer, restaurantId, tableNumber) =>
  jwt.sign(
    { typ: 'customer', cid: customer._id.toString(), rid: restaurantId.toString(), table: tableNumber },
    process.env.JWT_SECRET,
    { expiresIn: CUSTOMER_TOKEN_TTL }
  );

const auth = async (req, res, next) => {
  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ message: 'No token provided', code: SESSION_INVALID });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token', code: SESSION_INVALID });
    if (!user.active) return res.status(403).json({ message: 'Account is deactivated', code: SESSION_INVALID });

    const restaurant = await Restaurant.findById(user.restaurantId);
    if (!restaurant || !restaurant.active) {
      return res.status(403).json({ message: 'This restaurant account is inactive. Please contact support.', code: SESSION_INVALID });
    }

    req.user = user;
    req.restaurantId = user.restaurantId;
    req.restaurant = restaurant;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Your session has expired. Please log in again.', code: SESSION_INVALID });
  }
};

// Public endpoints (menu, categories, loyalty settings): attaches staff if logged in,
// otherwise resolves the single active restaurant.
const optionalAuth = async (req, res, next) => {
  try {
    const staff = await resolveStaff(getBearer(req));
    if (staff) {
      req.user = staff.user;
      req.restaurantId = staff.user.restaurantId;
      req.restaurant = staff.restaurant;
    } else {
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

// Endpoints used by both the staff app and the customer QR app.
// Staff are identified by the Authorization header; customers by X-Customer-Token.
const staffOrCustomer = async (req, res, next) => {
  try {
    const staff = await resolveStaff(getBearer(req));
    if (staff) {
      req.user = staff.user;
      req.restaurantId = staff.user.restaurantId;
      req.restaurant = staff.restaurant;
      return next();
    }

    const session = await resolveCustomer(req.header(CUSTOMER_TOKEN_HEADER));
    if (session) {
      const restaurant = await Restaurant.findById(session.restaurantId);
      if (!restaurant || !restaurant.active) {
        return res.status(403).json({ message: 'This restaurant is not accepting orders right now.' });
      }
      req.customer = session.customer;
      req.customerTable = session.tableNumber;
      req.restaurantId = restaurant._id;
      req.restaurant = restaurant;
      return next();
    }

    res.status(401).json({ message: 'Please scan the table QR code again to continue.', code: 'CUSTOMER_SESSION' });
  } catch (err) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

const customerOnly = (req, res, next) => {
  if (!req.customer) return res.status(403).json({ message: 'Customer session required' });
  next();
};

const staffOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Staff login required' });
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

const notKitchen = (req, res, next) => {
  if (req.user?.role === 'kitchen') return res.status(403).json({ message: 'Not authorized' });
  next();
};

module.exports = {
  auth,
  optionalAuth,
  staffOrCustomer,
  customerOnly,
  staffOnly,
  adminOnly,
  notKitchen,
  resolveStaff,
  resolveCustomer,
  signCustomerToken,
  CUSTOMER_TOKEN_HEADER
};
