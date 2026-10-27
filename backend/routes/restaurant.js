const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const { auth, adminOnly } = require('../middleware/auth');
const { restaurantInfo } = require('./auth');

// Public info for the customer QR app (name and GST rate for the running bill)
router.get('/public', async (req, res) => {
  try {
    const r = await Restaurant.findOne({ active: true });
    if (!r) return res.status(404).json({ message: 'Restaurant not found' });
    res.json({ name: r.name, gstRate: r.gstRate ?? 5 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, (req, res) => res.json(restaurantInfo(req.restaurant)));

// Admin: business details printed on every bill (name, address, GSTIN, GST rate…)
router.put('/', auth, adminOnly, async (req, res) => {
  try {
    const r = req.restaurant;
    const text = (v, max) => String(v ?? '').trim().slice(0, max);

    if (req.body.name !== undefined) {
      const name = text(req.body.name, 100);
      if (!name) return res.status(400).json({ message: 'Restaurant name is required' });
      r.name = name;
    }
    if (req.body.address !== undefined) r.address = text(req.body.address, 300);
    if (req.body.phone !== undefined) r.phone = text(req.body.phone, 30);
    if (req.body.email !== undefined) r.email = text(req.body.email, 100) || r.email;
    if (req.body.fssaiNumber !== undefined) r.fssaiNumber = text(req.body.fssaiNumber, 20);
    if (req.body.receiptFooter !== undefined) r.receiptFooter = text(req.body.receiptFooter, 150);
    if (req.body.gstNumber !== undefined) {
      const gstin = text(req.body.gstNumber, 15).toUpperCase();
      if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) {
        return res.status(400).json({ message: 'GSTIN must be 15 characters, e.g. 27ABCDE1234F1Z5' });
      }
      r.gstNumber = gstin;
    }
    if (req.body.gstRate !== undefined) {
      const rate = Number(req.body.gstRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 28) {
        return res.status(400).json({ message: 'GST rate must be between 0 and 28' });
      }
      r.gstRate = rate;
    }

    await r.save();
    res.json(restaurantInfo(r));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
