const express = require('express');
const router = express.Router();
const LoyaltySetting = require('../models/LoyaltySetting');
const Customer = require('../models/Customer');

// 1. Get current loyalty program settings
router.get('/', async (req, res) => {
  try {
    const settings = await LoyaltySetting.getOrCreateDefault(req.query.restaurantId);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Admin: Update loyalty program settings (card stamps & reward milestones)
router.put('/', async (req, res) => {
  try {
    const { stampsPerCard, milestones, restaurantId } = req.body;

    let settings = await LoyaltySetting.getOrCreateDefault(restaurantId);

    if (stampsPerCard && !isNaN(stampsPerCard)) {
      settings.stampsPerCard = Math.max(2, Math.min(24, parseInt(stampsPerCard, 10)));
    }

    if (Array.isArray(milestones)) {
      // Validate and clean milestones
      settings.milestones = milestones.map((m, idx) => ({
        milestoneId: m.milestoneId || `milestone_${Date.now()}_${idx}`,
        requiredStamps: Math.max(1, parseInt(m.requiredStamps, 10) || 1),
        title: (m.title || 'Special Reward').trim(),
        description: (m.description || '').trim(),
        rewardType: ['free_item', 'discount_percent', 'discount_flat'].includes(m.rewardType)
          ? m.rewardType
          : 'discount_percent',
        rewardValue: parseFloat(m.rewardValue) || 0,
        icon: m.icon || (m.rewardType === 'free_item' ? '☕' : '🏷️'),
        isActive: m.isActive !== false
      })).sort((a, b) => a.requiredStamps - b.requiredStamps);
    }

    await settings.save();

    // Sync all customers with updated settings and milestones
    const allCustomers = await Customer.find({});
    for (const cust of allCustomers) {
      cust.maxStampsPerCard = settings.stampsPerCard;
      cust.initDefaultRewards(settings);
      cust.evaluateRewards();
      await cust.save();
    }

    // Broadcast update via socket so all customer apps & admin panels sync in real time
    const io = req.app.get('io');
    if (io) {
      io.emit('loyalty-settings-updated', settings);
      for (const cust of allCustomers) {
        io.emit(`customer-update-${cust._id}`, cust);
        if (cust.customerId) io.emit(`customer-update-${cust.customerId}`, cust);
        if (cust.phone) io.emit(`customer-update-${cust.phone}`, cust);
      }
    }

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
