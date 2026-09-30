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
customerSchema.methods.initDefaultRewards = function(customSettings) {
  const totalStamps = this.totalStamps || 0;
  const stampsPerCard = (customSettings && customSettings.stampsPerCard) || this.maxStampsPerCard || 8;
  const milestones = (customSettings && customSettings.milestones && customSettings.milestones.length > 0)
    ? customSettings.milestones.filter(m => m.isActive !== false)
    : [
        {
          milestoneId: 'milestone_coffee_4',
          requiredStamps: 4,
          title: 'Free Coffee',
          description: 'Get a complimentary freshly brewed espresso or cappuccino',
          rewardType: 'free_item',
          rewardValue: 0
        },
        {
          milestoneId: 'milestone_discount_8',
          requiredStamps: 8,
          title: '20% OFF',
          description: 'Enjoy 20% off your entire dining bill',
          rewardType: 'discount_percent',
          rewardValue: 20
        }
      ];

  const maxCycles = Math.max(1, Math.floor(Math.max(0, totalStamps - 1) / stampsPerCard) + 1);

  for (let c = 1; c <= maxCycles; c++) {
    for (const m of milestones) {
      const cycleReq = m.requiredStamps + (c - 1) * stampsPerCard;
      const cycleId = `${m.milestoneId || 'milestone'}_c${c}_${cycleReq}`;
      const cycleTitle = c === 1 ? m.title : `${m.title} (Card #${c})`;

      // Legacy fallback IDs for Card 1
      const legacyId = (m.rewardType === 'free_item' && cycleReq === 4)
        ? 'rew_coffee_4'
        : (m.rewardType === 'discount_percent' && cycleReq === 8)
        ? 'rew_discount_8'
        : null;

      const existing = this.rewards.find(r => r.rewardId === cycleId || (legacyId && r.rewardId === legacyId));

      if (!existing) {
        this.rewards.push({
          rewardId: cycleId,
          title: cycleTitle,
          description: m.description || '',
          requiredStamps: cycleReq,
          rewardType: m.rewardType || 'discount_percent',
          rewardValue: m.rewardValue || 0,
          status: totalStamps >= cycleReq ? 'available' : 'locked'
        });
      } else {
        if (existing.status === 'locked' && totalStamps >= cycleReq) {
          existing.status = 'available';
          existing.unlockedAt = new Date();
        }
      }
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
  try {
    if (this.isNew) {
      if (!this.customerId) {
        const count = await this.constructor.countDocuments();
        this.customerId = `CUS_${10001 + count}`;
      }
      if (!this.rewardToken) {
        this.generateFreshRewardToken();
      }
    }

    try {
      const LoyaltySetting = mongoose.models.LoyaltySetting || require('./LoyaltySetting');
      const settings = await LoyaltySetting.findOne(this.restaurantId ? { restaurantId: this.restaurantId } : {});
      if (settings) {
        this.maxStampsPerCard = settings.stampsPerCard || 8;
        this.initDefaultRewards(settings);
      } else {
        this.initDefaultRewards();
      }
    } catch {
      this.initDefaultRewards();
    }

    this.evaluateRewards();
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Customer', customerSchema);
