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

// Function to generate standard default rewards tier
customerSchema.methods.initDefaultRewards = function() {
  const defaultTiers = [
    {
      rewardId: 'rew_coffee_4',
      title: 'Free Coffee',
      description: 'Get a complimentary freshly brewed espresso or cappuccino',
      requiredStamps: 4,
      rewardType: 'free_item',
      rewardValue: 0,
      status: this.totalStamps >= 4 ? 'available' : 'locked'
    },
    {
      rewardId: 'rew_discount_8',
      title: '20% OFF',
      description: 'Enjoy 20% off your entire dining bill',
      requiredStamps: 8,
      rewardType: 'discount_percent',
      rewardValue: 20,
      status: this.totalStamps >= 8 ? 'available' : 'locked'
    }
  ];

  // If customer doesn't have these rewards yet, attach them
  defaultTiers.forEach(tier => {
    const exists = this.rewards.some(r => r.rewardId === tier.rewardId);
    if (!exists) {
      this.rewards.push(tier);
    }
  });
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
