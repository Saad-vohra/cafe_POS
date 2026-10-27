const express = require('express');
const router = express.Router();
const LoyaltySetting = require('../models/LoyaltySetting');
const Customer = require('../models/Customer');
const { auth, optionalAuth, adminOnly } = require('../middleware/auth');
const { emitCustomerUpdate } = require('../utils/realtime');

// 1. Current loyalty program settings (public: the customer app shows the stamp card)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const settings = await LoyaltySetting.getOrCreateDefault(req.restaurantId);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Admin: update loyalty program settings (card stamps & reward milestones)
router.put('/', auth, adminOnly, async (req, res) => {
  try {
    const { stampsPerCard, minSpendForStamp, milestones } = req.body;

    const settings = await LoyaltySetting.getOrCreateDefault(req.restaurantId);

    if (stampsPerCard && !isNaN(stampsPerCard)) {
      settings.stampsPerCard = Math.max(2, Math.min(24, parseInt(stampsPerCard, 10)));
    }

    if (minSpendForStamp !== undefined && !isNaN(minSpendForStamp)) {
      settings.minSpendForStamp = Math.max(0, parseInt(minSpendForStamp, 10));
    }

    if (Array.isArray(milestones)) {
      settings.milestones = milestones.slice(0, 20).map((m, idx) => {
        const rewardType = ['free_item', 'discount_percent', 'discount_flat'].includes(m.rewardType)
          ? m.rewardType
          : 'discount_percent';
        let rewardValue = Math.max(0, parseFloat(m.rewardValue) || 0);
        if (rewardType === 'discount_percent') rewardValue = Math.min(100, rewardValue);
        return {
          milestoneId: m.milestoneId || `milestone_${Date.now()}_${idx}`,
          requiredStamps: Math.max(1, parseInt(m.requiredStamps, 10) || 1),
          title: String(m.title || 'Special Reward').trim().slice(0, 60),
          description: String(m.description || '').trim().slice(0, 200),
          rewardType,
          rewardValue,
          icon: m.icon || (rewardType === 'free_item' ? '☕' : '🏷️'),
          isActive: m.isActive !== false
        };
      }).sort((a, b) => a.requiredStamps - b.requiredStamps);
    }

    await settings.save();

    // Sync all customers with updated settings and milestones
    const allCustomers = await Customer.find({});
    const io = req.app.get('io');
    for (const cust of allCustomers) {
      cust.maxStampsPerCard = settings.stampsPerCard;
      cust.initDefaultRewards(settings);
      cust.evaluateRewards();
      await cust.save();
      emitCustomerUpdate(io, cust);
    }

    // Loyalty settings are public (shown on every customer's stamp card)
    if (io) io.emit('loyalty-settings-updated', settings);

    res.json({
      success: true,
      message: 'Loyalty program settings updated successfully!',
      settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
