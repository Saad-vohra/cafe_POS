const mongoose = require('mongoose');
const crypto = require('crypto');

const customerRewardSchema = new mongoose.Schema({
  rewardId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  requiredStamps: { type: Number, required: true },
  rewardType: { type: String, enum: ['free_item', 'discount_percent', 'discount_flat'], default: 'discount_percent' },
  rewardValue: { type: Number, default: 0 }, // e.g. 20 for 20%, or 0 for free coffee
  status: { type: String, enum: ['locked', 'available', 'redeemed', 'expired'], default: 'locked' },
  unlockedAt: { type: Date, default: null },
  redeemedAt: { type: Date, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
});

const customerSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
  customerId: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true },
  rewardToken: { type: String, unique: true, index: true },
  totalStamps: { type: Number, default: 0 },
  maxStampsPerCard: { type: Number, default: 8 },
  rewards: [customerRewardSchema],
  activeTable: { type: Number, default: null },
  lastVisit: { type: Date, default: Date.now },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }]
}, { timestamps: true });

// Function to generate standard default rewards tiers across repeatable card cycles
customerSchema.methods.initDefaultRewards = function() {
  const totalStamps = this.totalStamps || 0;
  // Determine how many 8-stamp cycles to prepare rewards for (at least 1, plus active cycle)
  const maxCycles = Math.max(1, Math.floor(Math.max(0, totalStamps - 1) / 8) + 1);

  for (let c = 1; c <= maxCycles; c++) {
    const coffeeReq = 4 + (c - 1) * 8;
    const discountReq = 8 * c;

    const coffeeId = c === 1 ? 'rew_coffee_4' : `rew_coffee_${coffeeReq}`;
    const discountId = c === 1 ? 'rew_discount_8' : `rew_discount_${discountReq}`;

    const coffeeTitle = c === 1 ? 'Free Coffee' : `Free Coffee (Card #${c})`;
    const discountTitle = c === 1 ? '20% OFF' : `20% OFF (Card #${c})`;

    if (!this.rewards.some(r => r.rewardId === coffeeId)) {
      this.rewards.push({
        rewardId: coffeeId,
        title: coffeeTitle,
        description: 'Get a complimentary freshly brewed espresso or cappuccino',
        requiredStamps: coffeeReq,
        rewardType: 'free_item',
        rewardValue: 0,
        status: totalStamps >= coffeeReq ? 'available' : 'locked'
      });
    }

    if (!this.rewards.some(r => r.rewardId === discountId)) {
      this.rewards.push({
        rewardId: discountId,
        title: discountTitle,
        description: 'Enjoy 20% off your entire dining bill',
        requiredStamps: discountReq,
        rewardType: 'discount_percent',
        rewardValue: 20,
        status: totalStamps >= discountReq ? 'available' : 'locked'
      });
    }
  }
};

// Auto-check and update reward statuses whenever stamps change
customerSchema.methods.evaluateRewards = function() {
  this.rewards.forEach(rew => {
    if (rew.status === 'locked' && this.totalStamps >= rew.requiredStamps) {
      rew.status = 'available';
      rew.unlockedAt = new Date();
    }
  });
};

// Generate fresh unique token
customerSchema.methods.generateFreshRewardToken = function() {
  this.rewardToken = 'RWD_' + crypto.randomBytes(12).toString('hex');
  return this.rewardToken;
};

customerSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (!this.customerId) {
      const count = await this.constructor.countDocuments();
      this.customerId = `CUS_${10001 + count}`;
    }
    if (!this.rewardToken) {
      this.generateFreshRewardToken();
    }
    if (!this.rewards || this.rewards.length === 0) {
      this.initDefaultRewards();
    }
  }
  this.evaluateRewards();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
