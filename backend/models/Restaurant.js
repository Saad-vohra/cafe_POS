const mongoose = require('mongoose');

// Single-client build: this collection will only ever hold one document,
// representing this restaurant. Kept as its own model (rather than removing
// restaurantId everywhere) so every other model/route needs zero changes.
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  gstRate: { type: Number, default: 5 },
  currency: { type: String, default: 'INR' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
