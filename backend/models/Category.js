const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '🍽️' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

categorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

categorySchema.statics.getOrCreateDefaults = async function(restaurantId) {
  const query = restaurantId ? { restaurantId } : {};
  let count = await this.countDocuments(query);
  if (count === 0) {
    const defaults = [
      { name: 'Starters', icon: '🥟', sortOrder: 1 },
      { name: 'Main Course', icon: '🍲', sortOrder: 2 },
      { name: 'Pizza', icon: '🍕', sortOrder: 3 },
      { name: 'Burgers', icon: '🍔', sortOrder: 4 },
      { name: 'Beverages', icon: '🥤', sortOrder: 5 },
      { name: 'Desserts', icon: '🍰', sortOrder: 6 }
    ];
    await this.insertMany(defaults.map(d => ({ ...d, restaurantId: restaurantId || null })));
  }
  return this.find(query).sort({ sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('Category', categorySchema);
