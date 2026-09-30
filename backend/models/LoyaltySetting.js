const mongoose = require('mongoose');

const rewardMilestoneSchema = new mongoose.Schema({
  milestoneId: { type: String, required: true },
  requiredStamps: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  rewardType: {
    type: String,
    enum: ['free_item', 'discount_percent', 'discount_flat'],
    default: 'discount_percent'
  },
  rewardValue: { type: Number, default: 0 },
  icon: { type: String, default: '🎁' },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const loyaltySettingSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
  stampsPerCard: { type: Number, default: 8, min: 2, max: 24 },
  milestones: [rewardMilestoneSchema]
}, { timestamps: true });

// Static helper to get or create default loyalty settings
loyaltySettingSchema.statics.getOrCreateDefault = async function(restaurantId) {
  let settings = await this.findOne(restaurantId ? { restaurantId } : {});
  if (!settings) {
    settings = new this({
      restaurantId: restaurantId || null,
      stampsPerCard: 8,
      milestones: [
        {
          milestoneId: 'milestone_coffee_4',
          requiredStamps: 4,
          title: 'Free Coffee',
          description: 'Get a complimentary freshly brewed espresso or cappuccino',
          rewardType: 'free_item',
          rewardValue: 0,
          icon: '☕',
          isActive: true
        },
        {
          milestoneId: 'milestone_discount_8',
          requiredStamps: 8,
          title: '20% OFF',
          description: 'Enjoy 20% off your entire dining bill',
          rewardType: 'discount_percent',
          rewardValue: 20,
          icon: '🏷️',
          isActive: true
        }
      ]
    });
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('LoyaltySetting', loyaltySettingSchema);
