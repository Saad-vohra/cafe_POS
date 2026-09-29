const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['Starters', 'Main Course', 'Drinks', 'Desserts', 'Fast Food', 'Special Items'] },
  price: { type: Number, required: true },
  description: { type: String, default: '' },
  available: { type: Boolean, default: true },
  isVeg: { type: Boolean, default: true },
  image: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
