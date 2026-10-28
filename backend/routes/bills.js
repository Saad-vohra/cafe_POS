const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const { auth, adminOnly } = require('../middleware/auth');
const { billOrder, BillingError } = require('../utils/billing');

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const filter = { restaurantId: req.restaurantId };
    if (req.query.date) {
      const [y, m, d] = String(req.query.date).split('-').map(Number);
      const start = new Date(y, m - 1, d);
      if (!y || !m || !d || isNaN(start)) return res.status(400).json({ message: 'Invalid date' });
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }
    const bills = await Bill.find(filter).sort('-createdAt').limit(200);
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, restaurantId: req.restaurantId }).populate('orderId');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate the bill for an order at the POS (admin / cashier only — waiters don't bill).
// Payment is collected by staff (cash / UPI / card); an optional loyalty reward of the
// linked customer can be applied here.
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { orderId, paymentMode, rewardId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const result = await billOrder({
      orderId,
      restaurant: req.restaurant,
      paymentMode,
      rewardId: rewardId || null,
      user: req.user,
      io: req.app.get('io')
    });

    res.status(201).json({
      ...result.bill.toObject(),
      stampEarned: result.stampEarned,
      customerTotalStamps: result.customer?.totalStamps,
      newlyUnlocked: result.newlyUnlocked.map(r => r.title)
    });
  } catch (err) {
    if (err instanceof BillingError) return res.status(err.status).json({ message: err.message });
    console.error('Billing error:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
